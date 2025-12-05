import { FacadeVFS } from "../FacadeVFS.js";
import * as VFS from '../VFS.js';
import { LazyLock } from "./LazyLock.js";

/**
 * @typedef FileEntry
 * @property {string} zName
 * @property {number} flags
 * @property {FileSystemSyncAccessHandle} accessHandle
 * 
 * Main database file properties:
 * @property {string} [writeHint]
 * @property {LazyLock} [accessLock]
 * @property {number} [timeout]
 * 
 * Main journal file properties:
 * @property {FileEntry} [dbFile]
 */

/**
 * Cache the OPFS root directory handle.
 * @type {FileSystemDirectoryHandle}
 */
let dirHandle = null;

export class OPFSWriteAheadVFS extends FacadeVFS {
  lastError = null;
  // log = console.log;
  
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
   * @returns {Promise<number>}
   */
  async jOpen(zName, fileId, flags, pOutFlags) {
    try {
      // For simplicity, everything goes into the OPFS root directory.
      dirHandle = dirHandle ?? await navigator.storage.getDirectory();
      const fileHandle = await dirHandle.getFileHandle(
        zName,
        { create: (flags & VFS.SQLITE_OPEN_CREATE) === VFS.SQLITE_OPEN_CREATE });

      // Open a synchronous access handle with concurrent access.
      // @ts-ignore
      const accessHandle = await fileHandle.createSyncAccessHandle({
        mode: 'readwrite-unsafe'
      });

      /** @type {FileEntry} */ const file = {
        zName,
        flags,
        accessHandle,
      };

      if (flags & VFS.SQLITE_OPEN_MAIN_DB) {
        file.accessLock = new LazyLock(`${zName}-access`);
        file.timeout = -1;
        file.writeHint = null;
      } else if (flags & VFS.SQLITE_OPEN_MAIN_JOURNAL) {
        const dbFilename = zName.slice(0, -"-journal".length);
        const dbFile = this.mapPathToFile.get(dbFilename);
        if (!dbFile) {
          throw new Error(`database file not found for journal ${zName}`);
        }
        file.dbFile = dbFile; 
      }
      this.mapIdToFile.set(fileId, file);
      this.mapPathToFile.set(zName, file);
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
   * @returns {Promise<number>}
   */
  async jDelete(zName, syncDir) {
    try {
      dirHandle = dirHandle ?? await navigator.storage.getDirectory();
      await dirHandle.removeEntry(zName, { recursive: false });
      return VFS.SQLITE_OK;
    } catch (e) {
      return VFS.SQLITE_IOERR_DELETE;
    }
  }

  /**
   * @param {string} zName 
   * @param {number} flags 
   * @param {DataView} pResOut 
   * @returns {Promise<number>}
   */
  async jAccess(zName, flags, pResOut) {
    try {
      dirHandle = dirHandle ?? await navigator.storage.getDirectory();
      const fileHandle = await dirHandle.getFileHandle(zName, { create: false });
      pResOut.setInt32(0, 1, true);
      return VFS.SQLITE_OK;
    } catch (e) {
      if (e.name === 'NotFoundError') {
        pResOut.setInt32(0, 0, true);
        return VFS.SQLITE_OK;
      }
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
      this.mapIdToFile.delete(fileId);
      this.mapPathToFile.delete(file?.zName);
      file?.accessHandle.close();
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

      // On Chrome (at least), passing pData to accessHandle.read() is
      // an error because pData is a Proxy of a Uint8Array. Calling
      // subarray() produces a real Uint8Array and that works.
      const bytesRead = file.accessHandle.read(pData.subarray(), { at: iOffset });
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
      const size = file.accessHandle.getSize();
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
    return VFS.SQLITE_OK;
  }

  /**
   * @param {number} pFile 
   * @param {number} lockType 
   * @returns {number}
   */
  jUnlock(pFile, lockType) {
    return VFS.SQLITE_OK;
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
          const key = extractString(pArg, pArg.getUint32(4, true));
          const valueAddress = pArg.getUint32(8, true);
          const value = valueAddress ? extractString(pArg, valueAddress) : null;
          switch (key.toLowerCase()) {
            case 'experimental_pragma_20251114':
              // After entering the SHARED locking state on the next
              // transaction, SQLite intends to immediately (barring a hot
              // journal) transition to RESERVED if value is '1', or
              // EXCLUSIVE if value is '2'.
              file.writeHint = value;
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
                case 'exclusive':
                  // Set the write hint to prevent deadlock if the first
                  // statement in exclusive mode is a read. Because of the
                  // way SQLite exclusive mode works (not actually exclusive
                  // until a write occurs), starting with a read is like
                  // BEGIN DEFERRED.
                  file.writeHint = '1';
                  break;
                case 'normal':
                  // The only reason for this is if
                  // PRAGMA locking_mode=EXCLUSIVE is followed by
                  // PRAGMA locking_mode=NORMAL with no database operations
                  // in between. Leaving this out wouldn't cause an error,
                  // only a potential loss of concurrency for one transaction.
                  file.writeHint = null;
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
      }
    } catch (e) {
      this.lastError = e;
      return VFS.SQLITE_IOERR;
    }
    return VFS.SQLITE_NOTFOUND;
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
}

/**
 * @param {DataView} dataView 
 * @param {number} p 
 * @returns {string}
 */
function extractString(dataView, p) {
  const chars = new Uint8Array(dataView.buffer, p);
  return new TextDecoder().decode(chars.subarray(0, chars.indexOf(0)));
}