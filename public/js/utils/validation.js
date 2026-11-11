import { syncCustomSelect } from '../components/custom-select.js?v=20261015-icon-system';

export function validateFields(form) {
  const errors = {};
  for (const field of form.querySelectorAll('[required]')) {
    const isMissing = field.type === 'checkbox' ? !field.checked : !String(field.value).trim();
    if (isMissing) errors[field.name] = field.type === 'checkbox' ? 'Bạn cần chọn ô xác nhận này để tiếp tục.' : 'Trường này là bắt buộc.';
  }
  for (const field of form.querySelectorAll('[type="number"]')) {
    if (!field.value) continue;
    const number = Number(field.value);
    const step = field.step || '1';
    const precision = step.includes('.') ? step.split('.')[1].length : 0;
    const decimalDigits = (String(field.value).split('.')[1] || '').length;
    const invalidInteger = step === '1' && !Number.isSafeInteger(number);
    const invalidPrecision = decimalDigits > precision;
    if (!Number.isFinite(number) || invalidInteger || invalidPrecision || number < Number(field.min || 0) || number > Number(field.max || Number.MAX_SAFE_INTEGER)) {
      errors[field.name] = step === '0.01' ? 'Nhập số hợp lệ, tối đa 2 chữ số thập phân.' : 'Nhập số nguyên hợp lệ.';
    }
  }
  for (const field of form.querySelectorAll('[type="email"]')) {
    if (field.value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(field.value)) errors[field.name] = 'Email chưa đúng định dạng.';
  }
  for (const field of form.querySelectorAll('[name="passwordConfirmation"]')) {
    const password = form.querySelector('[name="password"]');
    if (password && field.value !== password.value) errors[field.name] = 'Mật khẩu xác nhận chưa khớp.';
  }
  return errors;
}

export function showFieldErrors(form, errors = {}) {
  for (const field of form.querySelectorAll('[name]')) {
    const errorNode = form.querySelector(`[data-error-for="${CSS.escape(field.name)}"]`);
    const message = errors[field.name] || '';
    field.setAttribute('aria-invalid', String(Boolean(message)));
    if (field instanceof HTMLSelectElement) syncCustomSelect(field);
    if (errorNode) errorNode.textContent = message;
  }
}

export const hasErrors = (errors) => Object.keys(errors).length > 0;
