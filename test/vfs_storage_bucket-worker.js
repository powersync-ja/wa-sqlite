// A worker for vfs_storage_bucket.js, holding one connection through the VFS
// class named by the config parameter, in the Storage Bucket named by the
// storageBucket parameter or, without it, in the default bucket.
import * as SQLite from '../src/sqlite-api.js';

const searchParams = new URLSearchParams(location.search);
const ready = (async () => {
  const { default: moduleFactory } = await import('../dist/wa-sqlite.mjs');
  const module = await moduleFactory();
  const sqlite3 = SQLite.Factory(module);

  const className = searchParams.get('config');
  const namespace = await import(`../src/examples/${className}.js`);
  const storageBucket = searchParams.get('storageBucket');
  const options = storageBucket === null ? {} : { storageBucket };
  const vfs = await namespace[className].create('storage-bucket-test', module, options);
  sqlite3.vfs_register(vfs, true);

  const db = await sqlite3.open_v2(searchParams.get('filename'));
  return { sqlite3, db };
})();

addEventListener('message', async ({ data }) => {
  try {
    const { sqlite3, db } = await ready;
    switch (data.type) {
      case 'ready':
        postMessage({});
        break;
      case 'exec': {
        const rows = [];
        await sqlite3.exec(db, data.sql, row => rows.push(row));
        postMessage({ rows });
        break;
      }
      case 'close':
        await sqlite3.close(db);
        postMessage({});
        break;
    }
  } catch (e) {
    postMessage({ error: e.message, name: e.name });
  }
});
