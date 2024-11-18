/**
 * This script downloads PowerSync SQLite Core side-module binaries.
 * These modules are placed in the `dist` folder along other binaries.
 */
import path from 'path';
import { fileURLToPath } from 'url';
import { downloadReleaseAsset } from './tools/powersync-download.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const RELEASE_FILES = [`libpowersync.wasm`, `libpowersync-async.wasm`];

const DIST_DIR = path.resolve(__dirname, '../dist');

async function downloadDynamicCore() {
  try {
    for (const asset of RELEASE_FILES) {
      await downloadReleaseAsset({
        asset,
        outputPath: path.join(DIST_DIR, asset)
      });
    }
  } catch (ex) {
    console.warn(
      `Could not download PowerSync SQLite core for dynamic linking. Dynamic builds require ${RELEASE_FILES.join(
        '/'
      )} asset files. Static builds should still function correctly. ${ex}`
    );
  }
}

downloadDynamicCore();
