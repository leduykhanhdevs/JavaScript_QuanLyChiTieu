import { hasCurrencyApiConfig } from './config/env.js';
import { refreshLatestFxRate } from './services/fx-rate-service.js';

export async function expireBankLinkAttempts(db) {
  await db.query(
    `UPDATE bank_link_attempts
     SET status = 'expired', launch_token_hash = NULL,
         link_token_ciphertext = NULL, hosted_link_url_ciphertext = NULL
     WHERE status IN ('ready', 'launched') AND expires_at <= now()`
  );
}

export async function refreshCurrencyHistory(db) {
  if (!hasCurrencyApiConfig) return;
  await refreshLatestFxRate(db);
}

export async function runWorkerScheduledJob(cron, db) {
  if (cron === '*/5 * * * *') await expireBankLinkAttempts(db);
  if (cron === '0 0 * * *') await refreshCurrencyHistory(db);
}
