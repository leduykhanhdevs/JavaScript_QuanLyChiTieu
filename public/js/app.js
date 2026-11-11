import { api, get, post, patch, remove, ApiError } from './api/client.js';
import { renderApp } from './features/pages.js?v=20261111-help-bank-miniapp-v1';
import { renderAuth } from './features/auth-view.js?v=20261028-auth-banner-v1';
import { renderModal } from './features/forms.js';
import { toast } from './components/toast.js';
import { icon } from './components/icons.js';
import { enhanceCustomSelects, syncCustomSelect } from './components/custom-select.js?v=20261015-icon-system';
import { $, escapeHtml, initials, setButtonBusy } from './utils/dom.js';
import { hydrateUser, setSnapshot, state, clearUserData, applyLocalMutation, savePreferences } from './state/store.js?v=20261105-admin-suite-v1';
import { validateFields, showFieldErrors, hasErrors } from './utils/validation.js?v=20261015-icon-system';
import { formatMoney, formatMoneyInput, setMoneyDisplay } from './utils/money.js';
import { filterTransactions } from './utils/finance-stats.js';
import { applyBankHubAttempt, applyBankHubReadiness, getBankLinkRequest, refreshBankHubConnectButton, setBankHubBusy, updateBankSelection } from './features/bank-catalog.js?v=20261016-bank-hub-connect';
import { adminPathForView, adminUi, adminViewFromPath, changeAdminFilter, handleAdminAction, handleAdminAgentInput, loadAdminView, renderAdminApp, resetAdminUi, submitAdminAgent, submitAdminForm, submitAdminSearch } from './features/admin-view.js?v=20261111-agent-export-refresh-v2';
import { handleAgentAction, handleAgentEscape, handleAgentInput, handleAgentSubmit, renderAgentWidget, resetAgentSession } from './features/ai-agent.js?v=20261111-agent-export-refresh-v2';
import { recognizeReceipt, releaseReceiptWorker, validateReceiptImage } from './features/receipt-scanner.js?v=20261028-receipt-category-v1';
import { applyTranslations, observeTranslations } from './i18n.js?v=20261111-language-support-v1';

let authScreen = 'login';
let authNotice = null;
let pendingEmail = '';
let verificationExpiresAt = 0;
let verificationTimer = null;
let resetToken = '';
let authErrors = {};
let profileAvatarFile = null;
let profileAvatarRemoved = false;
let profileAvatarPreviewUrl = '';
let receiptPreviewUrl = '';
let receiptImageFile = null;

function receiptStatus(message, type = 'info') {
  const status = $('#modal [data-receipt-status]');
  if (!status) return;
  status.className = `notice notice-${type} receipt-scan-status`;
  status.textContent = message;
}

async function runReceiptRecognition(button) {
  const form = $('#modal form[data-form="receipt-scan"]');
  // The app rerenders the modal after selecting an image, which clears the
  // browser's FileList. Keep the selected File only in memory for this draft.
  const file = receiptImageFile;
  if (!form || !file) {
    receiptStatus('Chọn ảnh hóa đơn trước khi nhận diện.', 'error');
    return;
  }
  try { validateReceiptImage(file); }
  catch (error) { receiptStatus(error.message, 'error'); return; }
  setButtonBusy(button, true, 'Đang nhận diện…');
  receiptStatus('Đang tải công cụ nhận diện tiếng Việt lần đầu. Ảnh vẫn ở trên thiết bị này.', 'info');
  try {
    const result = await recognizeReceipt(file, ({ status, progress }) => {
      const percent = Math.round(progress * 100);
      const label = status === 'loading tesseract core' ? 'Đang nạp bộ nhận diện'
        : status === 'loading language traineddata' ? 'Đang nạp dữ liệu tiếng Việt'
          : status === 'recognizing text' ? 'Đang đọc chữ trên hóa đơn'
            : 'Đang chuẩn bị';
      receiptStatus(`${label}${progress ? ` · ${percent}%` : '…'} Ảnh không được tải lên máy chủ.`, 'info');
    }, state.snapshot.categories);
    if (result.amount) form.elements.amount.value = formatMoneyInput(result.amount);
    if (result.date) form.elements.date.value = result.date;
    if (result.categorySuggestion) {
      const categorySelect = form.elements.categoryId;
      categorySelect.value = result.categorySuggestion.categoryId;
      syncCustomSelect(categorySelect);
    }
    if (!result.amount && !result.date && !result.categorySuggestion) receiptStatus('Chưa nhận ra chắc chắn số tiền, ngày hoặc danh mục. Bạn có thể điền các trường thủ công.', 'warn');
    else {
      const detected = [result.amount ? 'số tiền' : '', result.date ? 'ngày' : '', result.categorySuggestion ? `danh mục ${result.categorySuggestion.categoryName} theo nội dung hóa đơn` : ''].filter(Boolean);
      const confidenceNote = result.categorySuggestion ? '' : ' Chưa đủ từ khóa rõ để gợi ý danh mục; hãy chọn danh mục thủ công.';
      receiptStatus(`Đã gợi ý ${detected.join(', ')}.${confidenceNote} Kiểm tra lại các trường trước khi lưu.`, 'success');
    }
  } catch {
    receiptStatus('Không đọc được ảnh này. Hãy thử ảnh rõ hơn hoặc nhập thông tin thủ công.', 'error');
  } finally {
    await releaseReceiptWorker();
    setButtonBusy(button, false);
  }
}

function clearReceiptDraft() {
  if (receiptPreviewUrl) URL.revokeObjectURL(receiptPreviewUrl);
  receiptPreviewUrl = '';
  receiptImageFile = null;
  void releaseReceiptWorker();
}

function resetProfileAvatarDraft() {
  if (profileAvatarPreviewUrl) URL.revokeObjectURL(profileAvatarPreviewUrl);
  profileAvatarFile = null;
  profileAvatarRemoved = false;
  profileAvatarPreviewUrl = '';
}

function refreshProfileAvatarPreview() {
  if (state.modal?.type !== 'profile') return;
  const preview = $('#profile-avatar-preview');
  const removeButton = $('#modal [data-action="remove-profile-avatar"]');
  if (!preview) return;
  preview.replaceChildren();
  const imageUrl = profileAvatarFile && profileAvatarPreviewUrl
    ? profileAvatarPreviewUrl
    : !profileAvatarRemoved ? state.user?.avatarUrl : null;
  if (imageUrl) {
    const image = document.createElement('img');
    image.src = imageUrl;
    image.alt = '';
    preview.append(image);
  } else preview.textContent = initials(state.user?.fullName || '');
  if (removeButton) {
    removeButton.hidden = !state.user?.avatarUrl && !profileAvatarFile;
    removeButton.textContent = profileAvatarFile ? 'Bỏ ảnh mới' : profileAvatarRemoved ? 'Khôi phục ảnh' : 'Gỡ ảnh';
  }
}

async function avatarDataUrl(file) {
  if (!file) return undefined;
  if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type) || file.size > 5 * 1024 * 1024) {
    throw new Error('Chọn ảnh PNG, JPG hoặc WebP có dung lượng tối đa 5 MB.');
  }
  const bitmap = await createImageBitmap(file);
  if (bitmap.width > 8192 || bitmap.height > 8192 || !bitmap.width || !bitmap.height) {
    bitmap.close();
    throw new Error('Kích thước ảnh vượt quá giới hạn hỗ trợ.');
  }
  const side = Math.min(bitmap.width, bitmap.height);
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const context = canvas.getContext('2d');
  context.drawImage(bitmap, (bitmap.width - side) / 2, (bitmap.height - side) / 2, side, side, 0, 0, 256, 256);
  bitmap.close();
  const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.86));
  if (!blob || blob.size > 262_144) throw new Error('Không thể xử lý ảnh. Hãy chọn ảnh khác nhỏ hơn.');
  return await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error('Không đọc được ảnh đã chọn.'));
    reader.readAsDataURL(blob);
  });
}

function syncVerificationResendControl() {
  if (verificationTimer) clearInterval(verificationTimer);
  verificationTimer = null;
  const update = () => {
    const button = $('#app [data-auth-action="resend"]');
    if (!button) {
      if (verificationTimer) clearInterval(verificationTimer);
      verificationTimer = null;
      return;
    }
    const remaining = Math.max(0, Math.ceil((verificationExpiresAt - Date.now()) / 1000));
    button.disabled = remaining > 0;
    button.textContent = remaining
      ? `Gửi lại mã sau ${Math.floor(remaining / 60)}:${String(remaining % 60).padStart(2, '0')}`
      : 'Gửi lại mã OTP';
    if (!remaining && verificationTimer) {
      clearInterval(verificationTimer);
      verificationTimer = null;
    }
  };
  update();
  if ($('#app [data-auth-action="resend"]') && verificationExpiresAt > Date.now()) verificationTimer = setInterval(update, 1000);
}

