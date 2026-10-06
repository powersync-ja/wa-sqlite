import { getConfig } from '@web/test-runner-core/browser/session.js';
import { SUITES, VFS_CONFIGS, skipReason, testBuilds } from './configs.js';
import { getCapabilities, runSuite } from './runner.js';

const { testFrameworkConfig } = await getConfig();
const filters = testFrameworkConfig.mptest;
const capabilities = await getCapabilities();
const select = (entries, filter, name = (entry) => entry.name) =>
  entries.filter((entry) => !filter || filter.includes(name(entry)));

describe('SQLite upstream mptest', () => {
  for (const vfs of select(VFS_CONFIGS, filters.vfs)) {
    for (const build of testBuilds(vfs, filters.build)) {
      for (const suite of select(SUITES, filters.suite)) {
        it(
          `${vfs.name} / ${build} / ${suite.name}`,
          async () => {
            const reason = skipReason(suite, vfs, build, capabilities);
            if (reason) {
              pending(reason);
              return;
            }
            const result = await runSuite({
              suite: suite.name,
              vfs: vfs.name,
              build,
              capabilities
            });
            expect(result.status).toBe('passed');
            expect(result.assertions).toBeGreaterThan(0);
          },
          11 * 60 * 1000
        );
      }
    }
  }
});
