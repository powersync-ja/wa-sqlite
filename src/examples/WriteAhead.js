import { Lock } from './Lock.js';

const DEFAULT_AUTOCHECKPOINT_PAGES = 1000;
const DEFAULT_HEARTBEAT_INTERVAL = 3000;
const DEFAULT_HEARTBEAT_ACTION_DELAY = 50;

/**
 * @typedef Transaction
 * @property {number} id
 * @property {Map<number, Uint8Array>} pages address to page data mapping
 * @property {number} fileSize
 */

/**
 * @typedef WriteAheadOptions
 * @property {boolean} [create=false] true if database is being created
 * @property {number} [autoCheckpointPages]
 * @property {number} [heartbeatInterval]
 * @property {number} [heartbeatActionDelay]
 * @property {(error: Error) => void} [asyncErrorHandler]
 */

export class WriteAhead {
  log = null;
  /** @type {WriteAheadOptions} */ options = {
    create: false,
    autoCheckpointPages: DEFAULT_AUTOCHECKPOINT_PAGES,
    heartbeatInterval: DEFAULT_HEARTBEAT_INTERVAL,
    heartbeatActionDelay: DEFAULT_HEARTBEAT_ACTION_DELAY,
    asyncErrorHandler: (error) => { console.error(error); }
  };

  #zName;
  #writeFn;
  #truncateFn;
  #syncFn;

  /** @type {Promise<any>} */ #ready;
  /** @type {'read'|'write'} */ #state = null

  #txId = 0;
  /** @type {Lock} */ #txLock = null;
  #txFileSize = 0;

  /** @type {Map<number, Uint8Array>} */ #waOverlay = new Map();
  /** @type {Map<number, Uint8Array>} */ #txOverlay = new Map();
  /** @type {Map<number, Transaction>} */ #mapIdToTx = new Map();
  #nWriteAheadPages = 0;

  #broadcastChannel;
  /** @type {number} */ #heartbeatTimer;

  /** @type {IDBDatabase} */ #idbDb;

  /**
   * @param {string} zName 
   * @param {(offset: number, data: Uint8Array) => void} writeFn
   * @param {(newSize: number) => void} truncateFn
   * @param {() => void} syncFn
   * @param {WriteAheadOptions} options 
   */
  constructor(zName, writeFn, truncateFn, syncFn, options) {
    this.#zName = zName;
    this.#writeFn = writeFn;
    this.#truncateFn = truncateFn;
    this.#syncFn = syncFn;
    this.options = Object.assign(this.options, options);

    // All the asynchronous initialization is done here.
    this.#ready = (async () => {
      // Disable checkpointing by other connections until we're ready.
      await this.#updateTxLock(0);

      // Load all the write-ahead transactions from storage.
      await this.#repoInit(zName);
      const { txList, emptyId } = await this.#repoLoad(0);
      if (txList.length > 0) {
        for (const tx of txList) {
          this.#mapIdToTx.set(tx.id, tx);
        }

        this.#txId = txList[0].id - 1;
        this.#advanceTxId();
      } else {
        this.#txId = emptyId;
      }

      // Listen for transactions and checkpoints from other connections.
      this.#broadcastChannel = new BroadcastChannel(`${zName}#wa`);
      this.#broadcastChannel.onmessage = (event) => {
        this.#handleMessage(event);
      };

      // Update our tx lock to reflect the current txId.
      await this.#updateTxLock(this.#txId);

