---
'@journeyapps/wa-sqlite': patch
---

Drain parallel OPFSCoopSyncVFS access handle opens before cleaning up failures. Retry transient NoModificationAllowedError contention for up to three seconds while holding the cooperative Web Lock, and retain the failing file and underlying error for diagnostics.
