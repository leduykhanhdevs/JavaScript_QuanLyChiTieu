import 'dotenv/config';
import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createAppServer } from './app.js';
import { env, hasCurrencyApiConfig } from './config/env.js';
import { pool } from './db/pool.js';
import { expireBankLinkAttempts, refreshCurrencyHistory } from './jobs.js';

const server = createAppServer();
const currentDir = dirname(fileURLToPath(import.meta.url));

const bankAttemptCleanupTimer = setInterval(() => {
  expireBankLinkAttempts(pool).catch(() => {});
}, 5 * 60_000);
bankAttemptCleanupTimer.unref();

server.listen(env.port, () => {
  console.log(`Ví Mình đang chạy tại ${env.appBaseUrl} (HTTP port ${env.port}).`);
  if (!existsSync(join(currentDir, '..', 'public', 'index.html'))) console.warn('Chưa tìm thấy public/index.html.');
});

if (hasCurrencyApiConfig) {
  const fxHistoryTimer = setInterval(() => refreshCurrencyHistory(pool).catch(() => {}), 24 * 60 * 60 * 1000);
  fxHistoryTimer.unref();
  void refreshCurrencyHistory(pool).catch(() => {});
}

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => server.close(async () => { await pool.end(); process.exit(0); }));
}
