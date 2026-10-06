import { getConfig } from '@web/test-runner-core/browser/session.js';
import { openConnection } from './sqlite.js';
import { VFS_CONFIGS, testBuilds } from './configs.js';

const { testFrameworkConfig } = await getConfig();
const vfs = VFS_CONFIGS.find((vfs) => vfs.name === 'MemoryVFS');

describe('mptest SQLite connection', () => {
  for (const build of testBuilds(vfs, testFrameworkConfig.mptest.build)) {
    describe(build, () => {
      let connection;
      beforeEach(async () => {
        if (
          build === 'jspi' &&
          !('Suspending' in WebAssembly || 'Suspender' in WebAssembly)
        ) {
          pending('JSPI unavailable');
          return;
        }
        connection = await openConnection({
          build,
          vfs,
          namespace: 'mptest-memory',
          filename: 'test.db'
        });
      });
      afterEach(async () => {
        await connection?.close();
        connection = null;
      });

      it('preserves native SQLite values and executes SQL without a final semicolon', async () => {
        expect(
          await connection.execute(
            "SELECT 1500.0, NULL, '', 'two words', 'it''s quoted'"
          )
        ).toBe("1500.0 nil '' 'two words' 'it''s quoted'");
      });

      it('registers vfsname and recursive eval used by upstream configuration suites', async () => {
        expect(
          await connection.execute("SELECT vfsname(), eval('PRAGMA page_size')")
        ).toMatch(/^MemoryVFS \d+$/);
        expect(
          await connection.execute("SELECT eval('SELECT NULL, 1.0')")
        ).toBe("'nil 1.0'");
        expect(
          await connection.execute(
            "SELECT eval(NULL), eval('SELECT 1 WHERE 0')"
          )
        ).toBe('nil nil');
      });

      it('uses SQLite truth and GLOB semantics', async () => {
        expect(await connection.truth('NULL')).toBeFalse();
        expect(await connection.truth("'not a number'")).toBeFalse();
        expect(await connection.truth('2')).toBeTrue();
        expect(await connection.glob('[a-c]?*', 'b12')).toBeTrue();
        expect(await connection.glob('[^a-c]*', 'b12')).toBeFalse();
      });

      it('retains trigger bodies and quoted semicolons when splitting a SQL batch', async () => {
        await connection.execute(
          "CREATE TABLE t(x); CREATE TRIGGER tr AFTER INSERT ON t WHEN new.x = 'a;b' BEGIN INSERT INTO t VALUES('c;d'); END; INSERT INTO t VALUES('a;b');"
        );
        expect(await connection.execute('SELECT x FROM t ORDER BY x')).toBe(
          'a;b c;d'
        );
      });
      it('retains earlier output and stops the SQL batch when an expected SQL error occurs', async () => {
        connection.showSqlErrors = false;
        expect(
          await connection.execute('SELECT 1; SELECT missing; SELECT 2;')
        ).toBe("1 error(1) 'no such column: missing'");
      });
    });
  }
});
