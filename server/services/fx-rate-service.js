import { AppError } from '../lib/errors.js';
import { env, hasCurrencyApiConfig } from '../config/env.js';

const API_URL = 'https://api.currencyapi.com/v3/latest?base_currency=USD&currencies=VND';
const RATE_CACHE_MS = 23 * 60 * 60 * 1000;
const MAX_USABLE_AGE_MS = 72 * 60 * 60 * 1000;

function asRate(row) {
  if (!row) return null;
  const usdVnd = Number(row.rate);
  const updatedAt = new Date(row.provider_updated_at);
  const fetchedAt = new Date(row.fetched_at);
  if (!Number.isFinite(usdVnd) || usdVnd <= 0 || !Number.isFinite(updatedAt.getTime()) || !Number.isFinite(fetchedAt.getTime())) return null;
  return {
    date: row.rate_date,
    usdVnd,
    vndUsd: 1 / usdVnd,
    providerUpdatedAt: updatedAt.toISOString(),
    fetchedAt: fetchedAt.toISOString(),
    ageMs: Date.now() - updatedAt.getTime()
  };
}

async function storedLatest(db) {
  const result = await db.query(
    `SELECT rate_date::text AS rate_date, rate, provider_updated_at, fetched_at
       FROM fx_rate_history
      WHERE provider = 'currencyapi' AND base_currency = 'USD' AND quote_currency = 'VND'
      ORDER BY rate_date DESC LIMIT 1`
  );
  return asRate(result.rows[0]);
}

export async function refreshLatestFxRate(db) {
  const cached = await storedLatest(db);
  if (cached && Date.now() - Date.parse(cached.fetchedAt) < RATE_CACHE_MS) return cached;
  if (!hasCurrencyApiConfig) return cached;

  let response;
  try {
    response = await fetch(API_URL, {
      headers: { apikey: env.currencyApiKey, accept: 'application/json' },
      signal: AbortSignal.timeout(8_000)
    });
  } catch {
    return cached;
  }
  if (!response.ok) return cached;

  let payload;
  try { payload = await response.json(); } catch { return cached; }
  const usdVnd = Number(payload?.data?.VND?.value);
  const providerUpdatedAt = new Date(payload?.meta?.last_updated_at || '');
  if (!Number.isFinite(usdVnd) || usdVnd <= 0 || usdVnd > 10_000_000 || !Number.isFinite(providerUpdatedAt.getTime())) return cached;
  const rateDate = providerUpdatedAt.toISOString().slice(0, 10);

  const result = await db.query(
    `INSERT INTO fx_rate_history (provider, base_currency, quote_currency, rate_date, rate, provider_updated_at, fetched_at)
     VALUES ('currencyapi', 'USD', 'VND', $1::date, $2, $3, now())
     ON CONFLICT (provider, base_currency, quote_currency, rate_date)
     DO UPDATE SET rate = EXCLUDED.rate, provider_updated_at = EXCLUDED.provider_updated_at, fetched_at = now()
     RETURNING rate_date::text AS rate_date, rate, provider_updated_at, fetched_at`,
    [rateDate, usdVnd, providerUpdatedAt.toISOString()]
  );
  return asRate(result.rows[0]);
}

async function usableRate(db) {
  const rate = await refreshLatestFxRate(db);
  if (!rate) throw new AppError(503, 'FX_RATE_UNAVAILABLE', 'Chưa có tỷ giá USD/VND. Hãy cấu hình CURRENCYAPI_API_KEY trong tệp .env rồi thử lại.');
  if (rate.ageMs > MAX_USABLE_AGE_MS) throw new AppError(503, 'FX_RATE_STALE', 'Tỷ giá USD/VND đã cũ quá 3 ngày nên chưa thể quy đổi giao dịch an toàn.');
  return rate;
}

export async function requireUsableFxRate(db) {
  return usableRate(db);
}

export async function getFxRateSummary(db, requestedDays = 30) {
  const days = Math.max(1, Math.min(365, Number.parseInt(requestedDays, 10) || 30));
  const latest = await refreshLatestFxRate(db);
  if (!latest) throw new AppError(503, 'FX_RATE_UNAVAILABLE', 'Chưa có dữ liệu tỷ giá. Hãy cấu hình CURRENCYAPI_API_KEY trong tệp .env.');
  const history = await db.query(
    `SELECT rate_date::text AS date, rate::text AS usd_vnd
       FROM fx_rate_history
      WHERE provider = 'currencyapi' AND base_currency = 'USD' AND quote_currency = 'VND'
        AND rate_date >= (CURRENT_DATE - $1::integer)
      ORDER BY rate_date`, [days - 1]
  );
  return {
    provider: 'CurrencyAPI',
    refreshCadence: 'daily',
    baseCurrency: 'USD',
    quoteCurrency: 'VND',
    usdVnd: latest.usdVnd,
    vndUsd: latest.vndUsd,
    rateDate: latest.date,
    providerUpdatedAt: latest.providerUpdatedAt,
    fetchedAt: latest.fetchedAt,
    stale: latest.ageMs > RATE_CACHE_MS,
    history: history.rows.map((row) => ({ date: row.date, usdVnd: Number(row.usd_vnd) }))
  };
}

export async function convertMoneyFieldsToVnd(db, payload, fieldNames, { allowZero = [] } = {}) {
  const currency = payload.currency || 'VND';
  if (!['VND', 'USD'].includes(currency)) {
    throw new AppError(400, 'INVALID_CURRENCY', 'Đơn vị tiền tệ chỉ hỗ trợ VND hoặc USD.', { currency: 'Chọn VND hoặc USD.' });
  }
  if (currency === 'VND') return payload;

  const rate = await usableRate(db);
  const converted = { ...payload };
  for (const name of fieldNames) {
    if (!Object.hasOwn(payload, name) || payload[name] === '' || payload[name] == null) continue;
    const amount = Number(payload[name]);
    const isZeroAllowed = allowZero.includes(name);
    const amountCents = Math.round(amount * 100);
    if (!Number.isFinite(amount) || !Number.isSafeInteger(amountCents)
      || Math.abs(amount * 100 - amountCents) > 1e-8
      || amount < 0 || (!isZeroAllowed && amount === 0)) {
      throw new AppError(400, 'VALIDATION_ERROR', 'Số tiền USD cần hợp lệ và tối đa 2 chữ số thập phân.', { [name]: 'Nhập số USD dương với tối đa 2 chữ số thập phân.' });
    }
    const amountVnd = Math.round(amount * rate.usdVnd);
    if (!Number.isSafeInteger(amountVnd) || (!isZeroAllowed && amountVnd <= 0)) {
      throw new AppError(400, 'VALIDATION_ERROR', 'Số tiền sau quy đổi vượt phạm vi hỗ trợ.', { [name]: 'Số tiền sau quy đổi không hợp lệ.' });
    }
    converted[name] = amountVnd;
  }
  return converted;
}
