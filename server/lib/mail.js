import nodemailer from 'nodemailer';
import { fileURLToPath } from 'node:url';
import { env, hasSmtpConfig } from '../config/env.js';
import { AppError } from './errors.js';

let transporter;
const workerBrandMark = globalThis.__VI_MINH_BRAND_MARK;
const brandMarkPath = workerBrandMark ? null : fileURLToPath(new URL('../../public/assets/brand-mark.svg', import.meta.url));

function getTransporter() {
  if (!hasSmtpConfig) throw new AppError(503, 'SMTP_NOT_CONFIGURED', 'SMTP chưa được cấu hình. Hãy điền thông tin SMTP trong .env để gửi email.');
  transporter ||= nodemailer.createTransport({ host: env.smtp.host, port: env.smtp.port, secure: env.smtp.secure, auth: { user: env.smtp.user, pass: env.smtp.password }, connectionTimeout: 10_000, greetingTimeout: 10_000, socketTimeout: 15_000 });
  return transporter;
}
async function sendMail(message) {
  if (!hasSmtpConfig) throw new AppError(503, 'SMTP_NOT_CONFIGURED', 'SMTP chưa được cấu hình. Hãy điền thông tin SMTP trong .env để gửi email.');
  if (globalThis.__VI_MINH_WORKER_RUNTIME) {
    const { sendWorkerSmtpMessage } = await import('./worker-smtp.js');
    return sendWorkerSmtpMessage(message, { ...env.smtp, appBaseUrl: env.appBaseUrl });
  }
  return getTransporter().sendMail(message);
}
function brandAttachment() {
  return {
    filename: 'brand-mark.svg',
    ...(workerBrandMark ? { content: workerBrandMark } : { path: brandMarkPath }),
    cid: 'vi-minh-brand-mark',
    contentType: 'image/svg+xml',
    contentDisposition: 'inline'
  };
}
const escapeHtml = (value) => String(value).replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]);

