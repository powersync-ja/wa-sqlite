import { BUILDS, SUITES, VFS_CONFIGS, skipReason } from './configs.js';
import { parseScript } from './parser.js';
import { runScript, sleep } from './script.js';

const scriptCache = new Map();
export async function loadScript(url) {
  if (!scriptCache.has(url)) {
    scriptCache.set(
      url,
      (async () => {
        const response = await fetch(url);
        if (!response.ok)
          throw new Error(`Cannot load ${url}: HTTP ${response.status}`);
        return parseScript(await response.text(), url);
      })()
    );
  }
  return scriptCache.get(url);
}

function deferred() {
  let resolve, reject;
  const promise = new Promise((a, b) => {
    resolve = a;
    reject = b;
  });
  // A task can fail before the supervisor reaches --wait. Keep the rejection
  // available for --wait without generating an unhandled rejection meanwhile.
  promise.catch(() => {});
  return { promise, resolve, reject };
}

class WorkerConnection {
  #worker = new Worker(new URL('./worker.js', import.meta.url), {
    type: 'module'
  });
  #pending = new Map();
  #nextId = 0;
  live = true;
  showSqlErrors = true;

  constructor(onEvent = () => {}) {
    this.#worker.onmessage = ({ data }) => {
      if (data.type === 'response') {
        const pending = this.#pending.get(data.id);
        this.#pending.delete(data.id);
        if (data.error)
          pending?.reject(
            Object.assign(new Error(data.error.message), {
              stack: data.error.stack
            })
          );
        else pending?.resolve(data.value);
      } else if (data.type === 'exit') {
        onEvent(data);
        // An intentional --exit is successful even when its code is nonzero.
        for (const pending of this.#pending.values())
          pending.resolve({ exited: true, code: data.code });
        this.#pending.clear();
        this.terminate();
      } else {
        onEvent(data);
      }
    };
    this.#worker.onerror = (event) => {
      event.preventDefault();
      this.terminate(new Error(event.message || 'mptest Worker failed'));
    };
    this.#worker.onmessageerror = () =>
      this.terminate(new Error('Cannot deserialize mptest Worker message'));
  }

  call(method, ...args) {
    if (!this.live)
      return Promise.reject(new Error('mptest Worker has terminated'));
    const id = ++this.#nextId;
    const pending = deferred();
    this.#pending.set(id, pending);
    this.#worker.postMessage({ id, method, args });
    return pending.promise;
  }

  execute(sql) {
    return this.call('execute', sql, this.showSqlErrors);
  }
  truth(expression) {
    return this.call('truth', expression);
  }
  glob(pattern, text) {
    return this.call('glob', pattern, text);
  }
  terminate(error = new Error('mptest run stopped')) {
    this.live = false;
    this.#worker.terminate();
    for (const pending of this.#pending.values()) pending.reject(error);
    this.#pending.clear();
  }
}

export async function getCapabilities() {
  const worker = new WorkerConnection();
  try {
    return await withTimeout(
      worker.call('probe'),
      10000,
      'probing browser storage'
    );
  } finally {
    worker.terminate();
  }
}

