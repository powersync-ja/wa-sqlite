import base from './web-test-runner.config.mjs';
import { BUILDS, SUITES, VFS_CONFIGS } from './test/mptest/configs.js';

function filter(variable, choices) {
  const value = process.env[variable];
  if (!value) return undefined;
  const names = value.split(',');
  for (const name of names) {
    if (!choices.includes(name))
      throw new Error(
        `${variable}: unknown name ${name}; expected one of ${choices.join(', ')}`
      );
  }
  return names;
}

export default {
  ...base,
  files: ['./test/mptest/*.test.js'],
  testsFinishTimeout: 60 * 60 * 1000,
  testFramework: {
    config: {
      ...base.testFramework.config,
      mptest: {
        vfs: filter(
          'MPTEST_VFS',
          VFS_CONFIGS.map((entry) => entry.name)
        ),
        build: filter('MPTEST_BUILD', Object.keys(BUILDS)),
        suite: filter(
          'MPTEST_SUITE',
          SUITES.map((entry) => entry.name)
        )
      }
    }
  }
};
