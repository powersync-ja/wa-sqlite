import { FacadeVFS } from "../FacadeVFS.js";
import * as VFS from '../VFS.js';
import { Lock } from "./Lock.js";
import { LazyLock } from "./LazyLock.js";
import { WriteAhead } from "./WriteAhead.js";

/**
 * @typedef FileEntry
 * @property {string} zName
 * @property {number} flags
 * @property {FileSystemSyncAccessHandle} [accessHandle]

 * Main database file properties:
 * @property {*} [retryResult]
 * @property {FileSystemSyncAccessHandle} [journalHandle]
 * 
 * @property {'reserved'|'exclusive'} [writeHint]
 * @property {'normal'|'exclusive'|null} [lockingMode]
 * @property {number} [lockState]
 * @property {LazyLock} [readLock]
 * @property {Lock} [writeLock]
 * @property {number} [timeout]
 * 
 * @property {WriteAhead} [writeAhead]
 */

/**
 * Cache the OPFS root directory handle.
 * @type {FileSystemDirectoryHandle}
 */
let dirHandle = null;

export class OPFSWriteAheadVFS extends FacadeVFS {
  lastError = null;
  log = console.log;
  
  /** @type {Map<number, FileEntry>} */ mapIdToFile = new Map();
  /** @type {Map<string, FileEntry>} */ mapPathToFile = new Map();

  static async create(name, module, options) {
    const vfs = new OPFSWriteAheadVFS(name, module);
    await vfs.isReady();
    return vfs;
  }

  constructor(name, module) {
    super(name, module);
  }

