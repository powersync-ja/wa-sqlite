// Copyright 2024 Roy T. Hashimoto. All Rights Reserved.

import * as Comlink from 'comlink';
import * as SQLite from '../src/sqlite-api.js';

const BUILDS = new Map([
  ['default', '../dist/wa-sqlite.mjs'],
  ['asyncify', '../dist/wa-sqlite-async.mjs'],
  ['jspi', '../dist/wa-sqlite-jspi.mjs'],
]);

const MODULE = Symbol('module');

// The Storage Bucket the "-storageBucket" configurations keep their files in.
// A test can name another one with the storageBucket search parameter.
export const TEST_STORAGE_BUCKET = 'wa-sqlite-test';
const STORAGE_BUCKET_OPTIONS = Symbol('storage bucket options');

const VFS_CONFIGS = new Map([
  {
    name: 'default',
    vfsModule: null
  },
  {
    name: 'AccessHandlePoolVFS',
    vfsModule: '../src/examples/AccessHandlePoolVFS.js',
  },
  {
    name: 'OPFSCoopSyncVFS',
    vfsModule: '../src/examples/OPFSCoopSyncVFS.js',
  },
  {
    name: 'FLOOR',
    vfsModule: '../src/examples/FLOOR.js',
  },
  {
    name: 'MemoryVFS',
    vfsModule: '../src/examples/MemoryVFS.js',
  },
  {
    name: 'MemoryAsyncVFS',
    vfsModule: '../src/examples/MemoryAsyncVFS.js',
  },
  {
    name: 'IDBBatchAtomicVFS',
    vfsModule: '../src/examples/IDBBatchAtomicVFS.js',
  },
  {
    name: 'IDBMirrorVFS',
    vfsModule: '../src/examples/IDBMirrorVFS.js',
  },
  {
    name: 'OPFSAdaptiveVFS',
    vfsModule: '../src/examples/OPFSAdaptiveVFS.js',
  },
  {
    name: 'OPFSAnyContextVFS',
    vfsModule: '../src/examples/OPFSAnyContextVFS.js',
  },
  {
    name: 'OPFSWriteAheadVFS',
    vfsModule: '../src/examples/OPFSWriteAheadVFS.js',
  },
  ...['AccessHandlePoolVFS', 'OPFSCoopSyncVFS', 'OPFSWriteAheadVFS'].map(className => ({
    name: `${className}-storageBucket`,
    vfsModule: `../src/examples/${className}.js`,
    vfsArgs: ['demo', MODULE, STORAGE_BUCKET_OPTIONS],
  })),
].map(config => [config.name, config]));

const INDEXEDDB_DBNAMES = ['demo'];

const searchParams = new URLSearchParams(location.search);

maybeReset().then(async () => {
  const buildName = searchParams.get('build') || BUILDS.keys().next().value;
  const configName = searchParams.get('config') || VFS_CONFIGS.keys().next().value;
  const config = VFS_CONFIGS.get(configName);

  // Instantiate SQLite.
  const { default: moduleFactory } = await import(BUILDS.get(buildName));
  const module = await moduleFactory();
  const sqlite3 = SQLite.Factory(module);

  const vfs = await (async function() {
    if (config.vfsModule) {
      // Create the VFS and register it as the default file system.
      const namespace = await import(config.vfsModule);
      const className = config.vfsClass ?? config.vfsModule.match(/([^/]+)\.js$/)[1];
      const storageBucket = searchParams.get('storageBucket') ?? TEST_STORAGE_BUCKET;
      const vfsArgs = (config.vfsArgs ?? ['demo', MODULE])
        .map(arg => arg === MODULE ? module : arg)
        .map(arg => arg === STORAGE_BUCKET_OPTIONS ? { storageBucket } : arg);
      const vfs = await namespace[className].create(...vfsArgs);
      sqlite3.vfs_register(vfs, true);
      return vfs;
    }
    return {};
  })();

  const sqlite3Proxy = new Proxy(sqlite3, {
    get(target, p, receiver) {
      // Comlink intercepts some function property names, e.g. "bind",
      // so allow aliases to avoid the problem.
      if (typeof p === 'string') p = p.replaceAll('$', '');

      const value = Reflect.get(target, p, receiver);
      if (typeof value === 'function') {
        return async (...args) => {
          const result = await value.apply(target, args);
          if (p === 'statements') {
            return Comlink.proxy(result);
          }
          return result;
        };
      }
    }
  });

  const vfsProxy = new Proxy(vfs, {
    get(target, p, receiver) {
      const value = Reflect.get(target, p, receiver);
      if (typeof value === 'function') {
        return async (...args) => {
          if (p === 'jRead') {
            // The read buffer Uint8Array will be passed by proxy so all
            // access is asynchronous. Pass a local buffer to the VFS
            // and copy the local buffer to the proxy on completion.
            const proxyBuffer = args[1];
            args[1] = new Uint8Array(await proxyBuffer.length);
            const result = await value.apply(target, args);
            await proxyBuffer.set(args[1]);
            return result;
          }
          return value.apply(target, args);
        };
      }

      // Plain properties are passed through, so a test can read the VFS
      // state a call left behind - lastError, for one. Without this the
      // proxy answers undefined for everything that is not a method.
      return value;
    }
  });

  const { port1, port2 } = new MessageChannel();
  Comlink.expose({
    module,
    sqlite3: sqlite3Proxy,
    vfs: vfsProxy,
  }, port1);
  postMessage(null, [port2]);
}).catch(e => {
  console.error(e);
  postMessage(cvtErrorToCloneable(e));
});

async function maybeReset() {
  if (searchParams.get('reset') !== 'true') {
    return;
  }  
  
  // Limit the amount of time in this function.
  const abortController = new AbortController();
  setTimeout(() => abortController.abort(), 10_000);

  // Clear OPFS, in the default bucket and in every Storage Bucket.
  const roots = [await navigator.storage?.getDirectory()];
  // @ts-ignore
  const buckets = navigator.storageBuckets;
  for (const name of await buckets?.keys() ?? []) {
    roots.push(await (await buckets.open(name)).getDirectory());
  }
  for (const root of roots.filter(Boolean)) {
    let opfsDeleted = false;
    while (!opfsDeleted) {
      abortController.signal.throwIfAborted();
      try {
        // @ts-ignore
        for await (const name of root.keys()) {
          await root.removeEntry(name, { recursive: true });
        }
        opfsDeleted = true;
      } catch (e) {
        // A NoModificationAllowedError is thrown if an entry can't be
        // deleted because it isn't closed. Just try again.
        if (e.name === 'NoModificationAllowedError') {
          await new Promise(resolve => setTimeout(resolve));
          continue;
        }
        throw e;
      }
    }
  }

  // Clear IndexedDB.
  const dbList = indexedDB.databases ?
    await indexedDB.databases() :
    INDEXEDDB_DBNAMES.map(name => ({ name }));
  await Promise.all(dbList.map(({name}) => {
    return new Promise((resolve, reject) => {
      const request = indexedDB.deleteDatabase(name);
      request.onsuccess = resolve;
      request.onerror = reject;
    });
  }));
}

function cvtErrorToCloneable(e) {
  if (e instanceof Error) {
    const props = new Set([
      ...['name', 'message', 'stack'].filter(k => e[k] !== undefined),
      ...Object.getOwnPropertyNames(e)
    ]);
    return Object.fromEntries(Array.from(props, k =>  [k, e[k]])
      .filter(([_, v]) => {
        // Skip any non-cloneable properties.
        try {
          structuredClone(v);
          return true;
        } catch (e) {
          return false;
        }
      }));
  }
  return e;
}