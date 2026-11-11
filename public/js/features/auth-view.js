import { escapeHtml } from '../utils/dom.js';
import { icon } from '../components/icons.js?v=20261020-password-eye';
import { LEGAL_LINKS, LEGAL_VERSIONS } from '../config/legal.js';

const input = (label, name, type, options = {}) => {
  const id = `auth-${name}`;
  const passwordControl = type === 'password';
  const fieldInput = `<input id="${id}" name="${name}" type="${type}" ${options.autocomplete ? `autocomplete="${options.autocomplete}"` : ''} ${options.inputMode ? `inputmode="${options.inputMode}"` : ''} ${options.pattern ? `pattern="${options.pattern}"` : ''} ${options.maxLength ? `maxlength="${options.maxLength}"` : ''} ${options.required === false ? '' : 'required'} ${options.minLength ? `minlength="${options.minLength}"` : ''} ${options.value ? `value="${escapeHtml(options.value)}"` : ''}>`;
  const control = passwordControl
    ? `<div class="auth-password-control">${fieldInput}<button class="auth-password-toggle" type="button" data-auth-action="toggle-password" data-password-target="${id}" aria-label="Hiện mật khẩu" aria-pressed="false" title="Hiện mật khẩu">${icon('eye', 18)}</button></div>`
    : fieldInput;
  return `<div class="form-field"><label for="${id}">${label}</label>${control}<span class="field-error" data-error-for="${name}"></span></div>`;
};

const configurations = {
  login: { heading: 'Đăng nhập', description: 'Chào mừng bạn quay lại', button: 'Đăng nhập' },
  register: { heading: 'Tạo tài khoản', description: 'Bắt đầu quản lý tài chính cá nhân', button: 'Tạo tài khoản' },
  forgot: { heading: 'Quên mật khẩu', description: 'Nhập email để nhận hướng dẫn đặt lại mật khẩu.', button: 'Gửi hướng dẫn' },
  reset: { heading: 'Đặt lại mật khẩu', description: 'Khôi phục quyền truy cập an toàn.', button: 'Cập nhật mật khẩu' },
  'verify-info': { heading: 'Xác minh email', description: 'Nhập mã OTP 6 chữ số đã gửi đến email để kích hoạt tài khoản.', button: 'Xác minh email' },
  'forgot-sent': { heading: 'Kiểm tra hộp thư', description: '', button: 'Quay lại đăng nhập' },
  'verify-success': { heading: 'Email đã xác minh', description: 'Tài khoản đã sẵn sàng. Bạn có thể đăng nhập để bắt đầu.', button: 'Đăng nhập' }
};

