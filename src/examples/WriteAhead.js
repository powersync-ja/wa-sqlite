import { Lock } from './Lock.js';

const DEFAULT_JOURNAL_SIZE_LIMIT = 1000;
const DEFAULT_BACKSTOP_INTERVAL = 30_000;

/**
 * @typedef PageEntry
 * @property {number} waOffset location in WAL file
 * @property {number} waSalt1 WAL2 file identifier
 * @property {number} pageSize
 * @property {Uint8Array} [pageData]
 */

/**
 * @typedef Transaction
 * @property {number} id
 * @property {Map<number, PageEntry>} pages address to page data mapping
 * @property {number} dbFileSize
 * @property {number} dbPageSize
 * @property {number} waSalt1 WAL2 file identifier
 * @property {number} waOffsetEnd
 */

/**
 * @typedef WriteAheadOptions
 * @property {number} [autoCheckpoint]
 * @property {number} [backstopInterval]
 * @property {number} [journalSizeLimit]
 */

export class WriteAhead {
  log = null;
  /** @type {WriteAheadOptions} */ options = {
    autoCheckpoint: 1,
    backstopInterval: DEFAULT_BACKSTOP_INTERVAL,
    journalSizeLimit: DEFAULT_JOURNAL_SIZE_LIMIT,
  };

  #zName;
  #dbHandle;
  #waFile;

  #dbFileSize = 0;

  /** @type {Promise<any>} */ #ready;
  /** @type {'read'|'write'} */ #isolationState = null

  /** @type {Lock} */ #txIdLock = null;
  /** @type {Transaction} */ #txActive = null;
  
  /** @type {Map<number, PageEntry>} */ #waOverlay = new Map();
  /** @type {Map<number, Transaction>} */ #mapIdToTx = new Map();
  /** @type {Map<number, Transaction>} */ #pendingTx = new Map();
  #mapIdToTxPageCount = 0;

  /** @type {BroadcastChannel} */ #broadcastChannel;
  /** @type {number} */ #backstopTimer;

  /**
   * @param {string} zName 
   * @param {FileSystemSyncAccessHandle} dbHandle
   * @param {FileSystemSyncAccessHandle[]} waHandles
   * @param {WriteAheadOptions} options 
   */
  constructor(zName, dbHandle, waHandles, options = {}) {
    this.#zName = zName;
    this.#dbHandle = dbHandle;
    this.#waFile = new WriteAheadFile(waHandles);
    this.options = Object.assign(this.options, options);

    // All the asynchronous initialization is done here.
    this.#ready = (async () => {
      // Disable checkpointing by other connections until we're ready.
      await this.#updateTxIdLock();

      // Listen for transactions and checkpoints from other connections.
      this.#broadcastChannel = new BroadcastChannel(`${zName}#wa`);
      this.#broadcastChannel.onmessage = (event) => {
        this.#handleMessage(event);
      };

      // Load all the transactions from the WAL file.
      for (const tx of this.#waFile.readAllTx()) {
        this.#activateTx(tx);
      }
      this.#updateTxIdLock(); // doesn't need await