function render() {
  const root = $('#app');
  if (!root) return;
  if (!state.user) {
    resetAgentSession();
    root.innerHTML = renderAuth(authScreen, authNotice, pendingEmail, resetToken, verificationExpiresAt);
    applyTranslations(document, 'vi');
    enhanceCustomSelects(root);
    const authForm = $('#app form');
    if (authForm) showFieldErrors(authForm, authErrors);
    if (authScreen === 'verify-info') syncVerificationResendControl();
    else if (verificationTimer) { clearInterval(verificationTimer); verificationTimer = null; }
    return;
  }
  const language = state.user.language || 'vi';
  document.documentElement.lang = language === 'zh' ? 'zh-CN' : language;
  setMoneyDisplay(state.user.currency || 'VND', state.fxRates?.usdVnd, language);
  if ((state.view === 'settings' || state.user.currency === 'USD') && !state.fxRates && !state.fxRateLoading && !state.fxRateError) {
    void refreshFxRates({ quiet: true });
  }
  if (state.view.startsWith('admin-') && state.user.role === 'admin') {
    root.innerHTML = `${renderAdminApp(state)}${renderModal(state)}`;
    applyTranslations(root, language);
    enhanceCustomSelects(root);
    const confirmDialog = $('#admin-confirm-dialog', root);
    if (confirmDialog && !confirmDialog.open) confirmDialog.showModal();
    const roleDialog = $('#admin-role-dialog', root);
    if (roleDialog && !roleDialog.open) roleDialog.showModal();
    const detailDialog = $('#admin-user-detail-dialog', root);
    if (detailDialog && !detailDialog.open) detailDialog.showModal();
    const modal = $('#modal', root);
    if (state.modal && modal && !modal.open) modal.showModal();
    refreshProfileAvatarPreview();
    return;
  }
  root.innerHTML = `${renderApp(state)}${renderModal(state)}${renderAgentWidget(state)}`;
  applyTranslations(root, language);
  enhanceCustomSelects(root);
  if (state.modal) {
    const modal = $('#modal', root);
    if (modal && !modal.open) modal.showModal();
    refreshProfileAvatarPreview();
  }
}

function setNotice(message, type = 'info') {
  authNotice = message ? { message, type } : null;
}

async function refreshBankHubStatus({ inspectAttempt = false, notify = false } = {}) {
  try {
    const readiness = await get('/api/bank-hub/status');
    applyBankHubReadiness(readiness);
    if (!inspectAttempt) return null;
    const result = await get('/api/bank-hub/attempt/status');
    applyBankHubAttempt(result.attempt);
    return result.attempt;
  } catch (error) {
    applyBankHubReadiness({ configured: false });
    if (notify) toast(error.message || 'Chưa tải được trạng thái liên kết ngân hàng.', 'error');
    return null;
  }
}

async function syncSnapshot({ silent = false } = {}) {
  try {
    const snapshot = await get('/api/bootstrap');
    setSnapshot(snapshot);
    setMoneyDisplay(state.user?.currency || 'VND', state.fxRates?.usdVnd, state.user?.language || 'vi');
    render();
    return true;
  } catch (error) {
    state.offline = true;
    render();
    if (!silent) toast(error.message || 'Chưa đồng bộ được dữ liệu.', 'error');
    return false;
  }
}

async function refreshFxRates({ quiet = false, renderAfter = true } = {}) {
  if (!state.user || state.fxRateLoading) return state.fxRates;
  state.fxRateLoading = true;
  state.fxRateError = null;
  if (renderAfter && state.view === 'settings') render();
  try {
    state.fxRates = await get(`/api/fx/rates?days=${state.fxRangeDays || 30}`);
    state.fxRateError = null;
  } catch (error) {
    state.fxRates = null;
    state.fxRateError = error;
    if (!quiet) toast(error.message || 'Chưa tải được tỷ giá USD/VND.', 'error');
  } finally {
    state.fxRateLoading = false;
    setMoneyDisplay(state.user?.currency || 'VND', state.fxRates?.usdVnd, state.user?.language || 'vi');
    if (renderAfter) render();
  }
  return state.fxRates;
}

async function changeCurrencyPreference(currency) {
  if (!['VND', 'USD'].includes(currency) || currency === state.user?.currency) return;
  if (currency === 'USD' && !state.fxRates) {
    await refreshFxRates({ quiet: true, renderAfter: false });
    if (!state.fxRates) {
      render();
      toast(state.fxRateError?.message || 'Chưa có tỷ giá để chuyển sang USD.', 'error');
      return;
    }
  }
  try {
    const result = await patch('/api/settings/preferences', { currency });
    const previousCurrency = state.user?.currency === 'USD' ? 'USD' : 'VND';
    const rate = Number(state.fxRates?.usdVnd);
    if (previousCurrency !== currency) {
      for (const key of ['minAmount', 'maxAmount']) {
        const value = state.filters[key];
        if (!value) continue;
        if (!Number.isFinite(rate) || rate <= 0) state.filters[key] = '';
        else state.filters[key] = previousCurrency === 'USD'
          ? String(Math.round(Number(value) * rate))
          : (Number(value) / rate).toFixed(2);
      }
    }
    state.user = result.user;
    savePreferences({ currency: result.user.currency });
    setMoneyDisplay(result.user.currency, state.fxRates?.usdVnd, result.user.language || 'vi');
    render();
    toast(currency === 'USD' ? 'Đã đổi đơn vị hiển thị sang USD.' : 'Đã đổi đơn vị hiển thị sang VND.', 'success');
    await syncSnapshot({ silent: true });
  } catch (error) {
    toast(error.message || 'Chưa lưu được đơn vị tiền tệ.', 'error');
  }
}

async function changeUiLanguage(select) {
  const language = select.value;
  const previousLanguage = state.user?.language || 'vi';
  if (!['vi', 'en', 'zh'].includes(language) || language === previousLanguage) return;
  select.disabled = true;
  try {
    const result = await patch('/api/settings/preferences', { language });
    state.user = result.user;
    savePreferences({ language: result.user.language || language });
    render();
    toast('Đã cập nhật ngôn ngữ giao diện.', 'success');
    await syncSnapshot({ silent: true });
  } catch (error) {
    if (select.isConnected) select.value = previousLanguage;
    toast(error.message || 'Chưa lưu được ngôn ngữ giao diện.', 'error');
  } finally {
    if (select.isConnected) select.disabled = false;
  }
}

function updateFxConverter() {
  const input = $('#fx-converter-input');
  const output = $('#fx-converter-output');
  if (!input || !output || !state.fxRates) return;
  const amount = Number(input.value);
  if (!Number.isFinite(amount) || amount < 0) { output.textContent = '—'; return; }
  const converted = state.fxReverse ? amount * state.fxRates.vndUsd : amount * state.fxRates.usdVnd;
  output.textContent = new Intl.NumberFormat(document.documentElement.lang || 'vi-VN', {
    maximumFractionDigits: state.fxReverse ? 2 : 0
  }).format(converted);
}

async function enterSignedIn(user) {
  hydrateUser(user);
  const requestedAdminView = adminViewFromPath(location.pathname);
  const requestedSettingsView = location.hash.startsWith('#settings-');
  state.view = user.role === 'admin' && requestedAdminView ? requestedAdminView : requestedSettingsView ? 'settings' : 'dashboard';
  const deniedAdminRoute = Boolean(requestedAdminView && user.role !== 'admin');
  if (deniedAdminRoute) history.replaceState({}, document.title, '/');
  if (state.view.startsWith('admin-')) adminUi.view = state.view;
  setNotice('');
  render();
  const ok = await syncSnapshot({ silent: true });
  if (state.view === 'settings') await refreshBankHubStatus({ inspectAttempt: new URLSearchParams(location.search).get('bankhub') === 'returned' });
  if (!ok && !state.snapshot.syncedAt) toast('Chưa tải được dữ liệu. Kiểm tra PostgreSQL và thử đồng bộ lại.', 'error');
  if (state.view.startsWith('admin-')) {
    const request = loadAdminView(state.view);
    render();
    await request;
    render();
  }
}

function clearUrl() {
  const clean = `${location.pathname}${location.hash}`;
  history.replaceState({}, document.title, clean || '/');
}

