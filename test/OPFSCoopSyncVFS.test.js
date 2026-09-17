import { TestContext } from "./TestContext.js";
import { vfs_xOpen } from "./vfs_xOpen.js";
import { vfs_xAccess } from "./vfs_xAccess.js";
import { vfs_xClose } from "./vfs_xClose.js";
import { vfs_xRead } from "./vfs_xRead.js";
import { vfs_xWrite } from "./vfs_xWrite.js";

const CONFIG = 'OPFSCoopSyncVFS';
const BUILDS = ['default', 'asyncify', 'jspi'];

const supportsJSPI = await TestContext.supportsJSPI();

describe(CONFIG, function() {
  describe('failed access handle acquisition', function() {
    let worker;
    let filename;

    afterEach(function() {
      worker?.terminate();
    });

    async function run(scenario) {
      filename = `open-failure-${crypto.randomUUID()}.sqlite`;
      worker = new Worker(new URL('./opfs-coop-open-worker.js', import.meta.url), { type: 'module' });
      const result = await new Promise((resolve, reject) => {
        worker.onmessage = event => resolve(event.data);
        worker.onerror = event => reject(new Error(event.message));
        worker.postMessage({ scenario, filename });
      });
      expect(result.unexpectedError).toBeUndefined();
      return result;
    }

    it('retries transient native contention and preserves the database', async function() {
      const result = await run('transient');
      expect(result.opened).toBeTrue();
      expect(result.attempts).toBeGreaterThan(1);
      expect(result.preserved).toBe('saved');
      expect(result.available).toEqual(['', '-journal']);
    });

    it('bounds retries and drains late successful opens before reporting failure', async function() {
      const result = await run('persistent');
      expect(result.opened).toBeFalse();
      expect(result.attempts).toBeGreaterThan(1);
      expect(result.elapsed).toBeGreaterThanOrEqual(3000);
      expect(result.elapsed).toBeLessThan(10000);
      expect(result.available).toEqual(['', '-journal']);
      expect(result.lastError?.name).toBe('NoModificationAllowedError');
      expect(result.lastError?.message).toContain(filename + '-wal');
    });

    it('does not retry other access errors and still drains partial successes', async function() {
      const result = await run('non-retryable');
      expect(result.opened).toBeFalse();
      expect(result.attempts).toBe(1);
      expect(result.available).toEqual(['', '-journal']);
      expect(result.lastError?.name).toBe('NotAllowedError');
    });

    it('retains errors raised while discovering related files', async function() {
      const result = await run('wrong-type');
      expect(result.opened).toBeFalse();
      expect(result.attempts).toBe(0);
      expect(result.lastError?.name).toBe('TypeMismatchError');
    });
  });

  for (const build of BUILDS) {
    if (build === 'jspi' && !supportsJSPI) return;

    describe(build, function() {
      const context = new TestContext({ build, config: CONFIG });
    
      vfs_xAccess(context);
      vfs_xOpen(context);
      vfs_xClose(context);
      vfs_xRead(context);
      vfs_xWrite(context);
    });
  }
});
