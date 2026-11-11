import { pool } from './pool.js';
import { AppError } from '../lib/errors.js';
import { validateEmail } from '../lib/validation.js';

async function promoteAdmin(emailValue) {
  const { normalized } = validateEmail(emailValue);
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('SELECT pg_advisory_xact_lock($1)', [62419831]);
    const user = (await client.query(
      `SELECT id, role, status, email_verified_at FROM users
        WHERE email_normalized = $1 FOR UPDATE`, [normalized]
    )).rows[0];
    if (!user) throw new AppError(404, 'USER_NOT_FOUND', 'Không tìm thấy tài khoản với email đã nhập.');
    if (user.status !== 'active' || !user.email_verified_at) throw new AppError(409, 'USER_NOT_READY', 'Tài khoản phải hoạt động và đã xác minh email trước khi cấp quyền Admin.');
    if (user.role === 'admin') {
      await client.query('COMMIT');
      console.log('Tài khoản đã có quyền Admin.');
      return;
    }
    await client.query("UPDATE users SET role = 'admin', updated_at = now() WHERE id = $1", [user.id]);
    await client.query(
      `INSERT INTO admin_audit_logs (target_user_id, action, old_role, new_role)
       VALUES ($1, 'user.role_changed', 'user', 'admin')`, [user.id]
    );
    await client.query('COMMIT');
    console.log('Đã cấp quyền Admin cho tài khoản đã xác minh.');
  } catch (error) {
    try { await client.query('ROLLBACK'); } catch {}
    throw error;
  } finally { client.release(); }
}

const email = process.argv[2];
if (!email) {
  console.error('Cách dùng: npm run db:promote-admin -- <email-đã-xác-minh>');
  process.exitCode = 1;
  await pool.end();
} else {
  try { await promoteAdmin(email); }
  catch (error) { console.error(error.message || 'Không thể cấp quyền Admin.'); process.exitCode = 1; }
  finally { await pool.end(); }
}
