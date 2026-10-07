// Support for keeping a VFS's files in a Storage Bucket instead of the
// default bucket of the origin private file system.
// https://wicg.github.io/storage-buckets/

/**
 * Returns a function that gets the directory a VFS keeps its files in: the
 * root of the default origin private file system, or the root of the named
 * Storage Bucket. Each call opens the bucket and requests the directory
 * again, as the VFS requests the default directory, so a bucket the browser
 * deleted, with the rest of the site's data, is created again.
 * @param {string} [storageBucket]
 * @returns {() => Promise<FileSystemDirectoryHandle>}
 */
export function rootDirectory(storageBucket) {
  if (storageBucket == null) {
    return () => navigator.storage.getDirectory();
  }

  // @ts-ignore Storage Buckets are not in the TypeScript DOM library yet.
  const buckets = navigator.storageBuckets;
  if (!buckets) {
    throw new Error(
      `The storageBucket option needs the Storage Buckets API, which this browser does not have`);
  }

  return () => buckets.open(storageBucket).then(bucket => bucket.getDirectory());
}

/**
 * Returns the prefix for Web Lock and BroadcastChannel names a VFS derives
 * from a file name. A file of the same name in another bucket must not share
 * them: connections would wait on each other's locks, and OPFSWriteAheadVFS
 * would apply another database's transactions. Bucket names cannot contain
 * ':', so two buckets never get names that overlap. Without a bucket the
 * names stay as they were, so connections from earlier versions still share
 * them.
 * @param {string} [storageBucket]
 * @returns {string}
 */
export function lockNamePrefix(storageBucket) {
  return storageBucket == null ? '' : `${storageBucket}:`;
}
