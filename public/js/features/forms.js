import { escapeHtml, initials } from '../utils/dom.js';
import { today } from '../utils/dates.js';
import { formatDate } from '../utils/dates.js';
import { formatMoney, formatMoneyInput } from '../utils/money.js';
import { icon } from '../components/icons.js';

const field = (label, name, control, { required = false, help = '' } = {}) => `<div class="form-field"><label for="field-${name}">${escapeHtml(label)}${required ? ' <span aria-hidden="true">*</span>' : ''}</label>${control}<span class="field-error" data-error-for="${name}"></span>${help ? `<span class="form-help">${escapeHtml(help)}</span>` : ''}</div>`;
const textInput = (name, value = '', { type = 'text', required = true, maxLength = 120, placeholder = '' } = {}) => `<input id="field-${name}" name="${name}" type="${type}" value="${escapeHtml(value)}" maxlength="${maxLength}" ${required ? 'required' : ''} ${placeholder ? `placeholder="${escapeHtml(placeholder)}"` : ''}>`;
const numberInput = (name, value = '', { min = 1, required = true, max = Number.MAX_SAFE_INTEGER } = {}) => `<input id="field-${name}" name="${name}" type="number" inputmode="numeric" min="${min}" max="${max}" step="1" value="${escapeHtml(value)}" ${required ? 'required' : ''}>`;
const moneyInput = (state, name, value = '', { min = 1, required = true, max = Number.MAX_SAFE_INTEGER } = {}) => {
  const currency = state.user?.currency === 'USD' ? 'USD' : 'VND';
  const step = currency === 'USD' ? '0.01' : '1';
  const shown = value === '' ? '' : formatMoneyInput(value);
  return `<input id="field-${name}" name="${name}" type="number" inputmode="${currency === 'USD' ? 'decimal' : 'numeric'}" min="${min}" max="${max}" step="${step}" value="${escapeHtml(shown)}" ${required ? 'required' : ''}>`;
};
const moneyLabel = (state, label) => `${label} (${state.user?.currency === 'USD' ? 'USD' : 'VND'})`;
const selectInput = (name, rows, selected, labelKey = 'name', emptyLabel = 'Chọn…') => `<select id="field-${name}" name="${name}" required><option value="">${emptyLabel}</option>${rows.map((row) => `<option value="${escapeHtml(row.id)}" ${row.id === selected ? 'selected' : ''}>${escapeHtml(row[labelKey])}</option>`).join('')}</select>`;
const dateInput = (name, value = today(), required = true) => `<input id="field-${name}" name="${name}" type="date" value="${escapeHtml(value || '')}" ${required ? 'required' : ''}>`;