async function processEmailLink() {
  const params = new URLSearchParams(location.search);
  const verify = params.get('verify');
  const reset = params.get('reset');
  if (verify) {
    clearUrl();
    authScreen = 'verify-success';
    render();
    try {
      const result = await get(`/api/auth/verify-email?token=${encodeURIComponent(verify)}`);
      setNotice(result.message || 'Email đã xác minh. Bạn có thể đăng nhập.');
      authScreen = 'verify-success';
    } catch (error) {
      authScreen = 'login';
      setNotice(error.message, 'error');
    }
    render();
    return true;
  }
  if (reset) {
    resetToken = reset;
    clearUrl();
    authScreen = 'reset';
    setNotice('');
    render();
    return true;
  }
  return false;
}

async function start() {
  if (await processEmailLink()) return;
  const bankHubReturned = new URLSearchParams(location.search).get('bankhub') === 'returned';
  if (bankHubReturned) clearUrl();
  try {
    const result = await get('/api/auth/me');
    await enterSignedIn(result.user);
    if (bankHubReturned) {
      const attempt = await refreshBankHubStatus({ inspectAttempt: true, notify: true });
      if (attempt?.status === 'linked') {
        const name = attempt.bankName || 'ngân hàng';
        toast(`SePay đã xác nhận liên kết ${name}. Đồng bộ giao dịch chưa được bật.`, 'success');
      } else if (attempt?.status === 'launched') {
        toast('Đã quay lại từ SePay. Trạng thái liên kết đang chờ xác nhận.', 'info');
      } else if (attempt?.status === 'failed' || attempt?.status === 'abandoned' || attempt?.status === 'expired') {
        toast('SePay chưa hoàn tất liên kết. Bạn có thể bắt đầu lại.', 'error');
      }
    }
  } catch (error) {
    authScreen = 'login';
    if (location.pathname.startsWith('/admin') && error instanceof ApiError && error.code === 'UNAUTHENTICATED') history.replaceState({}, document.title, '/');
    else if (!(error instanceof ApiError) || !['UNAUTHENTICATED'].includes(error.code)) setNotice(error.message || 'Máy chủ chưa sẵn sàng.', 'error');
    render();
  }
}

function openModal(type, data = {}) {
  if (type === 'profile') resetProfileAvatarDraft();
  state.modal = { type, data };
  render();
  const firstField = $('#modal [name]:not([type="hidden"])');
  const firstFocusTarget = firstField?.classList.contains('custom-select-source')
    ? firstField.closest('.custom-select')?.querySelector('.custom-select-trigger')
    : firstField;
  firstFocusTarget?.focus({ preventScroll: true });
}

function readAgentActionContext(button) {
  if (!button?.dataset.agentContext) return null;
  try {
    const value = JSON.parse(button.dataset.agentContext);
    if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
    const month = /^\d{4}-\d{2}$/.test(value.period?.month || '') ? value.period.month : '';
    const date = (input) => /^\d{4}-\d{2}-\d{2}$/.test(input || '') ? input : '';
    const category = state.snapshot.categories.find((item) => item.id === value.categoryId);
    const account = state.snapshot.accounts.find((item) => item.id === value.accountId && !item.isArchived && item.kind !== 'goal');
    const goal = state.snapshot.goals.find((item) => item.id === value.goalId && item.status === 'active');
    const recurring = state.snapshot.recurringRules.find((item) => item.id === value.recurringId && item.isActive);
    return {
      period: month && ['month', 'range'].includes(value.period?.mode)
        ? { month, from: date(value.period.from), to: date(value.period.to), mode: value.period.mode }
        : null,
      kind: ['income', 'expense'].includes(value.kind) ? value.kind : category?.kind || '',
      categoryId: category?.id || '',
      accountId: account?.id || '',
      goalId: goal?.id || '',
      recurringId: recurring?.id || ''
    };
  } catch {
    return null;
  }
}

function applyAgentActionContext(view, context) {
  if (!context) return;
  const period = context.period;
  if (view === 'transactions' && (period || context.kind || context.categoryId || context.accountId)) {
    state.filters = {
      month: period?.mode === 'month' ? period.month : '',
      kind: context.kind || 'all',
      accountId: context.accountId || 'all',
      categoryId: context.categoryId || 'all',
      from: period?.mode === 'range' ? period.from : '',
      to: period?.mode === 'range' ? period.to : '',
      minAmount: '',
      maxAmount: '',
      sort: 'newest'
    };
    state.search = '';
  }
  if (period && view === 'reports') {
    state.period = period.month;
    state.reportRange = { from: period.from, to: period.to };
  }
  if (period && view === 'budgets') state.period = period.month;
  if (view === 'categories') {
    const category = state.snapshot.categories.find((item) => item.id === context.categoryId);
    state.categorySearch = '';
    if (category) {
      state.categoryKind = category.kind;
      state.categorySearch = category.name;
    } else if (context.kind) state.categoryKind = context.kind;
  }
}

function focusAgentActionTarget(view, context) {
  const focus = view === 'accounts' ? ['account', context?.accountId]
    : view === 'goals' ? ['goal', context?.goalId]
      : view === 'budgets' ? ['budget-category', context?.categoryId]
        : view === 'recurring' ? ['recurring', context?.recurringId]
          : null;
  if (!focus?.[1]) return;
  requestAnimationFrame(() => {
    const target = [...document.querySelectorAll('[data-agent-focus-type][data-agent-focus-id]')]
      .find((element) => element.dataset.agentFocusType === focus[0] && element.dataset.agentFocusId === focus[1]);
    target?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  });
}

function agentFormPrefill(action, context) {
  if (!context) return {};
  const period = context.period;
  const singleDate = period?.from && period.from === period.to ? period.from : '';
  if (action === 'new-transaction') return {
    kind: context.kind || 'expense',
    date: singleDate,
    accountId: context.accountId,
    categoryId: context.categoryId
  };
  if (action === 'new-budget') return {
    periodStart: period?.month ? `${period.month}-01` : '',
    categoryId: context.kind === 'income' ? '' : context.categoryId
  };
  if (action === 'new-recurring') return {
    kind: context.kind || 'expense',
    startOn: singleDate,
    accountId: context.accountId,
    categoryId: context.categoryId
  };
  if (action === 'new-category') return { kind: context.kind || 'expense' };
  return {};
}

function closeModal() {
  const modal = $('#modal');
  if (state.modal?.type === 'profile') resetProfileAvatarDraft();
  if (state.modal?.type === 'receipt-scan') clearReceiptDraft();
  if (modal?.open) modal.close();
  state.modal = null;
  render();
}

function transactionById(id) { return state.snapshot.transactions.find((item) => item.id === id); }
function accountById(id) { return state.snapshot.accounts.find((item) => item.id === id); }
function categoryById(id) { return state.snapshot.categories.find((item) => item.id === id); }
function budgetById(id) { return state.snapshot.budgets.find((item) => item.id === id); }
function recurringById(id) { return state.snapshot.recurringRules.find((item) => item.id === id); }
function goalById(id) { return state.snapshot.goals.find((item) => item.id === id); }

async function performMutation(path, method, payload, { success = 'Đã lưu thay đổi.', close = true } = {}) {
  const result = await api(path, { method, body: method === 'DELETE' ? undefined : payload });
  applyLocalMutation(path, method, payload || {}, result);
  state.offline = false;
  if (path === '/api/settings/profile' && result.user) {
    state.user = result.user;
    resetProfileAvatarDraft();
  }
  if (close) {
    if (state.modal?.type === 'receipt-scan') clearReceiptDraft();
    state.modal = null;
  }
  render();
  toast(success, 'success');
  await syncSnapshot({ silent: true });
}

function updateFilteredTransactions() {
  const results = $('#transaction-results');
  if (!results) return;
  const rows = filterCurrentTransactions();
  results.innerHTML = transactionListMarkup(rows);
  const counter = $('#transaction-count');
  if (counter) counter.textContent = `${rows.length} giao dịch phù hợp`;
  const incomeCount = rows.filter((item) => item.kind === 'income').length;
  const expenseCount = rows.filter((item) => item.kind === 'expense').length;
  const totalCard = $('#transaction-total-count');
  const incomeCard = $('#transaction-income-count');
  const expenseCard = $('#transaction-expense-count');
  if (totalCard) totalCard.textContent = String(rows.length);
  if (incomeCard) incomeCard.textContent = String(incomeCount);
  if (expenseCard) expenseCard.textContent = String(expenseCount);
  const localSearch = $('#transaction-search');
  if (localSearch && localSearch !== document.activeElement) localSearch.value = state.search;
  const globalSearch = $('#global-search');
  if (globalSearch && globalSearch !== document.activeElement) globalSearch.value = state.search;
}

function filterCurrentTransactions() {
  return filterTransactionsForView(state.snapshot.transactions, state.filters, state.search);
}