function authForm(mode, pendingEmail, resetToken, notice, verificationExpiresAt) {
  const legalConsents = `<input type="hidden" name="termsVersion" value="${LEGAL_VERSIONS.terms}"><input type="hidden" name="privacyVersion" value="${LEGAL_VERSIONS.privacy}"><fieldset class="auth-consents" aria-label="Xác nhận điều khoản và quyền riêng tư"><legend class="sr-only">Điều khoản và quyền riêng tư</legend><div class="auth-consent-item"><label class="auth-consent" for="auth-terms-accepted"><input id="auth-terms-accepted" name="termsAccepted" type="checkbox" value="true" required aria-describedby="auth-terms-error"><span>Tôi đã đọc và đồng ý với <a href="${LEGAL_LINKS.terms}" target="_blank" rel="noopener noreferrer">Điều khoản sử dụng</a>.</span></label><span id="auth-terms-error" class="field-error" data-error-for="termsAccepted"></span></div><div class="auth-consent-item"><label class="auth-consent" for="auth-privacy-accepted"><input id="auth-privacy-accepted" name="privacyAccepted" type="checkbox" value="true" required aria-describedby="auth-privacy-error"><span>Tôi đồng ý để Ví Mình xử lý dữ liệu cá nhân theo <a href="${LEGAL_LINKS.privacy}" target="_blank" rel="noopener noreferrer">Thông báo quyền riêng tư</a>.</span></label><span id="auth-privacy-error" class="field-error" data-error-for="privacyAccepted"></span></div></fieldset>`;
  if (mode === 'login') return `<form data-form="auth-login" novalidate><div class="auth-fields">${input('Email', 'email', 'email', { autocomplete: 'email' })}${input('Mật khẩu', 'password', 'password', { autocomplete: 'current-password' })}</div>${legalConsents}<div class="auth-forgot-row"><button type="button" class="button button-quiet button-small" data-auth-action="forgot">Quên mật khẩu?</button></div><button class="button button-primary auth-submit" type="submit">Đăng nhập</button><div class="auth-footer">Chưa có tài khoản? <button type="button" class="button button-quiet button-small" data-auth-action="register">Đăng ký</button></div></form>`;
  if (mode === 'register') return `<form data-form="auth-register" novalidate><div class="auth-fields">${input('Tên hiển thị', 'fullName', 'text', { autocomplete: 'name' })}${input('Email', 'email', 'email', { autocomplete: 'email' })}${input('Mật khẩu', 'password', 'password', { autocomplete: 'new-password', minLength: 10 })}${input('Xác nhận mật khẩu', 'passwordConfirmation', 'password', { autocomplete: 'new-password', minLength: 10 })}</div>${legalConsents}<p class="form-help">Mật khẩu cần ít nhất 10 ký tự. Sau khi đăng ký, bạn cần xác minh email.</p><button class="button button-primary auth-submit" type="submit">Tạo tài khoản</button><div class="auth-footer">Đã có tài khoản? <button type="button" class="button button-quiet button-small" data-auth-action="login">Đăng nhập</button></div></form>`;
  if (mode === 'forgot') return `<form data-form="auth-forgot" novalidate><div class="auth-fields">${input('Email đăng ký', 'email', 'email', { autocomplete: 'email' })}</div><button class="button button-primary auth-submit" type="submit">Gửi hướng dẫn</button><div class="auth-footer"><button type="button" class="button button-quiet button-small" data-auth-action="login">Quay lại đăng nhập</button></div></form>`;
  if (mode === 'reset') return `<form data-form="auth-reset" novalidate><input type="hidden" name="token" value="${escapeHtml(resetToken)}"><div class="auth-fields">${input('Mật khẩu mới', 'password', 'password', { autocomplete: 'new-password', minLength: 10 })}${input('Xác nhận mật khẩu', 'passwordConfirmation', 'password', { autocomplete: 'new-password', minLength: 10 })}</div><button class="button button-primary auth-submit" type="submit">Cập nhật mật khẩu</button></form>`;
  if (mode === 'verify-info') {
    const noticeClass = notice?.type === 'error' ? 'notice-error' : notice?.type === 'success' ? 'notice-success' : 'notice-info';
    const message = notice?.message || `Mã xác minh đã được gửi đến ${pendingEmail || 'email đăng ký'}. Kiểm tra hộp thư và thư mục thư rác.`;
    const expiresAt = Number(verificationExpiresAt) || 0;
    const remainingSeconds = Math.max(0, Math.ceil((expiresAt - Date.now()) / 1000));
    const resendLabel = remainingSeconds ? `Gửi lại mã sau ${Math.floor(remainingSeconds / 60)}:${String(remainingSeconds % 60).padStart(2, '0')}` : 'Gửi lại mã OTP';
    return `<div class="auth-fields"><div class="notice ${noticeClass}" role="status"><span>${escapeHtml(message)}</span></div><form data-form="auth-verify-email" autocomplete="off" novalidate><div class="auth-fields"><p class="form-help">Email nhận mã: <strong>${escapeHtml(pendingEmail || 'email đăng ký')}</strong></p>${input('Mã xác minh (6 chữ số)', 'verificationCode', 'text', { autocomplete: 'one-time-code', inputMode: 'numeric', pattern: '[0-9]{6}', maxLength: 6 })}<p class="form-help">Mã chỉ dùng một lần và có hiệu lực trong thời gian hiển thị. Chỉ gửi mã mới khi mã hiện tại hết hạn.</p></div><button class="button button-primary auth-submit" type="submit">Xác minh email</button></form><button type="button" class="button button-secondary" data-auth-action="resend" ${remainingSeconds ? 'disabled' : ''}>${resendLabel}</button><button type="button" class="button button-secondary" data-auth-action="register">Dùng email khác</button><button type="button" class="button button-secondary" data-auth-action="login">Quay lại đăng nhập</button></div>`;
  }
  if (mode === 'forgot-sent') return `<div class="auth-fields"><div class="notice notice-success">Nếu email thuộc tài khoản đã xác minh, hướng dẫn đặt lại mật khẩu sẽ được gửi trong ít phút. Nếu bạn chưa xác minh email, hãy quay lại đăng nhập để gửi lại email xác minh.</div><button type="button" class="button button-primary auth-submit" data-auth-action="login">Quay lại đăng nhập</button></div>`;
  if (mode === 'verify-success') return `<div class="auth-fields"><div class="notice notice-success">Email đã được xác minh thành công.</div><button type="button" class="button button-primary auth-submit" data-auth-action="login">Quay lại đăng nhập</button></div>`;
  return '';
}

