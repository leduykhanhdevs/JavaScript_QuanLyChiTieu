import { createDropdown } from '/desktop/dropdown.js';

const elements = {
  status: document.querySelector('#status-panel'),
  balanceDetails: document.querySelector('#balance-details'),
  balance: document.querySelector('#balance-value'),
  balanceMeta: document.querySelector('#balance-meta'),
  liquidBalance: document.querySelector('#liquid-balance'),
  goalBalance: document.querySelector('#goal-balance'),
  assetTotal: document.querySelector('#asset-total'),
  goalCount: document.querySelector('#goal-count'),
  goalList: document.querySelector('#goal-list'),
  emptyGoals: document.querySelector('#empty-goals'),
  signedOut: document.querySelector('#signed-out-panel'),
  entry: document.querySelector('#entry-section'),
  recentSection: document.querySelector('#recent-section'),
  form: document.querySelector('#transaction-form'),
  amount: document.querySelector('#amount-input'),
  amountUnit: document.querySelector('#amount-currency-label'),
  date: document.querySelector('#date-input'),
  note: document.querySelector('#note-input'),
  save: document.querySelector('#save-button'),
  kindButtons: [...document.querySelectorAll('.kind-button')],
  recentList: document.querySelector('#recent-list'),
  emptyTransactions: document.querySelector('#empty-transactions'),
  goalDialog: document.querySelector('#goal-dialog'),
  goalDialogForm: document.querySelector('#goal-dialog-form'),
  goalDialogTitle: document.querySelector('#goal-dialog-title'),
  goalDialogContext: document.querySelector('#goal-dialog-context'),
  goalDialogError: document.querySelector('#goal-dialog-error'),
  goalEditorFields: document.querySelector('#goal-editor-fields'),
  goalMovementFields: document.querySelector('#goal-movement-fields'),
  goalArchiveMessage: document.querySelector('#goal-archive-message'),
  goalTitleInput: document.querySelector('#goal-title-input'),
  goalTargetInput: document.querySelector('#goal-target-input'),
  goalTargetUnit: document.querySelector('#goal-target-currency-label'),
  goalDateInput: document.querySelector('#goal-date-input'),
  goalColorInput: document.querySelector('#goal-color-input'),
  goalMovementAmount: document.querySelector('#goal-movement-amount'),
  goalMovementUnit: document.querySelector('#goal-movement-currency-label'),
  goalMovementDate: document.querySelector('#goal-movement-date'),
  goalMovementNote: document.querySelector('#goal-movement-note'),
  goalAccountLabel: document.querySelector('#goal-account-label'),
  saveGoalDialog: document.querySelector('#save-goal-dialog')
};

const accountDropdown = createDropdown(document.querySelector('[data-dropdown="transaction-account"]'), {
  placeholder: 'Chọn tài khoản',
  emptyMessage: 'Chưa có tài khoản hoạt động'
});
const categoryDropdown = createDropdown(document.querySelector('[data-dropdown="transaction-category"]'), {
  placeholder: 'Chọn danh mục',
  emptyMessage: 'Chưa có danh mục phù hợp'
});
const goalAccountDropdown = createDropdown(document.querySelector('[data-dropdown="goal-account"]'), {
  placeholder: 'Chọn tài khoản',
  emptyMessage: 'Chưa có tài khoản thu/chi hoạt động'
});

const vndMoney = new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 0 });
const usdMoney = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2, maximumFractionDigits: 2 });
const dateFormatter = new Intl.DateTimeFormat('vi-VN', { day: '2-digit', month: 'short' });
const fullDateFormatter = new Intl.DateTimeFormat('vi-VN', { day: 'numeric', month: 'short', year: 'numeric' });
let activeKind = 'expense';
let bootstrapData = null;
let activeSpendingAccounts = [];
let currentGoal = null;
let dialogAction = null;
let statusTimer = null;
let selectedCurrency = 'VND';
let usdVndRate = null;
let usdRateUsable = false;

function localDateValue(date = new Date()) {
  const offset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 10);
}

