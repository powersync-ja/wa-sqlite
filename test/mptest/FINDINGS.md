# Browser mptest investigation findings

This records the issues found while bringing SQLite's upstream mptest suites to
the browser and investigating the VFS failures. It covers the fixes through
`bc60ca8` on 2026-10-06. The validation below records the targeted runs completed
during those investigations; it is not a fresh result for the entire VFS matrix.

The upstream scripts remain unchanged. See [the runner README](README.md) for
their pinned source revision, browser adaptations, supported combinations and
commands.

## What the tests exercise

- `multiwrite01.test` runs independent clients against the same database, checking
  concurrent writes, reads, VACUUM and integrity.
- `crash01.test` repeatedly terminates a writer during an uncommitted transaction.
  Large writes and a small page cache make SQLite spill changes into the main
  database before commit. Surviving connections must discover the hot rollback
  journal, restore the previous committed state and pass integrity checks.
- `config02.test` repeats the write and crash workloads with different page sizes,
  auto-vacuum settings and client configurations. It changes existing database
  page sizes through VACUUM, so page-size support matters.

Each browser client has a separate Worker and SQLite instance, with its connection
retained between tasks. A crash terminates that Worker without closing SQLite or
rolling back. This exercises worker termination and recovery, not physical power
loss or every browser's storage durability behavior.

## Results and status

| Component         | Finding                                                         | Status                                         |
| ----------------- | --------------------------------------------------------------- | ---------------------------------------------- |
| OPFSCoopSyncVFS   | Web Lock handoff can precede browser access-handle cleanup      | Bounded retry added                            |
| OPFSCoopSyncVFS   | Stale sidecar cache can hide a hot journal                      | Sidecar presence refreshed under the lock      |
| OPFSWriteAheadVFS | Page-size reread loses the write hint                           | Hint preserved for the internal retry          |
| OPFSWriteAheadVFS | Default read view can lag a committed transaction               | mptest enables the existing latest-read option |
| OPFSPermutedVFS   | VACUUM loses logical truncation                                 | Transaction size and mappings updated          |
| OPFSPermutedVFS   | Reclamation can free a currently mapped physical page           | Current mappings protected                     |
| OPFSPermutedVFS   | Private rollback/recovery transaction survives unlock           | Uncommitted private state discarded            |
| OPFSPermutedVFS   | VACUUM leaves obsolete durable mappings and transaction history | Complete recovery and final maps checkpointed  |
| OPFSPermutedVFS   | Startup assumes the database header is at physical offset zero  | Header read from mapped page 1                 |
| Test command      | Node/Yarn PnP loader fails with `EBADF`                         | `yargs` entry-point patch added                |

### OPFSCoopSyncVFS: access-handle cleanup after a crash

After the writer Worker was terminated, another connection acquired the database's
Web Lock almost immediately, but the browser had not yet released the terminated
Worker's exclusive OPFS access handles. Attempts to acquire the database and
sidecar handles failed with `NoModificationAllowedError`. In one trace the Web
Lock was granted about 0.2 ms after exit, while all three handle acquisitions
still failed.

The delay was in browser cleanup of the terminated Worker, rather than the old
VFS instance deliberately holding its Web Lock longer. The VFS had assumed that
receiving the Web Lock also meant those handles were immediately available.

In practice this can happen when a worker or tab disappears and another
connection immediately opens or accesses the database. It blocks opening or
recovery even though the VFS lock protocol has handed over ownership. This race
alone did not demonstrate damaged database contents.

The fix retries only `NoModificationAllowedError`, every 10 ms for up to one
second, while retaining the Web Lock. Other errors propagate immediately. The
deadline also prevents an indefinite wait when a context outside the VFS lock
protocol owns a handle.

[Handle recovery tests](../vfs_handle_recovery.js) include a handle released
50 ms after opening starts. The fix is in
[OPFSCoopSyncVFS](../../src/examples/OPFSCoopSyncVFS.js), commit `99853a4`.

### OPFSCoopSyncVFS: a surviving connection misses the hot journal

The VFS cached whether the journal existed when a connection opened. Another
Worker could subsequently create a journal, spill uncommitted changes into the
main database and crash. The surviving connection's cached `xAccess` answer still
said the journal did not exist. One trace showed a 187,904-byte journal while that
connection reported it absent.