function renderAuthShowcase() {
  return `<section class="auth-showcase" aria-label="Ví Mình — Tiền của bạn, bạn làm chủ">
    <div class="auth-showcase-orb auth-showcase-orb-one" aria-hidden="true"></div>
    <div class="auth-showcase-orb auth-showcase-orb-two" aria-hidden="true"></div>
    <div class="auth-brand"><img class="auth-brand-lockup" src="/assets/brand-lockup-light.svg?v=20261020-logo-v2" alt=""></div>
    <div class="auth-copy"><h1>Tiền của bạn,<br><span>bạn làm chủ.</span></h1><p>Nhìn rõ từng khoản chi mỗi ngày. Lên kế hoạch dễ dàng và tiến gần hơn tới mục tiêu của bạn.</p></div>
    <div class="auth-growth-scene" aria-hidden="true">
      <img class="auth-growth-art" src="/assets/auth-growth-ribbon.webp?v=20261028-auth-banner-v1" alt="" width="1536" height="1024" decoding="async">
    </div>
  </section>`;
}

export function renderAuth(mode, notice, pendingEmail = '', resetToken = '', verificationExpiresAt = 0) {
  const content = configurations[mode] || configurations.login;
  const noticeClass = notice?.type === 'error' ? 'notice-error' : notice?.type === 'success' ? 'notice-success' : 'notice-info';
  const noticeBlock = notice && mode !== 'verify-info' && mode !== 'forgot-sent' ? `<div class="notice ${noticeClass} auth-notice" role="status"><span>${escapeHtml(notice.message)}</span></div>` : '';
  const otpWasSent = mode === 'login' && /mã\s*(?:otp|xác minh).{0,100}(?:đã|vừa)\s*được\s*gửi/i.test(notice?.message || '');
  const continueVerification = otpWasSent ? '<button type="button" class="button button-secondary auth-submit" data-auth-action="continue-verification">Nhập mã OTP</button>' : '';
  const description = content.description ? `<p>${escapeHtml(content.description)}</p>` : '';
  return `<main class="auth-page"><div class="auth-stage">${renderAuthShowcase()}<section class="auth-form-panel"><div class="auth-form-wrap"><span class="auth-form-kicker">CHÀO MỪNG ĐẾN VÍ MÌNH</span><h2>${escapeHtml(content.heading)}</h2>${description}${noticeBlock}${continueVerification}${authForm(mode, pendingEmail, resetToken, notice, verificationExpiresAt)}</div></section></div></main>`;
}