      // Schedule backstop. The backstop is a guard against a crash in
      // another context between persisting a transaction and broadcasting
      // it.
      this.#backstop();
    })();
  }

  /**
   * @returns {Promise<void>}
   */
  ready() {
    return this.#ready;
  }

  close() {
    // Stop asynchronous maintenance.
    this.#broadcastChannel.onmessage = null;
    clearTimeout(this.#backstopTimer);

    // Wait for any pending commit to complete.
    this.#txIdLock?.release();
    this.#broadcastChannel.close();
  }

  /**
   * Freeze our view of the database.
   * The view includes the transactions received so far but is not
   * guaranteed to be completely up to date (this allows this method
   * to be synchronous). Unfreeze the view with rejoin().
   */
  isolateForRead() {
    if (this.#isolationState !== null) {
      throw new Error('Already in isolated state');
    }
    this.#isolationState = 'read';
  }

  /**
   * Freeze our view of the database for writing.
   * The view includes all transactions. Unfreeze the view with rejoin().
   */
  isolateForWrite() {
    if (this.#isolationState !== null) {
      throw new Error('Already in isolated state');
    }
    this.#isolationState = 'write';

    // Backstop is not needed while writing because we will be current.
    clearTimeout(this.#backstopTimer);
    this.#backstopTimer = null;

    // A writer needs all previous transactions assimilated.
    this.#advanceTxId({ readToCurrent: true });
  }

  rejoin() {
    if (this.#isolationState === 'write') {
      // Resume backstop after write isolation.
      this.#backstop();

      // We need a place for a connection that only does write transactions
      // to auto-checkpoint. This the best place because writing is
      // complete.
      this.#autoCheckpoint();
    } else {
      // Catch up on new transactions that arrived while isolated.
      this.#advanceTxId({ autoCheckpoint: true });
    }
    this.#isolationState = null;
  }

  /**
   * @param {number} offset 
   * @return {Uint8Array?}
   */
  read(offset) {
    // First look for the page in any write transaction in progress.
    // If the page is not found in the transaction overlay, look in the
    // write-ahead overlay.
    const pageEntry = this.#txActive?.pages.get(offset) ?? this.#waOverlay.get(offset);
    if (pageEntry) {
      if (pageEntry.pageData) {
        // Page data is cached.
        this.log?.(`%cread page at ${offset} from WAL ${pageEntry.waSalt1 & 1}:${pageEntry.waOffset} (cached)`, 'background-color: gold;');
        return pageEntry.pageData;
      }

      // Read the page from the WAL file.
      this.log?.(`%cread page at ${offset} from WAL ${pageEntry.waSalt1 & 1}:${pageEntry.waOffset}`, 'background-color: gold;');
      return this.#waFile.fetchPage(pageEntry);
    }
    return null;
  }

  /**
   * @param {number} offset 
   * @param {Uint8Array} data 
   */
  write(offset, data) {
    if (this.#isolationState !== 'write') {
      throw new Error('Not in write isolated state');
    }

    if (!this.#txActive) {
      // There is no active transaction so we need to create one. But
      // first check whether to swap WAL files.
      const nPageThreshold = this.options.journalSizeLimit >= 0 ?
        this.options.journalSizeLimit :
        DEFAULT_JOURNAL_SIZE_LIMIT;
      if (this.#mapIdToTxPageCount >= nPageThreshold && this.#waFile.isInactiveFileEmpty()) {
        this.log?.(`%cchange WAL file at ${this.#mapIdToTxPageCount} pages`, 'background-color: lightskyblue;');
        this.#waFile.swapActiveFile();
      }

      this.#txActive = this.#waFile.beginTx();
    }
    const waOffset = this.#waFile.writePage(offset, data.slice());
    this.log?.(`%cwrite page at ${offset} to WAL ${this.#waFile.activeHeader.salt1 & 1}:${waOffset}`, 'background-color: lightskyblue;');
  }

  /**
   * @param {number} newSize 
   */
  truncate(newSize) {
    // Remove any pages past the truncation point. We don't need to save
    // the file size because that will be extracted from page 1.
    for (const offset of this.#txActive.pages.keys()) {
      if (offset >= newSize) {
        this.#txActive.pages.delete(offset);
      }
    }
  }

  getFileSize() {
    // If the overlay is empty, the last file size may no longer be valid
    // if direct changes were made to the main database file.
    return this.#waOverlay.size ? this.#dbFileSize : null;
  }

  commit() {
    // Persist the final pending transaction page with the database size.
    this.#waFile.commitTx();

    // Incorporate the transaction locally.
    this.#activateTx(this.#txActive);
    this.#updateTxIdLock();

    // Send the transaction to other connections.
    const payload = { type: 'tx', tx: this.#txActive };
    this.#broadcastChannel.postMessage(payload);
    this.#txActive = null;
  }

  rollback() {
    // Discard transaction pages.
    this.#waFile.abortTx();
    this.#txActive = null;
  }
  
  /**
   * @param {{durability: 'strict'|'relaxed'}} options 
   */
  sync(options) {
    if (options.durability === 'strict') {
      this.#waFile.flushInactiveFile();
    }
  }

  /**
   * Move pages from write-ahead to main database file.
   * 
   * @param {{isPassive: boolean}} options
   */
  async checkpoint(options = { isPassive: true }) {
    if (this.#waFile.isInactiveFileEmpty() && options.isPassive) {
      // Checkpoint is unnecessary.
      return;
    }

    // Passive checkpointing is abandoned if another connection is
    // already checkpointing.
    const lockOptions = {
      ifAvailable: options.isPassive,
    };

    await navigator.locks.request(`${this.#zName}#ckpt`, lockOptions, async lock => {
      if (!lock) return;

      let ckptId = this.#waFile.getActiveFileStartingTxId() - 1;
      if (options.isPassive) {
        // Scan the txId locks to find the oldest txId.
        const busyTxId = (await this.#getTxIdLocks())
          .reduce((min, value) => Math.min(min, value.maxTxId), this.#waFile.txId);

        if (busyTxId < ckptId) {
          // The inactive WAL file is still being used.
          return;
        }
      } else {
        // Wait for all connections to reach the current txId.
        await this.#waitForTxIdLocks(value => value.maxTxId >= this.#waFile.txId);
        ckptId = this.#waFile.txId;
      }
      this.log?.(`%ccheckpoint through txId ${ckptId}`, 'background-color: lightgreen;');

      // Sync the WAL file. This ensures that if there is a crash after
      // part of the WAL has been copied, the uncopied part will still be
      // available afterwards.
      this.#waFile.flushInactiveFile();

      // Starting at ckptId and going backwards (higher to lower txId),
      // write transaction pages to the main database file. Do not overwrite
      // a page written by a more recent transaction.
      const writtenOffsets = new Set();
      let dbFileSize = this.#dbHandle.getSize();
      for (let tx = this.#mapIdToTx.get(ckptId); tx; tx = this.#mapIdToTx.get(tx.id - 1)) {
        if (tx.id === ckptId && dbFileSize !== tx.dbFileSize) {
          // Set the file size from the latest transaction.
          dbFileSize = tx.dbFileSize;
          this.#dbHandle.truncate(dbFileSize);
        }

        for (const [offset, pageEntry] of tx.pages) {
          if (offset < dbFileSize && !writtenOffsets.has(offset)) {
            // Fetch the page data from the WAL file if not cached.
            const pageData = pageEntry.pageData ?? this.#waFile.fetchPage(pageEntry);

            // Write the page to the database file.
            const nWritten = this.#dbHandle.write(pageData, { at: offset });
            if (nWritten !== pageData.byteLength) {
              throw new Error('Checkpoint write failed');
            }
            writtenOffsets.add(offset);
            this.log?.(`%ccheckpoint wrote txId ${tx.id} page at ${offset} to database`, 'background-color: lightgreen;');
          }
        }
      }

      // Ensure that database writes are durable.
      this.log?.(`%ccheckpoint flush database file`, 'background-color: lightgreen;');
      this.#dbHandle.flush();

      // Notify other connections and ourselves of the checkpoint.
      this.#broadcastChannel.postMessage({
        type: 'ckpt',
        ckptId,
      });
      this.#handleCheckpoint(ckptId);

      // Wait for all connections to update their overlay.
      this.log?.(`%ccheckpoint waiting for connection updates`, 'background-color: lightgreen;');
      await this.#waitForTxIdLocks(value => value.minTxId > ckptId);

      // Truncate the inactive WAL file. This prevents new connections from
      // unnecessarily reading checkpointed data, and allows writers to make
      // it active when their conditions are met.
      this.#waFile.truncateInactiveFile();
      this.log?.(`%ccheckpoint complete`, 'background-color: lightgreen;');
    });
  }

  /**
   * Return the approximate number of write-ahead pages. This is the
   * sum of the number of unique page indices for each transaction,
   * so it can be fewer than the number of pages if any transaction
   * contains multiple frames for the same page.
   * @returns {number}
   */
  getWriteAheadSize() {
    return this.#mapIdToTxPageCount;
  }

  /**
   * Incorporate a transaction into our view of the database.
   * @param {Transaction} tx 
   */
  #activateTx(tx) {
    // Transfer to the active collection of transactions.
    this.#mapIdToTx.set(tx.id, tx);
    this.#mapIdToTxPageCount += tx.pages.size;
  
    // Add transaction pages to the write-ahead overlay.
    for (const [offset, pageEntry] of tx.pages) {
      this.#waOverlay.set(offset, pageEntry);
    }
    this.#dbFileSize = tx.dbFileSize;
  }

  /**
   * Advance the local view of the database. By default, advance to the
   * last broadcast transaction. Optionally, also advance through any
   * additional transactions in the WAL file to be fully current.
   * 
   * @param {{readToCurrent?: boolean, autoCheckpoint?: boolean}} options
   */
  #advanceTxId(options = {}) {
    let didAdvance = false;
    while (this.#pendingTx.size) {
      // Fetch the next transaction in sequence. Usually this will come
      // from pendingTx, but if it is missing then read it from the file.
      const nextTxId = this.#waFile.txId + 1;
      let tx;
      if (this.#pendingTx.has(nextTxId)) {
        // This transaction arrived via message.
        tx = this.#pendingTx.get(nextTxId);
        this.#pendingTx.delete(tx.id);

        // Move the WAL file offset past this transaction.
        this.#waFile.skipTx(tx);
      } else {
        // Read the transaction from the WAL file.
        tx = this.#waFile.readTx();
      }

      this.#activateTx(tx);
      didAdvance = true;
    }

    if (options.readToCurrent) {
      // Read all additional transactions from the WAL file.
      for (const tx of this.#waFile.readAllTx()) {
        this.#activateTx(tx);
        didAdvance = true;
      }
    }

    if (didAdvance) {
      // Publish our new view txId.
      this.#updateTxIdLock();

      if (options.autoCheckpoint) {
        this.#autoCheckpoint();
      }
    }
  }

  #autoCheckpoint() {
    if (this.options.autoCheckpoint > 0) {
      this.checkpoint({ isPassive: true });
    }
  }

  /**
   * After a checkpoint, remove checkpointed pages from write-ahead.
   * The checkpoint may be been done locally or by another connection.
   * @param {number} ckptId 
   */
  #handleCheckpoint(ckptId) {
    this.log?.(`%capply checkpoint through txId ${ckptId}`, 'background-color: lightgreen;');

    // Loop backwards from ckptId.
    let tx = /** @type {Transaction} */ ({ id: ckptId + 1 });
    while (tx = this.#mapIdToTx.get(tx.id - 1)) {
      // Remove pages from write-ahead overlay.
      for (const [offset, pageEntry] of tx.pages.entries()) {
        // Be sure not to remove a newer version of the page.
        const overlayEntry = this.#waOverlay.get(offset);
        if (overlayEntry === pageEntry) {
          this.log?.(`%cremove txId ${tx.id} page at offset ${offset}`, 'background-color: lightgreen;');
          this.#waOverlay.delete(offset);
        }
      }

      // Remove transaction.
      this.#mapIdToTx.delete(tx.id);
      this.#mapIdToTxPageCount -= tx.pages.size;
    }
    this.#updateTxIdLock();
  }

  /**
   * @param {MessageEvent} event 
   */
  #handleMessage(event) {
    if (event.data.type === 'tx') {
      // New transaction from another connection. Don't use it if we
      // already have it.
      /** @type {Transaction} */ const tx = event.data.tx;
      if (tx.id > this.#waFile.txId) {
        this.#pendingTx.set(tx.id, tx);
        if (this.#isolationState === null) {
          // Not in an isolated state, so advance our view of the database.
          this.#advanceTxId({ autoCheckpoint: true });
        }
      }
    } else if (event.data.type === 'ckpt') {
      // Checkpoint notification from another connection.
      /** @type {number} */ const ckptId = event.data.ckptId;
      this.#handleCheckpoint(ckptId);
    }
  }

  /**
   * Periodic check for recovering from lost transaction broadcasts.
   */
  async #backstop() {
    try {
      if (this.#backstopTimer) { 
        if (this.#isolationState === null) {
          // Not in an isolated state, so advance our view of the database.
          const oldTxId = this.#waFile.txId;
          this.#advanceTxId({ readToCurrent: true });
          if (this.#waFile.txId > oldTxId) {
            this.log?.(`%cbackstop txId ${oldTxId} -> ${this.#waFile.txId}`, 'background-color: lightyellow;');
          }
        } else if (this.#isolationState === 'read') {
          // TODO: Peek to see if there may be new transactions.
          // Check txId locks or read the next frame header.
        }
      }
    } catch (e) {
      console.error('Backstop failed', e);
    }

    // Schedule next backstop. Add a bit of jitter to decorrelate
    // backstops across multiple connections.
    const delay = this.options.backstopInterval * (0.9 + 0.2 * Math.random());
    this.#backstopTimer = self.setTimeout(() => {
      this.#backstop();
    }, delay);
  }
  
  /**
   * Update the lock that publishes our current txId.
   */
  async #updateTxIdLock() {
    // Our view of the database, i.e. the txId, is encoded into the name
    // of a lock so other connections can see it. When our txId changes,
    // we acquire a new lock and release the old one. We must not release
    // the old lock until the new one is in place.
    const oldLock = this.#txIdLock;
    const newLockName = this.#encodeTxIdLockName();
    if (oldLock?.name !== newLockName) {
      this.#txIdLock = new Lock(newLockName);
      await this.#txIdLock.acquire('shared').then(() => {
        // The new lock is acquired.
        oldLock?.release();
      });

      if (this.log) {
        const { minTxId, maxTxId } = this.#decodeTxIdLockName(newLockName);
        this.log?.(`%ctxId to ${minTxId}:${maxTxId}`, 'background-color: pink;');
      }
    }
  }

  /**
   * Get all txId locks for this database.
   * @returns {Promise<{name: string, minTxId: number, maxTxId: number}[]>}
   */
  async #getTxIdLocks() {
    const { held } = await navigator.locks.query();
    return held
      .map(lock => this.#decodeTxIdLockName(lock.name))
      .filter(value => value !== null)
  }

  /**
   * @returns {string}
   */
  #encodeTxIdLockName() {
    // The maxTxId is our current view of the database. The minTxId is
    // the lowest txId we get pages from the WAL for, which is the lowest
    // key in mapIdToTx. If mapIdToTx is empty then we aren't reading
    // from the WAL at all - in this case we arbitrarily set minTxId to
    // invalid value maxTxId + 1.
    //
    // Use radix 36 to encode integer values to reduce the lock name length.
    const maxTxId = this.#waFile.txId;
    const minTxId = this.#mapIdToTx.keys().next().value ?? (maxTxId + 1);
    return `${this.#zName}-txId<${minTxId.toString(36)}:${maxTxId.toString(36)}>`;
  }

  /**
   * @param {string} lockName 
   * @returns {{name: string, minTxId: number, maxTxId: number}}
   */
  #decodeTxIdLockName(lockName) {
    const match = lockName.match(/^(.*)-txId<([0-9a-z]+):([0-9a-z]+)>$/);
    if (match?.[1] === this.#zName) {
      // This txId lock is for this database.
      return {
        name: match[1],
        minTxId: parseInt(match[2], 36),
        maxTxId: parseInt(match[3], 36)
      };
    }
    return null;
  }

  /**
   * Wait for all txId locks that fail the provided predicate.
   * @param {(lock: {name: string, minTxId: number, maxTxId: number}) => boolean} predicate 
   */
  async #waitForTxIdLocks(predicate) {
    /** @type {string[]} */ let failingLockNames = [];
    do {
      // Wait for all connections that fail the predicate.
      await Promise.all(
        failingLockNames.map(name => navigator.locks.request(name, async () => {}))
      );

      // Refresh the list of failing locks.
      failingLockNames = (await this.#getTxIdLocks())
        .filter(value => !predicate(value))
        .map(value => value.name);
    } while (failingLockNames.length > 0);
  }
}