function transactionListMarkup(rows) {
  if (!rows.length) {
    const category = state.snapshot.categories.find((item) => item.id === state.filters.categoryId);
    const title = category ? `Chưa có giao dịch trong danh mục ${escapeHtml(category.name)}` : 'Không tìm thấy giao dịch phù hợp';
    const description = category ? 'Các khoản thu hoặc chi thuộc danh mục này sẽ xuất hiện tại đây.' : 'Hãy thay đổi bộ lọc hoặc ghi nhận giao dịch mới.';
    return `<div class="empty-state"><div><div class="empty-illustration" aria-hidden="true">${icon('search', 28)}</div><h3>${title}</h3><p>${description}</p><button class="button button-primary" data-action="new-transaction"><span class="button-icon" aria-hidden="true">${icon('plus', 17)}</span>Thêm giao dịch</button></div></div>`;
  }
  const formatDate = (date) => new Intl.DateTimeFormat(document.documentElement.lang || 'vi-VN', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(`${date}T00:00:00`));
  return `<div class="transaction-table-wrap"><table class="transaction-table"><thead><tr><th>Khoản mục</th><th>Ngày</th><th>Loại</th><th style="text-align:right">Số tiền</th><th></th></tr></thead><tbody>${rows.map((item) => `<tr><td><div class="transaction-main"><span class="row-icon ${item.kind}">${icon(item.kind === 'income' ? 'income' : 'expense', 18)}</span><span><strong>${escapeHtml(item.note || item.categoryName)}</strong><small>${escapeHtml(item.categoryName)} · ${escapeHtml(item.accountName)}</small></span></div></td><td>${formatDate(item.date)}</td><td>${item.kind === 'income' ? 'Khoản thu' : 'Khoản chi'}</td><td class="amount-cell ${item.kind}">${item.kind === 'income' ? '+' : '−'}${formatMoney(item.amount)}</td><td><div class="table-actions"><button class="icon-button" aria-label="Xem chi tiết" data-action="transaction-detail" data-id="${item.id}">${icon('search', 16)}</button><button class="icon-button" aria-label="Chỉnh sửa" data-action="edit-transaction" data-id="${item.id}">${icon('pencil', 16)}</button><button class="icon-button" aria-label="Xóa" data-action="delete-transaction" data-id="${item.id}">${icon('trash', 16)}</button></div></td></tr>`).join('')}</tbody></table></div>`;
}

function filterTransactionsForView(transactions, filters, search) {
  return filterTransactions(transactions, filters, search, state.user?.currency || 'VND', state.fxRates?.usdVnd);
}

function updateCategorySelect(form, kind) {
  const select = form.querySelector('[name="categoryId"]');
  if (!select) return;
  const previous = select.value;
  const options = state.snapshot.categories.filter((item) => item.kind === kind && !item.isArchived);
  select.innerHTML = `<option value="">Chọn danh mục…</option>${options.map((item) => `<option value="${item.id}">${escapeHtml(item.name)}</option>`).join('')}`;
  if (options.some((item) => item.id === previous)) select.value = previous;
  syncCustomSelect(select);
}

function openDelete(entity, id, title, { archive = false, message = '' } = {}) {
  openModal('delete', { entity, id, title, archive, message });
}

async function handleAction(button) {
  const { action, view, id } = button.dataset;
  if (!action) return;
  if (action === 'navigate') {
    const agentContext = readAgentActionContext(button);
    state.adminMenuOpen = false;
    document.querySelector('#sidebar')?.classList.remove('is-open');
    const adminPath = adminPathForView(view);
    if (adminPath) {
      if (state.user?.role !== 'admin') {
        state.view = 'dashboard';
        history.replaceState({}, document.title, '/');
        render();
        return;
      }
      state.view = view;
      adminUi.view = view;
      history.pushState({}, document.title, adminPath);
      const request = loadAdminView(view);
      render();
      await request;
      render();
      return;
    }
    if (state.view.startsWith('admin-') && location.pathname.startsWith('/admin')) history.pushState({}, document.title, '/');
    applyAgentActionContext(view, agentContext);
    state.view = view;
    render();
    focusAgentActionTarget(view, agentContext);
    if (view === 'settings') await refreshBankHubStatus();
    return;
  }
  if (action === 'currency-preference') {
    await changeCurrencyPreference(button.dataset.currency);
    return;
  }
  if (action === 'fx-refresh') {
    await refreshFxRates();
    return;
  }
  if (action === 'fx-range') {
    state.fxRangeDays = Math.max(1, Math.min(365, Number(button.dataset.days) || 30));
    await refreshFxRates({ quiet: true });
    return;
  }
  if (action === 'fx-swap') {
    state.fxReverse = !state.fxReverse;
    render();
    updateFxConverter();
    return;
  }
  if (action === 'category-kind') {
    state.categoryKind = button.dataset.kind === 'income' ? 'income' : 'expense';
    render();
    return;
  }
  if (action === 'category-history') {
    const category = state.snapshot.categories.find((item) => item.id === id);
    if (!category) return;
    state.filters = {
      month: '',
      kind: 'all',
      accountId: 'all',
      categoryId: category.id,
      from: '',
      to: '',
      minAmount: '',
      maxAmount: '',
      sort: 'newest'
    };
    state.search = '';
    state.categoryKind = category.kind;
    state.view = 'transactions';
    document.querySelector('#sidebar')?.classList.remove('is-open');
    render();
    return;
  }
  if (action === 'receipt-scan') { openModal('receipt-scan'); return; }
  if (action === 'receipt-ocr') { await runReceiptRecognition(button); return; }
  if (action === 'request-password-reset') {
    setButtonBusy(button, true, 'Đang gửi…');
    try {
      const result = await post('/api/auth/forgot-password', { email: state.user?.email });
      toast(result.message || 'Nếu email đã đăng ký, hướng dẫn đặt lại mật khẩu sẽ được gửi.', 'success');
    } catch (error) {
      toast(error.message || 'Chưa gửi được hướng dẫn đặt lại mật khẩu.', 'error');
    } finally { setButtonBusy(button, false); }
    return;
  }
  if (action === 'bank-connect') {
    const request = getBankLinkRequest();
    if (!request) {
      toast('Chọn ngân hàng và đồng ý riêng với nội dung liên kết trước khi tiếp tục.', 'error');
      return;
    }
    setBankHubBusy(true);
    try {
      const result = await post('/api/bank-hub/connections/start', request);
      if (result.launchPath !== '/api/bank-hub/launch') throw new Error('Đường mở Hosted Link không hợp lệ.');
      location.assign(result.launchPath);
    } catch (error) {
      setBankHubBusy(false);
      toast(error.message || 'Chưa tạo được liên kết ngân hàng.', 'error');
      await refreshBankHubStatus();
    }
    return;
  }
  if (action === 'open-mini-app') {
    location.assign('viminh://open');
    return;
  }
  if (action === 'toggle-menu') { $('#sidebar')?.classList.toggle('is-open'); return; }
  if (action === 'close-modal') { closeModal(); return; }
  if (action === 'submit-modal') { $('#modal form')?.requestSubmit(); return; }
  if (action === 'transaction-kind') {
    const form = $('#modal form');
    const kind = button.dataset.kind;
    if (!form) return;
    form.elements.kind.value = kind;
    form.querySelectorAll('[data-action="transaction-kind"]').forEach((item) => item.setAttribute('aria-pressed', String(item.dataset.kind === kind)));
    updateCategorySelect(form, kind);
    return;
  }
  if (action === 'new-transaction') { openModal('transaction', agentFormPrefill(action, readAgentActionContext(button))); return; }
  if (action === 'edit-transaction') { const row = transactionById(id); if (row) openModal('transaction', row); return; }
  if (action === 'transaction-detail') { openModal('transaction-detail', { id }); return; }
  if (action === 'delete-transaction') { const row = transactionById(id); if (row) openDelete('transactions', id, row.note || row.categoryName, { message: 'Xóa giao dịch có thể làm thay đổi số dư lịch sử. Thao tác sẽ bị từ chối nếu làm tài khoản âm.' }); return; }
  if (action === 'new-account') { openModal('account'); return; }
  if (action === 'edit-account') { const row = accountById(id); if (row) openModal('account', row); return; }
  if (action === 'archive-account') { const row = accountById(id); if (row) openDelete('accounts', id, row.name, { archive: true, message: 'Tài khoản được lưu trữ và ẩn khỏi các biểu mẫu mới. Lịch sử cũ vẫn được giữ.' }); return; }
  if (action === 'new-category') { openModal('category', agentFormPrefill(action, readAgentActionContext(button))); return; }
  if (action === 'edit-category') { const row = categoryById(id); if (row) openModal('category', row); return; }
  if (action === 'archive-category') { const row = categoryById(id); if (row) openDelete('categories', id, row.name, { archive: true, message: 'Danh mục được lưu trữ. Các giao dịch và báo cáo cũ vẫn được giữ.' }); return; }
  if (action === 'new-budget') { openModal('budget', agentFormPrefill(action, readAgentActionContext(button))); return; }
  if (action === 'edit-budget') { const row = budgetById(id); if (row) openModal('budget', row); return; }
  if (action === 'delete-budget') { const row = budgetById(id); if (row) openDelete('budgets', id, row.categoryName, { message: 'Ngân sách của kỳ này sẽ bị xóa. Giao dịch liên quan vẫn được giữ.' }); return; }
  if (action === 'new-recurring') { openModal('recurring', agentFormPrefill(action, readAgentActionContext(button))); return; }
  if (action === 'edit-recurring') { const row = recurringById(id); if (row) openModal('recurring', row); return; }
  if (action === 'toggle-recurring') {
    const row = recurringById(id);
    if (!row) return;
    try { await performMutation(`/api/recurring-rules/${id}`, 'PATCH', { ...row, isActive: !row.isActive }, { success: row.isActive ? 'Đã tạm dừng giao dịch định kỳ.' : 'Đã bật lại giao dịch định kỳ.', close: false }); }
    catch (error) { toast(error.message, 'error'); }
    return;
  }
  if (action === 'run-recurring') {
    setButtonBusy(button, true, 'Đang kiểm tra…');
    try {
      const result = await post('/api/recurring-rules/run-due', {});
      await syncSnapshot({ silent: true });
      toast(result.generated.length ? `Đã tạo ${result.generated.length} giao dịch đến hạn.` : 'Không có giao dịch nào đến hạn.', 'success');
    } catch (error) { toast(error.message, 'error'); }
    finally { setButtonBusy(button, false); }
    return;
  }
  if (action === 'new-goal') { openModal('goal'); return; }
  if (action === 'edit-goal') { const row = goalById(id); if (row) openModal('goal', row); return; }
  if (action === 'archive-goal') { const row = goalById(id); if (row) openDelete('savings-goals', id, row.title, { archive: true, message: 'Mục tiêu được lưu trữ; số dư và lịch sử trong ví mục tiêu vẫn được giữ.' }); return; }
  if (action === 'goal-deposit' || action === 'goal-withdraw') { openModal('goal-movement', { goalId: id, direction: action === 'goal-deposit' ? 'deposit' : 'withdraw' }); return; }
  if (action === 'new-transfer') { openModal('transfer'); return; }
  if (action === 'edit-profile') { openModal('profile'); return; }
  if (action === 'start-profile-email-change') { startProfileEmailChange(); return; }
  if (action === 'send-email-change-authorization') { await sendEmailChangeAuthorization(button); return; }
  if (action === 'confirm-email-change-authorization') { await confirmEmailChangeAuthorization(button); return; }
  if (action === 'cancel-profile-email-change') { await cancelProfileEmailChange(button); return; }
  if (action === 'send-profile-email-code') { await sendProfileEmailCode(button); return; }
  if (action === 'confirm-profile-email-code') { await confirmProfileEmailCode(button); return; }
  if (action === 'remove-profile-avatar') {
    const hadNewAvatar = Boolean(profileAvatarFile);
    if (profileAvatarPreviewUrl) URL.revokeObjectURL(profileAvatarPreviewUrl);
    profileAvatarPreviewUrl = '';
    profileAvatarFile = null;
    profileAvatarRemoved = hadNewAvatar ? false : state.user?.avatarUrl ? !profileAvatarRemoved : false;
    const fileInput = $('#modal [name="avatar"]');
    if (fileInput) fileInput.value = '';
    refreshProfileAvatarPreview();
    return;
  }
  if (action === 'sync') {
    setButtonBusy(button, true, 'Đang đồng bộ…');
    const success = await syncSnapshot();
    if (success) toast('Dữ liệu đã được đồng bộ.', 'success');
    setButtonBusy(button, false);
    return;
  }
  if (action === 'logout') { openModal('logout-confirm'); return; }
  if (action === 'confirm-logout') {
    setButtonBusy(button, true, 'Đang đăng xuất…');
    await signOut();
    return;
  }
  if (action === 'clear-filters') {
    state.search = '';
    state.filters = { month: '', kind: 'all', accountId: 'all', categoryId: 'all', from: '', to: '', minAmount: '', maxAmount: '', sort: 'newest' };
    render(); return;
  }
  if (action === 'confirm-delete') { await confirmDelete(button); return; }
  if (action === 'edit-transaction-from-detail') { const row = transactionById(id); if (row) openModal('transaction', row); return; }
}