function shell(title, greeting, actionUrl, actionLabel, expiry, options = {}) {
  return `<!doctype html><html lang="vi"><meta charset="utf-8"><body style="margin:0;padding:0;background:#f2f6fc;color:#15233b;font-family:Arial,Helvetica,sans-serif;-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%"><div style="display:none!important;visibility:hidden;opacity:0;color:transparent;height:0;width:0;overflow:hidden;mso-hide:all">${escapeHtml(title)} cho tài khoản Ví Mình. Liên kết chỉ dùng một lần.</div><table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:#f2f6fc"><tr><td align="center" style="padding:28px 14px"><table role="presentation" width="600" cellspacing="0" cellpadding="0" border="0" style="width:100%;max-width:600px;background:#ffffff;border:1px solid #e5ebf5;border-radius:18px;overflow:hidden"><tr><td style="padding:30px 34px 22px"><table role="presentation" cellspacing="0" cellpadding="0" border="0"><tr><td width="48" valign="middle"><img src="cid:vi-minh-brand-mark" width="48" height="48" alt="Ví Mình" style="display:block;width:48px;height:48px;border:0"></td><td valign="middle" style="padding-left:12px"><div style="font-size:18px;line-height:23px;font-weight:700;color:#15233b">Ví Mình</div><div style="padding-top:3px;font-size:9px;line-height:13px;font-weight:700;letter-spacing:1px;color:#71829e">TÀI CHÍNH CÁ NHÂN</div></td></tr></table></td></tr><tr><td style="padding:0 34px"><div style="height:1px;background:#e8eef7;font-size:1px;line-height:1px">&nbsp;</div></td></tr><tr><td style="padding:30px 34px 0;font-size:10px;line-height:15px;font-weight:700;letter-spacing:1.2px;color:#2563eb">${escapeHtml(options.eyebrow || 'KHÔI PHỤC QUYỀN TRUY CẬP')}</td></tr><tr><td style="padding:10px 34px 0;font-size:30px;line-height:38px;font-weight:700;letter-spacing:-.5px;color:#15233b">${escapeHtml(title)}</td></tr><tr><td style="padding:22px 34px 0;font-size:15px;line-height:24px;font-weight:700;color:#26354d">${escapeHtml(greeting)}</td></tr><tr><td style="padding:8px 34px 0;font-size:14px;line-height:23px;color:#53647e">${escapeHtml(options.body || 'Bạn vừa yêu cầu đặt lại mật khẩu cho tài khoản Ví Mình. Nhấn nút bên dưới để tạo mật khẩu mới.')}</td></tr><tr><td align="center" style="padding:24px 34px 0"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0"><tr><td align="center" bgcolor="#2563eb" style="border-radius:10px"><a href="${escapeHtml(actionUrl)}" target="_blank" style="display:block;padding:17px 20px;color:#ffffff;font-size:15px;line-height:20px;font-weight:700;text-align:center;text-decoration:none;border-radius:10px">${escapeHtml(actionLabel)}</a></td></tr></table></td></tr><tr><td style="padding:20px 34px 0"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:#eff6ff;border-radius:12px"><tr><td style="padding:18px 20px"><div style="font-size:13px;line-height:20px;font-weight:700;color:#1d3b72">Liên kết bảo mật</div><div style="padding-top:5px;font-size:12px;line-height:19px;color:#53647e">Có hiệu lực trong ${Number(expiry)} phút và chỉ sử dụng một lần.</div><div style="padding-top:3px;font-size:11px;line-height:18px;color:#71829e">Nếu liên kết hết hạn, hãy yêu cầu một liên kết mới.</div></td></tr></table></td></tr><tr><td style="padding:23px 34px 0;font-size:12px;line-height:19px;font-weight:700;color:#26354d">Nút không hoạt động?</td></tr><tr><td style="padding:5px 34px 0;font-size:11px;line-height:18px;color:#71829e">Sao chép liên kết này và mở trong trình duyệt:</td></tr><tr><td style="padding:10px 34px 0"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:#f7f9fc;border-radius:8px"><tr><td style="padding:12px 14px;font-size:11px;line-height:17px;word-break:break-all"><a href="${escapeHtml(actionUrl)}" target="_blank" style="color:#2563eb;text-decoration:underline;word-break:break-all">${escapeHtml(actionUrl)}</a></td></tr></table></td></tr><tr><td style="padding:22px 34px 0"><div style="height:1px;background:#e8eef7;font-size:1px;line-height:1px">&nbsp;</div></td></tr><tr><td style="padding:17px 34px 0;font-size:12px;line-height:19px;color:#53647e">${escapeHtml(options.footer || 'Nếu bạn không yêu cầu email này, hãy bỏ qua thư. Mật khẩu hiện tại của bạn vẫn không thay đổi.')}</td></tr><tr><td style="padding:22px 34px 26px"><div style="height:1px;background:#e8eef7;font-size:1px;line-height:1px">&nbsp;</div><table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0"><tr><td style="padding-top:14px;font-size:11px;line-height:17px;font-weight:700;color:#71829e">Ví Mình · Tài chính cá nhân</td><td align="right" style="padding-top:14px;font-size:10px;line-height:17px;color:#9aa8bc">Email tự động · Vui lòng không trả lời</td></tr></table></td></tr></table></td></tr></table></body></html>`;
}
export async function sendVerificationEmail(email, name, token) {
  const url = env.appBaseUrl.replace(/\/$/, '') + '/?verify=' + encodeURIComponent(token);
  const greeting = 'Chào ' + String(name || 'bạn').trim() + ',';
  const body = 'Tài khoản Ví Mình vừa được tạo. Nhấn nút bên dưới để xác minh email và kích hoạt tài khoản.';
  const expiry = Number(env.emailTokenTtlMinutes) || 30;
  const html = shell('Xác minh email', greeting, url, 'Xác minh email', expiry, {
    eyebrow: 'XÁC MINH TÀI KHOẢN',
    body,
    footer: 'Nếu bạn không tạo tài khoản này, hãy bỏ qua email.'
  });
  const text = [greeting, '', body, '', 'Mở liên kết sau để xác minh email:', url, '', 'Liên kết có hiệu lực trong ' + expiry + ' phút và chỉ dùng một lần.', '', 'Nếu bạn không tạo tài khoản này, hãy bỏ qua email.'].join('\n');
  await sendMail({
    from: { name: env.smtp.fromName, address: env.smtp.fromEmail },
    to: email,
    subject: 'Xác minh email Ví Mình',
    text,
    html,
    attachments: [brandAttachment()]
  });
}

