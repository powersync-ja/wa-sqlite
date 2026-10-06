import { TestContext } from "./TestContext.js";
import { vfs_storage_bucket } from "./vfs_storage_bucket.js";
import { vfs_xOpen } from "./vfs_xOpen.js";
import { vfs_xAccess } from "./vfs_xAccess.js";
import { vfs_xClose } from "./vfs_xClose.js";
import { vfs_xRead } from "./vfs_xRead.js";
import { vfs_xWrite } from "./vfs_xWrite.js";
import { vfs_pool_recovery } from "./vfs_pool_recovery.js";

const CONFIG = 'AccessHandlePoolVFS';
const BUILDS = ['default', 'asyncify', 'jspi'];

const supportsJSPI = await TestContext.supportsJSPI();

describe(CONFIG, function() {
  for (const build of BUILDS) {
    if (build === 'jspi' && !supportsJSPI) return;

    describe(build, function() {
      const context = new TestContext({ build, config: CONFIG });
    
      vfs_xAccess(context);
      vfs_xOpen(context);
      vfs_xClose(context);
      vfs_xRead(context);
      vfs_xWrite(context);
      vfs_pool_recovery({ build });
    });
  }
});

describe(`${CONFIG} in a Storage Bucket`, function() {
  // The default build only: where the files go does not depend on the build.
  const context = new TestContext({ config: `${CONFIG}-storageBucket` });

  vfs_xAccess(context);
  vfs_xOpen(context);
  vfs_xClose(context);
  vfs_xRead(context);
  vfs_xWrite(context);
  vfs_storage_bucket({ config: CONFIG });
});