SQLite then skipped the rollback needed before reading the database. A focused
reproduction expected 64 rows with a total blob length of 96,000; it instead saw
32 rows and a total length of 20,000, with integrity errors including out-of-order
rowids.

The practical trigger is a crash during a transaction large enough to spill
pages, with another connection remaining open. The surviving connection can see
an inconsistent mixture of committed and uncommitted pages. Integrity failures
and malformed-database symptoms are plausible consequences; this reproduction
did not establish a `not a database` error for this VFS.

The fix refreshes journal and WAL presence after acquiring the Web Lock and all
access handles. In this VFS, deletion truncates sidecars to zero, so their current
sizes determine presence. The focused test retains a reader with a small cache,
terminates the writer without closing it, and verifies the original rows and
`integrity_check = ok`.

Implementation and regression coverage are in
[OPFSCoopSyncVFS](../../src/examples/OPFSCoopSyncVFS.js) and
[handle recovery tests](../vfs_handle_recovery.js), commit `99853a4`.

### OPFSWriteAheadVFS: page-size reread loses the write hint

SQLite sends this VFS a write hint before acquiring a transaction's locks. If an
existing connection discovers a changed page size while reading page 1, SQLite
unlocks and retries with the new size. That internal retry does not send the hint
again. The VFS cleared the hint on unlock, so the retry acquired a read view and
then rejected the write-lock upgrade with `Write transaction cannot use BEGIN
DEFERRED`. This was misleading: an ordinary UPDATE could trigger it.

The SQL-level result was `disk I/O error` in all three builds. A practical trigger
is connection A changing the page size through VACUUM, followed by connection B,
which still has the old size cached, attempting a write. The rejection itself did
not demonstrate storage corruption.

The first `config02` failure already involved this transition: the supervisor
requested 512-byte pages, clients initially created tables using 4096-byte pages,
and the first included VACUUM applied the supervisor's requested size. The failure
therefore occurred before the later explicit page-size changes in the script.

The fix detects a page-size mismatch in a complete page-1 read and preserves the
hint across that one internal retry. Other unlocks still clear it. The
[page-size retry test](../vfs_page_size_retry.js) changes the size to 512 and then
8192 through another connection, verifies successful writes and integrity, and
checks that a later read does not retain write behavior or block another writer.

Implementation: [OPFSWriteAheadVFS](../../src/examples/OPFSWriteAheadVFS.js),
commit `48bd0bc`. The SQLite hint/reread ordering can also be seen in the local
SQLite source's `btree.c`, in the write-hint call preceding the `lockBtree` retry
loop.

### OPFSWriteAheadVFS: the default read view can lag a commit

After fixing the write hint, `config02` could still report `no such table: pgsz`
just after another client created that table. The default
`WriteAhead.options.readToCurrent = false` allows a new read to use a view that
has not yet received queued transaction broadcasts. The worker may therefore
temporarily see an older, internally consistent database.

This is a consistency-setting mismatch with upstream mptest's expected
cross-client visibility, rather than evidence that the table's stored bytes were
corrupted. It can affect an application that expects a read begun after another
client's commit to include that commit, especially while its worker is busy and
broadcast delivery is delayed.

The existing `PRAGMA wal_read_latest=1` forces new reads to include committed WAL
transactions without waiting for their broadcast events. The
[mptest SQLite adapter](sqlite.js) now enables it for OPFSWriteAheadVFS. The VFS's
application default remains unchanged; applications requiring this freshness must
select it themselves. The
[read freshness test](../vfs_read_freshness.js) delays event delivery while another
worker commits and verifies visibility before the queued event is handled.

The adapter change is part of `48bd0bc`.

### OPFSPermutedVFS: VACUUM loses logical truncation

This VFS maps logical SQLite pages to physical file offsets. During VACUUM it
compacts them into canonical offsets. Its truncation branch excluded overwrite
transactions, so it physically shortened the file without updating the active
transaction's logical size or removing mappings past the new end. Commit could
then grow the file back and publish obsolete tail mappings.

A focused case expected an 8192-byte compacted file but got the original
139,264-byte physical size. The upstream workload also encountered malformed
database errors after VACUUM and subsequent larger writes. This can occur with
ordinary, same-page-size VACUUM; it is separate from this VFS's unsupported
page-size changes.

