---
'@journeyapps/wa-sqlite': patch
---

Clear retryOps after waiting for ops. This can fix issues on OPFSCoopSyncVFS where is an access handle failed to be obtained once, it could lock the entire connection indefinitely. 