 /**
   * @param {string?} zName 
   * @param {number} fileId 
   * @param {number} flags 
   * @param {DataView} pOutFlags 
   * @returns {number}
   */
  jOpen(zName, fileId, flags, pOutFlags) {
    try {
      const file = this.mapPathToFile.get(zName) ?? {
        zName,
        flags,
        retryResult: null,
      };
      this.mapPathToFile.set(zName, file);

      if (flags & VFS.SQLITE_OPEN_MAIN_DB) {
        // Open database and journal files with a retry operation.
        if (file.retryResult === null) {
          // This is the initial open attempt. Start the asynchronous task
          // and return SQLITE_BUSY to force a retry.
          this._module.retryOps.push(this.#retryOpen(zName, flags, fileId, pOutFlags));
          return VFS.SQLITE_BUSY;
        } else if (file.retryResult instanceof Error) {
          throw file.retryResult;
        }

        // Initialize database file state.
        file.accessHandle = file.retryResult.accessHandle;
        file.journalHandle = file.retryResult.journalHandle;
        file.writeAhead = file.retryResult.writeAhead;
        file.retryResult = null;

        file.lockState = VFS.SQLITE_LOCK_NONE;
        file.lockingMode = null;
        file.readLock = new LazyLock(`${zName}#read`);
        file.writeLock = new Lock(`${zName}#write`);
        file.timeout = -1;
        file.writeHint = null;
      } else if (flags & VFS.SQLITE_OPEN_MAIN_JOURNAL) {
        // A journal file is managed with its main database so look that up.
        const dbFilename = zName.slice(0, -"-journal".length);
        const dbFile = this.mapPathToFile.get(dbFilename);
        if (!dbFile) {
          throw new Error(`database file not found for journal ${zName}`);
        }

        // Initialize journal file state.
        file.accessHandle = dbFile.journalHandle;
      } else {
        throw new Error(`unsupported file type 0x${flags.toString(16)} for ${zName}`);
      }

      this.mapIdToFile.set(fileId, file);
      pOutFlags.setInt32(0, flags, true);
      return VFS.SQLITE_OK;
    } catch (e) {
      this.lastError = e;
      return VFS.SQLITE_CANTOPEN;
    }
  }

  /**
   * @param {string} zName 
   * @param {number} syncDir 
   * @returns {number}
   */
  jDelete(zName, syncDir) {
    try {
      const file = this.mapPathToFile.get(zName);
      if (!file) throw new Error(`file not found: ${zName}`);
      if (file.flags & VFS.SQLITE_OPEN_MAIN_JOURNAL) {
        // The actual OPFS journal file is managed with the main database.
        // We don't actually delete it, just truncate it to zero length.
        file.accessHandle.truncate(0);
        file.accessHandle.flush();
      } else {
        throw new Error(`Unexpected delete: ${zName}`);
      }
      return VFS.SQLITE_OK;
    } catch (e) {
      return VFS.SQLITE_IOERR_DELETE;
    }
  }

  /**
   * @param {string} zName 
   * @param {number} flags 
   * @param {DataView} pResOut 
   * @returns {number}
   */
  jAccess(zName, flags, pResOut) {
    try {
      const file = this.mapPathToFile.get(zName);
      if (file) {
        if ((file.flags & VFS.SQLITE_OPEN_MAIN_JOURNAL) &&
            file.accessHandle.getSize() === 0) {
          // Treat an empty journal file as non-existent.
          pResOut.setInt32(0, 0, true);
        } else {
          pResOut.setInt32(0, 1, true);
        }
      } else {
        pResOut.setInt32(0, 0, true);
      }
      return VFS.SQLITE_OK;
    } catch (e) {
      this.lastError = e;
      return VFS.SQLITE_IOERR_ACCESS;
    }
  }

  /**
   * @param {number} fileId 
   * @returns {number}
   */
  jClose(fileId) {
    try {
      const file = this.mapIdToFile.get(fileId);
      if (file.flags & VFS.SQLITE_OPEN_MAIN_DB) {
        file.accessHandle.close();
        this.mapPathToFile.delete(file?.zName);

        file.journalHandle.close();
        const journalPath = this.#getJournalPathFromDbPath(file.zName);
        this.mapPathToFile.delete(journalPath);

        file.readLock.close();
        file.writeLock.close();
      } else if (file.flags & VFS.SQLITE_OPEN_MAIN_JOURNAL) {
        // The actual OPFS journal file is managed with the main database
        // file, so don't close the access handle here.
      }

      // Disassociate fileId from file entry.
      this.mapIdToFile.delete(fileId);
      return VFS.SQLITE_OK;
    } catch (e) {
      return VFS.SQLITE_IOERR_CLOSE;
    }
  }

  /**
   * @param {number} fileId 
   * @param {Uint8Array} pData 
   * @param {number} iOffset
   * @returns {number}
   */
  jRead(fileId, pData, iOffset) {
    try {
      const file = this.mapIdToFile.get(fileId);

      let bytesRead = null;
      if (file.flags & VFS.SQLITE_OPEN_MAIN_DB) {
        // Try reading from the write-ahead overlays first. A read on the
        // database file is always a complete page, except when reading
        // from the 100-byte header.
        const pageOffset = iOffset < 100 ? iOffset : 0;
        const page = file.writeAhead.read(iOffset - pageOffset);
        if (page) {
          const readData = page.subarray(pageOffset, pageOffset + pData.byteLength);
          pData.set(readData);
          bytesRead = readData.byteLength;
        }
      }

      if (bytesRead === null) {
        // Read directly from the OPFS file.

        // On Chrome (at least), passing pData to accessHandle.read() is
        // an error because pData is a Proxy of a Uint8Array. Calling
        // subarray() produces a real Uint8Array and that works.
        bytesRead = file.accessHandle.read(pData.subarray(), { at: iOffset });
      }

      if (bytesRead < pData.byteLength) {
        pData.fill(0, bytesRead);
        return VFS.SQLITE_IOERR_SHORT_READ;
      }
      return VFS.SQLITE_OK;
    } catch (e) {
      return VFS.SQLITE_IOERR_READ;
    }
  }

  /**
   * @param {number} fileId 
   * @param {Uint8Array} pData 
   * @param {number} iOffset
   * @returns {number}
   */
  jWrite(fileId, pData, iOffset) {
    try {
      const file = this.mapIdToFile.get(fileId);
      if (file.flags & VFS.SQLITE_OPEN_MAIN_DB) {
        if (file.writeHint === 'reserved') {
          // Write to the write-ahead overlay.
          file.writeAhead.write(iOffset, pData);
          return VFS.SQLITE_OK;
        }
      }

      // On Chrome (at least), passing pData to accessHandle.write() is
      // an error because pData is a Proxy of a Uint8Array. Calling
      // subarray() produces a real Uint8Array and that works.
      file.accessHandle.write(pData.subarray(), { at: iOffset });
      return VFS.SQLITE_OK;
    } catch (e) {
      this.lastError = e;
      return VFS.SQLITE_IOERR_WRITE;
    }
  }

  /**
   * @param {number} fileId 
   * @param {number} iSize 
   * @returns {number}
   */
  jTruncate(fileId, iSize) {
    try {
      const file = this.mapIdToFile.get(fileId);
      if (file.flags & VFS.SQLITE_OPEN_MAIN_DB) {
        if (file.writeHint !== 'exclusive') {
          file.writeAhead.truncate(iSize);
          return VFS.SQLITE_OK;
        }
      }
      file.accessHandle.truncate(iSize);
      return VFS.SQLITE_OK;
    } catch (e) {
      this.lastError = e;
      return VFS.SQLITE_IOERR_TRUNCATE;
    }
  }

  /**
   * @param {number} fileId 
   * @param {number} flags 
   * @returns {number}
   */
  jSync(fileId, flags) {
    try {
      const file = this.mapIdToFile.get(fileId);
      if (file.flags & VFS.SQLITE_OPEN_MAIN_DB) {
        if (file.writeHint === 'reserved') {
          // Write-ahead sync is handled on SQLITE_FCNTL_SYNC.
          return VFS.SQLITE_OK;
        }
      }
      file.accessHandle.flush();
      return VFS.SQLITE_OK;
    } catch (e) {
      this.lastError = e;
      return VFS.SQLITE_IOERR_FSYNC;
    }
  }

  /**
   * @param {number} fileId 
   * @param {DataView} pSize64 
   * @returns {number}
   */
  jFileSize(fileId, pSize64) {
    try {
      const file = this.mapIdToFile.get(fileId);

      let size;
      if (file.flags & VFS.SQLITE_OPEN_MAIN_DB) {
        size = file.writeAhead.getFileSize() || file.accessHandle.getSize();
      } else {
        size = file.accessHandle.getSize();
      }
      pSize64.setBigInt64(0, BigInt(size), true);
      return VFS.SQLITE_OK;
    } catch (e) {
      this.lastError = e;
      return VFS.SQLITE_IOERR_FSTAT;
    }
  }

  /**
   * @param {number} pFile 
   * @param {number} lockType 
   * @returns {number|Promise<number>}
   */
  jLock(pFile, lockType) {
    try {
      const file = this.mapIdToFile.get(pFile);
      if (file.lockState === VFS.SQLITE_LOCK_NONE && lockType === VFS.SQLITE_LOCK_SHARED) {
        // We do all our locking work in this transition.
        if (file.retryResult === null) {
          // Manage some special cases.
          if (file.accessHandle.getSize() === 0) {
            // The database has not been created. We will need a write lock.
            file.writeHint = 'exclusive';
          } else if (file.lockingMode === 'exclusive') {
            // PRAGMA locking_mode=EXCLUSIVE was set.
            file.writeHint = 'exclusive';
          } else if (file.journalHandle.getSize() > 0) {
            // There is a hot journal. We will need a write lock.
            file.writeHint = 'exclusive';
          }

          if (file.writeHint || file.readLock.mode !== 'shared') {
            // Asynchronous lock acquisition is needed. Set retryResult to
            // non-null so when SQLite calls jUnlock() it knows not to reset
            // any locks we have in progress.
            file.retryResult = {};
            this._module.retryOps.push(this.#retryLock(pFile, lockType));
            return VFS.SQLITE_BUSY;
          }

          // This is a read transaction and we can get the shared
          // lock synchronously.
          file.readLock.acquireIfHeld('shared');
        } else if (file.retryResult instanceof Error) {
          throw file.retryResult;
        }

        file.retryResult = null;
        if (file.writeHint === null) {
          file.writeAhead.isolateForRead();
        }
      } else if (lockType >= VFS.SQLITE_LOCK_RESERVED && !file.writeLock.mode) {
        // This is a write transaction but we don't already have the write
        // lock. This happens when the write hint was not used, which this
        // VFS treats as an error.
        // TODO: Arrange for the write hint to be set on unlock?
        throw new Error('Multi-statement write transaction cannot use BEGIN DEFERRED');
      }
      file.lockState = lockType;
      return VFS.SQLITE_OK;
    } catch (e) {
      this.lastError = e;
      console.error(e.message);
      return VFS.SQLITE_IOERR_LOCK;
    }
  }

  /**
   * @param {number} pFile 
   * @param {number} lockType 
   * @returns {number}
   */
  jUnlock(pFile, lockType) {
    try {
      const file = this.mapIdToFile.get(pFile);

      // If retryResult is non-null, an asynchronous lock operation is in
      // progress. In that case, don't change any locks.
      if (!file.retryResult && lockType === VFS.SQLITE_LOCK_NONE) {
        // In this VFS, this is the only unlock transition that matters.
        file.writeLock.release();
        if (file.readLock.mode === 'exclusive') {
          file.readLock.release();
        } else {
          file.readLock.releaseLazy();
        }
        file.writeHint = null;

        file.writeAhead.rejoin();
      }
      file.lockState = lockType;
    } catch (e) {
      this.lastError = e;
      return VFS.SQLITE_IOERR_UNLOCK;
    }
  }

  /**
   * @param {number} pFile 
   * @param {DataView} pResOut 
   * @returns {number}
   */
  jCheckReservedLock(pFile, pResOut) {
    pResOut.setInt32(0, 0, true);
    return VFS.SQLITE_OK;
  }

  /**
   * @param {number} pFile
   * @param {number} op
   * @param {DataView} pArg
   * @returns {number}
   */
  jFileControl(pFile, op, pArg) {
    try {
      const file = this.mapIdToFile.get(pFile);
      switch (op) {
        case VFS.SQLITE_FCNTL_PRAGMA:
          const key = this._module.UTF8ToString(pArg.getUint32(4, true));
          const valueAddress = pArg.getUint32(8, true);
          const value = valueAddress ? this._module.UTF8ToString(valueAddress) : null;
          this.log?.(`PRAGMA ${key} ${value}`);
          switch (key.toLowerCase()) {
            case 'experimental_pragma_20251114':
              // After entering the SHARED locking state on the next
              // transaction, SQLite intends to immediately (barring a hot
              // journal) transition to RESERVED if value is '1', or
              // EXCLUSIVE if value is '2'.
              switch (value) {
                case '1':
                  if (file.writeHint !== 'exclusive') {
                    file.writeHint = 'reserved';
                  }
                  break;
                case '2':
                  file.writeHint = 'exclusive';
                  break;
                default:
                  throw new Error(`unexpected write hint value: ${value}`);
              }
              break;
            case 'busy_timeout':
              // Override SQLite's handling of busy timeouts with our
              // blocking lock timeouts.
              if (value !== null) {
                file.timeout = parseInt(value);
              } else {
                // Return current timeout.
                const s = file.timeout.toString();
                const ptr = this._module._sqlite3_malloc64(s.length + 1);
                this._module.stringToUTF8(s, ptr, s.length + 1);
                pArg.setUint32(0, ptr, true);
              }
              return VFS.SQLITE_OK;
            case 'locking_mode':
              switch (value?.toLowerCase()) {
                case 'normal':
                case 'exclusive':
                  file.lockingMode = value.toLowerCase();
                  break;
              }
              break;
            case 'vfs_logging':
              // This is a trace feature for debugging only.
              if (value !== null) {
                this.log = parseInt(value) !== 0 ? console.log : null;
              }
              return VFS.SQLITE_OK;
          }
          break;

        case VFS.SQLITE_FCNTL_BEGIN_ATOMIC_WRITE:
        case VFS.SQLITE_FCNTL_COMMIT_ATOMIC_WRITE:
          return VFS.SQLITE_OK;
        case VFS.SQLITE_FCNTL_ROLLBACK_ATOMIC_WRITE:
          file.writeAhead.rollback();
          return VFS.SQLITE_OK;

        case VFS.SQLITE_FCNTL_SYNC:
          if (file.writeHint === 'reserved') {
            file.writeAhead.commit();
          }
          break;
      }
    } catch (e) {
      this.lastError = e;
      return VFS.SQLITE_IOERR;
    }
    return VFS.SQLITE_NOTFOUND;
  }

  /**
   * @param {number} pFile
   * @returns {number}
   */
  jDeviceCharacteristics(pFile) {
    // Allow batch atomic writes with write-ahead. Disallow when writing
    // directly to the file.
    let value = VFS.SQLITE_IOCAP_UNDELETABLE_WHEN_OPEN;
    const file = this.mapIdToFile.get(pFile);
    if (file.flags & VFS.SQLITE_OPEN_MAIN_DB) {
      if (file.writeHint !== 'exclusive') {
        value |= VFS.SQLITE_IOCAP_BATCH_ATOMIC;
      }
    }
    return value
  }

  /**
   * @param {Uint8Array} zBuf 
   * @returns {number}
   */
  jGetLastError(zBuf) {
    if (this.lastError) {
      console.error(this.lastError);
      const outputArray = zBuf.subarray(0, zBuf.byteLength - 1);
      const { written } = new TextEncoder().encodeInto(this.lastError.message, outputArray);
      zBuf[written] = 0;
    }
    return VFS.SQLITE_OK
  }

  /**
   * @param {string} dbPath 
   * @returns {string}
   */
  #getJournalPathFromDbPath(dbPath) {
    return `${dbPath}-journal`;
  }

  /**
   * Handle asynchronous jLock() tasks.
   * @param {number} pFile 
   * @param {number} lockType 
   */
  async #retryLock(pFile, lockType) {
    const file = this.mapIdToFile.get(pFile);
    try {
      switch (file.writeHint) {
        case 'reserved':
          // This transaction will be write-ahead. We only need
          // writeLock, not readLock.
          await file.writeLock.acquire('exclusive', file.timeout);
          await file.writeAhead.isolateForWrite();
          break;
        case 'exclusive':
          // This transaction will write directly to the database.
          await file.readLock.acquire('exclusive', file.timeout);
          await file.writeLock.acquire('exclusive');

          // Transfer everything in write-ahead to the OPFS file.
          await file.writeAhead.flush();
          break;
        default:
          await file.readLock.acquire('shared', file.timeout);
          break;
      }
      file.retryResult = {};
    } catch (e) {
      file.retryResult = e;
      return;
    }
  }