function showStatus(message, type = 'info', duration = 0) {
  clearTimeout(statusTimer);
  elements.status.textContent = message;
  elements.status.className = `status-panel is-${type}`;
  elements.status.hidden = false;
  if (duration) statusTimer = setTimeout(() => { elements.status.hidden = true; }, duration);
}

function formatMoney(amount) {
  const value = Number(amount) || 0;
  if (selectedCurrency === 'USD') return usdVndRate ? usdMoney.format(value / usdVndRate) : '— USD';
  return `${vndMoney.format(value)} ₫`;
}

function formatMoneyInput(amount) {
  const value = Number(amount) || 0;
  if (selectedCurrency === 'USD') return usdVndRate ? (value / usdVndRate).toFixed(2) : '';
  return String(Math.round(value));
}

function configureMoneyInput(input, unitLabel) {
  if (!input) return;
  input.step = selectedCurrency === 'USD' ? '0.01' : '1';
  input.min = selectedCurrency === 'USD' ? '0.01' : '1';
  input.inputMode = selectedCurrency === 'USD' ? 'decimal' : 'numeric';
  input.disabled = selectedCurrency === 'USD' && !usdRateUsable;
  if (unitLabel) unitLabel.textContent = selectedCurrency;
}

function configureCurrency() {
  configureMoneyInput(elements.amount, elements.amountUnit);
  configureMoneyInput(elements.goalTargetInput, elements.goalTargetUnit);
  configureMoneyInput(elements.goalMovementAmount, elements.goalMovementUnit);
}

function readMoneyAmount(input) {
  const amount = Number(input.value);
  if (selectedCurrency === 'USD') {
    const cents = Math.round(amount * 100);
    return Number.isFinite(amount) && amount > 0 && Number.isSafeInteger(cents)
      && Math.abs(amount * 100 - cents) <= 1e-8 ? amount : null;
  }
  return Number.isSafeInteger(amount) && amount > 0 ? amount : null;
}

function formatDate(dateValue, formatter = fullDateFormatter) {
  if (!dateValue) return '';
  const date = new Date(`${String(dateValue).slice(0, 10)}T00:00:00`);
  return Number.isNaN(date.getTime()) ? '' : formatter.format(date);
}

async function api(path, options = {}) {
  const response = await fetch(path, {
    credentials: 'same-origin',
    ...options,
    headers: { ...(options.body ? { 'Content-Type': 'application/json' } : {}), ...options.headers }
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(result.error?.message || 'Không thể kết nối với Ví Mình.');
    error.status = response.status;
    throw error;
  }
  return result;
}

function createButton(label, className, action, id) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = className;
  button.dataset.action = action;
  button.dataset.id = id;
  button.textContent = label;
  return button;
}