      // Schedule first heartbeat. The heartbeat is a guard against a crash
      // in another context between persisting a transaction and broadcasting
      // it.
      this.#heartbeat();
    })();
  }

  /**
   * @returns {Promise<void>}
   */
  ready() {
    return this.#ready;
  }

  async close() {
    // Stop asynchronous maintenance.
    this.#broadcastChannel.onmessage = null;
    clearTimeout(this.#heartbeatTimer);

    // Wait for any pending commit to complete.
    await this.#ready;
    this.#txLock?.release();
    this.#broadcastChannel.close();
  }

  /**
   * Freeze our view of the database.
   * The view includes the transactions received so far but is not
   * guaranteed to be completely up to date (this allows this method
   * to be synchronous). Unfreeze the view with rejoin().
   */
  isolateForRead() {
    if (this.#state !== null) {
      throw new Error('Already in isolated state');
    }
    this.#state = 'read';
  }

  /**
   * Freeze our view of the database for writing.
   * The view includes all transactions. Unfreeze the view with rejoin().
   */
  async isolateForWrite() {
    if (this.#state !== null) {
      throw new Error('Already in isolated state');
    }
    this.#state = 'write';

    // Heartbeat is not needed while writing because we will be current.
    clearTimeout(this.#heartbeatTimer);
    this.#heartbeatTimer = null;

    // Wait for our previous write transaction to complete. Note that
    // any error will be caught and passed to asyncErrorHandler.
    await this.#ready;

    // Ensure that we have all previous transactions.
    const { txList, emptyId } = await this.#repoLoad(this.#txId);
    if (txList.length > 0) {
      for (const tx of txList) {
        // Don't overwrite any transactions we already have as that can
        // produce subtle bugs when we need to know if a page belongs to
        // a particular transaction.
        if (!this.#mapIdToTx.has(tx.id)) {
          this.#mapIdToTx.set(tx.id, tx);
        }
      }
      this.#advanceTxId();
    } else {
      this.#txId = emptyId;
    }
  }

  rejoin() {
    if (this.#state === 'write') {
      // Resume heartbeat after write isolation.
      this.#heartbeat();
    } else {
      // Catch up on new transactions that arrived while isolated.
      this.#advanceTxId();
    }
    this.#state = null;
  }

  /**
   * @param {number} offset 
   * @return {Uint8Array?}
   */
  read(offset) {
    // First look for the page in any write transaction in progress.
    // Note that txOverlay may contain data even if not in write state,
    // because a previous transaction is not final until a successful
    // store to the write-ahead repo. If the page is not found in the
    // transaction overlay, look in the write-ahead overlay.
    return this.#txOverlay.get(offset) ?? this.#waOverlay.get(offset) ?? null;
  }

  /**
   * @param {number} offset 
   * @param {Uint8Array} data 
   */
  write(offset, data) {
    if (this.#state !== 'write') {
      throw new Error('Not in write isolated state');
    }

    // Save a copy of the data to avoid external mutation.
    this.#txOverlay.set(offset, data.slice());
  }

  /**
   * @param {number} newSize 
   */
  truncate(newSize) {
    // Nothing needed. Size is tracked from page 1 header in commit().
  }

  getFileSize() {
    // If the overlay is empty, the last file size may no longer be valid
    // if direct changes were made to the main database file.
    return this.#waOverlay.size ? this.#txFileSize : null;
  }

  commit() {
    if (this.#txOverlay.size === 0) return;
    
    // Get the file size from the page 1 header.
    const page1 = this.#txOverlay.get(0);
    if (!page1) {
      // The change counter on page 1 must be updated on every transaction.
      // If page 1 is not here then this must be a non-batch-atomic rollback
      // before page 1 was modified, and we can discard the transaction.
      this.#txOverlay.clear();
      return;
    }
    const dataView = new DataView(page1.buffer, page1.byteOffset, 100);
    const pageCount = dataView.getUint32(28);
    const fileSize = page1.byteLength * pageCount;

    // Create a new transaction.
    const tx = {
      id: this.#txId + 1,
      pages: this.#txOverlay,
      fileSize
    };

    // Persist the transaction to storage, then notify.
    const complete = this.#repoStore(tx).then(() => {
      // Incorporate the transaction into the local view. This is a tricky
      // situation because we can't accept our own transaction until it
      // is persistently stored asynchronously here, while in the meantime
      // we may have moved on to another transaction.
      //
      // If the next transaction is a write transaction, isolateForWrite()
      // will wait for this Promise to complete. If the next transaction
      // is a read transaction, it may start before this Promise completes,
      // so it will read from #txOverlay until then.
      const payload = { type: 'tx', tx };
      this.#handleMessage(new MessageEvent('message', { data: payload }));
      if (this.#state === 'read') {
        this.#advanceTxId();
      }
      this.#txOverlay = new Map();

      // Send the transaction to other connections.
      this.#broadcastChannel.postMessage(payload);
    }, e => {
      this.#txOverlay = new Map();
      this.options.asyncErrorHandler(e);
    });

    this.#ready = Promise.all([this.#ready, complete]);
  }

  rollback() {
    // Discard transaction pages.
    this.#txOverlay.clear();
  }
  
  /**
   * Flush the write-ahead transactions to the main database file.
   * There must be no other connections reading or writing.
   */
  async flush() {
    if (this.#state !== null) {
      throw new Error('Already in isolated state');
    }

    try {
      // Make sure we have every transaction.
      await this.isolateForWrite();
      this.rejoin();

      // Disable heartbeat as a minor optimization.
      clearTimeout(this.#heartbeatTimer);
      this.#heartbeatTimer = null;

      // Perform a full checkpoint. Write-ahead will be empty afterwards.
      await this.#checkpoint(this.#txId, { ifAvailable: false });
    } finally {
      this.#state = null;
      this.#heartbeat();
    }
  }

  /**
   * Advance the local view of the database.
   */
  #advanceTxId() {
    const oldTxId = this.#txId;

    // Look up the next transaction one at a time. This will stop if there
    // are any missing transactions, which will be filled in later either
    // for write isolation or by the heartbeat.
    let tx;
    while (tx = this.#mapIdToTx.get(this.#txId + 1)) {
      // Add transaction pages to the write-ahead overlay.
      for (const [offset, data] of tx.pages) {
        this.#waOverlay.set(offset, data);
      }
      this.#nWriteAheadPages += tx.pages.size;

      this.#txId = tx.id;
      this.#txFileSize = tx.fileSize;
    }

    if (this.#txId !== oldTxId) {
      this.#updateTxLock(this.#txId);
    }
  }

  /**
   * Move pages from write-ahead to main database file.
   * @param {number} [ckptId] 
   * @param {LockOptions} [lockOptions]
   */
  async #checkpoint(ckptId, lockOptions = { ifAvailable: true }) {
    // Allow only one connection to checkpoint at a time. The default
    // lockOptions argument will skip everything if another connection
    // is already checkpointing. This is suitable for heartbeat-initiated
    // checkpoints. For a checkpoint initiated by flush(), we should
    // block until we can checkpoint ourselves.
    await navigator.locks.request(`${this.#zName}-ckpt`, lockOptions, async lock => {
      if (!lock) return;

      // If the txId checkpoint is not specified, find the lowest txId
      // in use by any connection.
      if (ckptId === undefined) {
        ckptId = await this.#getLowestUsedTxId();
      }

      // Starting at ckptId and going backwards (earlier), write transaction
      // pages to the main database file. Do not overwrite a page written
      // by a later transaction.
      const writtenOffsets = new Set();
      let fileSize = 0;
      let tx = { id: ckptId + 1 };
      while (tx = this.#mapIdToTx.get(tx.id - 1)) {
        if (tx.id === ckptId) {
          // Set the file size from the latest transaction. This may be
          // unnecessary as SQLite is not known to reduce the database size
          // except with VACUUM.
          fileSize = tx.fileSize;
          this.#truncateFn(fileSize);
        }

        for (const [offset, data] of tx.pages) {
          if (offset < fileSize && !writtenOffsets.has(offset)) {
            this.#writeFn(offset, data);
            writtenOffsets.add(offset);
          }
        }
      }

      if (writtenOffsets.size > 0) {
        // Ensure data is safely in the file.
        this.#syncFn();

        // Notify other connections and ourselves of the checkpoint.
        this.#broadcastChannel.postMessage({ type: 'ckpt', ckptId });
        this.#handleCheckpoint(ckptId);

        // Remove checkpointed transactions from persistent storage.
        this.#repoDeleteUpTo(ckptId);
      }
    });
  }

  /**
   * After a checkpoint, remove checkpointed pages from write-ahead.
   * The checkpoint may be been done locally or by another connection.
   * @param {number} ckptId 
   */
  #handleCheckpoint(ckptId) {
    // Loop backwards from ckptId.
    let tx = { id: ckptId + 1 };
    while (tx = this.#mapIdToTx.get(tx.id - 1)) {
      // Remove pages from write-ahead overlay.
      for (const [offset, page] of tx.pages.entries()) {
        // Be sure not to remove a newer version of the page.
        const overlayPage = this.#waOverlay.get(offset);
        if (overlayPage === page) {
          this.#waOverlay.delete(offset);
        }
      }

      // Remove transaction.
      this.#mapIdToTx.delete(tx.id);
    }

    const oldCount = this.#nWriteAheadPages;

    // Recalculate the number of pages in write-ahead.
    this.#nWriteAheadPages = 0;
    for (const tx of this.#mapIdToTx.values()) {
      this.#nWriteAheadPages += tx.pages.size;
    }

    this.log?.(`%cCheckpoint to txId ${ckptId}, ${oldCount} -> ${this.#nWriteAheadPages} pages in write-ahead`, 'background-color: lightgreen;');
  }

  /**
   * @param {MessageEvent} event 
   */
  #handleMessage(event) {
    if (event.data.type === 'tx') {
      // New transaction from another connection. Don't use it if we
      // already have it.
      /** @type {Transaction} */ const tx = event.data.tx;
      if (!this.#mapIdToTx.has(tx.id)) {
        this.#mapIdToTx.set(tx.id, tx);

        if (this.#state === null) {
          // Not in an isolated state, so advance our view of the database.
          this.#advanceTxId();
        }
      }
    } else if (event.data.type === 'ckpt') {
      // Checkpoint notification from another connection.
      /** @type {number} */ const ckptId = event.data.ckptId;
      this.#handleCheckpoint(ckptId);
    }
  }

  /**
   * Periodic check for missing transactions and checkpointing.
   */
  async #heartbeat() {
    try {
      if (this.#heartbeatTimer) {
        // Auto-checkpoint when the write-ahead overlay exceeds the
        // checkpoint threshold.
        if (this.#nWriteAheadPages >= this.options.autoCheckpointPages) {
          this.#checkpoint();
        }
        
        // Check whether we are missing the next transaction.
        const nextLocalTxId = this.#txId + 1;
        const lastRepoTxId = await this.#repoLastTxId();
        if (this.#txId < lastRepoTxId && !this.#mapIdToTx.has(nextLocalTxId)) {
          // There are transactions in the repository that we have not received
          // a broadcast for. This could be due to a crash in another context
          // or simply unlucky timing. In case of bad timing, use a brief
          // delay to allow any pending broadcasts to arrive.
          self.setTimeout(async () => {
            // Repeat the check.
            if (this.#txId < nextLocalTxId && !this.#mapIdToTx.has(nextLocalTxId)) {
              // Still missing the next transaction, so load it from the
              // repository.
              const { txList } = await this.#repoLoad(this.#txId);

              // Simulate a broadcast message for this transaction.
              this.#handleMessage(
                new MessageEvent('message', { data: { type: 'tx', tx: txList[0] } }));
            }
          }, this.options.heartbeatActionDelay);
        }
      }
    } catch (e) {
      console.error('Heartbeat failed', e);
    }

    // Schedule next heartbeat. Add a bit of jitter to decorrelate
    // heartbeats across multiple connections.
    const delay = this.options.heartbeatInterval * (0.9 + 0.2 * Math.random());
    this.#heartbeatTimer = self.setTimeout(() => {
      this.#heartbeat();
    }, delay);
  }

  /**
   * Initialize persistent write-ahead storage.
   * @param {string} zName 
   */
  async #repoInit(zName) {
    // Delete existing IndexedDB database for a new SQLite database.
    if (this.options.create) {
      await idbWrap(indexedDB.deleteDatabase(zName));
    }

    // Open IndexedDB database.
    const idbRequest = indexedDB.open(zName, 1);
    idbRequest.onupgradeneeded = (event) => {
      const db = idbRequest.result;
      const store = db.createObjectStore('txStore');

      // Insert the initial marker.
      store.put({ id: 1 }, 1);
    };

    this.#idbDb = await idbWrap(idbRequest);
  }
  
  /**
   * Delete transactions through txId from persistent storage.
   * @param {number} txId 
   * @returns 
   */
  async #repoDeleteUpTo(txId) {
    const idbTx = this.#idbDb.transaction('txStore', 'readwrite');
    const results = Promise.all([
      idbTx.objectStore('txStore').delete(IDBKeyRange.upperBound(txId)),
      idbTx
    ].map(idbWrap));
    idbTx.commit();

    return results;
  }

  /**
   * Get the last transaction id for the database.
   * @returns {Promise<number>}
   */
  async #repoLastTxId() {
    const idbTx = this.#idbDb.transaction('txStore', 'readonly');
    const idbTxStore = idbTx.objectStore('txStore');
    const marker = await new Promise((resolve, reject) => {
      // Use a cursor with 'prev' direction to get the last key
      // in the store. This will be the end marker, which will
      // be the *next* transaction id.
      const request = idbTxStore.openKeyCursor(null, 'prev');
      request.onsuccess = () => {
        const cursor = request.result;
        if (cursor) {
          resolve(cursor.key);
        } else {
          reject(new Error('Invalid repository state'));
        }
      };
      request.onerror = () => {
        reject(request.error);
      };
    });
    idbTx.commit();
    return marker - 1;
  }

  /**
   * Load transactions from persistent storage starting from txId + 1.
   * @param {number} txId
   * @returns {Promise<{ txList: Transaction[], emptyId: number}>}
   */
  async #repoLoad(txId) {
    const idbTx = this.#idbDb.transaction('txStore', 'readonly');
    const idbTxStore = idbTx.objectStore('txStore');

    // Get all transactions with id > txId.
    const request = idbTxStore.getAll(IDBKeyRange.lowerBound(txId, true));
    /** @type {Transaction[]} */ const txList = await idbWrap(request);
    idbTx.commit();

    // The last object in the store is the end marker, which contains
    // no data. Its purpose is to provide the txId when write-ahead
    // is empty.
    const marker = txList.pop();
    return { txList, emptyId: marker.id - 1 };
  }

  /**
   * Copy a new transaction to persistent storage.
   * @param {Transaction} tx 
   */
  async #repoStore(tx) {
    const idbTx = this.#idbDb.transaction('txStore', 'readwrite');
    const idbTxStore = idbTx.objectStore('txStore');
    
    const results = [
      idbTxStore.put(tx, tx.id), // overwrite the current end marker
      idbTxStore.put({ id: tx.id + 1 }, tx.id + 1), // new end marker
      idbTx
    ].map(idbWrap);
    idbTx.commit();
    return Promise.all(results);
  }

  /**
   * Update the lock that publishes our current txId.
   * @param {number} txId 
   */
  async #updateTxLock(txId) {
    // Our view of the database, i.e. the txId, is encoded into the name
    // of a lock so other connections can see it. When our txId changes,
    // we acquire a new lock and release the old one. We must not release
    // the old lock until the new one is in place.
    const oldLock = this.#txLock;
    const newLockName = `${this.#zName}-txId<${txId}>`;
    if (oldLock?.name !== newLockName) {
      this.#txLock = new Lock(newLockName);
      await this.#txLock.acquire('shared');
      oldLock?.release();

      this.log?.(`%ctxId to ${txId}`, 'background-color: lightblue;');
    }
  }

  /**
   * Find the globally lowest txId held by any connection.
   * @returns {Promise<number>}
   */
  async #getLowestUsedTxId() {
    // * Get all held locks.
    // * Find those that match the txId lock name pattern.
    // * Extract the txId from the lock name.
    // * Return the lowest txId found.
    const txLockRegex = new RegExp(`^(.*)-txId<(\\d+)>$`);
    const { held } = await navigator.locks.query();
    return held
      .map(lock => lock.name.match(txLockRegex))
      .filter(match => match?.[1] === this.#zName)
      .map(match => parseInt(match[2]))
      .reduce((min, txId) => Math.min(min, txId), this.#txId);
  }
}

/**
 * Convert IndexedDB callbacks to Promises.
 * @param {IDBRequest|IDBTransaction} request 
 * @returns 
 */
function idbWrap(request) {
  return new Promise((resolve, reject) => {
    if (request instanceof IDBTransaction) {
      request.oncomplete = () => {
        resolve();
      };
      request.onabort = () => {
        reject(request.error ?? new Error('transaction aborted'));
      };
    } else {
      request.onsuccess = () => {
        resolve(request.result);
      };
      request.onerror = () => {
        reject(request.error);
      };
    }
  });
}