function profileEmailChangeFlowMarkup(data) {
  if (!data.emailChangeStarted) return '';
  if (!data.emailChangeAuthorized) {
    return `<section class="profile-email-flow-card"><strong>Bước 1 · Xác minh email hiện tại</strong><p class="form-help">Mã 6 chữ số sẽ được gửi đến email đã xác nhận của bạn. Email tài khoản chưa thay đổi ở bước này.</p>${data.authorizationCodeSent ? `<div class="notice notice-info profile-email-feedback">Mã đã được gửi. Kiểm tra hộp thư đến và thư rác.</div><div class="form-field"><label for="field-authorization-code">Mã xác nhận email hiện tại</label><div class="profile-email-input-row"><input id="field-authorization-code" name="authorizationCode" type="text" inputmode="numeric" autocomplete="one-time-code" maxlength="6" pattern="[0-9]{6}" placeholder="Nhập mã 6 số"><button type="button" class="button button-primary button-small" data-action="confirm-email-change-authorization">Xác minh mã</button></div><span class="field-error" data-error-for="authorizationCode"></span></div><button type="button" class="button button-secondary button-small" data-action="send-email-change-authorization">Gửi lại mã</button>` : `<button type="button" class="button button-primary button-small" data-action="send-email-change-authorization">Gửi mã xác nhận đổi</button>`}<button type="button" class="button button-quiet button-small" data-action="cancel-profile-email-change">Hủy đổi email</button></section>`;
  }
  return `<section class="profile-email-flow-card"><strong>Bước 2 · Xác minh email mới</strong><div class="notice notice-success profile-email-feedback">Email hiện tại đã xác minh. Nhập email mới và xác nhận mã gửi đến địa chỉ đó.</div><div class="form-field"><label for="field-new-email">Email mới</label><div class="profile-email-input-row"><input id="field-new-email" name="newEmail" type="email" value="${escapeHtml(data.pendingEmail || '')}" maxlength="320" autocomplete="email" ${data.newEmailVerified ? '' : 'required'}><button type="button" class="button button-secondary button-small" data-action="send-profile-email-code">${data.newEmailCodeSent ? 'Gửi lại mã' : 'Gửi mã đến email mới'}</button></div><span class="field-error" data-error-for="newEmail"></span></div>${data.newEmailCodeSent && !data.newEmailVerified ? `<div class="form-field" data-new-email-code-field><label for="field-new-email-code">Mã xác nhận email mới</label><div class="profile-email-input-row"><input id="field-new-email-code" name="newEmailCode" type="text" inputmode="numeric" autocomplete="one-time-code" maxlength="6" pattern="[0-9]{6}" placeholder="Nhập mã 6 số"><button type="button" class="button button-primary button-small" data-action="confirm-profile-email-code">Xác nhận mã</button></div><span class="field-error" data-error-for="newEmailCode"></span></div>` : ''}${data.newEmailVerified ? `<div class="notice notice-success profile-email-feedback" data-email-verified-notice>Email mới đã được xác minh. Bấm Lưu hồ sơ để áp dụng thay đổi.</div>` : data.newEmailCodeSent ? `<p class="form-help" data-email-code-feedback>Mã xác minh đã gửi đến ${escapeHtml(data.pendingEmail || '')}. Email tài khoản chỉ đổi sau khi bạn bấm Lưu hồ sơ.</p>` : ''}<button type="button" class="button button-quiet button-small" data-action="cancel-profile-email-change">Hủy đổi email</button></section>`;
}
const categoryOptions = (state, kind, selected) => state.snapshot.categories.filter((row) => row.kind === kind && !row.isArchived).map((row) => ({ id: row.id, name: row.name })).map((row) => `<option value="${escapeHtml(row.id)}" ${row.id === selected ? 'selected' : ''}>${escapeHtml(row.name)}</option>`).join('');
const activeAccounts = (state, includeGoals = false) => state.snapshot.accounts.filter((row) => !row.isArchived && (includeGoals || row.kind !== 'goal'));

function transactionForm(state, data = {}) {
  const kind = data.kind || 'expense';
  const accounts = activeAccounts(state);
  const accountId = data.accountId || accounts[0]?.id || '';
  const categories = state.snapshot.categories.filter((row) => row.kind === kind && !row.isArchived);
  return `<form data-form="transaction" data-id="${escapeHtml(data.id || '')}" novalidate>
    <div class="form-field full"><label>Loại giao dịch</label><div class="form-segment"><button type="button" class="segment-option ${kind === 'expense' ? '' : ''}" data-action="transaction-kind" data-kind="expense" aria-pressed="${kind === 'expense'}">Khoản chi</button><button type="button" class="segment-option income" data-action="transaction-kind" data-kind="income" aria-pressed="${kind === 'income'}">Khoản thu</button></div><input type="hidden" name="kind" value="${kind}"></div>
    ${field(moneyLabel(state, 'Số tiền'), 'amount', moneyInput(state, 'amount', data.amount || '', { min: state.user?.currency === 'USD' ? 0.01 : 1 }), { required: true })}
    ${field('Ngày giao dịch', 'date', dateInput('date', data.date || today()), { required: true })}
    ${field('Tài khoản', 'accountId', selectInput('accountId', accounts, accountId), { required: true })}
    ${field('Danh mục', 'categoryId', `<select id="field-categoryId" name="categoryId" required><option value="">Chọn danh mục…</option>${categoryOptions(state, kind, data.categoryId)}</select>`, { required: true })}
    <div class="form-field full"><label for="field-note">Ghi chú</label><textarea id="field-note" name="note" maxlength="500" placeholder="Ví dụ: tiền ăn trưa, hóa đơn điện…">${escapeHtml(data.note || '')}</textarea><span class="field-error" data-error-for="note"></span></div>
  </form>`;
}

