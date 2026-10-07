---
"@journeyapps/wa-sqlite": minor
---

Add a `getRoot` option to AccessHandlePoolVFS, OPFSCoopSyncVFS and OPFSWriteAheadVFS: a function returning the directory the VFS keeps its files in, instead of the root of the origin private file system. For example a directory below the root, or the root of a Storage Bucket. Add a `lockPrefix` option to OPFSCoopSyncVFS and OPFSWriteAheadVFS, put in front of the Web Lock and BroadcastChannel names they derive from file names, so that a file of the same name under another root does not share them.