async function confirmDelete(button) {
  const form = $('#modal form[data-form="delete"]');
  if (!form) return;
  const { entity, id } = form.dataset;
  const archive = state.modal?.data?.archive;
  const path = entity === 'transactions' ? `/api/transactions/${id}`
    : entity === 'accounts' ? `/api/accounts/${id}`
      : entity === 'categories' ? `/api/categories/${id}`
        : entity === 'budgets' ? `/api/budgets/${id}`
          : entity === 'savings-goals' ? `/api/savings-goals/${id}` : null;
  if (!path) return;
  setButtonBusy(button, true, archive ? 'Đang lưu trữ…' : 'Đang xóa…');
  try {
    await performMutation(path, 'DELETE', {}, { success: archive ? 'Đã lưu trữ dữ liệu.' : 'Đã xóa dữ liệu.' });
  } catch (error) { toast(error.message, 'error'); setButtonBusy(button, false); }
}

async function signOut() {
  const userId = state.user?.id;
  let requestFailed = false;
  try { await post('/api/auth/logout', {}); }
  catch { requestFailed = true; }
  clearUserData(userId);
  resetAgentSession();
  resetAdminUi();
  if (location.pathname.startsWith('/admin')) history.replaceState({}, document.title, '/');
  authScreen = 'login';
  setNotice(requestFailed ? 'Đã xóa cache trên thiết bị, nhưng máy chủ chưa xác nhận thu hồi phiên. Hãy đăng xuất lại khi có kết nối.' : 'Bạn đã đăng xuất thành công.');
  render();
  if (requestFailed) toast('Máy chủ chưa xác nhận đăng xuất.', 'error');
}

function profileDraftFrom(form) {
  return {
    ...state.modal.data,
    fullName: form?.elements.fullName?.value ?? state.modal.data.fullName,
    pendingEmail: form?.elements.newEmail?.value?.trim() ?? state.modal.data.pendingEmail ?? ''
  };
}

function showProfileEmailFlow(focusName = '') {
  render();
  if (focusName) $('#modal [name="' + focusName + '"]')?.focus();
}

function startProfileEmailChange() {
  const form = $('#modal form[data-form="profile"]');
  if (!form || !state.modal) return;
  state.modal.data = {
    ...profileDraftFrom(form),
    emailChangeStarted: true,
    authorizationCodeSent: false,
    emailChangeAuthorized: false,
    pendingEmail: '',
    newEmailCodeSent: false,
    newEmailVerified: false
  };
  showProfileEmailFlow();
}

async function sendEmailChangeAuthorization(button) {
  const form = $('#modal form[data-form="profile"]');
  if (!form || !state.modal) return;
  setButtonBusy(button, true, 'Đang gửi…');
  try {
    const result = await post('/api/settings/profile/email-change/authorization', {});
    state.modal.data = { ...profileDraftFrom(form), emailChangeStarted: true, authorizationCodeSent: true, emailChangeAuthorized: false, newEmailCodeSent: false, newEmailVerified: false };
    showProfileEmailFlow('authorizationCode');
    toast(result.message || 'Mã xác nhận đã được gửi đến email hiện tại.', 'success');
  } catch (error) {
    if (error.fields) showFieldErrors(form, error.fields);
    toast(error.message || 'Chưa gửi được mã xác nhận.', 'error');
  } finally { setButtonBusy(button, false); }
}

async function confirmEmailChangeAuthorization(button) {
  const form = $('#modal form[data-form="profile"]');
  const code = form?.elements.authorizationCode?.value.trim();
  if (!form || !state.modal) return;
  setButtonBusy(button, true, 'Đang xác nhận…');
  try {
    const result = await post('/api/settings/profile/email-change/authorization/confirm', { code });
    state.modal.data = { ...profileDraftFrom(form), emailChangeStarted: true, authorizationCodeSent: true, emailChangeAuthorized: true, pendingEmail: '', newEmailCodeSent: false, newEmailVerified: false };
    showProfileEmailFlow('newEmail');
    toast(result.message || 'Email hiện tại đã được xác minh.', 'success');
  } catch (error) {
    if (error.fields) showFieldErrors(form, error.fields);
    toast(error.message || 'Mã xác nhận chưa đúng.', 'error');
  } finally { setButtonBusy(button, false); }
}

