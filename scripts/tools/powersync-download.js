import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const getPowerSyncVersion = async () => {
  const versionPath = path.resolve(__dirname, '../../powersync-version');
  const versionContent = await fs.readFile(versionPath, 'utf8');
  return versionContent.trim();
};

export const downloadReleaseAsset = async ({ asset, outputPath }) => {
  const version = await getPowerSyncVersion();

  const response = await fetch(
    `https://github.com/powersync-ja/powersync-sqlite-core/releases/download/${version}/${asset}`
  );
  if (!response.ok) {
    throw new Error(`Could not download PowerSync core asset "${asset}". ${await response.text()}`);
  }

  const fileContent = await response.arrayBuffer();
  await fs.writeFile(outputPath, Buffer.from(fileContent));
};
