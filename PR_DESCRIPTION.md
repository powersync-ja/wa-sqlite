# Fix: Clear `retryOps` array after awaiting to prevent connection breakage

## Problem

When an async operation pushed to `Module.retryOps` rejects, the rejected promise remains in the array indefinitely. This causes all subsequent SQLite operations to fail immediately, effectively breaking the database connection until a page refresh.

## Root Cause

The `retry()` function in `sqlite-api.js` awaits all pending retry operations before retrying a SQLite call. Previously, the array was only cleared after a successful `Promise.all()`:

```javascript
// Before (problematic)
if (Module.retryOps.length) {
  await Promise.all(Module.retryOps);
  Module.retryOps = []; // Never reached if Promise.all throws
}
```

If any promise rejects, `Promise.all()` throws and `Module.retryOps = []` is never executed.

## Example Scenario

1. User opens a database file
2. VFS `xOpen` pushes an async operation to `retryOps` (e.g., acquiring a file access handle)
3. The async operation fails (e.g., `createSyncAccessHandle()` throws due to the file being locked by another tab)
4. `Promise.all(Module.retryOps)` rejects
5. The rejected promise stays in `Module.retryOps`
6. **Any subsequent SQLite operation** (queries, transactions, etc.) will:
   - Enter `retry()`
   - Call `Promise.all(Module.retryOps)` which contains the already-rejected promise
   - Immediately throw the same error
   - Never execute any actual SQLite code

The connection is now permanently broken—even unrelated operations that would otherwise succeed will fail.

## Fix

Use a `finally` block to ensure `retryOps` is always cleared, regardless of whether the promises resolve or reject:

```javascript
// After (fixed)
if (Module.retryOps.length) {
  try {
    await Promise.all(Module.retryOps);
  } finally {
    Module.retryOps = []; // Always executed
  }
}
```

This ensures each retry iteration starts with a clean state. The original error still propagates to the caller (as expected), but future operations are not blocked by stale rejected promises.

## Why This is Correct

The `retryOps` mechanism works as follows:

1. Synchronous VFS methods push async operations to the array and return `SQLITE_BUSY`
2. `retry()` awaits all pending ops, then retries the synchronous call
3. Each retry attempt may push **new** async operations

Each iteration should operate on a fresh set of promises. Rejected promises from a failed attempt have no bearing on subsequent attempts—the VFS will push new promises as needed.