  /**
   * Handle asynchronous jOpen() tasks.
   * @param {string} zName 
   * @param {number} flags 
   * @param {number} fileId 
   * @param {DataView} pOutFlags 
   * @returns {Promise<void>}
   */
  async #retryOpen(zName, flags, fileId, pOutFlags) {
    const file = this.mapPathToFile.get(zName);
    try {
      // For simplicity, everything goes into the OPFS root directory.
      // TODO: Support OPFS subdirectories.
      dirHandle = dirHandle ?? await navigator.storage.getDirectory();

      // Open the main database OPFS file.
      let created = false;
      let accessHandle;
      try {
        const fileHandle = await dirHandle.getFileHandle(zName);
        // @ts-ignore
        accessHandle = await fileHandle.createSyncAccessHandle({
          mode: 'readwrite-unsafe'
        });
      } catch (e) {
        if (e.name === 'NotFoundError' && (flags & VFS.SQLITE_OPEN_CREATE)) {
          const fileHandle = await dirHandle.getFileHandle(zName, { create: true });
          // @ts-ignore
          accessHandle = await fileHandle.createSyncAccessHandle({
            mode: 'readwrite-unsafe'
          });
          created = true;
        } else {
          throw e;
        }
      }

      // Pre-open the journal OPFS file here.
      const journalPath = this.#getJournalPathFromDbPath(zName);
      const fileHandle = await dirHandle.getFileHandle(journalPath, { create: true });
      // @ts-ignore
      const journalHandle = await fileHandle.createSyncAccessHandle({
        mode: 'readwrite-unsafe'
      });

      // Create the write-ahead manager.
      const writeAhead= new WriteAhead(
        zName,
        (offset, data) => accessHandle.write(data, { at: offset }),
        () => accessHandle.flush(),
        { create: created });
      await writeAhead.ready();

      file.retryResult = { accessHandle, journalHandle, writeAhead };
    } catch (e) {
      file.retryResult = e;
      return;
    }
  }
}
