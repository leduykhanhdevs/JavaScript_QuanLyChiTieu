import { env as processEnv } from 'node:process';
import { httpServerHandler } from 'cloudflare:node';
import { reportAssets } from './report-assets.js';

globalThis.__VI_MINH_REPORT_FONTS = {
  regular: reportAssets.regularFont,
  bold: reportAssets.boldFont
};
globalThis.__VI_MINH_BRAND_MARK = reportAssets.brandMark;
globalThis.__VI_MINH_WORKER_RUNTIME = true;

let runtimePromise;

function configureRuntime(bindings) {
  const runtimeValues = {
    NODE_ENV: bindings.NODE_ENV || 'production',
    PORT: '3000',
    APP_BASE_URL: bindings.APP_BASE_URL,
    EDGE_PROXY_SECRET: bindings.EDGE_PROXY_SECRET,
    DATABASE_URL: bindings.HYPERDRIVE.connectionString,
    DATABASE_POOL_MAX: '5',
    SERVE_STATIC: 'false',
    SESSION_COOKIE_NAME: bindings.SESSION_COOKIE_NAME,
    SESSION_TTL_HOURS: bindings.SESSION_TTL_HOURS,
    EMAIL_TOKEN_TTL_MINUTES: bindings.EMAIL_TOKEN_TTL_MINUTES,
    EMAIL_OTP_TTL_MINUTES: bindings.EMAIL_OTP_TTL_MINUTES,
    PASSWORD_RESET_TTL_MINUTES: bindings.PASSWORD_RESET_TTL_MINUTES,
    SMTP_HOST: bindings.SMTP_HOST,
    SMTP_PORT: bindings.SMTP_PORT,
    SMTP_SECURE: bindings.SMTP_SECURE,
    SMTP_USER: bindings.SMTP_USER,
    SMTP_PASSWORD: bindings.SMTP_PASSWORD,
    SMTP_FROM_NAME: bindings.SMTP_FROM_NAME,
    SMTP_FROM_EMAIL: bindings.SMTP_FROM_EMAIL,
    CURRENCYAPI_API_KEY: bindings.CURRENCYAPI_API_KEY,
    SEPAY_BANKHUB_CLIENT_ID: bindings.SEPAY_BANKHUB_CLIENT_ID,
    SEPAY_BANKHUB_CLIENT_SECRET: bindings.SEPAY_BANKHUB_CLIENT_SECRET,
    SEPAY_BANKHUB_COMPANY_XID: bindings.SEPAY_BANKHUB_COMPANY_XID,
    SEPAY_BANKHUB_ENCRYPTION_KEY: bindings.SEPAY_BANKHUB_ENCRYPTION_KEY
  };

  for (const [name, value] of Object.entries(runtimeValues)) {
    if (value !== undefined && value !== null && value !== '') processEnv[name] = String(value);
  }
}

async function getRuntime(bindings) {
  if (!bindings.HYPERDRIVE?.connectionString || !bindings.APP_BASE_URL || !bindings.EDGE_PROXY_SECRET) {
    throw new Error('Thiếu binding HYPERDRIVE, APP_BASE_URL hoặc EDGE_PROXY_SECRET.');
  }

  if (!runtimePromise) {
    configureRuntime(bindings);
    runtimePromise = Promise.all([
      import('../server/app.js'),
      import('../server/db/pool.js'),
      import('../server/jobs.js')
    ]).then(([appModule, databaseModule, jobsModule]) => ({
      nodeHandler: httpServerHandler(appModule.createAppServer()),
      pool: databaseModule.pool,
      runWorkerScheduledJob: jobsModule.runWorkerScheduledJob
    }));
  }
  return runtimePromise;
}

function unavailable() {
  return Response.json(
    { error: { code: 'WORKER_CONFIGURATION', message: 'API chưa được cấu hình đầy đủ.' } },
    { status: 503, headers: { 'Cache-Control': 'no-store' } }
  );
}

export default {
  async fetch(request, bindings, context) {
    try {
      const runtime = await getRuntime(bindings);
      return await runtime.nodeHandler.fetch(request, bindings, context);
    } catch (error) {
      console.error('[worker] Không thể khởi tạo API:', error.message);
      return unavailable();
    }
  },

  scheduled(controller, bindings, context) {
    context.waitUntil((async () => {
      const runtime = await getRuntime(bindings);
      await runtime.runWorkerScheduledJob(controller.cron, runtime.pool);
    })().catch((error) => console.error('[worker] Cron thất bại:', error.message)));
  }
};
