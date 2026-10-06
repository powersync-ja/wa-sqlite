// Interrupt VACUUM after its recovery map is saved but during the canonical
// overwrite. A torn header at offset 0 must not hide the intact mapped copy.
import { OPFSPermutedVFS } from '../src/examples/OPFSPermutedVFS.js';
import * as VFS from '../src/VFS.js';

let vacuumFile;
const control = OPFSPermutedVFS.prototype.jFileControl;
OPFSPermutedVFS.prototype.jFileControl = async function (fileId, op, arg) {
  const rc = await control.call(this, fileId, op, arg);
  if (
    op === VFS.SQLITE_FCNTL_OVERWRITE &&
    (rc === VFS.SQLITE_OK || rc === VFS.SQLITE_NOTFOUND)
  )
    vacuumFile = fileId;
  return rc;
};
const write = OPFSPermutedVFS.prototype.jWrite;
OPFSPermutedVFS.prototype.jWrite = async function (fileId, data, offset) {
  if (fileId === vacuumFile && offset === 0) {
    const torn = data.slice();
    torn.fill(0, 0, 100);
    const rc = write.call(this, fileId, torn, offset);
    if (rc !== VFS.SQLITE_OK) return rc;
    postMessage({ type: 'vacuum-write' });
    // The parent terminates us without closing or rolling back the database.
    await new Promise(() => {});
  }
  return write.call(this, fileId, data, offset);
};

import './mptest/worker.js';