function receiptScanForm(state, data = {}) {
  const accounts = activeAccounts(state);
  const accountId = data.accountId || accounts[0]?.id || '';
  const categories = state.snapshot.categories.filter((row) => row.kind === 'expense' && !row.isArchived);
  const preview = data.previewUrl
    ? `<img src="${escapeHtml(data.previewUrl)}" alt="Ảnh hóa đơn đã chọn">`
    : `<span>${icon('receipt', 26)}<strong>Chọn ảnh hóa đơn</strong><small>JPG, PNG hoặc WebP · tối đa 8 MB</small></span>`;
  return `<form data-form="receipt-scan" novalidate>
    <div class="receipt-scan-upload"><label for="receipt-image" class="receipt-scan-preview">${preview}</label><input id="receipt-image" type="file" accept="image/jpeg,image/png,image/webp" aria-describedby="receipt-scan-help"><div class="receipt-scan-upload-copy"><strong>Nhận diện hóa đơn ngay trên thiết bị</strong><p id="receipt-scan-help">Ảnh không được tải lên máy chủ. Nội dung nhận diện chỉ dùng để điền bản nháp.</p><button type="button" class="button button-secondary button-small" data-action="receipt-ocr">${icon('search', 15)} Nhận diện ảnh</button></div></div>
    <p class="notice notice-info receipt-scan-status" data-receipt-status role="status">Chọn ảnh rồi nhấn “Nhận diện ảnh”, hoặc nhập thông tin thủ công.</p>
    <div class="form-grid"><input type="hidden" name="kind" value="expense">
      ${field(moneyLabel(state, 'Số tiền'), 'amount', moneyInput(state, 'amount', data.amount || '', { min: state.user?.currency === 'USD' ? 0.01 : 1 }), { required: true })}
      ${field('Ngày giao dịch', 'date', dateInput('date', data.date || today()), { required: true })}
      ${field('Tài khoản', 'accountId', selectInput('accountId', accounts, accountId), { required: true })}
      ${field('Danh mục chi', 'categoryId', `<select id="field-categoryId" name="categoryId" required><option value="">Chọn danh mục…</option>${categoryOptions(state, 'expense', data.categoryId)}</select>`, { required: true })}
      <div class="form-field full"><label for="field-note">Ghi chú</label><textarea id="field-note" name="note" maxlength="500" placeholder="Tên cửa hàng hoặc nội dung chi">${escapeHtml(data.note || '')}</textarea><span class="field-error" data-error-for="note"></span></div>
      <div class="form-field full"><div class="notice notice-warn">OCR có thể nhận sai số tiền hoặc ngày. Hãy kiểm tra và chỉnh sửa toàn bộ trường trước khi lưu giao dịch.</div></div>
    </div>
  </form>`;
}

