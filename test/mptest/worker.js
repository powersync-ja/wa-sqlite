import { openConnection } from './sqlite.js';
import { runScript } from './script.js';

let connection;
const send = (type, data = {}) => postMessage({ type, ...data });

// Each client runs one task at a time on its own SQLite/WASM instance. The
// supervisor owns scheduling, allowing --finish to unblock --wait before exit.
const host = {
  assert: (passed, assertion) => send('assert', { passed, assertion }),
  log: (message) => send('log', { message }),
  finish: () => send('finish'),
  async exit(code) {
    if (code === 0) await connection.close();
    // Parent terminates this Worker. Never close/rollback on a simulated crash.
    send('exit', { code });
    await new Promise(() => {});
  },
  task() {
    throw new Error('--task is only valid on the supervisor');
  },
  start() {
    throw new Error('--start is only valid on the supervisor');
  },
  wait() {
    throw new Error('--wait is only valid on the supervisor');
  },
  async source(name, filename) {
    const { loadScript } = await import('./runner.js');
    return loadScript(new URL(name, filename).href);
  }
};

self.onmessage = async ({ data }) => {
  const { id, method, args = [] } = data;
  try {
    let value;
    switch (method) {
      case 'open':
        connection = await openConnection(args[0]);
        break;
      case 'run':
        await runScript(args[0], connection, host);
        break;
      case 'execute':
        connection.showSqlErrors = args[1];
        value = await connection.execute(args[0]);
        break;
      case 'truth':
        value = await connection.truth(...args);
        break;
      case 'glob':
        value = await connection.glob(...args);
        break;
      case 'close':
        await connection.close();
        break;
      case 'probe':
        value = await probe();
        break;
      default:
        throw new Error(`Unknown worker method ${method}`);
    }
    send('response', { id, value });
  } catch (error) {
    send('response', {
      id,
      error: { message: error.message, stack: error.stack }
    });
  }
};

async function probe() {
  const capabilities = {
    jspi: 'Suspending' in WebAssembly || 'Suspender' in WebAssembly,
    locks: !!navigator.locks,
    idb: !!self.indexedDB,
    opfs: false,
    syncAccess: false,
    unsafeAccess: false
  };
  if (!navigator.storage?.getDirectory) return capabilities;
  const name = `mptest-probe-${crypto.randomUUID()}`;
  let root;
  try {
    root = await navigator.storage.getDirectory();
    const file = await root.getFileHandle(name, { create: true });
    capabilities.opfs = true;
    if (file.createSyncAccessHandle) {
      const handle = await file.createSyncAccessHandle();
      handle.close();
      capabilities.syncAccess = true;
      try {
        const unsafe = await file.createSyncAccessHandle({
          mode: 'readwrite-unsafe'
        });
        // Browsers may silently ignore unknown dictionary members. Actually
        // opening a second handle proves that concurrent unsafe access works.
        try {
          const second = await file.createSyncAccessHandle({
            mode: 'readwrite-unsafe'
          });
          second.close();
          capabilities.unsafeAccess = true;
        } finally {
          unsafe.close();
        }
      } catch {
        /* unsupported */
      }
    }
  } catch {
    /* storage unavailable */
  } finally {
    if (root) await root.removeEntry(name).catch(() => {});
  }
  return capabilities;
}
