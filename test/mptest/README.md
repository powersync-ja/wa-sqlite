# SQLite mptest in a browser

See [investigation findings](FINDINGS.md) for VFS bugs, fixes, validation results
and remaining observations from the browser mptest work.

The five files in `upstream/` are **unchanged** from SQLite 3.47.2, check-in
`2aabe05e2e8cae4847a802ee2daddc1d7413d8fc560254d93ee3e72c14685b6c`.
Source: https://sqlite.org/src/dir?ci=version-3.47.2&name=mptest
The scripts are SQLite public-domain test material. `crash02.subtest` is an
include used by `crash01.test` and `config02.test`, not a standalone suite.

Start the existing development server with `pnpm start`, then open
http://localhost:8000/test/mptest/. Select a build, VFS and suite, or run all
enabled combinations. The table shows disabled combinations and their reasons.
URL parameters `build`, `vfs` and `suite` preselect the controls, for example
`?build=default&vfs=OPFSCoopSyncVFS&suite=crash01.test`.
Use a browser that supports the selected storage APIs, on localhost or HTTPS.
These tests need dedicated Workers but do not require COOP/COEP headers.

Run the Jasmine matrix (including parser/interpreter tests) with:

```sh
pnpm test:mptest
MPTEST_VFS=OPFSCoopSyncVFS MPTEST_BUILD=default MPTEST_SUITE=crash01.test pnpm test:mptest
pnpm test:mptest:manual
```

Each filter accepts comma-separated names. By default, each VFS runs once per
suite: synchronous VFSes use the default build, and asynchronous VFSes use
Asyncify. Runner SQLite checks use the default build. Set `MPTEST_BUILD` to select
other builds or restore the full build matrix:

```sh
MPTEST_BUILD=default,asyncify,jspi pnpm test:mptest
```

Omitted VFS and suite filters select all.
The regular `pnpm test` remains the existing short test suite. mptest has its
own command because the full matrix, particularly `config02.test`, is expensive.

The Yarn resolution patch for `yargs` preserves its CommonJS entry with a `.cjs`
extension. This avoids Node 24.15's loader reading an extensionless module through
a Yarn ZIP file descriptor and failing with `EBADF`. Run `yarn install` after
updating the patch or lockfile.

| VFS                                | multiwrite01 | crash01 | config01 | config02 |
| ---------------------------------- | ------------ | ------- | -------- | -------- |
| default, MemoryVFS, MemoryAsyncVFS | skipped      | skipped | skipped  | skipped  |
| AccessHandlePoolVFS                | skipped      | skipped | skipped  | skipped  |
| IDBBatchAtomicVFS, IDBMirrorVFS    | enabled      | enabled | skipped  | skipped  |
| OPFSAdaptiveVFS, OPFSAnyContextVFS | enabled      | enabled | skipped  | enabled  |
| OPFSCoopSyncVFS, OPFSWriteAheadVFS | enabled      | enabled | skipped  | enabled  |
| OPFSPermutedVFS                    | enabled      | enabled | skipped  | skipped  |

Memory storage is private to each Worker, and AccessHandlePoolVFS owns exclusive
access to its file pool, so neither can run these multi-client scripts.
`config01.test` is entirely guarded by `vfsname() GLOB 'unix'` upstream; that
condition is false for every browser VFS. IDB VFSes and OPFSPermutedVFS cannot change an existing
database's page size, as required by `config02.test`. Async VFSes also exclude
the default WASM build. Browser capability probing excludes unsupported JSPI,
Web Locks, IndexedDB, OPFS and `readwrite-unsafe` access handles. Failures of
supported combinations are reported as failures, not converted to skips.

## Runner semantics

`parser.js` reads SQL and the mptest `--command` language, preserving source
filenames/line numbers, nested conditionals, and task bodies. `script.js`
interprets the directives. Each client has a dedicated Worker with its own
SQLite instance and a connection retained between tasks, matching independent
upstream processes. Scheduling uses Worker messages instead of the upstream
`task`, `client`, and `counters` bookkeeping tables. All suite SQL still accesses
the same database concurrently.

`--finish` completes the task for waiting/scheduling purposes before the client
exits. `--exit 1` terminates its Worker **without closing SQLite or rolling back**.
`--exit 0` closes the connection before termination. Assertions are reported
incrementally so a crash cannot erase earlier results. The runner waits for
actual exits as well as logical completion before cleanup.

SQL output uses `sqlite3_column_text`, preserving SQLite REAL formatting,
NULL as `nil`, whitespace quoting and doubled apostrophes. The runner registers
`vfsname()` and recursive `eval()`, and implements match/glob/notglob, includes,
conditionals, delays and the other mptest directives. SQL statements may omit
their final semicolon. Busy retries apply to preparation or the current step,
never to an entire SQL batch that could replay completed writes.

Browser defaults use full synchronization (equivalent to upstream `--sync`),
10-second busy retries, and 60-second default `--wait` deadlines instead of
upstream's 10 seconds. Explicit script wait deadlines and all `--sleep` delays
retain their original milliseconds. `runSuite()` also accepts `sync`,
`busyTimeout`, `waitTimeout`, an overall `timeout`, an AbortSignal and an event
callback. The overall deadline defaults to ten minutes per combination.
Each run has a unique storage namespace and only deletes its own OPFS directory
and IndexedDB databases. Stopping a run terminates all its Workers.

To update the vendored suites, copy the five files from a pinned SQLite source
checkout, update the revision above, and run parser tests and the enabled matrix.