async function sendProfileEmailCode(button) {
  const form = $('#modal form[data-form="profile"]');
  if (!form || !state.modal) return;
  const emailInput = form.elements.newEmail;
  const email = emailInput?.value.trim() || '';
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    showFieldErrors(form, { newEmail: 'Nhập địa chỉ email hợp lệ.' });
    emailInput?.focus();
    return;
  }
  showFieldErrors(form, {});
  setButtonBusy(button, true, 'Đang gửi…');
  try {
    const result = await post('/api/settings/profile/email-verification', { email });
    state.modal.data = { ...profileDraftFrom(form), emailChangeStarted: true, emailChangeAuthorized: true, pendingEmail: email, newEmailCodeSent: true, newEmailVerified: false };
    showProfileEmailFlow('newEmailCode');
    toast(result.message || 'Mã xác nhận đã được gửi đến email mới.', 'success');
  } catch (error) {
    if (error.fields) showFieldErrors(form, error.fields);
    toast(error.message || 'Chưa gửi được mã xác nhận.', 'error');
  } finally { setButtonBusy(button, false); }
}

async function confirmProfileEmailCode(button) {
  const form = $('#modal form[data-form="profile"]');
  if (!form || !state.modal) return;
  const email = form.elements.newEmail?.value.trim() || '';
  const code = form.elements.newEmailCode?.value.trim() || '';
  setButtonBusy(button, true, 'Đang xác nhận…');
  try {
    const result = await post('/api/settings/profile/email-verification/confirm', { email, code });
    state.modal.data = { ...profileDraftFrom(form), emailChangeStarted: true, emailChangeAuthorized: true, pendingEmail: result.email || email, newEmailCodeSent: true, newEmailVerified: true };
    showProfileEmailFlow();
    toast(result.message || 'Email mới đã được xác minh. Bấm Lưu hồ sơ để áp dụng.', 'success');
  } catch (error) {
    if (error.fields) showFieldErrors(form, error.fields);
    toast(error.message || 'Mã xác nhận chưa đúng.', 'error');
  } finally { setButtonBusy(button, false); }
}

async function cancelProfileEmailChange(button) {
  const form = $('#modal form[data-form="profile"]');
  if (!form || !state.modal) return;
  setButtonBusy(button, true, 'Đang hủy…');
  try {
    await post('/api/settings/profile/email-change/cancel', {});
    state.modal.data = { ...profileDraftFrom(form), emailChangeStarted: false, authorizationCodeSent: false, emailChangeAuthorized: false, pendingEmail: '', newEmailCodeSent: false, newEmailVerified: false };
    showProfileEmailFlow();
  } catch (error) {
    toast(error.message || 'Chưa hủy được yêu cầu đổi email.', 'error');
  } finally { setButtonBusy(button, false); }
}

function formPayload(form) {
  const values = Object.fromEntries(new FormData(form).entries());
  form.querySelectorAll('input[type="checkbox"][name]').forEach((checkbox) => { values[checkbox.name] = checkbox.checked; });
  const numbers = ['amount', 'openingBalance', 'limitAmount', 'alertAtPercent', 'targetAmount', 'dayOfMonth'];
  numbers.forEach((name) => { if (values[name] !== undefined && values[name] !== '') values[name] = Number(values[name]); });
  for (const key of ['endOn', 'targetDate']) if (values[key] === '') values[key] = null;
  return values;
}

function validatePasswordExtras(form, errors) {
  const mode = form.dataset.form.replace('auth-', '');
  const password = form.querySelector('[name="password"]');
  const confirmation = form.querySelector('[name="passwordConfirmation"]');
  if (password && ['register', 'reset'].includes(mode) && password.value.length < 10) errors.password = 'Mật khẩu cần ít nhất 10 ký tự.';
  if (password && confirmation && password.value !== confirmation.value) errors.passwordConfirmation = 'Mật khẩu xác nhận chưa khớp.';
  const verificationCode = form.querySelector('[name="verificationCode"]');
  if (verificationCode && !/^\d{6}$/.test(verificationCode.value)) errors.verificationCode = 'Nhập mã OTP gồm đúng 6 chữ số.';
}

function validateBusinessForm(form, values, errors) {
  if (form.dataset.form === 'transfer' && values.sourceAccountId && values.sourceAccountId === values.targetAccountId) errors.targetAccountId = 'Hãy chọn hai tài khoản khác nhau.';
  if (form.dataset.form === 'recurring' && values.endOn && values.startOn && values.endOn < values.startOn) errors.endOn = 'Ngày kết thúc không được trước ngày bắt đầu.';
  if (form.dataset.form === 'budget' && !/^\d{4}-\d{2}$/.test(values.periodStart || '')) errors.periodStart = 'Chọn tháng hợp lệ.';
}

async function submitAuth(form) {
  const mode = form.dataset.form.replace('auth-', '');
  const errors = validateFields(form);
  validatePasswordExtras(form, errors);
  if (hasErrors(errors)) { authErrors = errors; showFieldErrors(form, errors); return; }
  authErrors = {};
  showFieldErrors(form, {});
  const values = formPayload(form);
  const button = form.querySelector('[type="submit"]');
  setButtonBusy(button, true, 'Đang xử lý…');
  try {
    if (mode === 'login') {
      const result = await post('/api/auth/login', values);
      await enterSignedIn(result.user);
    } else if (mode === 'register') {
      const result = await post('/api/auth/register', values);
      pendingEmail = values.email;
      verificationExpiresAt = Date.parse(result.expiresAt || '') || 0;
      authScreen = 'verify-info';
      setNotice(result.message || `Mã OTP đã được gửi đến ${pendingEmail}.`, 'info');
      render();
      $('#app [name="verificationCode"]')?.focus();
    } else if (mode === 'verify-email') {
      const result = await post('/api/auth/verify-email-code', { email: pendingEmail || values.email, verificationCode: values.verificationCode });
      verificationExpiresAt = 0;
      authScreen = 'verify-success';
      setNotice(result.message || 'Email đã được xác minh. Bạn có thể đăng nhập.', 'success');
      render();
    } else if (mode === 'forgot') {
      await post('/api/auth/forgot-password', values);
      authScreen = 'forgot-sent';
      setNotice('');
      render();
    } else if (mode === 'reset') {
      await post('/api/auth/reset-password', { token: values.token, password: values.password, passwordConfirmation: values.passwordConfirmation });
      resetToken = '';
      authScreen = 'login';
      setNotice('Mật khẩu đã được cập nhật. Hãy đăng nhập bằng mật khẩu mới.');
      render();
    }
  } catch (error) {
    authErrors = error.fields || {};
    if (mode === 'register' && error.code === 'EMAIL_SEND_FAILED') {
      pendingEmail = values.email;
      verificationExpiresAt = 0;
      authScreen = 'verify-info';
    } else if (mode === 'login' && (
      error.code === 'EMAIL_NOT_VERIFIED'
      || (error.status === 403 && /email.{0,40}(chưa xác minh|chưa được xác minh)|chưa xác minh.{0,40}email/i.test(error.message))
      || /mã\s*(?:otp|xác minh).{0,100}(?:đã|vừa)\s*được\s*gửi/i.test(error.message)
    )) {
      pendingEmail = String(values.email || '').trim();
      verificationExpiresAt = Date.parse(error.fields?.expiresAt || '') || 0;
      authScreen = 'verify-info';
      authErrors = {};
      setNotice(error.message, error.fields?.deliveryFailed ? 'error' : 'info');
      render();
      $('#app [name="verificationCode"]')?.focus();
      return;
    } else if (mode === 'verify-email' && ['OTP_EXPIRED', 'OTP_ATTEMPTS_EXCEEDED'].includes(error.code)) verificationExpiresAt = 0;
    setNotice(error.message, 'error');
    render();
  } finally { setButtonBusy(button, false); }
}

