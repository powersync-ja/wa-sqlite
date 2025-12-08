import { Lock } from './Lock.js';

/**
 * @typedef Transaction
 * @property {number} id
 * @property {Map<number, Uint8Array>} pages address to page data mapping
 * @property {number} fileSize
 */

/**
 * @typedef WriteAheadOptions
 * @property {boolean} [create=false] true if database is being created
 */

export class WriteAhead {
  #zName;
  #writeFn;
  #syncFn;
  #options = {
    create: false
  };

  #ready;
  /** @type {'read'|'write'} */ #state = null

  #txId = 0;
  /** @type {Lock} */ #txLock = null;
  #txFileSize = 0;

  /** @type {Map<number, Uint8Array>} */ #waOverlay = new Map();
  /** @type {Map<number, Uint8Array>} */ #txOverlay = new Map();
  /** @type {Map<number, Transaction>} */ #mapIdToTx = new Map();

  #broadcastChannel;

  /** @type {IDBDatabase} */ #idbDb;

  /**
   * @param {string} zName 
   * @param {(offset: number, data: Uint8Array) => void} writeFn 
   * @param {() => void} syncFn
   * @param {WriteAheadOptions} options 
   */
  constructor(zName, writeFn, syncFn, options) {
    this.#zName = zName;
    this.#writeFn = writeFn;
    this.#syncFn = syncFn;
    this.#options = Object.assign(this.#options, options);

    this.#broadcastChannel = new BroadcastChannel(`${zName}#wa`);
    this.#broadcastChannel.onmessage = (event) => {
      if (event.data.type === 'tx') {
        // New transaction from another connection.
        /** @type {Transaction} */ const tx = event.data.tx;
        this.#mapIdToTx.set(tx.id, tx);

        if (this.#state === null) {
          // Not in an isolated state, so advance our view of the database.
          this.#advanceTxId();
        }
      } else if (event.data.type === 'ckpt') {
        // Checkpoint notification from another connection.
        /** @type {number} */ const ckptId = event.data.ckptId;
        this.#handleCheckpoint(ckptId);
      }
    };

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

      // Update our tx lock to reflect the current txId.
      await this.#updateTxLock(this.#txId);
    })();
  }

  /**
   * @returns {Promise<void>}
   */
  ready() {
    return this.#ready;
  }

  close() {
    this.#broadcastChannel.onmessage = null;
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
   * The view includes all transactions.
   * Unfreeze the view with
   * rejoin().
   */
  async isolateForWrite() {
    if (this.#state !== null) {
      throw new Error('Already in isolated state');
    }
    this.#state = 'write';

    // Ensure that we have all previous transactions.
    const { txList, emptyId } = await this.#repoLoad(this.#txId);
    if (txList.length > 0) {
      for (const tx of txList) {
        this.#mapIdToTx.set(tx.id, tx);

        // This transaction wasn't already seen. It may just be a
        // race condition, but it could have been a page crash
        // between writing to IndexedDB and broadcasting. In case
        // of the latter, broadcast the transaction again.
        // TODO: To avoid redundant broadcasts, consider scheduling
        // a broadcast after a short delay and canceling if another
        // broadcast is seen in the meantime. Alternatively, remove
        // this code and schedule periodic checks.
        this.#broadcastChannel.postMessage({ type: 'tx', tx });
      }

      this.#advanceTxId();
    } else {
      this.#txId = emptyId;
    }
  }

  rejoin() {
    this.#state = null;
    this.#txOverlay = new Map();
    this.#advanceTxId();
  }

  /**
   * @param {number} offset 
   * @return {Uint8Array?}
   */
  read(offset) {
    if (offset && this.#state === null) {
      throw new Error('Not in isolated state');
    }

    // Look for the page in any write transaction in progress.
    // Otherwise look in the write-ahead overlay.
    return this.#txOverlay?.get(offset) ?? this.#waOverlay.get(offset) ?? null;
  }

  /**
   * @param {number} offset 
   * @param {Uint8Array} data 
   */
  write(offset, data) {
    if (this.#state !== 'write') {
      throw new Error('Not in write isolated state');
    }

    // Make a copy of the data to avoid external mutation.
    this.#txOverlay.set(offset, data.slice());
  }

  /**
   * @param {number} newSize 
   */
  truncate(newSize) {
    // Nothing needed. Size is tracked from page 1 header in commit().
  }

  getFileSize() {
    return this.#txFileSize;
  }

  commit() {
    if (this.#txOverlay.size === 0) return;
    
    // Get the file size from the page 1 header.
    const page1 = this.#txOverlay.get(0);
    const dataView = new DataView(page1.buffer, page1.byteOffset, 100);
    const pageSize = dataView.getUint16(16);
    const pageCount = dataView.getUint32(28);
    const fileSize = (pageSize === 1 ? 65536 : pageSize) * pageCount;

    // Create a new transaction.
    const tx = {
      id: this.#txId + 1,
      pages: this.#txOverlay,
      fileSize
    };

    // Incorporate the transaction into the local view.
    this.#mapIdToTx.set(tx.id, tx);
    this.#txOverlay = new Map();
    this.#advanceTxId();

    // Persist the transaction to storage, then send to other connections.
    this.#repoStore(tx).then(() => {
      this.#broadcastChannel.postMessage({ type: 'tx', tx });
    }, e => {
      // TODO: handle error
      console.error('IndexedDB write failed', e);
    });
  }

  rollback() {
    // Discard transaction pages.
    this.#txOverlay = new Map();
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

      // Perform a full checkpoint. Write-ahead will be empty afterwards.
      await this.#checkpoint(this.#txId);
    } finally {
      this.#state = null;
    }
  }

  /**
   * Advance the local view of the database.
   */
  #advanceTxId() {
    let tx;
    while (tx = this.#mapIdToTx.get(this.#txId + 1)) {
      // Add transaction pages to the write-ahead overlay.
      for (const [offset, data] of tx.pages) {
        this.#waOverlay.set(offset, data);
      }
      this.#txId = tx.id;
      this.#txFileSize = tx.fileSize;
    }

    this.#updateTxLock(this.#txId);
  }

  /**
   * Move pages from write-ahead to main database file.
   * @param {number} [ckptId] 
   */
  async #checkpoint(ckptId) {
    // Allow only one connection to checkpoint at a time.
    await navigator.locks.request(`${this.#zName}-ckpt`, async () => {
      // If the txId checkpoint is not specified, find the lowest txId
      // in use by any connection.
      if (ckptId === undefined) {
        ckptId = await this.#getLowestUsedTxId();
      }

      // Starting at ckptId and going backwards (earlier), write transaction
      // pages to the main database file. Do not overwrite a page written
      // by a later transaction.
      const writtenOffsets = new Set();
      let tx = { id: ckptId + 1 };
      while (tx = this.#mapIdToTx.get(tx.id - 1)) {
        for (const [offset, data] of tx.pages) {
          if (!writtenOffsets.has(offset)) {
            this.#writeFn(offset, data);
            writtenOffsets.add(offset);
          }
        }
      }

      if (writtenOffsets.size > 0) {
        this.#syncFn();

        // Notify other connections of the checkpoint.
        this.#broadcastChannel.postMessage({ type: 'ckpt', ckptId });

        // Remove checkpointed transactions from write-ahead.
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
      for (const offset of tx.pages.keys()) {
        this.#waOverlay.delete(offset);
      }

      // Remove transaction.
      this.#mapIdToTx.delete(tx.id);
    }
  }

  /**
   * Initialize persistent write-ahead storage.
   * @param {string} zName 
   */
  async #repoInit(zName) {
    // Delete existing IndexedDB database for a new SQLite database.
    if (this.#options.create) {
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
    const newLockName = `${this.#zName}-txId-#${txId}#`;
    if (oldLock?.name !== newLockName) {
      this.#txLock = new Lock(newLockName);
      await this.#txLock.acquire('shared');
      oldLock?.release();
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
    const txLockRegex = new RegExp(`^(.*)-txId-#(\\d+)#$`);
    const { held } = await navigator.locks.query();
    return held
      .map(lock => lock.name.match(txLockRegex))
      .filter(match => match !== null && match[1] === this.#zName)
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
    } else {
      request.onsuccess = () => {
        resolve(request.result);
      };
    }
    request.onerror = () => {
      reject(request.error);
    };
  });
}