function renderGoal(goal) {
  const currentAmount = Number(goal.currentAmount) || 0;
  const targetAmount = Number(goal.targetAmount) || 0;
  const completion = targetAmount > 0 ? Math.min(100, Math.round(currentAmount / targetAmount * 100)) : 0;
  const card = document.createElement('article');
  card.className = 'goal-card';

  const header = document.createElement('div');
  header.className = 'goal-card-header';
  const titleBlock = document.createElement('div');
  const title = document.createElement('strong');
  title.className = 'goal-title';
  title.textContent = goal.title;
  const date = document.createElement('span');
  date.className = 'goal-date';
  date.textContent = goal.targetDate ? `Mục tiêu đến ${formatDate(goal.targetDate)}` : 'Không đặt ngày hoàn thành';
  titleBlock.append(title, date);
  const editButton = createButton('Chỉnh sửa', 'goal-edit-button', 'goal-edit', goal.id);
  header.append(titleBlock, editButton);

  const amount = document.createElement('div');
  amount.className = 'goal-amount';
  const current = document.createElement('strong');
  current.textContent = formatMoney(currentAmount);
  const target = document.createElement('small');
  target.textContent = `trên ${formatMoney(targetAmount)}`;
  amount.append(current, target);

  const progress = document.createElement('div');
  progress.className = 'goal-progress';
  progress.setAttribute('role', 'progressbar');
  progress.setAttribute('aria-label', `Tiến độ mục tiêu ${goal.title}`);
  progress.setAttribute('aria-valuemin', '0');
  progress.setAttribute('aria-valuemax', '100');
  progress.setAttribute('aria-valuenow', String(completion));
  const fill = document.createElement('span');
  fill.style.width = `${completion}%`;
  progress.append(fill);

  const progressMeta = document.createElement('div');
  progressMeta.className = 'goal-progress-meta';
  const progressLabel = document.createElement('span');
  progressLabel.textContent = `${completion}% hoàn thành`;
  const remaining = document.createElement('span');
  remaining.textContent = currentAmount >= targetAmount ? 'Đã đạt mục tiêu' : `Còn ${formatMoney(Math.max(0, targetAmount - currentAmount))}`;
  progressMeta.append(progressLabel, remaining);

  const actions = document.createElement('div');
  actions.className = 'goal-actions';
  actions.append(
    createButton('＋ Nạp tiền', 'goal-action-button is-primary', 'goal-deposit', goal.id),
    createButton('Rút tiền', 'goal-action-button', 'goal-withdraw', goal.id),
    createButton('Lưu trữ', 'goal-action-button is-quiet', 'goal-archive', goal.id)
  );
  card.append(header, amount, progress, progressMeta, actions);
  return card;
}

function renderGoals(goals) {
  elements.goalList.replaceChildren(...goals.map(renderGoal));
  elements.emptyGoals.hidden = goals.length > 0;
  elements.goalCount.textContent = `${goals.length} mục tiêu đang thực hiện`;
}

function renderRecent(transactions) {
  const recent = [...transactions]
    .sort((left, right) => `${right.date}|${right.createdAt || ''}`.localeCompare(`${left.date}|${left.createdAt || ''}`))
    .slice(0, 5);
  elements.recentList.replaceChildren();
  elements.emptyTransactions.hidden = recent.length > 0;
  for (const transaction of recent) {
    const row = document.createElement('article');
    row.className = 'transaction-row';

    const icon = document.createElement('span');
    icon.className = `transaction-icon is-${transaction.kind}`;
    icon.setAttribute('aria-hidden', 'true');
    icon.textContent = transaction.kind === 'income' ? '+' : '−';

    const copy = document.createElement('div');
    copy.className = 'transaction-copy';
    const title = document.createElement('strong');
    title.textContent = transaction.categoryName || (transaction.kind === 'income' ? 'Khoản thu' : 'Khoản chi');
    const details = document.createElement('span');
    details.textContent = [transaction.accountName, formatDate(transaction.date, dateFormatter), transaction.note].filter(Boolean).join(' · ');
    copy.append(title, details);

    const amount = document.createElement('span');
    amount.className = `transaction-amount is-${transaction.kind}`;
    amount.textContent = `${transaction.kind === 'income' ? '+' : '−'}${formatMoney(transaction.amount)}`;
    row.append(icon, copy, amount);
    elements.recentList.append(row);
  }
}

function render(data) {
  bootstrapData = data;
  configureCurrency();
  const activeAccounts = (data.accounts || []).filter((account) => !account.isArchived);
  activeSpendingAccounts = activeAccounts.filter((account) => account.kind !== 'goal');
  const goalAccounts = activeAccounts.filter((account) => account.kind === 'goal');
  const liquidBalance = activeSpendingAccounts.reduce((total, account) => total + Number(account.balance || 0), 0);
  const goalBalance = goalAccounts.reduce((total, account) => total + Number(account.balance || 0), 0);
  const totalAssets = activeAccounts.reduce((total, account) => total + Number(account.balance || 0), 0);
  const goals = (data.goals || []).filter((goal) => goal.status !== 'archived');

  elements.balance.textContent = formatMoney(totalAssets);
  elements.balanceMeta.textContent = `${activeAccounts.length} tài khoản đang hoạt động · bấm để xem mục tiêu`;
  elements.liquidBalance.textContent = formatMoney(liquidBalance);
  elements.goalBalance.textContent = formatMoney(goalBalance);
  elements.assetTotal.textContent = formatMoney(totalAssets);
  accountDropdown.setItems(activeSpendingAccounts.map(({ id, name }) => ({ id, name })));
  categoryDropdown.setItems((data.categories || [])
    .filter((category) => !category.isArchived && category.kind === activeKind)
    .map(({ id, name }) => ({ id, name })));
  renderGoals(goals);
  renderRecent(data.transactions || []);
  elements.balanceDetails.hidden = false;
  elements.signedOut.hidden = true;
  elements.entry.hidden = false;
  elements.recentSection.hidden = false;
  elements.status.hidden = true;
}

