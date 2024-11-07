/**
 * This script downloads PowerSync SQLite Core static WASM binaries.
 * This is used in the linking phase of a statically linked WA-SQLite-PowerSync WASM distributable.
 */
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { downloadReleaseAsset } from './tools/powersync-download.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const BUILD_FILES = [`libpowersync-wasm.a`];

const LIBS_DIR = path.resolve(__dirname, '../powersync-libs');

async function directoryExists(path) {
  try {
    const stats = await fs.stat(path);
    return stats.isDirectory();
  } catch (error) {
    if (error.code === 'ENOENT') {
      // Directory does not exist
      return false;
    }
    // Some other error occurred
    throw error;
  }
}

async function downloadDynamicCore() {
  const exists = await directoryExists(LIBS_DIR);
  if (!exists) {
    await fs.mkdir(LIBS_DIR);
  }

  for (const asset of BUILD_FILES) {
    await downloadReleaseAsset({
      asset,
      outputPath: path.join(LIBS_DIR, asset)
    });
  }
}

downloadDynamicCore();
