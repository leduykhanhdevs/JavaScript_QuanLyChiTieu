import pg from 'pg';
import { env } from '../config/env.js';

const { Pool } = pg;
pg.types.setTypeParser(1082, (value) => value);
export const pool = new Pool({
  host: env.database.host,
  port: env.database.port,
  database: env.database.name,
  user: env.database.user || undefined,
  password: env.database.password || undefined,
  ssl: env.database.ssl ? { rejectUnauthorized: true } : false,
  max: 10,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 5_000,
  application_name: 'vi-minh'
});

pool.on('error', (error) => console.error('[db] Kết nối nhàn rỗi gặp lỗi:', error.message));