async function loadData({ quiet = false } = {}) {
  if (!quiet) showStatus('Đang tải dữ liệu…', 'info');
  try {
    await api('/api/auth/me');
    const data = await api('/api/bootstrap');
    selectedCurrency = data.user?.currency === 'USD' ? 'USD' : 'VND';
    usdVndRate = null;
    usdRateUsable = false;
    let rateError = '';
    if (selectedCurrency === 'USD') {
      try {
        const rates = await api('/api/fx/rates?days=30');
        usdVndRate = Number(rates.usdVnd);
        const updatedAt = Date.parse(rates.providerUpdatedAt || '');
        usdRateUsable = Number.isFinite(usdVndRate) && usdVndRate > 0
          && Number.isFinite(updatedAt) && Date.now() - updatedAt <= 72 * 60 * 60 * 1000;
        if (!usdRateUsable) rateError = 'Tỷ giá USD/VND đã cũ. Hãy mở website Cài đặt để kiểm tra tỷ giá trước khi ghi số tiền USD.';
      } catch (error) {
        rateError = error.message || 'Chưa tải được tỷ giá USD/VND. Hãy mở website Cài đặt để kiểm tra.';
      }
    }
    render(data);
    if (rateError) showStatus(rateError, 'error');
  } catch (error) {
    if (error.status === 401) {
      elements.balanceDetails.hidden = true;
      elements.entry.hidden = true;
      elements.recentSection.hidden = true;
      elements.signedOut.hidden = false;
      showStatus('Chưa đăng nhập vào Ví Mình.', 'info');
      return;
    }
    if (!quiet) showStatus(error.message, 'error');
    if (!bootstrapData) {
      elements.balanceDetails.hidden = true;
      elements.entry.hidden = true;
      elements.recentSection.hidden = true;
    }
  }
}

function updateKind(kind) {
  if (kind !== 'income' && kind !== 'expense') return;
  activeKind = kind;
  for (const button of elements.kindButtons) {
    const selected = button.dataset.kind === activeKind;
    button.classList.toggle('is-active', selected);
    button.setAttribute('aria-pressed', String(selected));
  }
  if (bootstrapData) render(bootstrapData);
}

async function openWebsite() {
  try {
    await window.desktop.openWebsite();
  } catch {
    showStatus('Không mở được website trong trình duyệt mặc định.', 'error');
  }
}

