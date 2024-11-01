/**
 * This script downloads PowerSync SQLite Core side-module binaries.
 * These modules are placed in the `dist` folder along other binaries.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const CORE_VERSION = 'v0.3.4';

const RELEASE_BASE_URL = `https://github.com/powersync-ja/powersync-sqlite-core/releases/download/${CORE_VERSION}`;
const RELEASE_FILES = [`libpowersync.wasm`, `libpowersync-async.wasm`];

const DIST_DIR = path.resolve(__dirname, '../dist');

async function downloadDynamicCore() {
  for (const file of RELEASE_FILES) {
    console.log(`Downloading ${file}`);

    const fileURL = path.join(RELEASE_BASE_URL, file);
    const response = await fetch(fileURL);
    if (!response.ok) {
      throw new Error(`Could not download PowerSync core files. ${await response.text()}`);
    }

    const distFilePath = path.join(DIST_DIR, file);
    const fileContent = await response.arrayBuffer();
    fs.writeFileSync(distFilePath, Buffer.from(fileContent));
    console.log(`File downloaded to ${distFilePath}`);
  }
}

downloadDynamicCore();