The fix always records main-database truncation in the transaction's size and
page map. VACUUM's physical truncation is deferred until its commit sequence.
This is part of `a92d566`.

### OPFSPermutedVFS: reclamation frees a live physical page

VACUUM reuses canonical offsets that older transaction records may still list as
obsolete. When accepting a new transaction, the VFS removed its newly used offsets
from the free list, then historical reclamation could add those same offsets back.
A following writer could allocate a slot still mapped to another committed page.

The trigger is a compacting VACUUM followed by further writes while older
reclamation history remains. Overwriting a live page can lose committed data and
persist corruption. `database disk image is malformed` was observed in the
investigation.

The fix checks the complete current page map before reclaiming an offset. An
offset still mapped to any page cannot become free. This guard, added in
`a92d566`, remains useful alongside the later checkpoint changes.

### OPFSPermutedVFS: private recovery state survives unlock

Rollback and hot-journal playback write restored pages into the VFS's private
copy-on-write transaction. SQLite does not send `COMMIT_PHASETWO` for that recovery
path. The VFS left the private transaction active after unlocking, so later reads
used private offsets and a private file size that were neither committed in
IndexedDB nor protected as a shared view.

Another writer could reuse those physical slots. In a trace, recovery wrote a
valid SQLite page-1 header at private offset 131,072; a later read used that same
private offset after it contained unrelated blob data. The committed mapping at
offset 118,784 still held the valid page.

In practice this affects a surviving connection after crash recovery, followed
by another connection writing. Upstream `crash01` produced `file is not a
database` in both Asyncify and JSPI builds.

The fix discards remaining private transaction state when the lock is downgraded
to SHARED or below. A committed transaction has already been cleared by
`COMMIT_PHASETWO`. Upstream `crash01` is the definitive reproduction: the smaller
new repeated-crash fixture also validates recovery, but happened to pass the
original implementation and should not be described as reproducing this bug on
its own. The fix is part of `bc60ca8`.

### OPFSPermutedVFS: durable VACUUM metadata is inconsistent

After the preceding fixes made the live upstream workloads pass, closing and
reopening immediately after VACUUM still exposed `not a database` failures.
VACUUM had relocated old pages and overwritten canonical offsets, but the durable
base map and older pending checksums could still reference offsets whose contents
had moved, changed or been truncated. Reopening could reject valid newer state or
use an invalid old mapping. Later normal commits could also checkpoint older
in-memory mappings over the newly compacted base map.

Practical triggers include VACUUM followed by reopen, termination partway through
VACUUM, or a subsequent normal write and reopen. These failures concern persisted
recovery state, not just one connection's cached view.

The fix makes both overwrite preparation and final commit establish complete
durable maps:

- Before overwriting canonical pages, flush the relocated recovery copies and
  atomically replace the IndexedDB page map with their locations.
- At VACUUM commit, flush the final pages and atomically replace that map with the
  final canonical locations.
- Clear obsolete pending history while retaining a transaction marker containing
  the transaction ID, file size and checkpoint flag. The flag also clears stale
  in-memory history in receiving connections.
- Use strict IndexedDB durability for these VACUUM operations even under
  `synchronous=NORMAL`, await completion and other live views' acknowledgements,
  then physically truncate and flush.

The [OPFSPermutedVFS tests](../OPFSPermutedVFS.test.js) cover physical and logical
compaction, immediate reopen, subsequent growth and another reopen under both
FULL and NORMAL. The fix is part of `bc60ca8`.

### OPFSPermutedVFS: startup reads the wrong header location

An interrupted VACUUM can leave physical offset zero partly overwritten while a
valid recovery copy of logical page 1 exists elsewhere. Startup read the page
size from physical offset zero rather than the durable mapping. An invalid header
could yield an invalid or zero page size, causing a failed open or a startup
allocation loop that made no progress despite a recoverable page-1 copy.

The fix reads the header at the mapped page-1 offset, including during initial
open before the in-memory map is established. A
[fault-injection worker](../vfs_permuted_vacuum_crash-worker.js) pauses after writing
a zeroed 100-byte header during VACUUM's first canonical page write. The parent
terminates it, then a fresh connection verifies the original row and integrity.
This is deliberate torn-write simulation with worker termination, not a hardware
power-loss guarantee. The fix and test are part of `bc60ca8`.