function showGoalDialog(action, goal = null) {
  dialogAction = action;
  currentGoal = goal;
  const editing = action === 'goal-create' || action === 'goal-edit';
  const moving = action === 'goal-deposit' || action === 'goal-withdraw';
  const archiving = action === 'goal-archive';
  const direction = action === 'goal-withdraw' ? 'withdraw' : 'deposit';

  elements.goalEditorFields.hidden = !editing;
  elements.goalMovementFields.hidden = !moving;
  elements.goalArchiveMessage.hidden = !archiving;
  elements.goalDialogError.hidden = true;
  elements.goalDialogError.textContent = '';
  elements.goalDialogTitle.textContent = action === 'goal-create' ? 'Tạo mục tiêu'
    : action === 'goal-edit' ? 'Chỉnh sửa mục tiêu'
      : action === 'goal-deposit' ? 'Nạp tiền mục tiêu'
        : action === 'goal-withdraw' ? 'Rút tiền mục tiêu' : 'Lưu trữ mục tiêu';
  elements.saveGoalDialog.textContent = archiving ? 'Lưu trữ mục tiêu' : 'Lưu thay đổi';
  elements.goalDialogContext.textContent = moving
    ? `${direction === 'deposit' ? 'Nạp tiền vào' : 'Rút tiền từ'} “${goal.title}”. Số dư hiện tại: ${formatMoney(goal.currentAmount)}. Thao tác này không tính vào thu hoặc chi.`
    : editing ? (goal ? 'Cập nhật thông tin và tiến độ mục tiêu tiết kiệm.' : 'Tạo ví riêng để theo dõi số dư mục tiêu.') : '';

  elements.goalTitleInput.value = goal?.title || '';
  elements.goalTargetInput.value = goal ? formatMoneyInput(goal.targetAmount) : '';
  elements.goalDateInput.value = goal?.targetDate ? String(goal.targetDate).slice(0, 10) : '';
  elements.goalColorInput.value = goal?.color || '#2563eb';
  elements.goalMovementAmount.value = '';
  elements.goalMovementDate.value = localDateValue();
  elements.goalMovementNote.value = '';
  configureCurrency();
  if (moving) {
    elements.goalAccountLabel.textContent = direction === 'deposit' ? 'Từ tài khoản' : 'Chuyển đến tài khoản';
    goalAccountDropdown.clear();
    goalAccountDropdown.setItems(activeSpendingAccounts.map(({ id, name }) => ({ id, name })));
  }
  if (archiving) {
    elements.goalArchiveMessage.textContent = `Bạn có chắc muốn lưu trữ “${goal.title}”? Số dư và lịch sử trong ví mục tiêu vẫn được giữ.`;
  }
  elements.goalDialog.showModal();
  if (editing) elements.goalTitleInput.focus();
}

function showDialogError(message) {
  elements.goalDialogError.textContent = message;
  elements.goalDialogError.hidden = false;
}

async function submitGoalDialog(event) {
  event.preventDefault();
  if (!dialogAction) return;
  elements.saveGoalDialog.disabled = true;
  elements.saveGoalDialog.textContent = 'Đang lưu…';
  try {
    let successMessage = '';
    if (dialogAction === 'goal-create' || dialogAction === 'goal-edit') {
      const title = elements.goalTitleInput.value.trim();
      const targetAmount = readMoneyAmount(elements.goalTargetInput);
      if (!title || title.length > 100) throw new Error('Nhập tên mục tiêu từ 1 đến 100 ký tự.');
      if (targetAmount == null) throw new Error(`Số tiền mục tiêu phải lớn hơn 0 và đúng định dạng ${selectedCurrency}.`);
      const editing = dialogAction === 'goal-edit';
      await api(editing ? `/api/savings-goals/${currentGoal.id}` : '/api/savings-goals', {
        method: editing ? 'PATCH' : 'POST',
        body: JSON.stringify({ title, targetAmount, currency: selectedCurrency, targetDate: elements.goalDateInput.value || null, color: elements.goalColorInput.value })
      });
      successMessage = editing ? 'Đã cập nhật mục tiêu.' : 'Đã tạo mục tiêu tiết kiệm.';
    } else if (dialogAction === 'goal-deposit' || dialogAction === 'goal-withdraw') {
      const amount = readMoneyAmount(elements.goalMovementAmount);
      const accountId = goalAccountDropdown.value;
      const date = elements.goalMovementDate.value;
      if (!accountId) throw new Error('Chọn tài khoản để tiếp tục.');
      if (amount == null) throw new Error(`Số tiền phải lớn hơn 0 và đúng định dạng ${selectedCurrency}.`);
      if (!date) throw new Error('Chọn ngày giao dịch.');
      const direction = dialogAction === 'goal-withdraw' ? 'withdraw' : 'deposit';
      await api(`/api/savings-goals/${currentGoal.id}/contributions`, {
        method: 'POST',
        body: JSON.stringify({ direction, amount, currency: selectedCurrency, accountId, date, note: elements.goalMovementNote.value.trim() })
      });
      successMessage = direction === 'deposit' ? 'Đã nạp tiền vào mục tiêu.' : 'Đã rút tiền mục tiêu.';
    } else if (dialogAction === 'goal-archive') {
      await api(`/api/savings-goals/${currentGoal.id}`, { method: 'DELETE' });
      successMessage = 'Đã lưu trữ mục tiêu. Số dư và lịch sử vẫn được giữ.';
    }

    elements.goalDialog.close();
    dialogAction = null;
    currentGoal = null;
    await loadData({ quiet: true });
    showStatus(successMessage, 'success', 4500);
  } catch (error) {
    showDialogError(error.message);
  } finally {
    elements.saveGoalDialog.disabled = false;
    elements.saveGoalDialog.textContent = dialogAction === 'goal-archive' ? 'Lưu trữ mục tiêu' : 'Lưu thay đổi';
  }
}