export async function sendRegistrationVerificationCode(email, name, code) {
  const expiry = Number(env.emailOtpTtlMinutes) || 10;
  const greeting = `Chào ${String(name || 'bạn').trim()},`;
  const safeCode = escapeHtml(code);
  const text = `${greeting}\n\nTài khoản Ví Mình của bạn đã được tạo. Nhập mã xác minh ${code} trong ứng dụng để kích hoạt tài khoản.\n\nMã có hiệu lực trong ${expiry} phút và chỉ dùng một lần. Nếu bạn không tạo tài khoản này, hãy bỏ qua email. Không chia sẻ mã với bất kỳ ai.`;
  const html = `<!doctype html><html lang="vi"><meta charset="utf-8"><body style="margin:0;padding:0;background:#f2f6fc;color:#15233b;font-family:Arial,Helvetica,sans-serif;-webkit-text-size-adjust:100%"><div style="display:none!important;visibility:hidden;opacity:0;color:transparent;height:0;width:0;overflow:hidden;mso-hide:all">Mã xác minh Ví Mình có hiệu lực trong ${expiry} phút.</div><table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:#f2f6fc"><tr><td align="center" style="padding:28px 14px"><table role="presentation" width="560" cellspacing="0" cellpadding="0" border="0" style="width:100%;max-width:560px;background:#ffffff;border:1px solid #e5ebf5;border-radius:18px;overflow:hidden"><tr><td style="padding:26px 32px;background:#1e3a8a;color:#ffffff"><div style="font-size:22px;line-height:28px;font-weight:700">Ví Mình</div><div style="padding-top:3px;font-size:10px;line-height:15px;font-weight:700;letter-spacing:1.5px;color:#dbeafe">TÀI CHÍNH CÁ NHÂN</div></td></tr><tr><td style="padding:30px 32px 0;font-size:10px;line-height:15px;font-weight:700;letter-spacing:1.2px;color:#2563eb">XÁC MINH TÀI KHOẢN</td></tr><tr><td style="padding:9px 32px 0;font-size:27px;line-height:35px;font-weight:700;letter-spacing:-.4px;color:#15233b">Mã xác minh email</td></tr><tr><td style="padding:16px 32px 0;font-size:15px;line-height:24px;font-weight:700;color:#26354d">${escapeHtml(greeting)}</td></tr><tr><td style="padding:8px 32px 0;font-size:14px;line-height:23px;color:#53647e">Nhập mã 6 chữ số này trong Ví Mình để xác minh email và kích hoạt tài khoản.</td></tr><tr><td align="center" style="padding:23px 32px 0"><table role="presentation" cellspacing="0" cellpadding="0" border="0" style="background:#eff6ff;border:1px solid #dbeafe;border-radius:12px"><tr><td style="padding:17px 30px;font-size:32px;line-height:40px;font-weight:700;letter-spacing:9px;color:#1e3a8a">${safeCode}</td></tr></table></td></tr><tr><td style="padding:18px 32px 0;font-size:13px;line-height:21px;color:#53647e;text-align:center">Mã có hiệu lực trong <strong style="color:#26354d">${expiry} phút</strong> và chỉ sử dụng một lần.</td></tr><tr><td style="padding:22px 32px 0"><div style="height:1px;background:#e8eef7;font-size:1px;line-height:1px">&nbsp;</div></td></tr><tr><td style="padding:16px 32px 27px;font-size:12px;line-height:19px;color:#53647e">Nếu bạn không tạo tài khoản này, hãy bỏ qua thư. Không chia sẻ mã xác minh với bất kỳ ai.</td></tr></table></td></tr></table></body></html>`;
  return sendMail({
    from: { name: env.smtp.fromName, address: env.smtp.fromEmail },
    to: email,
    subject: 'Mã xác minh tài khoản Ví Mình',
    text,
    html
  });
}

