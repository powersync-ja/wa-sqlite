import { Lock } from './Lock.js';

const DEFAULT_AUTOCHECKPOINT_PAGES = 1000;
const DEFAULT_BACKSTOP_INTERVAL = 30_000;

const SECTOR_SIZE = 4096;
const WAL_FILE_HEADER_SIZE = 32;
const WAL_FRAME_BASE = SECTOR_SIZE + WAL_FILE_HEADER_SIZE; // first frame starts at this offset

/**
 * @typedef PageEntry
 * @property {number} waOffset location in WAL file
 * @property {number} waSalt1 location in WAL file
 * @property {number} pageSize
 * @property {Uint8Array} [pageData]
 */

/**
 * @typedef Transaction
 * @property {number} id
 * @property {Map<number, PageEntry>} pages address to page data mapping
 * @property {number} dbFileSize
 * @property {number} dbPageSize
 * @property {number} waOffsetEnd
 */

/**
 * @typedef WriteAheadOptions
 * @property {boolean} [create=false] true if database is being created
 * @property {number} [autoCheckpointPages]
 * @property {number} [backstopInterval]
 */

export class WriteAhead {
  log = null;
  /** @type {WriteAheadOptions} */ options = {
    create: false,
    autoCheckpointPages: DEFAULT_AUTOCHECKPOINT_PAGES,
    backstopInterval: DEFAULT_BACKSTOP_INTERVAL,
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

  #broadcastChannel;
  /** @type {number} */ #backstopTimer;

  /**
   * @param {string} zName 
   * @param {FileSystemSyncAccessHandle} dbHandle
   * @param {FileSystemSyncAccessHandle[]} waHandles
   * @param {WriteAheadOptions} options 
   */
  constructor(zName, dbHandle, waHandles, options) {
    this.#zName = zName;
    this.#dbHandle = dbHandle;
    this.#waFile = new WriteAheadFile(waHandles, { create: options.create });
    this.options = Object.assign(this.options, options);

    // All the asynchronous initialization is done here.
    this.#ready = (async () => {
      // Disable checkpointing by other connections until we're ready.
      await navigator.locks.request(`${this.#zName}-ckpt`, async () => {
        await this.#updateTxIdLock();
      });

      // Load all the transactions from the WAL file.
      for (const tx of this.#waFile.readAllTx()) {
        this.#activateTx(tx);
      }
      this.#updateTxIdLock(); // doesn't need await

      // Listen for transactions and checkpoints from other connections.
      this.#broadcastChannel = new BroadcastChannel(`${zName}#wa`);
      this.#broadcastChannel.onmessage = (event) => {
        this.#handleMessage(event);
      };

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

    if (this.#waFile.checkReset()) {
      // The WAL file has been restarted after a full checkpoint. Our
      // view must be at the final transaction before the checkpoint for
      // that to have happened. The previous overlay is now stale. In
      // case we haven't received the checkpoint broadcast, make sure
      // the overlay is cleared.
      this.#handleCheckpoint(this.#waFile.txId);
    }
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

    if (this.#waFile.checkReset()) {
      // The WAL file has been restarted after a full checkpoint. Our
      // view must be at the final transaction before the checkpoint for
      // that to have happened. The previous overlay is now stale. In
      // case we haven't received the checkpoint broadcast, make sure
      // the overlay is cleared.
      this.#handleCheckpoint(this.#waFile.txId);
    }

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
        this.log?.(`%cread page at ${offset} from WAL ${pageEntry.waOffset} (cached)`, 'background-color: gold;');
        return pageEntry.pageData;
      }