async function submitModal(form) {
  const errors = validateFields(form);
  const values = formPayload(form);
  validateBusinessForm(form, values, errors);
  if (['transaction', 'receipt-scan', 'recurring'].includes(form.dataset.form)) {
    const category = state.snapshot.categories.find((item) => item.id === values.categoryId);
    if (category && category.kind !== values.kind) errors.categoryId = 'Danh mục chưa đúng loại thu/chi.';
  }
  if (hasErrors(errors)) { showFieldErrors(form, errors); return; }
  showFieldErrors(form, {});
  const { id } = form.dataset;
  const type = form.dataset.form;
  let path; let method = type === 'profile' || id ? 'PATCH' : 'POST'; let payload = values; let success = 'Đã lưu thành công.';
  if (type === 'transaction' || type === 'receipt-scan') { path = id ? `/api/transactions/${id}` : '/api/transactions'; success = type === 'receipt-scan' ? 'Đã thêm giao dịch từ hóa đơn.' : id ? 'Đã cập nhật giao dịch.' : 'Đã thêm giao dịch.'; }
  else if (type === 'account') { path = id ? `/api/accounts/${id}` : '/api/accounts'; success = id ? 'Đã cập nhật tài khoản.' : 'Đã thêm tài khoản.'; }
  else if (type === 'category') { path = id ? `/api/categories/${id}` : '/api/categories'; success = id ? 'Đã cập nhật danh mục.' : 'Đã thêm danh mục.'; }
  else if (type === 'budget') { path = id ? `/api/budgets/${id}` : '/api/budgets'; payload.periodStart = `${values.periodStart}-01`; success = id ? 'Đã cập nhật ngân sách.' : 'Đã tạo ngân sách.'; }
  else if (type === 'recurring') { path = id ? `/api/recurring-rules/${id}` : '/api/recurring-rules'; success = id ? 'Đã cập nhật quy tắc định kỳ.' : 'Đã tạo quy tắc định kỳ.'; }
  else if (type === 'goal') { path = id ? `/api/savings-goals/${id}` : '/api/savings-goals'; success = id ? 'Đã cập nhật mục tiêu.' : 'Đã tạo mục tiêu tiết kiệm.'; }
  else if (type === 'transfer') { path = '/api/transfers'; success = 'Đã chuyển tiền.'; }
  else if (type === 'goal-movement') { path = `/api/savings-goals/${form.dataset.goalId}/contributions`; payload.direction = form.dataset.direction; success = payload.direction === 'deposit' ? 'Đã nạp tiền vào mục tiêu.' : 'Đã rút tiền mục tiêu.'; }
  else if (type === 'profile') {
    payload = { fullName: values.fullName };
    const pendingEmail = String(state.modal?.data?.pendingEmail || '').trim();
    if (state.modal?.data?.newEmailVerified && pendingEmail
      && pendingEmail.toLowerCase() !== String(state.user?.email || '').trim().toLowerCase()) {
      payload.email = pendingEmail;
    }
    if (profileAvatarFile) {
      try { payload.avatarDataUrl = await avatarDataUrl(profileAvatarFile); }
      catch (error) { showFieldErrors(form, { avatar: error.message || 'Ảnh đại diện không hợp lệ.' }); return; }
    } else if (profileAvatarRemoved) payload.avatarDataUrl = null;
    path = '/api/settings/profile';
    success = 'Đã cập nhật hồ sơ.';
  }
  else return;

  if (['transaction', 'receipt-scan', 'account', 'budget', 'recurring', 'goal', 'transfer', 'goal-movement'].includes(type)) {
    payload.currency = state.user?.currency || 'VND';
  }

  const button = $('#modal [data-action="submit-modal"]');
  setButtonBusy(button, true, 'Đang lưu…');
  try { await performMutation(path, method, payload, { success }); }
  catch (error) {
    if (error.fields) showFieldErrors(form, error.fields);
    toast(error.message, 'error');
    setButtonBusy(button, false);
  }
}

async function confirmResend(button) {
  if (!pendingEmail) { authScreen = 'login'; render(); return; }
  if (verificationExpiresAt > Date.now()) {
    setNotice('Mã OTP hiện tại vẫn còn hiệu lực. Hãy nhập mã đó; chỉ có thể gửi mã mới khi mã hết hạn.', 'info');
    render();
    return;
  }
  setButtonBusy(button, true, 'Đang gửi…');
  try {
    const result = await post('/api/auth/resend-verification', { email: pendingEmail });
    verificationExpiresAt = Date.parse(result.expiresAt || '') || 0;
    setNotice(result.message, 'success');
  } catch (error) {
    if (error.code === 'OTP_NOT_EXPIRED') verificationExpiresAt = Date.parse(error.fields?.expiresAt || '') || 0;
    else if (error.code === 'EMAIL_SEND_FAILED' || error.code === 'OTP_EXPIRED' || error.code === 'OTP_ATTEMPTS_EXCEEDED') verificationExpiresAt = 0;
    setNotice(error.message, 'error');
  }
  render();
}

document.addEventListener('click', (event) => {
  const link = event.target.closest('[data-settings-section]');
  if (!link) return;
  const nav = link.closest('.settings-subnav');
  nav?.querySelectorAll('[data-settings-section]').forEach((item) => {
    const active = item === link;
    item.classList.toggle('is-active', active);
    item.setAttribute('aria-current', active ? 'location' : 'false');
  });
});

document.addEventListener('click', async (event) => {
  const button = event.target.closest('[data-action], [data-auth-action]');
  if (!button) return;
  event.preventDefault();
  if (button.dataset.authAction) {
    const action = button.dataset.authAction;
    if (action === 'toggle-password') {
      const password = document.getElementById(button.dataset.passwordTarget);
      if (!(password instanceof HTMLInputElement)) return;
      const isVisible = password.type === 'password';
      password.type = isVisible ? 'text' : 'password';
      const label = isVisible ? 'Ẩn mật khẩu' : 'Hiện mật khẩu';
      button.setAttribute('aria-label', label);
      button.setAttribute('title', label);
      button.setAttribute('aria-pressed', String(isVisible));
      button.innerHTML = icon(isVisible ? 'eyeOff' : 'eye', 18);
    }
    else if (action === 'continue-verification') {
      const loginEmail = $('#app [data-form="auth-login"] [name="email"]')?.value;
      pendingEmail = String(loginEmail || pendingEmail || '').trim();
      if (!pendingEmail) {
        setNotice('Không tìm thấy email nhận mã. Hãy nhập email rồi đăng nhập lại.', 'error');
        render();
        return;
      }
      const validityMinutes = Number(/hiệu lực trong\s+(\d+)\s*phút/i.exec(authNotice?.message || '')?.[1]) || 10;
      verificationExpiresAt = Date.now() + validityMinutes * 60_000;
      authErrors = {};
      authScreen = 'verify-info';
      setNotice(authNotice?.message || `Mã OTP đã được gửi đến ${pendingEmail}.`, 'info');
      render();
      $('#app [name="verificationCode"]')?.focus();
    }
    else if (action === 'register') { authScreen = 'register'; pendingEmail = ''; verificationExpiresAt = 0; setNotice(''); render(); }
    else if (action === 'login') { authScreen = 'login'; setNotice(''); render(); }
    else if (action === 'forgot') { authScreen = 'forgot'; setNotice(''); render(); }
    else if (action === 'resend') await confirmResend(button);
    return;
  }
  if (button.dataset.action?.startsWith('admin-')) {
    await handleAdminAction(button.dataset.action, button, { appState: state, render, toast });
    return;
  }
  if (button.dataset.action?.startsWith('ai-agent-')) {
    await handleAgentAction(button.dataset.action, button, { state, render, toast, refresh: () => syncSnapshot({ silent: true }) });
    return;
  }
  await handleAction(button);
});

document.addEventListener('submit', async (event) => {
  const form = event.target;
  if (!(form instanceof HTMLFormElement)) return;
  event.preventDefault();
  if (form.dataset.form === 'ai-agent') return handleAgentSubmit(form, { state, render, refresh: () => syncSnapshot({ silent: true }) });
  if (form.dataset.form === 'admin-agent') return submitAdminAgent(form, { render });
  if (form.id === 'admin-search-form' || form.id === 'admin-audit-filter-form') return submitAdminSearch(form, { render });
  if (['admin-role-change', 'admin-announcement', 'admin-category-template', 'admin-support-ticket'].includes(form.dataset.form)) {
    return submitAdminForm(form, { render, toast });
  }
  if (form.dataset.form === 'support-ticket') {
    const values = formPayload(form);
    const button = form.querySelector('[type="submit"]');
    setButtonBusy(button, true, 'Đang gửi…');
    try {
      const result = await post('/api/support-tickets', values);
      applyLocalMutation('/api/support-tickets', 'POST', values, result.ticket);
      render();
      toast(result.message || 'Yêu cầu hỗ trợ đã được gửi tới Quản trị viên.', 'success');
    } catch (error) {
      toast(error.message || 'Chưa gửi được yêu cầu hỗ trợ.', 'error');
    } finally {
      setButtonBusy(button, false);
    }
    return;
  }
  if (form.dataset.form?.startsWith('auth-')) return submitAuth(form);
  if (form.dataset.form === 'delete') return;
  return submitModal(form);
});