export async function sendPasswordResetEmail(email, name, token) {
  const url = `${env.appBaseUrl.replace(/\/$/, '')}/?reset=${encodeURIComponent(token)}`;
  const greeting = `Chào ${String(name || 'bạn').trim()},`;
  const expiry = Number(env.passwordResetTtlMinutes) || 30;
  const html = shell('Đặt lại mật khẩu', greeting, url, 'Đặt lại mật khẩu', expiry);
  const text = `${greeting}\n\nBạn vừa yêu cầu đặt lại mật khẩu cho tài khoản Ví Mình. Mở liên kết sau để tạo mật khẩu mới:\n${url}\n\nLiên kết có hiệu lực trong ${expiry} phút và chỉ sử dụng một lần. Nếu bạn không yêu cầu email này, hãy bỏ qua thư. Mật khẩu hiện tại của bạn vẫn không thay đổi.`;
  return sendMail({
    from: { name: env.smtp.fromName, address: env.smtp.fromEmail },
    to: email,
    subject: 'Đặt lại mật khẩu Ví Mình',
    text,
    html,
    attachments: [{ filename: 'brand-mark.svg', path: brandMarkPath, cid: 'vi-minh-brand-mark', contentType: 'image/svg+xml', contentDisposition: 'inline' }],
  });
}

export async function sendEmailChangeAuthorizationEmail(email, name, code) {
  const expiry = Number(env.emailOtpTtlMinutes) || 10;
  const greeting = `Chào ${String(name || 'bạn').trim()},`;
  const safeCode = escapeHtml(code);
  const text = `${greeting}\n\nBạn vừa yêu cầu đổi email tài khoản Ví Mình. Nhập mã xác nhận ${code} trong ứng dụng để cho phép bước đổi email. Mã có hiệu lực trong ${expiry} phút và chỉ dùng một lần. Email tài khoản chưa thay đổi ở bước này. Nếu không phải bạn, hãy bỏ qua thư và không chia sẻ mã với bất kỳ ai.`;
  const html = `<!doctype html><html lang="vi"><meta charset="utf-8"><body style="margin:0;padding:28px 14px;background:#f2f6fc;color:#15233b;font-family:Arial,Helvetica,sans-serif"><table role="presentation" width="100%" cellspacing="0" cellpadding="0"><tr><td align="center"><table role="presentation" width="560" cellspacing="0" cellpadding="0" style="max-width:560px;background:#fff;border:1px solid #e5ebf5;border-radius:16px"><tr><td style="padding:28px 32px"><strong style="font-size:20px">Ví Mình</strong><p style="margin:18px 0 8px;color:#26354d;font-weight:700">${escapeHtml(greeting)}</p><p style="margin:0;color:#53647e;line-height:1.6">Bạn vừa yêu cầu đổi email tài khoản. Nhập mã này để xác nhận bạn đang sở hữu email hiện tại. Email tài khoản chưa thay đổi ở bước này.</p><div style="margin:22px 0;padding:18px;text-align:center;background:#eff6ff;border-radius:12px;color:#1e3a8a;font-size:32px;font-weight:700;letter-spacing:9px">${safeCode}</div><p style="color:#53647e">Mã có hiệu lực trong <strong>${expiry} phút</strong> và chỉ sử dụng một lần.</p><p style="margin-bottom:0;color:#71829e;font-size:12px">Nếu không phải bạn, hãy bỏ qua thư. Không chia sẻ mã xác nhận với bất kỳ ai.</p></td></tr></table></td></tr></table></body></html>`;
  return sendMail({
    from: { name: env.smtp.fromName, address: env.smtp.fromEmail },
    to: email,
    subject: 'Xác nhận yêu cầu đổi email Ví Mình',
    text,
    html,
    attachments: [brandAttachment()]
  });
}

