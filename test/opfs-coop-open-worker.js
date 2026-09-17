import SQLiteESMFactory from '../dist/wa-sqlite.mjs';
import * as SQLite from '../src/sqlite-api.js';
import { OPFSCoopSyncVFS } from '../src/examples/OPFSCoopSyncVFS.js';

self.onmessage = async ({ data: { scenario, filename } }) => {
  try {
    self.postMessage(await run(scenario, filename));
  } catch (error) {
    self.postMessage({ unexpectedError: String(error) });
  }
};

async function run(scenario, filename) {
  const root = await navigator.storage.getDirectory();
  const nativeOpen = FileSystemFileHandle.prototype.createSyncAccessHandle;
  let holder;
  if (scenario === 'wrong-type') {
    await root.getDirectoryHandle(filename + '-wal', { create: true });
  } else if (scenario !== 'non-retryable') {
    holder = await (await root.getFileHandle(filename + '-wal', { create: true }))
      .createSyncAccessHandle();
  }

  let attempts = 0;
  let release;
  let lateOpen;
  FileSystemFileHandle.prototype.createSyncAccessHandle = async function(...args) {
    if (this.name === filename + '-wal') {
      attempts++;
      if (scenario === 'non-retryable') {
        throw new DOMException('Access denied', 'NotAllowedError');
      }
    }
    try {
      const handle = await nativeOpen.apply(this, args);
      if (this.name === filename + '-journal') {
        // Acquire a real native handle, but deliver the result after the WAL
        // open has rejected. Promise.all must not permit cleanup to race this.
        lateOpen = new Promise(resolve => setTimeout(resolve, 75));
        await lateOpen;
      }
      return handle;
    } catch (error) {
      if (scenario === 'transient' && !release) {
        release = new Promise(resolve => setTimeout(resolve, 150)).then(() => {
          holder.close();
          holder = null;
        });
      }
      throw error;
    }
  };

  try {
    const module = await SQLiteESMFactory();
    const sqlite3 = SQLite.Factory(module);
    const vfs = await OPFSCoopSyncVFS.create('opfs', module);
    sqlite3.vfs_register(vfs, true);
    const started = performance.now();
    let opened = false;
    let error;
    let preserved;
    try {
      const db = await sqlite3.open_v2(filename);
      opened = true;
      await sqlite3.exec(db, "CREATE TABLE marker(value); INSERT INTO marker VALUES ('saved')");
      await sqlite3.close(db);
      const reopened = await sqlite3.open_v2(filename);
      await sqlite3.exec(reopened, 'SELECT value FROM marker', row => {
        preserved = row[0];
      });
      await sqlite3.close(reopened);
    } catch (cause) {
      error = String(cause);
    }
    const elapsed = performance.now() - started;
    // Do not terminate the failing worker before checking: termination would
    // mask a handle that completed after the failure cleanup.
    await lateOpen;
    const available = [];
    for (const suffix of ['', '-journal']) {
      try {
        const file = await root.getFileHandle(filename + suffix, { create: true });
        const handle = await nativeOpen.call(file);
        handle.close();
        available.push(suffix);
      } catch (cause) {
        available.push(String(cause));
      }
    }
    await release;
    return {
      opened, error, elapsed, attempts, preserved, available,
      lastError: vfs.lastError && {
        name: vfs.lastError.name,
        message: vfs.lastError.message,
      },
    };
  } finally {
    FileSystemFileHandle.prototype.createSyncAccessHandle = nativeOpen;
    holder?.close();
  }
}
