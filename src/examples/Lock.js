// This is a convenience wrapper for the Web Locks API.
export class Lock {
  #name;
  /** @type {LockMode?} */ #mode = null;
  #releaser = null;

  /**
   * @param {string} name 
   */
  constructor(name) {
    this.#name = name;
  }

  get name() { return this.#name; }
  get mode() { return this.#mode; }

  close() {
    this.release();
  }
  
  /**
   * @param {'shared'|'exclusive'} mode 
   * @param {number} timeout -1 for infinite, 0 for poll, >0 for milliseconds
   * @return {Promise<boolean>} true if lock acquired, false on timeout
   */
  async acquire(mode, timeout = -1) {
    if (this.#releaser) {
      throw new Error(`Lock ${this.#name} is already acquired`);
    }
    return new Promise((resolve, reject) => {
      /** @type {LockOptions} */
      const options = { mode, ifAvailable: timeout === 0 };
      let timeoutId;
      if (timeout > 0) {
        const abortController = new AbortController();
        timeoutId = self.setTimeout(() => {
          abortController.abort();
        }, timeout);
        options.signal = abortController.signal;
      }

      navigator.locks.request(this.#name, options, lock => {
        if (timeoutId) clearTimeout(timeoutId);
        if (lock === null) {
          // Polling (with timeout = 0) did not acquire the lock.
          return resolve(false);
        }

        // Lock acquired. The lock is released when this returned
        // Promise is resolved.
        this.#mode = mode;
        return new Promise(releaser => {
          this.#releaser = releaser;
          resolve(true);
        })
      }).catch(e => {
        if (e.name === 'AbortError') {
          // Timeout expired while waiting for the lock.
          return resolve(false);
        }
        return reject(e);
      });
    });
  }

  release() {
    this.#releaser?.();
    this.#releaser = null;
    this.#mode = null;
  }
}
