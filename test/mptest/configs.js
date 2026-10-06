export const BUILDS = {
  default: '../../dist/wa-sqlite.mjs',
  asyncify: '../../dist/wa-sqlite-async.mjs',
  jspi: '../../dist/wa-sqlite-jspi.mjs'
};

export const VFS_CONFIGS = [
  { name: 'default', concurrent: false },
  { name: 'MemoryVFS', concurrent: false },
  { name: 'MemoryAsyncVFS', async: true, concurrent: false },
  {
    name: 'AccessHandlePoolVFS',
    opfs: true,
    syncAccess: true,
    concurrent: false
  },
  {
    name: 'IDBBatchAtomicVFS',
    async: true,
    idb: true,
    concurrent: true,
    changePageSize: false
  },
  {
    name: 'IDBMirrorVFS',
    async: true,
    idb: true,
    concurrent: true,
    changePageSize: false
  },
  {
    name: 'OPFSAdaptiveVFS',
    async: true,
    opfs: true,
    syncAccess: true,
    concurrent: true
  },
  { name: 'OPFSAnyContextVFS', async: true, opfs: true, concurrent: true },
  { name: 'OPFSCoopSyncVFS', opfs: true, syncAccess: true, concurrent: true },
  {
    name: 'OPFSWriteAheadVFS',
    opfs: true,
    syncAccess: true,
    unsafeAccess: true,
    concurrent: true
  },
  {
    name: 'OPFSPermutedVFS',
    async: true,
    opfs: true,
    idb: true,
    syncAccess: true,
    unsafeAccess: true,
    concurrent: true,
    changePageSize: false
  }
];

// crash02.subtest is an include: it needs the five tables created by its caller.
export const SUITES = [
  { name: 'multiwrite01.test' },
  { name: 'crash01.test', crash: true },
  { name: 'config01.test', unix: true, changePageSize: true },
  { name: 'config02.test', crash: true, changePageSize: true }
];

// The main run uses one build per VFS; explicit filters opt into other builds.
export function testBuilds(vfs, builds) {
  return builds ?? [vfs.async ? 'asyncify' : 'default'];
}

export function skipReason(suite, vfs, build, capabilities = {}) {
  if (!vfs.concurrent)
    return 'Requires a database shared by independent Workers; this VFS does not support concurrent access.';
  if (suite.unix)
    return "Upstream guards this entire suite with vfsname() GLOB 'unix'; browser VFSes do not satisfy it.";
  if (suite.changePageSize && vfs.changePageSize === false)
    return 'This suite changes an existing database page size; this VFS does not support it.';
  if (vfs.async && build === 'default')
    return 'This VFS requires an Asyncify or JSPI build.';
  if (build === 'jspi' && capabilities.jspi === false)
    return 'This browser does not support JSPI.';
  if (capabilities.locks === false) return 'This VFS requires Web Locks.';
  if (vfs.idb && capabilities.idb === false)
    return 'This browser does not provide IndexedDB.';
  if (vfs.opfs && capabilities.opfs === false)
    return 'This browser does not provide OPFS.';
  if (vfs.syncAccess && capabilities.syncAccess === false)
    return 'This browser does not provide synchronous OPFS access handles.';
  if (vfs.unsafeAccess && capabilities.unsafeAccess === false)
    return 'This VFS requires OPFS readwrite-unsafe access handles.';
  return null;
}
