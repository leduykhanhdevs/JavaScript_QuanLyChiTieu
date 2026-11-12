import { copyFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const assetDirectory = join(projectRoot, 'worker', 'assets');
const assets = [
  ['public/assets/fonts/BeVietnamPro-Regular.ttf', 'BeVietnamPro-Regular.bin'],
  ['public/assets/fonts/BeVietnamPro-Bold.ttf', 'BeVietnamPro-Bold.bin'],
  ['public/assets/brand-mark.svg', 'brand-mark.bin']
];

mkdirSync(assetDirectory, { recursive: true });
for (const [source, target] of assets) {
  copyFileSync(join(projectRoot, source), join(assetDirectory, target));
}