export async function sendEmailChangeCode(email, name, code) {
  const expiry = Number(env.emailOtpTtlMinutes) || 10;
  const greeting = `Chào ${String(name || 'bạn').trim()},`;
  const escapedCode = escapeHtml(code);
  const html = `<!doctype html><html lang="vi"><meta charset="utf-8"><body style="margin:0;padding:0;background:#f2f6fc;color:#15233b;font-family:Arial,Helvetica,sans-serif;-webkit-text-size-adjust:100%"><div style="display:none!important;visibility:hidden;opacity:0;color:transparent;height:0;width:0;overflow:hidden;mso-hide:all">Mã xác nhận email Ví Mình có hiệu lực trong ${expiry} phút.</div><table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:#f2f6fc"><tr><td align="center" style="padding:28px 14px"><table role="presentation" width="600" cellspacing="0" cellpadding="0" border="0" style="width:100%;max-width:600px;background:#ffffff;border:1px solid #e5ebf5;border-radius:18px;overflow:hidden"><tr><td style="padding:30px 34px 22px"><table role="presentation" cellspacing="0" cellpadding="0" border="0"><tr><td width="48" valign="middle"><img src="cid:vi-minh-brand-mark" width="48" height="48" alt="Ví Mình" style="display:block;width:48px;height:48px;border:0"></td><td valign="middle" style="padding-left:12px"><div style="font-size:18px;line-height:23px;font-weight:700;color:#15233b">Ví Mình</div><div style="padding-top:3px;font-size:9px;line-height:13px;font-weight:700;letter-spacing:1px;color:#71829e">TÀI CHÍNH CÁ NHÂN</div></td></tr></table></td></tr><tr><td style="padding:0 34px"><div style="height:1px;background:#e8eef7;font-size:1px;line-height:1px">&nbsp;</div></td></tr><tr><td style="padding:30px 34px 0;font-size:10px;line-height:15px;font-weight:700;letter-spacing:1.2px;color:#2563eb">XÁC NHẬN ĐỊA CHỈ EMAIL</td></tr><tr><td style="padding:10px 34px 0;font-size:28px;line-height:36px;font-weight:700;letter-spacing:-.5px;color:#15233b">Mã xác nhận của bạn</td></tr><tr><td style="padding:18px 34px 0;font-size:15px;line-height:24px;font-weight:700;color:#26354d">${escapeHtml(greeting)}</td></tr><tr><td style="padding:8px 34px 0;font-size:14px;line-height:23px;color:#53647e">Nhập mã bên dưới trong Ví Mình để xác nhận địa chỉ email mới.</td></tr><tr><td align="center" style="padding:24px 34px 0"><table role="presentation" cellspacing="0" cellpadding="0" border="0" style="background:#eff6ff;border-radius:12px"><tr><td style="padding:18px 34px;font-size:32px;line-height:40px;font-weight:700;letter-spacing:9px;color:#1e3a8a">${escapedCode}</td></tr></table></td></tr><tr><td style="padding:20px 34px 0;font-size:13px;line-height:21px;color:#53647e;text-align:center">Mã có hiệu lực trong <strong style="color:#26354d">${expiry} phút</strong> và chỉ sử dụng một lần.</td></tr><tr><td style="padding:24px 34px 0"><div style="height:1px;background:#e8eef7;font-size:1px;line-height:1px">&nbsp;</div></td></tr><tr><td style="padding:17px 34px 0;font-size:12px;line-height:19px;color:#53647e">Nếu bạn không yêu cầu thay đổi email, hãy bỏ qua thư này. Không chia sẻ mã xác nhận với bất kỳ ai.</td></tr><tr><td style="padding:22px 34px 26px"><div style="height:1px;background:#e8eef7;font-size:1px;line-height:1px">&nbsp;</div><table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0"><tr><td style="padding-top:14px;font-size:11px;line-height:17px;font-weight:700;color:#71829e">Ví Mình · Tài chính cá nhân</td><td align="right" style="padding-top:14px;font-size:10px;line-height:17px;color:#9aa8bc">Email tự động · Vui lòng không trả lời</td></tr></table></td></tr></table></td></tr></table></body></html>`;
  const text = `${greeting}\n\nNhập mã xác nhận ${code} trong Ví Mình để xác nhận địa chỉ email mới. Mã có hiệu lực trong ${expiry} phút và chỉ sử dụng một lần. Nếu bạn không yêu cầu thay đổi email, hãy bỏ qua thư này. Không chia sẻ mã xác nhận với bất kỳ ai.`;
  await sendMail({
    from: { name: env.smtp.fromName, address: env.smtp.fromEmail },
    to: email,
    subject: 'Mã xác nhận email Ví Mình',
    text,
    html,
    attachments: [brandAttachment()],
  });
}
