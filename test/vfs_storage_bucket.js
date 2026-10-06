import { TestContext } from "./TestContext.js";

// The same name as TEST_STORAGE_BUCKET in test-worker.js, whose reset clears
// every bucket. That module cannot be imported here: it starts a VFS.
const BUCKET = 'wa-sqlite-test';
const ANSWER_MS = 10_000;
const WAIT_MS = 3_000;

/**
 * A VFS given the storageBucket option keeps its files in that bucket, and
 * shares no locks or messages with a file of the same name in the default
 * bucket.
 * @param {{ config: string }} params VFS class name
 */
export function vfs_storage_bucket({ config }) {
  describe('vfs_storage_bucket', function() {
    const workers = [];
    beforeEach(async function() {
      // Starting a test worker clears the default bucket and every bucket.
      const context = new TestContext();
      await context.destroy(await context.create());
    });

    afterEach(function() {
      for (const worker of workers.splice(0)) worker.terminate();
    });

    /**
     * @param {{ filename: string, storageBucket?: string }} params
     * @returns {(message: object) => Promise<any>}
     */
    function connect({ filename, storageBucket }) {
      const url = new URL('./vfs_storage_bucket-worker.js', import.meta.url);
      url.searchParams.set('config', config);
      url.searchParams.set('filename', filename);
      if (storageBucket !== undefined) {
        url.searchParams.set('storageBucket', storageBucket);
      }
      const worker = new Worker(url, { type: 'module' });
      workers.push(worker);
      return (message) => new Promise((resolve, reject) => {
        const timer = setTimeout(
          () => reject(new Error(`no answer to ${JSON.stringify(message)}`)),
          ANSWER_MS);
        worker.addEventListener('message', ({ data }) => {
          clearTimeout(timer);
          resolve(data);
        }, { once: true });
        worker.postMessage(message);
      });
    }

    it('should keep its files in the storage bucket', async function() {
      const db = connect({ filename: 'in-bucket', storageBucket: BUCKET });
      expect(await db({
        type: 'exec',
        sql: `CREATE TABLE t(x); INSERT INTO t VALUES ('bucket')`
      })).toEqual({ rows: [] });
      expect(await db({ type: 'close' })).toEqual({});

      const defaultRoot = await navigator.storage.getDirectory();
      // @ts-ignore
      const bucket = await navigator.storageBuckets.open(BUCKET);
      expect(await listAll(defaultRoot)).toEqual([]);
      const inBucket = await listAll(await bucket.getDirectory());
      expect(inBucket.length).toBeGreaterThan(0);
      if (config !== 'AccessHandlePoolVFS') {
        // AccessHandlePoolVFS stores files under generated names.
        expect(inBucket).toContain('in-bucket');
      }
    });

    it('should keep apart from a file of the same name in the default bucket', async function() {
      const inBucket = connect({ filename: 'same-name', storageBucket: BUCKET });
      const inDefault = connect({ filename: 'same-name' });
      await inBucket({ type: 'exec', sql: `CREATE TABLE t(x); INSERT INTO t VALUES ('bucket')` });
      await inDefault({ type: 'exec', sql: `CREATE TABLE t(x); INSERT INTO t VALUES ('default')` });

      // A write while the other connection is open, then time for any message
      // it sends to arrive.
      await inDefault({ type: 'exec', sql: `INSERT INTO t VALUES ('default')` });
      await new Promise(resolve => setTimeout(resolve, 200));

      expect(await inBucket({ type: 'exec', sql: 'SELECT x FROM t' }))
        .toEqual({ rows: [['bucket']] });
      expect(await inDefault({ type: 'exec', sql: 'SELECT x FROM t' }))
        .toEqual({ rows: [['default'], ['default']] });
    });

    it('should not wait for a transaction on a file of the same name in the default bucket', async function() {
      const inBucket = connect({ filename: 'same-name', storageBucket: BUCKET });
      const inDefault = connect({ filename: 'same-name' });
      await inBucket({ type: 'exec', sql: 'CREATE TABLE t(x)' });
      await inDefault({ type: 'exec', sql: 'CREATE TABLE t(x)' });

      // The bucket connection holds a write transaction open.
      await inBucket({ type: 'exec', sql: `BEGIN IMMEDIATE; INSERT INTO t VALUES ('bucket')` });
      const result = await Promise.race([
        inDefault({ type: 'exec', sql: `INSERT INTO t VALUES ('default')` }),
        new Promise(resolve => setTimeout(() => resolve('waited'), WAIT_MS)),
      ]);
      expect(result).toEqual({ rows: [] });

      expect(await inBucket({ type: 'exec', sql: 'COMMIT' })).toEqual({ rows: [] });
      expect(await inBucket({ type: 'exec', sql: 'SELECT x FROM t' }))
        .toEqual({ rows: [['bucket']] });
    });

    it('should fail to open in a bucket the browser does not accept', async function() {
      // Bucket names are lowercase.
      const db = connect({ filename: 'x', storageBucket: 'Not-Valid' });
      expect(await db({ type: 'ready' })).toEqual(jasmine.objectContaining({ name: 'TypeError' }));
    });
  });
}

/**
 * @param {FileSystemDirectoryHandle} directory
 * @returns {Promise<string[]>} paths of every entry below the directory
 */
async function listAll(directory, prefix = '') {
  const paths = [];
  // @ts-ignore
  for await (const [name, handle] of directory.entries()) {
    paths.push(prefix + name);
    if (handle.kind === 'directory') {
      paths.push(...await listAll(handle, `${prefix}${name}/`));
    }
  }
  return paths.sort();
}