All OPFSPermuted fixes are in
[OPFSPermutedVFS](../../src/examples/OPFSPermutedVFS.js), with focused coverage in
[its VFS tests](../OPFSPermutedVFS.test.js).

## Interpreting the error messages

| Symptom                                               | Connection to these findings                                                                                                           |
| ----------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| `NoModificationAllowedError`                          | Directly observed during OPFSCoopSync access-handle cleanup; an availability failure, not proof of damaged bytes                       |
| `disk I/O error`                                      | Directly observed for OPFSWriteAhead's lost write hint; the rejected operation was not shown to corrupt storage                        |
| `no such table`                                       | Observed with OPFSWriteAhead's lagging read view; can represent older schema visibility                                                |
| `database disk image is malformed` / integrity errors | Observed in OPFSPermuted workloads and OPFSCoopSync's missed-journal reproduction; incorrect page contents or recovery can cause these |
| `file is not a database`                              | Directly observed in OPFSPermuted crash/reopen failures when page 1 resolved to invalid bytes                                          |

These SQLite messages are not unique diagnoses. The same text in another
application needs its own reproduction and storage/lock evidence.

## Validation completed during the investigations

| VFS               | Builds                  | Upstream suites passed                                | Additional validation                                                                      |
| ----------------- | ----------------------- | ----------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| OPFSCoopSyncVFS   | default, Asyncify, JSPI | `multiwrite01`, `crash01`, `config02`: 9 combinations | Combined matrix and regular VFS run: 147 reported assertions                               |
| OPFSWriteAheadVFS | default, Asyncify, JSPI | `multiwrite01`, `crash01`, `config02`: 9 combinations | Regular VFS run: 120 reported assertions, including page-size retry and freshness coverage |
| OPFSPermutedVFS   | Asyncify, JSPI          | `multiwrite01`, `crash01`: 4 combinations             | Combined run: 72 reported assertions, including 8 focused cases across the two builds      |

The eight focused OPFSPermuted cases cover FULL/NORMAL compaction and reopening,
repeated crash recovery, and interrupted VACUUM. Comparing the compaction cases
against the original implementation reproduced the incorrect physical size and
reopen failures. Counts describe different test runs and should not be added as
though they were a single repository-wide run.

“Runner checks” validate parsing, directives and the SQLite adapter. Matrix tests
execute the upstream workloads against actual VFS/build combinations. The tests
are not all Asyncify: synchronous VFSes also run the default build, while async
VFSes require Asyncify or JSPI.

## Expected exclusions and remaining observations

`config02` is intentionally disabled for IDBBatchAtomicVFS, IDBMirrorVFS and
OPFSPermutedVFS because they cannot change an existing database's page size.
OPFSWriteAheadVFS supports that operation, so its failure required a fix.
OPFSPermuted's same-size VACUUM failures also required fixes despite that exclusion.

`config01` is guarded upstream by `vfsname() GLOB 'unix'`; it is disabled for all
browser VFSes. Memory VFSes have worker-private storage, and AccessHandlePoolVFS
owns exclusive access to its pool, so the multi-client suites are disabled for
them. Async VFSes exclude the default build. Browser capability checks separately
exclude unavailable APIs. These are unsupported combinations, not passing tests.

Earlier matrix runs also recorded an OPFSAnyContextVFS `config02` timeout at the
60-second wait deadline and an IDBMirrorVFS/JSPI `multiwrite01` output mismatch
(expected empty output). Those observations were not diagnosed or reconfirmed in
the final targeted runs above. They remain follow-up items; the fixes documented
here do not establish that every enabled VFS combination passes.

## Test-command loader failure

The initial `test:mptest` launch could fail under Node 24.15 with
`EBADF: bad file descriptor, fstat`, before any browser test ran. The Yarn PnP ZIP
loader and `yargs`' extensionless CommonJS entry point were involved. The
[Yarn patch](../../.yarn/patches/yargs-npm-17.7.2-80b62638e1.patch) preserves that
entry with a `.cjs` extension, with package resolutions selecting the patch.
Dependencies must be installed after updating it or the lockfile. The accompanying
`punycode` deprecation warning is separate and was not the cause of the failure.
