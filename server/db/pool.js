import pg from 'pg';
import { env } from '../config/env.js';

const { Pool, Client } = pg;
pg.types.setTypeParser(1082, (value) => value);
const poolOptions = {
  ...(env.database.url
    ? { connectionString: env.database.url }
    : {
      host: env.database.host,
      port: env.database.port,
      database: env.database.name,
      user: env.database.user || undefined,
      password: env.database.password || undefined,
      ssl: env.database.ssl ? { rejectUnauthorized: true } : false
    }),
  max: 5,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 5_000,
  application_name: 'vi-minh'
};

const isWorkerRuntime = globalThis.__VI_MINH_WORKER_RUNTIME === true;
export const pool = isWorkerRuntime
  ? {
    query: async () => { throw new Error('Worker requests must use a request-scoped Hyperdrive client.'); },
    connect: async () => { throw new Error('Worker requests must use a request-scoped Hyperdrive client.'); },
    end: async () => {}
  }
  : new Pool(poolOptions);

if (!isWorkerRuntime) pool.on('error', (error) => console.error('[db] Kết nối nhàn rỗi gặp lỗi:', error.message));

// Hyperdrive manages connection pooling. A Worker invocation must own its
// client instead of reusing a module-scoped pg.Pool across requests.
export async function acquireWorkerDatabase() {
  const client = new Client({
    ...(env.database.url
      ? { connectionString: env.database.url }
      : {
        host: env.database.host,
        port: env.database.port,
        database: env.database.name,
        user: env.database.user || undefined,
        password: env.database.password || undefined,
        ssl: env.database.ssl ? { rejectUnauthorized: true } : false
      }),
    connectionTimeoutMillis: 5_000,
    application_name: 'vi-minh-worker'
  });
  await client.connect();

  let released = false;
  const transactionClient = {
    query: (...args) => client.query(...args),
    release: () => {}
  };
  return {
    db: {
      query: (...args) => client.query(...args),
      connect: async () => transactionClient
    },
    async release() {
      if (released) return;
      released = true;
      await client.end();
    }
  };
}