class WriteAheadFile {
  static MAGIC = 0x377f0684;
  static FILE_HEADER_SIZE = 32;
  static FRAME_HEADER_SIZE = 32;
  static FRAME_TYPE_PAGE = 0;
  static FRAME_TYPE_COMMIT = 1;
  static FRAME_TYPE_END = 2;

  /** @type {FileSystemSyncAccessHandle[]} */ accessHandles;

  /** @type {FileSystemSyncAccessHandle} */ activeHandle;
  /** @type {{nextTxId: number, salt1: number, salt2: number}} */ activeHeader;
  /** @type {number} */ activeOffset;
  
  txId = 0;

  /** @type {Transaction} */ txInProgress = null;

  /**
   * @param {FileSystemSyncAccessHandle[]} accessHandles 
   */
  constructor(accessHandles) {
    this.accessHandles = accessHandles;

    // Read file headers from both header slots and use the one with the
    // lower nextTxId. If neither header is valid, create a new header.
    const fileHeader = this.accessHandles
      .map(handle => this.#readFileHeader(handle))
      .filter(h => h)
      .sort((a, b) => a.nextTxId - b.nextTxId)[0]
      ?? this.#writeFileHeader(Math.floor(Math.random() * 0xffffffff));
    
    this.activeHeader = fileHeader;
    this.activeHandle = this.accessHandles[fileHeader.salt1 & 1];
    this.activeOffset = WriteAheadFile.FILE_HEADER_SIZE;
    this.txId = fileHeader.nextTxId - 1;
  }

  /**
   * @param {PageEntry} pageEntry 
   * @returns {Uint8Array}
   */
  fetchPage(pageEntry) {
    // Get the appropriate access handle based on salt parity.
    const accessHandle = this.accessHandles[pageEntry.waSalt1 & 1];

    // Read the page.
    const pageData = new Uint8Array(pageEntry.pageSize);
    const nBytesRead = accessHandle.read(pageData, { at: pageEntry.waOffset });

    if (nBytesRead !== pageEntry.pageSize) {
      throw new Error(`Short WAL read: expected ${pageEntry.pageSize} bytes, got ${nBytesRead}`);
    }
    return pageData;
  }

  *readAllTx() {
    while (true) {
      const tx = this.readTx();
      if (!tx) break;
      yield tx;
    }
  }

  /**
   * @returns {Transaction?}
   */
  readTx() {
    // Read the next complete transaction or return null.
    let offset = this.activeOffset;
    /** @type {Transaction?} */ let tx = null;
    while (true) {
      const frame = this.#readFrame(offset);
      if (!frame) return null;

      if (frame.frameType === WriteAheadFile.FRAME_TYPE_PAGE) {
        if (!tx) {
          tx = {
            id: 0, // placeholder
            pages: new Map(),
            dbFileSize: 0, // placeholder
            dbPageSize: frame.pageData.byteLength,
            waSalt1: this.activeHeader.salt1,
            waOffsetEnd: 0 // placeholder
          };
        }

        tx.pages.set(
          frame.pageOffset,
          {
            pageSize: frame.pageData.byteLength,
            waOffset: offset + WriteAheadFile.FRAME_HEADER_SIZE,
            waSalt1: tx.waSalt1
          });
      } else if (frame.frameType === WriteAheadFile.FRAME_TYPE_COMMIT) {
        // The transaction is complete. Update the instance state.
        this.txId += 1;
        this.activeOffset = offset + frame.byteLength;
  
        // Finalize the transaction fields and return it.
        tx.id = this.txId;
        tx.dbFileSize = frame.dbFileSize;
        tx.waOffsetEnd = this.activeOffset;
        return tx;
      } else if (frame.frameType === WriteAheadFile.FRAME_TYPE_END) {
        // No more transactions on the current WAL file. Switch to the
        // other file.
        this.#followFileChange();
        offset = this.activeOffset;
        continue;
      }

      offset += frame.byteLength;
    }
  }

  /**
   * This method is called when transaction(s) have been received by other
   * means than readTx(), e.g. via BroadcastChannel.
   * 
   * @param {Transaction} tx 
   */
  skipTx(tx) {
    if (tx.waSalt1 !== this.activeHeader.salt1) {
      // This transaction is on the other WAL file.
      if (!this.#followFileChange()) {
        throw new Error('invalid WAL file');
      }
    }

    this.txId = tx.id;
    this.activeOffset = tx.waOffsetEnd;
  }

  /**
   * 
   * @param {{overwrite?: boolean}} options 
   * @returns {Transaction}
   */
  beginTx(options = {}) {
    this.txInProgress = {
      id: this.txId + 1,
      pages: new Map(),
      dbFileSize: 0,
      dbPageSize: 0,
      waSalt1: this.activeHeader.salt1,
      waOffsetEnd: this.activeOffset
    };
    return this.txInProgress;
  }

  /**
   * Write a page frame to the WAL file.
   * 
   * @param {number} pageOffset 
   * @param {Uint8Array} pageData 
   */
  writePage(pageOffset, pageData) {
    const headerView = new DataView(new ArrayBuffer(WriteAheadFile.FRAME_HEADER_SIZE));
    headerView.setUint8(0, WriteAheadFile.FRAME_TYPE_PAGE);
    headerView.setUint16(2, pageData.byteLength === 65536 ? 1 : pageData.byteLength);
    headerView.setBigUint64(8, BigInt(pageOffset));
    headerView.setUint32(16, this.activeHeader.salt1);
    headerView.setUint32(20, this.activeHeader.salt2);

    const checksum = new Checksum();
    checksum.update(new Uint8Array(headerView.buffer, 0, WriteAheadFile.FRAME_HEADER_SIZE - 8));
    checksum.update(pageData);
    headerView.setUint32(24, checksum.s0);
    headerView.setUint32(28, checksum.s1);

    const bytesWritten =
      this.activeHandle.write(headerView, { at: this.txInProgress.waOffsetEnd }) +
      this.activeHandle.write(pageData, {
        at: this.txInProgress.waOffsetEnd + WriteAheadFile.FRAME_HEADER_SIZE
      });
    if (bytesWritten !== headerView.byteLength + pageData.byteLength) {
      throw new Error('write failed');
    }

    const pageEntry = {
      pageSize: pageData.byteLength,
      waOffset: this.txInProgress.waOffsetEnd + WriteAheadFile.FRAME_HEADER_SIZE,
      waSalt1: this.activeHeader.salt1
    };
    if (pageOffset === 0) {
      // This is page 1, which contains the database header.
      const dataView = new DataView(pageData.buffer, pageData.byteOffset, pageData.byteLength);
      const pageCount = dataView.getUint32(28);
      this.txInProgress.dbFileSize = pageCount * pageData.byteLength;
      this.txInProgress.dbPageSize = pageData.byteLength;

      // Cache page 1 as a performance optimization and to exercise the
      // cache code path.
      pageEntry.pageData = pageData;
    }

    this.txInProgress.pages.set(pageOffset, pageEntry);
    this.txInProgress.waOffsetEnd += bytesWritten;

    return pageEntry.waOffset;
  }

  /**
   * @returns {Transaction}
   */
  commitTx() {
    const headerView = new DataView(new ArrayBuffer(WriteAheadFile.FRAME_HEADER_SIZE));
    headerView.setUint8(0, WriteAheadFile.FRAME_TYPE_COMMIT);
    headerView.setBigUint64(8, BigInt(this.txInProgress.dbFileSize));
    headerView.setUint32(16, this.activeHeader.salt1);
    headerView.setUint32(20, this.activeHeader.salt2);

    const checksum = new Checksum();
    checksum.update(new Uint8Array(headerView.buffer, 0, WriteAheadFile.FRAME_HEADER_SIZE - 8));
    headerView.setUint32(24, checksum.s0);
    headerView.setUint32(28, checksum.s1);

    const bytesWritten = this.activeHandle.write(headerView, {
      at: this.txInProgress.waOffsetEnd
    });
    if (bytesWritten !== headerView.byteLength) {
      throw new Error('write failed');
    }
    this.txInProgress.waOffsetEnd += bytesWritten;

    const tx = this.txInProgress;
    this.txInProgress = null;
    this.activeOffset = tx.waOffsetEnd;
    this.txId = tx.id;
    return tx;
  }

  abortTx() {
    this.txInProgress = null;
  }

  /**
   * Switch the active WAL file prior to writing the next transaction.
   */
  swapActiveFile() {
    // Write an end frame to terminate the currently active WAL file.
    const frameView = new DataView(new ArrayBuffer(WriteAheadFile.FRAME_HEADER_SIZE));
    frameView.setUint8(0, WriteAheadFile.FRAME_TYPE_END);
    frameView.setUint32(16, this.activeHeader.salt1);
    frameView.setUint32(20, this.activeHeader.salt2);

    const checksum = new Checksum();
    checksum.update(new Uint8Array(frameView.buffer, 0, WriteAheadFile.FRAME_HEADER_SIZE - 8));
    frameView.setUint32(24, checksum.s0);
    frameView.setUint32(28, checksum.s1);

    const bytesWritten =
      this.activeHandle.write(frameView, { at: this.activeOffset });
    if (bytesWritten !== frameView.byteLength) {
      throw new Error('write failed');
    }
    
    // Initialize the other WAL file and make it active.
    this.activeHeader = this.#writeFileHeader();
    this.activeHandle = this.#getInactiveHandle();
    this.activeOffset = WriteAheadFile.FRAME_HEADER_SIZE;
  }

  getActiveFileStartingTxId() {
    return this.activeHeader.nextTxId;
  }

  isInactiveFileEmpty() {
    const accessHandle = this.#getInactiveHandle();
    return accessHandle.getSize() === 0;
  }

  flushInactiveFile() {
    const accessHandle = this.#getInactiveHandle();
    accessHandle.flush();
  }

  truncateInactiveFile() {
    const accessHandle = this.#getInactiveHandle();
    accessHandle.truncate(0);
  }

  #followFileChange() {
    const accessHandle = this.#getInactiveHandle();
    const fileHeader = this.#readFileHeader(accessHandle);
    if (!fileHeader) return null;
    if (fileHeader.salt1 !== ((this.activeHeader.salt1 + 1) | 0)) return null;
 
    this.activeHandle = accessHandle;
    this.activeHeader = fileHeader;
    this.activeOffset = WriteAheadFile.FRAME_HEADER_SIZE;
    return fileHeader;
  }