function modalForm(state, modal) {
  const data = modal.data || {};
  switch (modal.type) {
    case 'transaction': return transactionForm(state, data);
    case 'receipt-scan': return receiptScanForm(state, data);
    case 'account': {
      const kinds = [{ id: 'cash', name: 'Tiền mặt' }, { id: 'bank', name: 'Ngân hàng' }, { id: 'e_wallet', name: 'Ví điện tử' }];
      const kind = data.kind || 'cash';
      const institutionLabel = kind === 'bank' ? 'Tên ngân hàng' : 'Tên ví điện tử';
      return `<form data-form="account" data-id="${escapeHtml(data.id || '')}" data-kind="${escapeHtml(kind)}" novalidate><div class="form-grid">
        ${field('Tên tài khoản', 'name', textInput('name', data.name || '', { maxLength: 80, placeholder: 'Ví dụ: Tiền mặt' }), { required: true })}
        ${field('Loại tài khoản', 'kind', `<select id="field-kind" name="kind" required ${data.id ? 'disabled' : ''}>${kinds.map((row) => `<option value="${row.id}" ${row.id === kind ? 'selected' : ''}>${row.name}</option>`).join('')}</select>`, { required: true })}
        ${field(moneyLabel(state, 'Số dư ban đầu'), 'openingBalance', moneyInput(state, 'openingBalance', data.openingBalance ?? 0, { min: 0 }), { required: true })}
        ${field('Màu nhận diện', 'color', `<input id="field-color" name="color" type="color" value="${escapeHtml(data.color || '#2563EB')}">`)}
        <div class="form-grid account-institution-fields" id="account-institution-fields" ${kind === 'cash' ? 'hidden' : ''}>
          ${field(institutionLabel, 'institutionName', `<input id="field-institutionName" name="institutionName" type="text" value="${escapeHtml(data.institutionName || '')}" maxlength="80" placeholder="Tự nhập tên">`, { required: true })}
          ${field('Số tài khoản / số ví', 'accountNumber', `<input id="field-accountNumber" name="accountNumber" type="text" inputmode="numeric" autocomplete="off" maxlength="40" placeholder="${data.accountNumberLast4 ? 'Để trống để giữ nguyên' : 'Nhập số tài khoản hoặc số ví'}">`)}
          ${data.accountNumberLast4 ? `<div class="form-field full"><span class="form-help" data-no-translate>Đã lưu số kết thúc bằng •••• ${escapeHtml(data.accountNumberLast4)}</span></div>` : ''}
          ${data.accountNumberLast4 ? `<div class="form-field full"><label class="account-clear-number"><input type="checkbox" name="clearAccountNumber" value="true"> Xóa số tài khoản đã lưu</label></div>` : ''}
          <div class="form-field full"><div class="notice notice-info account-data-note">Số tài khoản được mã hóa khi lưu; chỉ 4 số cuối hiển thị lại. Chỉ lưu thông tin nhận diện thủ công, không kết nối ngân hàng/ví và không yêu cầu mật khẩu hay OTP.</div></div>
        </div>
        ${data.id ? `<div class="form-field full account-protection-note">${data.isDefault ? 'Đây là ví Tiền mặt mặc định. Không thể xóa hoặc lưu trữ.' : data.canDelete ? 'Tài khoản chưa có dữ liệu liên quan; có thể xóa hẳn.' : 'Tài khoản đã có lịch sử hoặc dữ liệu liên quan. Xóa hẳn sẽ bị khóa; lưu trữ sẽ giữ nguyên giao dịch và báo cáo cũ.'}</div>` : ''}
      </div></form>`;
    }
    case 'category': {
      const kinds = [{ id: 'expense', name: 'Khoản chi' }, { id: 'income', name: 'Khoản thu' }];
      return `<form data-form="category" data-id="${escapeHtml(data.id || '')}" novalidate><div class="form-grid">
        ${field('Tên danh mục', 'name', textInput('name', data.name || '', { maxLength: 60, placeholder: 'Ví dụ: Ăn uống' }), { required: true })}
        ${field('Loại danh mục', 'kind', selectInput('kind', kinds, data.kind || 'expense'), { required: true })}
        ${field('Màu nhận diện', 'color', `<input id="field-color" name="color" type="color" value="${escapeHtml(data.color || '#2563EB')}">`)}
      </div></form>`;
    }
    case 'budget': {
      const categories = state.snapshot.categories.filter((row) => row.kind === 'expense' && !row.isArchived);
      const month = data.periodStart?.slice(0, 7) || state.period;
      return `<form data-form="budget" data-id="${escapeHtml(data.id || '')}" novalidate><div class="form-grid">
        ${field('Danh mục chi', 'categoryId', selectInput('categoryId', categories, data.categoryId), { required: true })}
        ${field('Tháng áp dụng', 'periodStart', `<input id="field-periodStart" name="periodStart" type="month" value="${escapeHtml(month)}" required>`, { required: true })}
        ${field(moneyLabel(state, 'Hạn mức'), 'limitAmount', moneyInput(state, 'limitAmount', data.limitAmount || '', { min: state.user?.currency === 'USD' ? 0.01 : 1 }), { required: true })}
        ${field('Nhắc khi đạt (%)', 'alertAtPercent', numberInput('alertAtPercent', data.alertAtPercent || 80, { min: 1, max: 100 }), { required: true })}
        <div class="form-field full"><label for="field-note">Ghi chú</label><input id="field-note" name="note" maxlength="300" value="${escapeHtml(data.note || '')}" placeholder="Tùy chọn"></div>
      </div></form>`;
    }
    case 'recurring': {
      const accounts = activeAccounts(state);
      const kinds = [{ id: 'expense', name: 'Khoản chi' }, { id: 'income', name: 'Khoản thu' }];
      const frequencies = [{ id: 'monthly', name: 'Hàng tháng' }, { id: 'weekly', name: 'Hàng tuần' }, { id: 'daily', name: 'Hàng ngày' }, { id: 'yearly', name: 'Hàng năm' }];
      const kind = data.kind || 'expense';
      const frequency = data.frequency || 'monthly';
      return `<form data-form="recurring" data-id="${escapeHtml(data.id || '')}" novalidate><div class="form-grid">
        ${field('Tên định kỳ', 'title', textInput('title', data.title || '', { maxLength: 100, placeholder: 'Ví dụ: Tiền thuê nhà' }), { required: true })}
        ${field('Loại', 'kind', selectInput('kind', kinds, kind), { required: true })}
        ${field(moneyLabel(state, 'Số tiền'), 'amount', moneyInput(state, 'amount', data.amount || '', { min: state.user?.currency === 'USD' ? 0.01 : 1 }), { required: true })}
        ${field('Tài khoản', 'accountId', selectInput('accountId', accounts, data.accountId || accounts[0]?.id), { required: true })}
        ${field('Danh mục', 'categoryId', `<select id="field-categoryId" name="categoryId" required><option value="">Chọn danh mục…</option>${categoryOptions(state, kind, data.categoryId)}</select>`, { required: true })}
        ${field('Chu kỳ', 'frequency', selectInput('frequency', frequencies, frequency), { required: true })}
        ${field('Ngày bắt đầu', 'startOn', dateInput('startOn', data.startOn || today()), { required: true })}
        ${field('Ngày kết thúc', 'endOn', dateInput('endOn', data.endOn || '', false))}
        <div class="form-field" data-month-day-field ${frequency === 'monthly' ? '' : 'hidden'}><label for="field-dayOfMonth">Ngày trong tháng</label><input id="field-dayOfMonth" name="dayOfMonth" type="number" min="1" max="31" value="${escapeHtml(data.dayOfMonth || 1)}"><span class="field-error" data-error-for="dayOfMonth"></span></div>
        <div class="form-field full"><div class="notice notice-info">Quy tắc tạo giao dịch đến hạn theo ngày đã chọn. Giao dịch định kỳ sẽ không được tạo trùng.</div></div>
      </div></form>`;
    }
    case 'goal':
      return `<form data-form="goal" data-id="${escapeHtml(data.id || '')}" novalidate><div class="form-grid">
        ${field('Tên mục tiêu', 'title', textInput('title', data.title || '', { maxLength: 100, placeholder: 'Ví dụ: Du lịch Đà Lạt' }), { required: true })}
        ${field(moneyLabel(state, 'Số tiền cần đạt'), 'targetAmount', moneyInput(state, 'targetAmount', data.targetAmount || '', { min: state.user?.currency === 'USD' ? 0.01 : 1 }), { required: true })}
        ${field('Ngày mục tiêu', 'targetDate', dateInput('targetDate', data.targetDate || '', false))}
        ${field('Màu nhận diện', 'color', `<input id="field-color" name="color" type="color" value="${escapeHtml(data.color || '#2563EB')}">`)}
        <div class="form-field full"><div class="notice notice-info">Số dư mục tiêu được theo dõi trong ví riêng. Nạp/rút mục tiêu không làm tăng thu hoặc chi.</div></div>
      </div></form>`;
    case 'transfer': {
      const accounts = activeAccounts(state, true);
      return `<form data-form="transfer" novalidate><div class="form-grid">
        ${field('Từ tài khoản', 'sourceAccountId', selectInput('sourceAccountId', accounts, accounts[0]?.id), { required: true })}
        ${field('Đến tài khoản', 'targetAccountId', selectInput('targetAccountId', accounts, accounts[1]?.id || ''), { required: true })}
        ${field(moneyLabel(state, 'Số tiền'), 'amount', moneyInput(state, 'amount', '', { min: state.user?.currency === 'USD' ? 0.01 : 1 }), { required: true })}
        ${field('Ngày chuyển', 'date', dateInput('date'), { required: true })}
        <div class="form-field full"><label for="field-note">Ghi chú</label><textarea id="field-note" name="note" maxlength="500" placeholder="Tùy chọn"></textarea><span class="field-error" data-error-for="note"></span></div>
        <div class="form-field full"><div class="notice notice-info">Chuyển tiền được ghi thành một lần chuyển nội bộ, không tính vào báo cáo thu/chi.</div></div>
      </div></form>`;
    }
    case 'goal-movement': {
      const goal = state.snapshot.goals.find((item) => item.id === data.goalId);
      const accounts = activeAccounts(state);
      const direction = data.direction || 'deposit';
      return `<form data-form="goal-movement" data-goal-id="${escapeHtml(goal?.id || '')}" data-direction="${direction}" novalidate><div class="form-grid">
        <div class="form-field full"><div class="notice notice-info">${direction === 'deposit' ? 'Nạp tiền vào' : 'Rút tiền từ'} mục tiêu <strong>${escapeHtml(goal?.title || '')}</strong>. Số dư mục tiêu hiện tại: ${formatMoney(goal?.currentAmount || 0)}.</div></div>
        ${field(direction === 'deposit' ? 'Từ tài khoản' : 'Chuyển đến tài khoản', 'accountId', selectInput('accountId', accounts, accounts[0]?.id), { required: true })}
        ${field(moneyLabel(state, 'Số tiền'), 'amount', moneyInput(state, 'amount', '', { min: state.user?.currency === 'USD' ? 0.01 : 1 }), { required: true })}
        ${field('Ngày giao dịch', 'date', dateInput('date'), { required: true })}
        <div class="form-field full"><label for="field-note">Ghi chú</label><textarea id="field-note" name="note" maxlength="500"></textarea></div>
      </div></form>`;
    }
    case 'profile': {
      const avatarUrl = state.user?.avatarUrl;
      const email = state.user?.email || '';
      const flow = data.emailChangeStarted ? profileEmailChangeFlowMarkup(data) : '';
      return `<form data-form="profile" novalidate><div class="form-grid">
        <div class="form-field full profile-avatar-field"><label for="field-avatar">Ảnh đại diện</label><div class="profile-avatar-editor"><span class="profile-avatar-preview" id="profile-avatar-preview">${avatarUrl ? `<img src="${escapeHtml(avatarUrl)}" alt="">` : escapeHtml(initials(state.user?.fullName || ''))}</span><div class="profile-avatar-controls"><input id="field-avatar" name="avatar" type="file" accept="image/png,image/jpeg,image/webp"><span class="form-help">PNG, JPG hoặc WebP. Ảnh được thu nhỏ trước khi lưu.</span><button type="button" class="button button-secondary button-small" data-action="remove-profile-avatar" ${avatarUrl ? '' : 'hidden'}>Gỡ ảnh</button></div></div><span class="field-error" data-error-for="avatar"></span></div>
        ${field('Tên hiển thị', 'fullName', textInput('fullName', data.fullName ?? state.user?.fullName ?? '', { maxLength: 120 }), { required: true })}
        <div class="form-field full profile-email-section"><label>Email hiện tại</label><div class="profile-email-current"><strong>${escapeHtml(email)}</strong><span class="verification-badge">✓ Đã xác nhận</span></div><span class="form-help">Email chỉ đổi sau khi bạn xác minh địa chỉ hiện tại, địa chỉ mới và bấm Lưu hồ sơ.</span><button type="button" class="button button-secondary button-small" data-action="start-profile-email-change">Đổi email</button><div class="profile-email-change-flow" data-profile-email-flow>${flow}</div></div>
      </div></form>`;
    }
    case 'logout-confirm':
      return `<div class="logout-confirmation"><span class="logout-confirmation-icon">${icon('logout', 22)}</span><div><strong>Bạn có chắc muốn đăng xuất?</strong><p>Phiên làm việc trên thiết bị này sẽ kết thúc và cache của tài khoản hiện tại sẽ được xóa.</p></div></div>`;
    case 'delete':
      return `<form data-form="delete" data-entity="${escapeHtml(data.entity)}" data-id="${escapeHtml(data.id)}" data-permanent="${data.permanent ? 'true' : 'false'}"><p>Bạn có chắc muốn ${data.archive ? 'lưu trữ' : 'xóa'} <strong>${escapeHtml(data.title || 'mục này')}</strong>?</p><p class="form-help">${escapeHtml(data.message || 'Thao tác này sẽ cập nhật dữ liệu trong tài khoản của bạn.')}</p></form>`;
    case 'transaction-detail': {
      const row = state.snapshot.transactions.find((item) => item.id === data.id);
      if (!row) return `<div class="empty-state"><div><h3>Không tìm thấy giao dịch</h3></div></div>`;
      return `<div class="setting-row"><div><div class="setting-label">Loại giao dịch</div></div><strong>${row.kind === 'income' ? 'Khoản thu' : 'Khoản chi'}</strong></div><div class="setting-row"><div class="setting-label">Số tiền</div><strong class="${row.kind}">${formatMoney(row.amount)}</strong></div><div class="setting-row"><div class="setting-label">Ngày</div><strong>${formatDate(row.date)}</strong></div><div class="setting-row"><div class="setting-label">Danh mục</div><strong>${escapeHtml(row.categoryName)}</strong></div><div class="setting-row"><div class="setting-label">Tài khoản</div><strong>${escapeHtml(row.accountName)}</strong></div><div class="setting-row"><div class="setting-label">Ghi chú</div><span>${escapeHtml(row.note || 'Không có ghi chú')}</span></div>`;
    }
    default: return `<div class="empty-state"><div><h3>Không tìm thấy biểu mẫu</h3></div></div>`;
  }
}

