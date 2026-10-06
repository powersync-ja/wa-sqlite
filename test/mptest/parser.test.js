import { parseScript, formatTerm } from './parser.js';
import { runScript } from './script.js';
import { SUITES, VFS_CONFIGS, skipReason } from './configs.js';
import { loadScript } from './runner.js';

describe('mptest parser and interpreter', () => {
  it('ignores directive-like text in comments and SQL literals, retaining source lines', () => {
    const nodes = parseScript(
      "/*\n--exit 1\n*/\nSELECT '--task 9', 'it''s --end', \"--if\", [--reset];\n--match value\n",
      'quoted.test'
    );
    expect(nodes.map((node) => node.command)).toEqual(['sql', 'match']);
    expect(nodes[1].line).toBe(5);
    expect(nodes[0].argument).toContain("'it''s --end'");
  });

  it('retains task body locations and client labels', () => {
    const nodes = parseScript(
      '--task 3 writer\nSELECT 1\n--match 1\n--end\n--wait all\n',
      'tasks.test'
    );
    expect(nodes[0].argument).toBe('3 writer');
    expect(nodes[0].body[1].line).toBe(3);
    expect(nodes[0].body[0].argument.trim()).toBe('SELECT 1');
    expect(nodes[1].command).toBe('wait');
  });

  it('supports nested conditionals and the upstream EOF conditional', () => {
    const nodes = parseScript(
      '--if 1\n--if 0\nSELECT 0;\n--else\nSELECT 1;\n--endif\n',
      'conditional.test'
    );
    expect(nodes[0].body[0].otherwise[0].argument.trim()).toBe('SELECT 1;');
  });

  it('rejects misspelled commands and incomplete task blocks', () => {
    expect(() => parseScript('--wat all\n', 'bad.test')).toThrowError(
      /bad.test:1: unknown command/
    );
    expect(() => parseScript('--task 1\nSELECT 1;\n')).toThrowError(
      /missing --end/
    );
  });

  it('formats NULL, empty/whitespace strings and embedded quotes as upstream does', () => {
    expect(
      [null, '', 'two words', "a 'quote'", '1500.0'].map(formatTerm)
    ).toEqual(['nil', "''", "'two words'", "'a ''quote'''", '1500.0']);
  });

  it('accumulates SQL across conditionals, with separate result state for includes', async () => {
    const assertions = [];
    const connection = {
      execute: async (sql) => sql.trim(),
      truth: async (expression) => expression === '1'
    };
    const host = {
      assert: (passed, assertion) =>
        assertions.push({ passed, actual: assertion.actual }),
      source: async () =>
        parseScript('included\n--match included\n', 'include.test')
    };
    const nodes = parseScript(
      'first\n--if 1\nsecond\n--else\nwrong\n--endif\n--source include.test\n--match first second\nthird\n--match third\n'
    );
    await runScript(nodes, connection, host);
    expect(assertions).toEqual([
      { passed: true, actual: 'included' },
      { passed: true, actual: 'first second' },
      { passed: true, actual: 'third' }
    ]);
  });

  it('reports assertion failures with the original file and line', async () => {
    await expectAsync(
      runScript(
        parseScript('SELECT 1;\n--match 2\n', 'failure.test'),
        {
          execute: async () => '1'
        },
        { assert() {} }
      )
    ).toBeRejectedWithError(/failure.test:2: expected \[2\], got \[1\]/);
  });

  it('parses every vendored script without rewriting test SQL', async () => {
    for (const name of [
      ...SUITES.map((suite) => suite.name),
      'crash02.subtest'
    ]) {
      const nodes = await loadScript(
        new URL(`./upstream/${name}`, import.meta.url).href
      );
      expect(nodes.length).toBeGreaterThan(0);
      expect(
        nodes.some((node) => node.command === 'task' || node.command === 'if')
      ).toBeTrue();
    }
  });

  it('excludes only unsupported VFS/suite/build capabilities', () => {
    const suite = (name) => SUITES.find((entry) => entry.name === name);
    const vfs = (name) => VFS_CONFIGS.find((entry) => entry.name === name);
    expect(
      skipReason(suite('multiwrite01.test'), vfs('MemoryVFS'), 'default')
    ).toContain('concurrent');
    expect(
      skipReason(suite('config02.test'), vfs('IDBBatchAtomicVFS'), 'asyncify')
    ).toContain('page size');
    expect(
      skipReason(suite('crash01.test'), vfs('IDBMirrorVFS'), 'asyncify')
    ).toBeNull();
    expect(
      skipReason(suite('multiwrite01.test'), vfs('OPFSPermutedVFS'), 'asyncify')
    ).toBeNull();
    expect(
      skipReason(suite('config02.test'), vfs('OPFSPermutedVFS'), 'asyncify')
    ).toContain('page size');
    expect(
      skipReason(suite('config01.test'), vfs('OPFSAdaptiveVFS'), 'asyncify')
    ).toContain("'unix'");
    expect(
      skipReason(
        suite('multiwrite01.test'),
        vfs('OPFSWriteAheadVFS'),
        'default',
        { unsafeAccess: false }
      )
    ).toContain('readwrite-unsafe');
  });
});
