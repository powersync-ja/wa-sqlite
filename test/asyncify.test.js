import SQLiteESMFactory from '../dist/wa-sqlite-async.mjs';
import EncryptedSQLiteESMFactory from '../dist/mc-wa-sqlite-async.mjs';
import * as SQLite from '../src/sqlite-api.js';

describe('Asyncify build', function() {
  it('runs without WebAssembly JSPI', async function() {
    const descriptors = ['Suspending', 'promising'].map(name =>
      [name, Object.getOwnPropertyDescriptor(WebAssembly, name)]);
    try {
      for (const [name] of descriptors) {
        Object.defineProperty(WebAssembly, name, {
          configurable: true,
          value: undefined,
        });
      }

      for (const factory of [SQLiteESMFactory, EncryptedSQLiteESMFactory]) {
        const module = await factory();
        const sqlite3 = SQLite.Factory(module);
        const db = await sqlite3.open_v2(':memory:');
        try {
          await sqlite3.create_function(
            db, 'async_result', 0, SQLite.SQLITE_UTF8, 0,
            async function(context) {
              await new Promise(resolve => setTimeout(resolve, 0));
              sqlite3.result_int(context, 1);
            });
          const rows = [];
          await sqlite3.exec(db, 'SELECT async_result()', row => rows.push(row));
          expect(rows).toEqual([[1]]);
        } finally {
          await sqlite3.close(db);
        }
      }
    } finally {
      for (const [name, descriptor] of descriptors) {
        if (descriptor) {
          Object.defineProperty(WebAssembly, name, descriptor);
        } else {
          delete WebAssembly[name];
        }
      }
    }
  });
});