document.addEventListener('cancel', (event) => {
  if (event.target instanceof HTMLDialogElement && event.target.id === 'admin-confirm-dialog') {
    event.preventDefault();
    if (adminUi.savingStatus) return;
    adminUi.pendingStatus = null;
    render();
    return;
  }
  if (event.target instanceof HTMLDialogElement && event.target.id === 'admin-role-dialog') {
    event.preventDefault();
    if (adminUi.savingRole) return;
    adminUi.pendingRole = null;
    render();
    return;
  }
  if (event.target instanceof HTMLDialogElement && event.target.id === 'admin-user-detail-dialog') {
    event.preventDefault();
    adminUi.selectedUser = null;
    adminUi.detailError = null;
    adminUi.detailLoading = false;
    render();
    return;
  }
  if (event.target instanceof HTMLDialogElement && event.target.id === 'modal') {
    event.preventDefault();
    closeModal();
  }
}, true);

document.addEventListener('input', (event) => {
  const target = event.target;
  if (target instanceof HTMLInputElement && target.id === 'fx-converter-input') { updateFxConverter(); return; }
  if (target.matches('[data-admin-agent-input]')) { handleAdminAgentInput(target); return; }
  if (target.matches('[data-agent-input]')) { handleAgentInput(target); return; }
  if (!(target instanceof HTMLInputElement || target instanceof HTMLSelectElement)) return;
  if (target instanceof HTMLInputElement && target.name === 'verificationCode') {
    target.value = target.value.replace(/\D/g, '').slice(0, 6);
    return;
  }
  if (target instanceof HTMLInputElement && ['authorizationCode', 'newEmailCode'].includes(target.name)) {
    target.value = target.value.replace(/\D/g, '').slice(0, 6);
    return;
  }
  if (target instanceof HTMLInputElement && target.name === 'newEmail' && target.form?.dataset.form === 'profile' && state.modal?.data) {
    const email = target.value.trim();
    const changedAfterSend = state.modal.data.pendingEmail && email.toLowerCase() !== state.modal.data.pendingEmail.trim().toLowerCase();
    if (changedAfterSend) {
      state.modal.data = { ...state.modal.data, pendingEmail: email, newEmailCodeSent: false, newEmailVerified: false };
      const codeField = $('#modal [data-new-email-code-field]');
      const codeInput = target.form.elements.newEmailCode;
      const feedback = $('#modal [data-email-code-feedback]');
      const verified = $('#modal [data-email-verified-notice]');
      const sendButton = $('#modal [data-action="send-profile-email-code"]');
      if (codeField) codeField.remove();
      if (codeInput) codeInput.value = '';
      if (feedback) feedback.remove();
      if (verified) verified.remove();
      if (sendButton) sendButton.textContent = 'Gửi mã đến email mới';
    } else {
      state.modal.data = { ...state.modal.data, pendingEmail: email };
    }
    return;
  }
  if (target.id === 'global-search' || target.id === 'transaction-search') {
    state.search = target.value;
    if (state.view === 'transactions') {
      updateFilteredTransactions();
      const otherSearch = target.id === 'global-search' ? $('#transaction-search') : $('#global-search');
      if (otherSearch) otherSearch.value = target.value;
    }
    return;
  }
  if (target.id === 'category-search') {
    state.categorySearch = target.value;
    const query = target.value.trim().toLocaleLowerCase('vi');
    let visibleCount = 0;
    document.querySelectorAll('[data-category-tile]').forEach((tile) => {
      const matches = tile.dataset.search.includes(query);
      tile.hidden = !matches;
      if (matches) visibleCount += 1;
    });
    const empty = $('#category-empty');
    if (empty) {
      empty.hidden = visibleCount > 0;
      const heading = empty.querySelector('h3');
      const description = empty.querySelector('p');
      if (heading) heading.textContent = query ? 'Không tìm thấy danh mục' : 'Chưa có danh mục';
      if (description) description.textContent = query ? 'Thử từ khóa khác hoặc chuyển sang loại danh mục còn lại.' : 'Danh mục sẽ xuất hiện sau khi email được xác minh.';
      const addButton = empty.querySelector('[data-action="new-category"]');
      if (addButton) addButton.hidden = Boolean(query);
    }
    return;
  }
  if (target.dataset.filter) {
    const key = target.dataset.filter;
    if (key === 'dashboard-month' || key === 'budget-month' || key === 'report-month') state.period = target.value;
    else if (key === 'forecast-account') state.smartFinance.accountId = target.value;
    else if (key === 'forecast-to') state.smartFinance.toDate = target.value;
    else if (key === 'report-from') state.reportRange.from = target.value;
    else if (key === 'report-to') state.reportRange.to = target.value;
    else if (key === 'preference-month') {
      state.period = target.value;
      savePreferences({ defaultMonth: target.value });
    } else state.filters[key] = target.value;
    if (state.view === 'transactions') updateFilteredTransactions();
  }
});

document.addEventListener('change', async (event) => {
  const target = event.target;
  if (target instanceof HTMLSelectElement && target.id === 'preference-language') {
    await changeUiLanguage(target);
    return;
  }
  if (target instanceof HTMLInputElement && target.id === 'receipt-image') {
    const file = target.files?.[0];
    if (!file) return;
    try { validateReceiptImage(file); }
    catch (error) {
      target.value = '';
      receiptImageFile = null;
      if (receiptPreviewUrl) URL.revokeObjectURL(receiptPreviewUrl);
      receiptPreviewUrl = '';
      state.modal.data = { ...state.modal.data, previewUrl: '' };
      render();
      receiptStatus(error.message, 'error');
      return;
    }
    if (receiptPreviewUrl) URL.revokeObjectURL(receiptPreviewUrl);
    receiptImageFile = file;
    receiptPreviewUrl = URL.createObjectURL(file);
    state.modal.data = { ...state.modal.data, previewUrl: receiptPreviewUrl };
    render();
    return;
  }
  if (target instanceof HTMLInputElement && target.type === 'file' && target.name === 'avatar') {
    const file = target.files?.[0];
    if (!file) return;
    if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type) || file.size > 5 * 1024 * 1024) {
      target.value = '';
      toast('Chọn ảnh PNG, JPG hoặc WebP có dung lượng tối đa 5 MB.', 'error');
      return;
    }
    if (profileAvatarPreviewUrl) URL.revokeObjectURL(profileAvatarPreviewUrl);
    profileAvatarFile = file;
    profileAvatarRemoved = false;
    profileAvatarPreviewUrl = URL.createObjectURL(file);
    refreshProfileAvatarPreview();
    return;
  }
  if (target instanceof HTMLSelectElement && target.id === 'bank-hub-select') {
    updateBankSelection(target.value);
    return;
  }
  if (target instanceof HTMLInputElement && target.id === 'bank-link-consent') {
    refreshBankHubConnectButton();
    return;
  }
  if (await changeAdminFilter(target, { render })) return;
  if (target instanceof HTMLInputElement && target.type === 'checkbox' && target.form?.dataset.form?.startsWith('auth-')) {
    if (target.checked) {
      target.setAttribute('aria-invalid', 'false');
      const errorNode = target.form.querySelector(`[data-error-for="${CSS.escape(target.name)}"]`);
      if (errorNode) errorNode.textContent = '';
    }
    return;
  }
  const form = target.closest('form');
  if (form && target.name === 'kind' && ['transaction', 'recurring'].includes(form.dataset.form)) {
    updateCategorySelect(form, target.value);
    return;
  }
  if (form && target.name === 'frequency' && form.dataset.form === 'recurring') {
    const day = form.querySelector('[data-month-day-field]');
    if (day) day.hidden = target.value !== 'monthly';
    return;
  }
  if (target.dataset.filter) render();
});

document.addEventListener('keydown', (event) => {
  if (handleAgentEscape(event, render)) return;
  if (event.key === 'Enter' && !event.shiftKey && event.target.matches('[data-agent-input]')) {
    event.preventDefault();
    event.target.form?.requestSubmit();
    return;
  }
  if (event.key === 'Enter' && event.target.id === 'global-search' && state.view !== 'transactions') {
    state.view = 'transactions';
    render();
  }
});

document.addEventListener('popstate', async () => {
  const requestedAdminView = adminViewFromPath(location.pathname);
  if (requestedAdminView && state.user?.role === 'admin') {
    state.view = requestedAdminView;
    adminUi.view = requestedAdminView;
    const request = loadAdminView(requestedAdminView);
    render();
    await request;
    render();
    return;
  }
  if (location.pathname.startsWith('/admin') && state.user?.role !== 'admin') {
    history.replaceState({}, document.title, '/');
  }
  state.view = 'dashboard';
  render();
});

observeTranslations(document.body, () => state.user?.language || 'vi');
start();
