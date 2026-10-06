import * as SQLite from '../../src/sqlite-api.js';
import { BUILDS } from './configs.js';
import { formatTerm } from './parser.js';
import { sleep } from './script.js';

const quote = (text) => `'${text.replaceAll("'", "''")}'`;

export async function openConnection({
  build,
  vfs: config,
  namespace,
  filename,
  busyTimeout = 10000,
  sync = true
}) {
  const { default: factory } = await import(BUILDS[build]);
  const module = await factory();
  const sqlite3 = SQLite.Factory(module);
  let vfs;
  if (config.name !== 'default') {
    const exports = await import(`../../src/examples/${config.name}.js`);
    // IndexedDB/pool names isolate this run's storage from the other tests/demo.
    vfs = await exports[config.name].create(namespace, module);
    sqlite3.vfs_register(vfs, true);
  }
  const db = await sqlite3.open_v2(
    filename,
    SQLite.SQLITE_OPEN_READWRITE | SQLite.SQLITE_OPEN_CREATE
  );
  const complete = module.cwrap('sqlite3_complete', 'number', ['string']);

  async function retry(operation) {
    const deadline = performance.now() + busyTimeout;
    for (;;) {
      try {
        return await operation();
      } catch (error) {
        if (
          (error.code & 255) !== SQLite.SQLITE_BUSY ||
          performance.now() >= deadline
        )
          throw error;
        await sleep(10);
      }
    }
  }

  async function execute(sql) {
    const terms = [];
    let begin = 0;
    // sqlite3_complete handles quoted semicolons and CREATE TRIGGER bodies.
    // Retry preparation per statement, never replay earlier committed writes.
    const statements = [];
    for (let i = 0; i < sql.length; i++) {
      if (sql[i] === ';' && complete(sql.slice(begin, i + 1))) {
        statements.push(sql.slice(begin, i + 1));
        begin = i + 1;
      }
    }
    statements.push(sql.slice(begin));
    try {
      for (const statement of statements) {
        let iterator;
        let item = await retry(async () => {
          iterator = sqlite3.statements(db, statement);
          return iterator.next();
        });
        try {
          while (!item.done) {
            const stmt = item.value;
            while (
              (await retry(() => sqlite3.step(stmt))) === SQLite.SQLITE_ROW
            ) {
              for (let i = 0; i < sqlite3.column_count(stmt); i++)
                terms.push(formatTerm(sqlite3.column_text(stmt, i)));
            }
            item = await iterator.next();
          }
        } finally {
          await iterator.return();
        }
      }
    } catch (error) {
      error.output = terms.join(' ');
      throw error;
    }
    return terms.join(' ');
  }

  // Synchronous builds cannot suspend a SQL function callback. Use the native
  // prepare/step entry points for recursive eval() there. The upstream scripts
  // only evaluate PRAGMA page_size, which does not require VFS I/O/retry work.
  function evalSync(sql) {
    const prepare = module.cwrap('sqlite3_prepare_v2', 'number', [
      'number',
      'number',
      'number',
      'number',
      'number'
    ]);
    const step = module.cwrap('sqlite3_step', 'number', ['number']);
    const finalize = module.cwrap('sqlite3_finalize', 'number', ['number']);
    const bytes = new TextEncoder().encode(sql + '\0');
    const head = module._sqlite3_malloc(bytes.length);
    const pointers = module._sqlite3_malloc(8);
    const terms = [];
    const check = (rc) => {
      if (rc !== SQLite.SQLITE_OK)
        throw new SQLite.SQLiteError(
          module.ccall('sqlite3_errmsg', 'string', ['number'], [db]),
          rc
        );
    };
    try {
      module.HEAPU8.set(bytes, head);
      let tail = head;
      while (tail < head + bytes.length - 1) {
        check(prepare(db, tail, -1, pointers, pointers + 4));
        const stmt = module.getValue(pointers, '*');
        tail = module.getValue(pointers + 4, '*');
        if (!stmt) break;
        try {
          let rc;
          while ((rc = step(stmt)) === SQLite.SQLITE_ROW) {
            const count = module.ccall(
              'sqlite3_column_count',
              'number',
              ['number'],
              [stmt]
            );
            for (let i = 0; i < count; i++) {
              const value = module.ccall(
                'sqlite3_column_text',
                'number',
                ['number', 'number'],
                [stmt, i]
              );
              terms.push(formatTerm(value ? module.UTF8ToString(value) : null));
            }
          }
          check(rc === SQLite.SQLITE_DONE ? SQLite.SQLITE_OK : rc);
        } finally {
          finalize(stmt);
        }
      }
    } finally {
      module._sqlite3_free(pointers);
      module._sqlite3_free(head);
    }
    return terms.join(' ');
  }

  const resultError = (context, error) =>
    module.ccall(
      'sqlite3_result_error',
      null,
      ['number', 'string', 'number'],
      [context, error.message, -1]
    );
  const evalFunction =
    build === 'default'
      ? function (context, values) {
          try {
            sqlite3.result_text(
              context,
              evalSync(sqlite3.value_text(values[0]) ?? '') || null
            );
          } catch (error) {
            resultError(context, error);
          }
        }
      : async function (context, values) {
          // Copy values before awaiting: callback arguments point into WASM memory.
          const sql = sqlite3.value_text(values[0]) ?? '';
          try {
            sqlite3.result_text(context, (await execute(sql)) || null);
          } catch (error) {
            resultError(context, error);
          }
        };
  sqlite3.create_function(db, 'eval', 1, SQLite.SQLITE_UTF8, 0, evalFunction);
  sqlite3.create_function(db, 'vfsname', 0, SQLite.SQLITE_UTF8, 0, (context) =>
    sqlite3.result_text(context, config.name)
  );

  const connection = {
    showSqlErrors: true,
    async execute(sql) {
      try {
        return await execute(sql);
      } catch (error) {
        if (this.showSqlErrors) throw error;
        return [error.output, `error(${error.code})`, formatTerm(error.message)]
          .filter(Boolean)
          .join(' ');
      }
    },
    async truth(expression) {
      return (
        (await execute(
          `SELECT CASE WHEN (${expression}) THEN 1 ELSE 0 END`
        )) === '1'
      );
    },
    async glob(pattern, text) {
      return (
        (await execute(`SELECT ${quote(text)} GLOB ${quote(pattern)}`)) === '1'
      );
    },
    async close() {
      await sqlite3.close(db);
      await vfs?.close?.();
    }
  };
  if (!sync) await execute('PRAGMA synchronous=OFF;');
  return connection;
}
