---
"@journeyapps/wa-sqlite": minor
---

Add a `storageBucket` option to AccessHandlePoolVFS, OPFSCoopSyncVFS and OPFSWriteAheadVFS, to keep the database files in a Storage Bucket instead of the default bucket of the origin private file system. Lock and BroadcastChannel names of a file in a bucket are prefixed with the bucket name, so a file of the same name in another bucket does not share them.
