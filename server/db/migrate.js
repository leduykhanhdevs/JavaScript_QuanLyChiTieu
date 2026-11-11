import { readdir, readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { pool } from './pool.js';

const currentDir = dirname(fileURLToPath(import.meta.url));
const migrationsDir = join(currentDir, 'migrations');
const lockKey = 719384621;

async function migrate() {
  const client = await pool.connect();
  try {
    await client.query('SELECT pg_advisory_lock($1)', [lockKey]);
    const files = (await readdir(migrationsDir)).filter((name) => /^\d+_.+\.sql$/i.test(name)).sort();
    for (const filename of files) {
      const version = filename.slice(0, filename.indexOf('_'));
      const table = await client.query("SELECT to_regclass('public.schema_migrations') AS name");
      if (table.rows[0].name) {
        const applied = await client.query('SELECT 1 FROM schema_migrations WHERE version = $1', [version]);
        if (applied.rowCount) {
          console.log(`Bỏ qua migration ${filename} (đã áp dụng).`);
          continue;
        }
      }
      console.log(`Đang áp dụng ${filename}...`);
      await client.query(await readFile(join(migrationsDir, filename), 'utf8'));
      console.log(`Đã áp dụng ${filename}.`);
    }
  } finally {
    try { await client.query('SELECT pg_advisory_unlock($1)', [lockKey]); } catch {}
    client.release();
    await pool.end();
  }
}

migrate().catch(async (error) => {
  console.error('Không thể chạy migration:', error.message);
  await pool.end();
  process.exitCode = 1;
});