      // Read the page from the WAL file.
      this.log?.(`%cread page at ${offset} from WAL ${pageEntry.waOffset} (${pageEntry.waSalt1.toString(16)})`, 'background-color: gold;');
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
      // There is no active transaction so create one.
      this.#txActive = this.#waFile.beginTx();
    }
    const waOffset = this.#waFile.writePage(offset, data.slice());
    this.log?.(`%c#write page at ${offset} to WAL ${waOffset}`, 'background-color: lightskyblue;');
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
      this.#waFile.activeHandle.flush();
    }
  }

  /**
   * Flush all write-ahead transactions to the main database file.
   * There must be no other connections reading or writing.
   * @param {'passive'|'full'|'restart'|'truncate'} mode
   */
  async checkpoint(mode) {
    if (mode !== 'passive') {
      this.isolateForWrite();
    }
    try {
      const options = {
        isRestart: mode !== 'passive',
        isRequired: mode !== 'passive'
      };
      await this.#checkpoint(options);

      if (mode === 'truncate') {
        this.#waFile.activeHandle.truncate(this.#waFile.activeOffset);
        this.log?.(`%ccheckpoint restart WAL file`, 'background-color: lightgreen;');
      }
    } finally {
      if (mode !== 'passive') {
        this.rejoin();
      }
    }
  }

  /**
   * Return the known usage size of the write-ahead file. Note that the
   * actual file size may be larger than reported if this connection is
   * not current or if the file has obsolete content past the current point.
   * @returns {number}
   */
  getWriteAheadSize() {
    return this.#waFile.activeOffset;
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
        tx = this.#pendingTx.get(nextTxId);
        this.#pendingTx.delete(tx.id);
        this.#waFile.skipTx(tx.id, tx.waOffsetEnd);
      } else {
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
    // Perform an automatic checkpoint if enabled and needed. Automatic
    // checkpoints are passive, so this will not change the WAL file
    // usage or size.
    if (this.options.autoCheckpointPages > 0 &&
        this.#mapIdToTxPageCount >= this.options.autoCheckpointPages) {
      this.log?.(`%cauto-checkpoint`, 'background-color: lightgreen;');
      this.checkpoint('passive');
    }
  }

  /**
   * Move pages from write-ahead to main database file.
   * 
   * @param {{isRestart?: boolean, isRequired?: boolean}} options
   */
  async #checkpoint(options = {}) {
    // By default, checkpointing is abandoned if another connection is
    // already checkpointing. With the isRequired option, a checkpoint
    // is always performed. This is necessary for leaving write-ahead
    // mode or a user-requested checkpoint.
    const lockOptions = {
      ifAvailable: !options.isRequired,
    };

    await navigator.locks.request(`${this.#zName}-ckpt`, lockOptions, async lock => {
      if (!lock) return null;

      /** @type {number} */ let ckptId;
      if (options.isRestart) {
        // Full checkpoint, use the current WAL file txId.
        ckptId = this.#waFile.txId;

        // Wait for all connections to reach this txId.
        await this.#waitForTxIdLocks(value => value.maxTxId >= ckptId);
        this.log?.(`%c#checkpoint full txId ${ckptId}`, 'background-color: lightgreen;');
      } else {
        // Not a full checkpoint, so find the lowest txId in use by any
        // connection.
        ckptId = (await this.#getTxIdLocks())
          .reduce((min, value) => Math.min(min, value.maxTxId), this.#waFile.txId);
        this.log?.(`%c#checkpoint partial txId ${ckptId}`, 'background-color: lightgreen;');
      }

      // Sync the WAL file. This ensures that if there is a crash after
      // part of the WAL has been copied, the uncopied part will still be
      // available afterwards.
      this.#waFile.activeHandle.flush();

      // Starting at ckptId and going backwards (earlier), write transaction
      // pages to the main database file. Do not overwrite a page written
      // by a later transaction.
      const writtenOffsets = new Set();
      let dbFileSize = 0;
      let tx = /** @type {Transaction} */ ({ id: ckptId + 1 });
      while (tx = this.#mapIdToTx.get(tx.id - 1)) {
        if (tx.id === ckptId) {
          // Set the file size from the latest transaction. This may be
          // unnecessary as SQLite is not known to reduce the database size
          // except with VACUUM.
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
            this.log?.(`%c#checkpoint wrote txId ${tx.id} page at ${offset} to database`, 'background-color: lightgreen;');
          }
        }
      }

      if (writtenOffsets.size > 0) {
        if (ckptId == this.#waFile.txId) {
          // Ensure data is safely in the file.
          this.log?.(`%c#checkpoint flush database file`, 'background-color: lightgreen;');
          this.#dbHandle.flush();
        }

        // Notify other connections and ourselves of the checkpoint.
        this.#broadcastChannel.postMessage({
          type: 'ckpt',
          ckptId,
        });
        this.#handleCheckpoint(ckptId);
      }

      if (options.isRestart) {
        // Wait for all connections to clear their overlay.
        await this.#waitForTxIdLocks(value => value.minTxId > ckptId);

        this.#waFile.reset();
      }
    });
  }

  /**
   * After a checkpoint, remove checkpointed pages from write-ahead.
   * The checkpoint may be been done locally or by another connection.
   * @param {number} ckptId 
   */
  #handleCheckpoint(ckptId) {
    this.log?.(`%c#handleCheckpoint to txId ${ckptId}`, 'background-color: lightgreen;');

    // Loop backwards from ckptId.
    let tx = /** @type {Transaction} */ ({ id: ckptId + 1 });
    while (tx = this.#mapIdToTx.get(tx.id - 1)) {
      // Remove pages from write-ahead overlay.
      for (const [offset, page] of tx.pages.entries()) {
        // Be sure not to remove a newer version of the page.
        const overlayPage = this.#waOverlay.get(offset);
        if (overlayPage === page) {
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

  /** @type {FileSystemSyncAccessHandle[]} */ accessHandles;

  /** @type {FileSystemSyncAccessHandle} */ activeHandle;
  /** @type {{nextTxId: number, salt1: number, salt2: number}} */ activeHeader;
  /** @type {number} */ activeOffset;
  
  txId = 0;

  /** @type {Transaction} */ txInProgress = null;

  /**
   * @param {FileSystemSyncAccessHandle[]} accessHandles 
   */
  constructor(accessHandles, options) {
    this.accessHandles = accessHandles;

    if (options.create) {
      this.activeHandle = accessHandles[0];
      this.#writeFileHeader(-1);
    }
    this.open();
  }

  open() {
    // Read file headers from both header slots and use the one with the
    // higher nextTxId.
    const fileHeader = [0, SECTOR_SIZE]
      .map(offset => this.#readFileHeader(offset))
      .filter(h => h)
      .sort((a, b) => b.nextTxId - a.nextTxId)[0];
    
    this.activeOffset = WAL_FRAME_BASE;
    this.activeHeader = fileHeader;
    this.txId = fileHeader.nextTxId - 1;
  }

  reset(options = { truncate: true }) {
    const fileHeader = this.#writeFileHeader();
    if (options.truncate) {
      this.activeHandle.truncate(WAL_FRAME_BASE);
    }

    this.activeOffset = WAL_FRAME_BASE;
    this.activeHeader = fileHeader;
  }

  checkReset() {
    // Check for a new header. There are two header slots in the file.
    // Look in the slot that is not current, which will be at offset 0
    // or SECTOR_SIZE depending on the current salt1 value (salt1 is
    // incremented on each new header).
    const headerOffset = (this.activeHeader.salt1 & 0x1) ? 0 : SECTOR_SIZE;
    const fileHeader = this.#readFileHeader(headerOffset);
    if (fileHeader?.nextTxId > this.txId &&
        fileHeader.salt1 === ((this.activeHeader.salt1 + 1) | 0)) {
      // The WAL file has been reset.
      this.activeOffset = WAL_FRAME_BASE;
      this.activeHeader = fileHeader;
      return true;
    }
    return false;
  }

  /**
   * @param {PageEntry} pageEntry 
   * @returns {Uint8Array}
   */
  fetchPage(pageEntry) {
    const pageData = new Uint8Array(pageEntry.pageSize);
    const nBytesRead = this.activeHandle.read(pageData, { at: pageEntry.waOffset });

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

      if (frame.frameType === WriteAheadFile.FRAME_TYPE_COMMIT) {
        // Update the instance state.
        this.txId += 1;
        this.activeOffset = offset + frame.byteLength;
  
        tx.id = this.txId;
        tx.dbFileSize = frame.dbFileSize;
        tx.waOffsetEnd = this.activeOffset;
        return tx;
      }

      // frameType === WriteAheadFile.FRAME_TYPE_PAGE
      if (!tx) {
        tx = {
          id: 0, // placeholder
          pages: new Map(),
          dbFileSize: 0, // placeholder
          dbPageSize: frame.pageData.byteLength,
          waOffsetEnd: 0 // placeholder
        };
      }

      tx.pages.set(
        frame.pageOffset,
        {
          pageSize: frame.pageData.byteLength,
          waOffset: offset + WriteAheadFile.FRAME_HEADER_SIZE,
          waSalt1: frame.salt1
       });

      offset += frame.byteLength;
    }
  }

  /**
   * This method is called when transaction(s) have been received by other
   * means than readTx(), e.g. via BroadcastChannel.
   * 
   * @param {number} txId 
   * @param {number} offset 
   */
  skipTx(txId, offset) {
    this.txId = txId;
    this.activeOffset = offset;
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

  #readFileHeader(offset) {
    const headerView = new DataView(new ArrayBuffer(WriteAheadFile.FILE_HEADER_SIZE));
    if (this.activeHandle.read(headerView, { at: offset }) !== headerView.byteLength) {
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
      }
    } else if (frameType === WriteAheadFile.FRAME_TYPE_COMMIT) {
      // Flags byte is currently unused. A possible future use would be
      // to indicate an overwrite commit to trigger clearing the overlay.
      // This might allow a page size change by VACUUM.
      const flags = headerView.getUint8(1);
      return {
        frameType,
        byteLength: WriteAheadFile.FRAME_HEADER_SIZE,
        dbFileSize: Number(headerView.getBigUint64(8)),
        isOverwrite: !!(flags & 0x1)
      }
    }
    throw new Error(`Invalid frame type: ${frameType}`);
  }

  #writeFileHeader(prevSalt1 = this.activeHeader.salt1) {
    // Derive new values from the previous values. Note that salt1 always
    // flips between even and odd so successive headers are written to
    // alternating slots. If the write fails, the file remains in a valid
    // state.
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

    // A header with an even salt1 is written at offset 0, and with an
    // odd salt1 at SECTOR_SIZE.
    const headerOffset = (salt1 & 0x1) ? SECTOR_SIZE : 0;
    const bytesWritten = this.activeHandle.write(headerView, { at: headerOffset });
    if (bytesWritten !== headerView.byteLength) {
      throw new Error('write failed');
    }

    this.activeHandle.flush();
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