async function withTimeout(promise, ms, description) {
  let timer;
  try {
    return await Promise.race([
      promise,
      new Promise((_, reject) => {
        timer = setTimeout(
          () => reject(new Error(`Timeout after ${ms}ms: ${description}`)),
          ms
        );
      })
    ]);
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Run one unchanged upstream entry point. Scheduling uses messages rather than
 * upstream's task/client/counters tables; all test SQL uses the same database.
 * Callers can cancel using signal. Only this run's storage is removed.
 */
export async function runSuite({
  suite: suiteName,
  vfs: vfsName,
  build = 'asyncify',
  capabilities,
  waitTimeout = 60000,
  busyTimeout = 10000,
  timeout = 10 * 60 * 1000,
  sync = true,
  signal,
  onEvent = () => {}
}) {
  const suite = SUITES.find((entry) => entry.name === suiteName);
  const vfs = VFS_CONFIGS.find((entry) => entry.name === vfsName);
  if (!suite || !vfs || !BUILDS[build])
    throw new Error('Unknown mptest suite, VFS or build');
  const reason = skipReason(
    suite,
    vfs,
    build,
    capabilities ?? (await getCapabilities())
  );
  if (reason) return { status: 'skipped', reason, assertions: 0 };
  signal?.throwIfAborted();

  const namespace = `mptest-${crypto.randomUUID()}`;
  const options = {
    build,
    vfs,
    namespace,
    filename: `/${namespace}/test.db`,
    busyTimeout,
    sync
  };
  const workers = new Set();
  const clients = new Map();
  const tasks = [];
  const failures = [];
  let stopped = false;
  let assertions = 0;
  const started = performance.now();
  const cancelled = deferred();
  const abort = () =>
    cancelled.reject(signal.reason ?? new Error('mptest run cancelled'));
  signal?.addEventListener('abort', abort, { once: true });

  const event = (client, data) => {
    if (data.type === 'assert') assertions++;
    onEvent({ client, ...data });
  };
  const supervisor = new WorkerConnection((data) => event(0, data));
  workers.add(supervisor);

  async function start(client) {
    if (stopped) throw new Error('mptest run stopped');
    if (!Number.isInteger(client) || client < 1)
      throw new Error(`Invalid client ${client}`);
    if (!clients.has(client)) {
      const state = { worker: null, active: null, queue: Promise.resolve() };
      const worker = new WorkerConnection((data) => {
        event(client, data);
        if (data.type === 'finish' || data.type === 'exit') {
          state.active?.finished.resolve();
          // --finish removes the upstream client registration. New work for
          // this id must start a fresh instance, even before the old one exits.
          if (clients.get(client) === state) clients.delete(client);
        }
      });
      state.worker = worker;
      workers.add(worker);
      clients.set(client, state);
      state.queue = worker.call('open', options).catch((error) => {
        failures.push(error);
        throw error;
      });
      state.queue.catch(() => {});
    }
    return clients.get(client);
  }

  const host = {
    assert: (passed, assertion) =>
      event(0, { type: 'assert', passed, assertion }),
    log: (message) => event(0, { type: 'log', message }),
    source: (name, filename) => loadScript(new URL(name, filename).href),
    start,
    async task(client, nodes, name) {
      const state = await start(client);
      const record = { client, name, finished: deferred(), done: null };
      tasks.push(record);
      record.done = state.queue
        .then(async () => {
          state.active = record;
          event(client, { type: 'task', name });
          await state.worker.call('run', nodes);
          record.finished.resolve();
        })
        .catch((error) => {
          const failure = new Error(
            `Client ${client}, task ${name}: ${error.message}`,
            { cause: error }
          );
          failures.push(failure);
          record.finished.reject(failure);
        });
      state.queue = record.done;
    },
    async wait(client, ms = waitTimeout) {
      const selected = tasks.filter(
        (task) => client === 'all' || task.client === Number(client)
      );
      await withTimeout(
        Promise.all(selected.map((task) => task.finished.promise)),
        ms,
        `waiting for client ${client}`
      );
      if (failures.length) throw failures[0];
    },
    finish() {
      throw new Error('--finish is only valid in a client task');
    },
    exit() {
      throw new Error('--exit on the browser supervisor is unsupported');
    }
  };

  async function run() {
    if (vfs.opfs) {
      const root = await navigator.storage.getDirectory();
      await root.getDirectoryHandle(namespace, { create: true });
    }
    await supervisor.call('open', options);
    const nodes = await loadScript(
      new URL(`./upstream/${suite.name}`, import.meta.url).href
    );
    if (stopped) throw new Error('mptest run stopped');
    await runScript(nodes, supervisor, host);
    await host.wait('all');
    // --finish can mark a task complete before its --exit. Wait for the actual
    // termination too, so later errors and storage cleanup cannot be lost.
    await withTimeout(
      Promise.all(tasks.map((task) => task.done)),
      waitTimeout,
      'waiting for client exits'
    );
    if (failures.length) throw failures[0];
    for (const worker of workers) {
      if (worker.live) await worker.call('close');
    }
    return {
      status: 'passed',
      assertions,
      duration: performance.now() - started
    };
  }

  try {
    return await withTimeout(
      Promise.race([run(), cancelled.promise]),
      timeout,
      `running ${suiteName} with ${vfsName}/${build}`
    );
  } finally {
    stopped = true;
    signal?.removeEventListener('abort', abort);
    for (const worker of workers) worker.terminate();
    await cleanup(namespace, vfs);
  }
}

async function cleanup(namespace, vfs) {
  if (vfs.opfs) {
    const root = await navigator.storage.getDirectory();
    for (let attempt = 0; ; attempt++) {
      try {
        await root.removeEntry(namespace, { recursive: true });
        break;
      } catch (error) {
        if (error.name === 'NotFoundError') break;
        if (error.name !== 'NoModificationAllowedError' || attempt >= 100)
          throw error;
        await sleep(50);
      }
    }
  }
  if (vfs.idb) {
    // OPFSPermutedVFS names its metadata DB after the database pathname.
    const names = [namespace, `/${namespace}/test.db`];
    for (const name of names) {
      await withTimeout(
        new Promise((resolve, reject) => {
          const request = indexedDB.deleteDatabase(name);
          request.onsuccess = resolve;
          request.onerror = () => reject(request.error);
        }),
        10000,
        `removing IndexedDB ${name}`
      );
    }
  }
}