const titles = {
  transaction: (data) => data.id ? 'Chỉnh sửa giao dịch' : 'Thêm giao dịch mới',
  'receipt-scan': () => 'Quét hóa đơn',
  account: (data) => data.id ? 'Chỉnh sửa tài khoản' : 'Thêm tài khoản',
  category: (data) => data.id ? 'Chỉnh sửa danh mục' : 'Thêm danh mục',
  budget: (data) => data.id ? 'Chỉnh sửa ngân sách' : 'Tạo ngân sách',
  recurring: (data) => data.id ? 'Chỉnh sửa định kỳ' : 'Tạo giao dịch định kỳ',
  goal: (data) => data.id ? 'Chỉnh sửa mục tiêu' : 'Tạo mục tiêu tiết kiệm',
  transfer: () => 'Chuyển tiền',
  'goal-movement': (data) => data.direction === 'withdraw' ? 'Rút tiền mục tiêu' : 'Nạp tiền mục tiêu',
  profile: () => 'Cập nhật thông tin cá nhân',
  'logout-confirm': () => 'Xác nhận đăng xuất',
  delete: (data) => data.archive ? 'Xác nhận lưu trữ' : 'Xác nhận xóa',
  'transaction-detail': () => 'Chi tiết giao dịch'
};

export function renderModal(state) {
  if (!state.modal) return '<dialog class="modal" id="modal"></dialog>';
  const { type, data = {} } = state.modal;
  const title = titles[type]?.(data) || 'Thông tin';
  const readOnly = type === 'transaction-detail';
  const destructive = type === 'delete' || type === 'logout-confirm';
  const subtitle = type === 'transaction' ? 'Nhập thông tin khoản thu hoặc chi.' : type === 'receipt-scan' ? 'Nhận diện tại thiết bị rồi xác nhận trước khi ghi sổ.' : type === 'logout-confirm' ? 'Hành động này sẽ kết thúc phiên hiện tại.' : 'Các trường có dấu * là bắt buộc.';
  const confirmationAction = type === 'logout-confirm' ? 'confirm-logout' : 'confirm-delete';
  const confirmationLabel = type === 'logout-confirm' ? 'Đăng xuất' : data.archive ? 'Lưu trữ' : 'Xóa';
  const accountActions = type === 'account' && data.id ? `<button type="button" class="button button-danger" data-action="delete-account-permanently" data-id="${escapeHtml(data.id)}" ${data.isDefault || data.canDelete !== true ? 'disabled title="Tài khoản mặc định hoặc đã có dữ liệu liên quan"' : ''}>Xóa tài khoản</button>${data.isDefault ? '' : `<button type="button" class="button button-secondary" data-action="archive-account" data-id="${escapeHtml(data.id)}">Lưu trữ</button>`}` : '';
  return `<dialog class="modal" id="modal" aria-labelledby="modal-title"><div class="modal-header"><div><h2 id="modal-title">${escapeHtml(title)}</h2><p>${subtitle}</p></div><button type="button" class="icon-button" data-action="close-modal" aria-label="Đóng">${icon('close', 18)}</button></div><div class="modal-body">${modalForm(state, state.modal)}</div><div class="modal-footer"><button type="button" class="button button-secondary" data-action="close-modal">${readOnly ? 'Đóng' : 'Hủy'}</button>${readOnly ? `<button type="button" class="button button-secondary" data-action="edit-transaction" data-id="${escapeHtml(data.id)}">Chỉnh sửa</button>` : ''}${accountActions}${destructive ? `<button type="button" class="button button-danger" data-action="${confirmationAction}">${confirmationLabel}</button>` : !readOnly ? `<button type="button" class="button button-primary" data-action="submit-modal">${data.id ? 'Lưu thay đổi' : type === 'goal-movement' ? 'Xác nhận chuyển' : type === 'receipt-scan' ? 'Lưu giao dịch' : 'Lưu'}</button>` : ''}</div></dialog>`;
}
