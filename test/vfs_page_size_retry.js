import * as Comlink from 'comlink';

/**
 * A write on an existing connection must survive another connection changing
 * the database page size. SQLite rereads page 1 within the same write attempt.
 * @param {import('./TestContext.js').TestContext} context
 */
export function vfs_page_size_retry(context) {
  describe('vfs_page_size_retry', function() {
    const cleanup = [];
    afterEach(async function() {
      while (cleanup.length) await cleanup.pop()();
    });

    it('should retain the write hint through a page size retry', async function() {
      const writer = await context.create();
      cleanup.push(() => context.destroy(writer));
      const db = await writer.sqlite3.open_v2('demo');
      cleanup.push(() => writer.sqlite3.close(db));
      await writer.sqlite3.exec(db, 'CREATE TABLE t(x); INSERT INTO t VALUES(1)');

      const reader = await context.create({ reset: false });
      cleanup.push(() => context.destroy(reader));
      const other = await reader.sqlite3.open_v2('demo');
      cleanup.push(() => reader.sqlite3.close(other));
      await reader.sqlite3.exec(other,
        'PRAGMA lazy_lock=none; SELECT * FROM t');

      for (const size of [512, 8192]) {
        await writer.sqlite3.exec(db, `PRAGMA page_size=${size}; VACUUM`);
        // Reacquiring a non-lazy lock during SQLite's internal reread can
        // require another asynchronous BUSY retry, as in the mptest runner.
        for (let attempt = 0; ; attempt++) {
          try {
            await reader.sqlite3.exec(other, 'INSERT INTO t VALUES(2)');
            break;
          } catch (error) {
            if (error.message !== 'database is locked' || attempt >= 5) throw error;
          }
        }
        // The preserved hint must not turn subsequent reads into writes.
        await reader.sqlite3.exec(other, 'BEGIN; SELECT * FROM t');
        await writer.sqlite3.exec(db, 'INSERT INTO t VALUES(3)');
        await reader.sqlite3.exec(other, 'COMMIT');
      }
      const counts = [];
      await reader.sqlite3.exec(other, 'SELECT count(*) FROM t',
        Comlink.proxy(row => counts.push(row)));
      expect(counts).toEqual([[5]]);
      const integrity = [];
      await reader.sqlite3.exec(other, 'PRAGMA integrity_check',
        Comlink.proxy(row => integrity.push(row)));
      expect(integrity).toEqual([['ok']]);
    });
  });
}
