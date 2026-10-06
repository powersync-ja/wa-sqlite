import { getCapabilities } from './mptest/runner.js';
import { VFS_CONFIGS } from './mptest/configs.js';

const capabilities = await getCapabilities();
const vfs = VFS_CONFIGS.find((entry) => entry.name === 'OPFSPermutedVFS');
const ROWS = `
  CREATE TABLE t(id INTEGER PRIMARY KEY, b);
  WITH RECURSIVE c(i) AS (SELECT 1 UNION ALL SELECT i+1 FROM c WHERE i<64)
  INSERT INTO t SELECT i, zeroblob(1500) FROM c;`;

describe('OPFSPermutedVFS', () => {
  for (const build of ['asyncify', 'jspi']) {
    describe(build, () => {
      let namespace, filename, workers;
      beforeEach(async () => {
        if (
          !capabilities.unsafeAccess ||
          (build === 'jspi' && !capabilities.jspi)
        ) {
          pending(
            'Required browser storage or WebAssembly support unavailable'
          );
          return;
        }
        workers = [];
        namespace = `mptest-${crypto.randomUUID()}`;
        filename = `/${namespace}/test.db`;
        await (
          await navigator.storage.getDirectory()
        ).getDirectoryHandle(namespace, { create: true });
      });
      afterEach(async () => {
        if (!workers) return;
        for (const worker of workers) worker.terminate();
        const root = await navigator.storage.getDirectory();
        for (let attempt = 0; ; attempt++) {
          try {
            await root.removeEntry(namespace, { recursive: true });
            break;
          } catch (error) {
            if (error.name !== 'NoModificationAllowedError' || attempt >= 100)
              throw error;
            await new Promise((resolve) => setTimeout(resolve, 50));
          }
        }
        await new Promise((resolve, reject) => {
          const request = indexedDB.deleteDatabase(filename);
          request.onsuccess = resolve;
          request.onerror = () => reject(request.error);
        });
        workers = null;
      });

      async function connect(workerPath = './mptest/worker.js') {
        // Each Worker has its own page map and free list, as in real tabs.
        const worker = new Worker(new URL(workerPath, import.meta.url), {
          type: 'module'
        });
        workers.push(worker);
        let id = 0;
        const call = (method, ...args) =>
          new Promise((resolve, reject) => {
            const requestId = ++id;
            const listener = ({ data }) => {
              if (data.type !== 'response' || data.id !== requestId) return;
              worker.removeEventListener('message', listener);
              if (data.error) reject(new Error(data.error.message));
              else resolve(data.value);
            };
            worker.addEventListener('message', listener);
            worker.postMessage({ id: requestId, method, args });
          });
        await call('open', { build, vfs, namespace, filename });
        return {
          worker,
          exec: (sql) => call('execute', sql, true),
          crash: () => worker.terminate()
        };
      }

      for (const synchronous of ['FULL', 'NORMAL']) {
        it(`should preserve a compacted database with synchronous=${synchronous}`, async () => {
          const writer = await connect();
          await writer.exec(`PRAGMA synchronous=${synchronous};`);
          await writer.exec(ROWS);
          const reader = await connect();
          expect(await reader.exec('SELECT count(*) FROM t;')).toBe('64');
          const originalPages = Number(await writer.exec('PRAGMA page_count;'));
          await writer.exec('DELETE FROM t WHERE id>1; VACUUM;');
          expect(Number(await writer.exec('PRAGMA page_count;'))).toBeLessThan(
            originalPages
          );
          const directory = await (
            await navigator.storage.getDirectory()
          ).getDirectoryHandle(namespace);
          const physicalFile = await (
            await directory.getFileHandle('test.db')
          ).getFile();
          expect(physicalFile.size).toBe(
            Number(await writer.exec('PRAGMA page_count;')) *
              Number(await writer.exec('PRAGMA page_size;'))
          );
          const compacted = await connect();
          expect(
            await compacted.exec('SELECT count(*), sum(length(b)) FROM t;')
          ).toBe('1 1500');
          expect(await compacted.exec('PRAGMA integrity_check;')).toBe('ok');
          compacted.crash();

          // Reuse slots that were occupied before VACUUM, including slots
          // reclaimed from transactions preceding its identity mapping.
          await reader.exec(`
          WITH RECURSIVE c(i) AS (SELECT 2 UNION ALL SELECT i+1 FROM c WHERE i<65)
          INSERT INTO t SELECT i, zeroblob(20000) FROM c;`);
          expect(
            await reader.exec('SELECT count(*), sum(length(b)) FROM t;')
          ).toBe('65 1281500');
          expect(await reader.exec('PRAGMA integrity_check;')).toBe('ok');
          await reader.exec('UPDATE t SET b=zeroblob(20000) WHERE id=2;');

          // Reopening must recover the same compacted page map from IndexedDB.
          writer.crash();
          reader.crash();
          const reopened = await connect();
          expect(
            await reopened.exec('SELECT count(*), sum(length(b)) FROM t;')
          ).toBe('65 1281500');
          expect(await reopened.exec('PRAGMA integrity_check;')).toBe('ok');
        });
      }

      it('should discard journal playback copies before another writer reuses them', async () => {
        const setup = await connect();
        await setup.exec(ROWS);
        for (let i = 2; i <= 5; i++) {
          await setup.exec(`CREATE TABLE t${i} AS SELECT * FROM t;`);
        }
        const reader = await connect();
        await reader.exec('PRAGMA cache_size=1;');
        expect(await reader.exec('SELECT count(*) FROM t;')).toBe('64');

        for (let attempt = 0; attempt < 3; attempt++) {
          const writer = await connect();
          await writer.exec('PRAGMA cache_size=1; BEGIN;');
          for (const table of ['t', 't2', 't3', 't4', 't5']) {
            await writer.exec(`UPDATE ${table} SET b=zeroblob(20000);`);
          }
          for (const table of ['t', 't2', 't3', 't4', 't5']) {
            await writer.exec(`UPDATE ${table} SET b=NULL;`);
          }
          // The previous recovery connection must keep seeing committed data
          // while the new writer occupies its discarded playback slots.
          expect(
            await reader.exec(
              'PRAGMA shrink_memory; SELECT count(*), sum(length(b)) FROM t;'
            )
          ).toBe('64 96000');
          writer.crash();
          expect(
            await reader.exec('SELECT count(*), sum(length(b)) FROM t;')
          ).toBe('64 96000');
          expect(await reader.exec('PRAGMA integrity_check;')).toBe('ok');
        }
        await reader.exec('INSERT INTO t VALUES(65, zeroblob(1500));');
        expect(await reader.exec('SELECT count(*) FROM t;')).toBe('65');
        expect(await reader.exec('PRAGMA integrity_check;')).toBe('ok');
      });

      it('should recover the saved map after VACUUM tears the canonical header', async () => {
        const writer = await connect('./vfs_permuted_vacuum_crash-worker.js');
        await writer.exec(ROWS);
        await writer.exec('DELETE FROM t WHERE id>1;');
        const crashed = new Promise((resolve, reject) => {
          writer.worker.addEventListener('message', ({ data }) => {
            if (data.type === 'vacuum-write') {
              writer.crash();
              resolve();
            }
          });
          writer
            .exec('VACUUM;')
            .then(
              () => reject(new Error('VACUUM was not interrupted')),
              reject
            );
        });
        await crashed;
        const reopened = await connect();
        expect(
          await reopened.exec('SELECT count(*), sum(length(b)) FROM t;')
        ).toBe('1 1500');
        expect(await reopened.exec('PRAGMA integrity_check;')).toBe('ok');
      });
    });
  }
});