elements.kindButtons.forEach((button) => button.addEventListener('click', () => updateKind(button.dataset.kind)));
document.querySelector('#refresh-button').addEventListener('click', () => loadData());
document.querySelector('#open-full-app').addEventListener('click', openWebsite);
document.querySelector('#open-full-app-footer').addEventListener('click', openWebsite);
document.querySelector('#open-transactions').addEventListener('click', openWebsite);
document.querySelector('#create-goal-button').addEventListener('click', () => showGoalDialog('goal-create'));
elements.goalList.addEventListener('click', (event) => {
  const button = event.target.closest('button[data-action]');
  if (!button || !bootstrapData) return;
  const goal = (bootstrapData.goals || []).find((item) => item.id === button.dataset.id);
  if (goal) showGoalDialog(button.dataset.action, goal);
});
document.querySelector('#close-goal-dialog').addEventListener('click', () => elements.goalDialog.close());
document.querySelector('#cancel-goal-dialog').addEventListener('click', () => elements.goalDialog.close());
elements.goalDialogForm.addEventListener('submit', submitGoalDialog);

elements.form.addEventListener('submit', async (event) => {
  event.preventDefault();
  const amount = readMoneyAmount(elements.amount);
  if (amount == null) {
    showStatus(`Nhập số tiền lớn hơn 0 và đúng định dạng ${selectedCurrency}.`, 'error');
    elements.amount.focus();
    return;
  }
  if (!accountDropdown.value || !categoryDropdown.value || !elements.date.value) {
    showStatus('Chọn tài khoản, danh mục và ngày giao dịch.', 'error');
    if (!accountDropdown.value) accountDropdown.trigger.focus();
    else if (!categoryDropdown.value) categoryDropdown.trigger.focus();
    return;
  }

  elements.save.disabled = true;
  elements.save.textContent = 'Đang lưu…';
  try {
    await api('/api/transactions', {
      method: 'POST',
      body: JSON.stringify({
        kind: activeKind,
        amount,
        currency: selectedCurrency,
        accountId: accountDropdown.value,
        categoryId: categoryDropdown.value,
        date: elements.date.value,
        note: elements.note.value.trim()
      })
    });
    elements.form.reset();
    elements.date.value = localDateValue();
    accountDropdown.clear();
    categoryDropdown.clear();
    await loadData({ quiet: true });
    showStatus('Đã lưu giao dịch thành công.', 'success', 4000);
  } catch (error) {
    showStatus(error.message, 'error');
  } finally {
    elements.save.disabled = false;
    elements.save.textContent = 'Lưu giao dịch';
  }
});

document.addEventListener('visibilitychange', () => {
  if (!document.hidden) loadData({ quiet: true });
});

elements.date.value = localDateValue();
window.desktop.onQuickKind(updateKind);
window.desktop.onRefresh(() => loadData({ quiet: true }));
const requestedKind = new URLSearchParams(window.location.search).get('kind');
if (requestedKind) updateKind(requestedKind);
loadData();