  #getInactiveHandle() {
    return this.activeHandle !== this.accessHandles[0] ?
      this.accessHandles[0] :
      this.accessHandles[1];
  }

  /**
   * @param {FileSystemSyncAccessHandle} accessHandle 
   */
  #readFileHeader(accessHandle) {
    const headerView = new DataView(new ArrayBuffer(WriteAheadFile.FILE_HEADER_SIZE));
    if (accessHandle.read(headerView, { at: 0 }) !== headerView.byteLength) {
      return null;
    }

    if (headerView.getUint32(0) !== WriteAheadFile.MAGIC) return null;

    const checksum = new Checksum();
    checksum.update(new Uint8Array(headerView.buffer, 0, WriteAheadFile.FILE_HEADER_SIZE - 8));
    if (!checksum.matches(headerView.getUint32(24), headerView.getUint32(28))) {
      return null;
    }

    return {
      nextTxId: Number(headerView.getBigUint64(8)),
      salt1: headerView.getUint32(16),
      salt2: headerView.getUint32(20)
    }
  }

  /**
   * @param {number} offset
   */
  #readFrame(offset) {
    const headerView = new DataView(new ArrayBuffer(WriteAheadFile.FRAME_HEADER_SIZE));
    if (this.activeHandle.read(headerView, { at: offset }) !== headerView.byteLength) {
      // EOF, not an error.
      return null;
    }

    // Verify the frame header salt values match the file header.
    const frameSalt1 = headerView.getUint32(16);
    const frameSalt2 = headerView.getUint32(20);
    if (frameSalt1 !== this.activeHeader.salt1 || frameSalt2 !== this.activeHeader.salt2) {
      // Not necessarily an error, could be from a restart without
      // truncation.
      return null;
    }

    const payloadSize = (size => size === 1 ? 65536 : size)(headerView.getUint16(2));
    /** @type {Uint8Array} */ let payloadData;
    if (payloadSize) {
      payloadData = new Uint8Array(payloadSize);
      const payloadBytesRead = this.activeHandle.read(
        payloadData,
        { at: offset + WriteAheadFile.FRAME_HEADER_SIZE });
      if (payloadBytesRead !== payloadSize ) return null;
    }

    const checksum = new Checksum();
    checksum.update(new Uint8Array(headerView.buffer, 0, WriteAheadFile.FRAME_HEADER_SIZE - 8));
    if (payloadData) {
      checksum.update(payloadData);
    }
    if (!checksum.matches(headerView.getUint32(24), headerView.getUint32(28))) {
      // Not necessarily an error, could be from a restart without
      // truncation.
      return null;
    }

    const frameType = headerView.getUint8(0);
    if (frameType === WriteAheadFile.FRAME_TYPE_PAGE) {
      return {
        frameType,
        byteLength: WriteAheadFile.FRAME_HEADER_SIZE + payloadSize,
        pageOffset: Number(headerView.getBigUint64(8)),
        pageData: payloadData
      };
    } else if (frameType === WriteAheadFile.FRAME_TYPE_COMMIT) {
      return {
        frameType,
        byteLength: WriteAheadFile.FRAME_HEADER_SIZE,
        dbFileSize: Number(headerView.getBigUint64(8))
      };
    } else if (frameType === WriteAheadFile.FRAME_TYPE_END) {
      return {
        frameType,
        byteLength: WriteAheadFile.FRAME_HEADER_SIZE
      };
    }
    throw new Error(`Invalid frame type: ${frameType}`);
  }

  #writeFileHeader(prevSalt1 = this.activeHeader.salt1) {
    // Derive new values from the previous values. Note that salt1 always
    // flips between even and odd so successive headers are written to
    // alternating files.
    const nextTxId = this.txId + 1;
    const salt1 = (prevSalt1 + 1) | 0;
    const salt2 = Math.floor(Math.random() * 0xffffffff);
    const headerView = new DataView(new ArrayBuffer(WriteAheadFile.FILE_HEADER_SIZE));
    headerView.setUint32(0, WriteAheadFile.MAGIC);
    headerView.setBigUint64(8, BigInt(nextTxId));
    headerView.setUint32(16, salt1);
    headerView.setUint32(20, salt2);

    const checksum = new Checksum();
    checksum.update(new Uint8Array(headerView.buffer, 0, WriteAheadFile.FILE_HEADER_SIZE - 8));
    headerView.setUint32(24, checksum.s0);
    headerView.setUint32(28, checksum.s1);

    // The even/odd parity of salt1 determines which file is written to.
    const accessHandle = this.accessHandles[salt1 & 1];
    const bytesWritten = accessHandle.write(headerView, { at: 0 });
    if (bytesWritten !== headerView.byteLength) {
      throw new Error('write failed');
    }

    return { nextTxId, salt1, salt2 };
  }
}

// https://www.sqlite.org/fileformat.html#checksum_algorithm
class Checksum {
  /** @type {number} */ s0 = 0;
  /** @type {number} */ s1 = 0;

  /**
   * @param {ArrayBuffer|ArrayBufferView} data 
   */
  update(data) {
    if ((data.byteLength % 8) !== 0) throw new Error('Data must be a multiple of 8 bytes');
    const words = ArrayBuffer.isView(data) ?
      new Uint32Array(data.buffer, data.byteOffset, data.byteLength / 4) :
      new Uint32Array(data);
    for (let i = 0; i < words.length; i += 2) {
      this.s0 = (this.s0 + words[i]     + this.s1) >>> 0;
      this.s1 = (this.s1 + words[i + 1] + this.s0) >>> 0;
    }
  }

  matches(s0, s1) {
    return this.s0 === s0 && this.s1 === s1;
  }
}
