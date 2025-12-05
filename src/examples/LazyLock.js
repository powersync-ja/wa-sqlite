import { Lock } from './Lock.js';

const BROADCAST_INTERVAL_MS = 25;

export class LazyLock extends Lock {
  #channel;
  #isAcquiring = false;
  #hasReleaseRequest = false;

  /**
   * @param {string} name 
   */
  constructor(name) {
    super(name);
    this.#channel = new BroadcastChannel(name);
    this.#channel.onmessage = (event) => {
      if (this.mode || this.#isAcquiring) {
        // We're using the lock so postpone the release.
        this.#hasReleaseRequest = true;
      } else {
        super.release();
      }
    }
  }

  async acquire(mode, timeout = -1) {
    this.#isAcquiring = true;
    try {
      if (mode === this.mode) {
        // We never had to release the lock.
        return true;
      }

      // Release the lock if held in a different mode.
      super.release();

      // Poll for the lock. This isn't necessary but if it works it avoids
      // the BroadcastChannel traffic.
      if (await super.acquire(mode, 0)) {
        return true;
      }

      // Request the lock.
      const pResult = super.acquire(mode, timeout)
      this.#channel.postMessage();

      return await pResult;
    } finally {
      this.#isAcquiring = false;
    }
  }

  release() {
    super.release();
    this.#hasReleaseRequest = false;
  }

  releaseLazy() {
    // Release the lock only if someone else wants it.
    if (this.#hasReleaseRequest) {
      this.release();
    }
  }
}