import { escapeHtml } from '../utils/dom.js';
import { icon } from '../components/icons.js';

// Snapshot of the public Bank Hub catalog checked on 2026-10-16.
// SePay's public API docs do not expose an endpoint for listing supported banks.
const bankHubBanks = [
  {
    code: 'vpbank', name: 'VPBank', shortName: 'VP', accountType: 'Cá nhân (VPBank NEO)',
    accountMode: 'Tài khoản chính', flows: ['Tiền vào'],
    detail: 'Bank Hub công bố đồng bộ tiền vào cho tài khoản cá nhân VPBank NEO.'
  },
  {
    code: 'tpbank', name: 'TPBank', shortName: 'TP', accountType: 'Cá nhân',
    accountMode: 'Tài khoản chính', flows: ['Tiền vào', 'Tiền ra', 'Số dư'],
    detail: 'Bank Hub công bố đồng bộ tiền vào, tiền ra và số dư tài khoản.'
  },
  {
    code: 'vietinbank', name: 'VietinBank', shortName: 'VTB', accountType: 'Cá nhân',
    accountMode: 'Tài khoản chính', flows: ['Tiền vào', 'Tiền ra', 'Số dư'],
    detail: 'Bank Hub công bố đồng bộ tiền vào, tiền ra và số dư tài khoản.'
  },
  {
    code: 'acb', name: 'ACB', shortName: 'ACB', accountType: 'Cá nhân',
    accountMode: 'Tài khoản chính', flows: ['Tiền vào', 'Tiền ra'],
    detail: 'Bank Hub công bố đồng bộ giao dịch vào và ra trên tài khoản chính.'
  },
  {
    code: 'bidv', name: 'BIDV', shortName: 'BIDV', accountType: 'Cá nhân',
    accountMode: 'Tài khoản ảo (VA)', flows: ['Tiền vào'],
    detail: 'Bank Hub chỉ công bố giao dịch tiền vào qua VA; không đồng bộ tài khoản chính hoặc giao dịch tiền ra.'
  },
  {
    code: 'mbbank', name: 'MBBank', shortName: 'MB', accountType: 'Cá nhân',
    accountMode: 'Tài khoản chính', flows: ['Tiền vào', 'Tiền ra'],
    detail: 'Bank Hub công bố đồng bộ giao dịch vào và ra trên tài khoản chính.'
  },
  {
    code: 'ocb', name: 'OCB', shortName: 'OCB', accountType: 'Cá nhân',
    accountMode: 'Tài khoản ảo (VA)', flows: ['Tiền vào'],
    detail: 'Bank Hub công bố giao dịch tiền vào qua VA; tài khoản chính chưa có trong phạm vi được nêu.'
  },
  {
    code: 'kienlongbank', name: 'KienLongBank', shortName: 'KLB', accountType: 'Cá nhân',
    accountMode: 'Tài khoản ảo (VA)', flows: ['Tiền vào'],
    detail: 'Bank Hub công bố giao dịch tiền vào qua VA; tài khoản chính chưa có trong phạm vi được nêu.'
  },
  {
    code: 'msb', name: 'MSB', shortName: 'MSB', accountType: 'Cá nhân',
    accountMode: 'Tài khoản ảo (VA)', flows: ['Tiền vào'],
    detail: 'Bank Hub công bố giao dịch tiền vào qua VA; tài khoản chính chưa có trong phạm vi được nêu.'
  },
  {
    code: 'sacombank', name: 'Sacombank', shortName: 'STB', accountType: 'Cá nhân',
    accountMode: 'Tài khoản chính', flows: ['Tiền vào', 'Tiền ra'],
    detail: 'Bank Hub công bố đồng bộ giao dịch vào và ra trên tài khoản chính.'
  }
];

let selectedBankCode = '';
let bankHubReady = false;
let bankHubConsentVersion = '1.0.0';
let bankHubBusy = false;
let bankHubAttempt = null;
const sandboxBankCodes = new Set(['vpbank', 'vietinbank', 'acb', 'bidv', 'mbbank', 'ocb', 'kienlongbank', 'sacombank']);

function selectedBank() {
  return bankHubBanks.find((bank) => bank.code === selectedBankCode) || null;
}

function selectionDetails(bank) {
  if (!bank) {
    return `<div class="bank-selection-empty"><span class="bank-selection-empty-icon" aria-hidden="true">${icon('bank', 22)}</span><div><strong>Chọn ngân hàng để xem phạm vi hỗ trợ</strong><p>Danh sách gồm các ngân hàng Bank Hub công bố cho tài khoản cá nhân.</p></div></div>`;
  }

  return `<div class="bank-selected-summary">
    <span class="bank-target-mark" aria-hidden="true">${escapeHtml(bank.shortName)}</span>
    <div class="bank-selected-copy"><div class="bank-selected-heading"><h4>${escapeHtml(bank.name)}</h4><span class="bank-target-status">${escapeHtml(bank.accountType)}</span></div>
      <p>${escapeHtml(bank.accountMode)} · ${escapeHtml(bank.detail)}</p>
      <div class="bank-target-scopes">${bank.flows.map((flow) => `<span>${icon('check', 13)}${escapeHtml(flow)}</span>`).join('')}</div>
    </div>
  </div>`;
}

function connectionStatusText(bank) {
  if (bankHubAttempt?.status === 'linked') {
    const bankName = bankHubAttempt.bankName || bankHubAttempt.bankCode;
    const lastFour = bankHubAttempt.accountNumberLast4 ? ` · tài khoản ****${bankHubAttempt.accountNumberLast4}` : '';
    return `SePay đã xác nhận liên kết ${bankName}${lastFour}. Đồng bộ giao dịch chưa được bật trong mốc triển khai này.`;
  }
  if (bankHubAttempt?.status === 'launched') return 'Đang chờ bạn hoàn tất xác thực trong SePay Bank Hub.';
  if (bankHubAttempt?.status === 'failed') return 'SePay không hoàn tất liên kết. Bạn có thể bắt đầu lại khi sandbox sẵn sàng.';
  if (bankHubAttempt?.status === 'abandoned') return 'Phiên trước đã đóng. Bạn có thể bắt đầu lại.';
  if (bankHubAttempt?.status === 'expired') return 'Liên kết trước đã hết hạn. Hãy bắt đầu lại để tạo link dùng một lần mới.';
  if (!bankHubReady) return 'Nút đang khóa tới khi máy chủ có credential sandbox, Company XID và khóa mã hóa.';
  if (!bank) return 'Chọn ngân hàng để xem phạm vi hỗ trợ.';
  if (!sandboxBankCodes.has(bank.code)) return 'Ngân hàng này có trong danh sách Bank Hub, nhưng chưa có tài khoản mẫu trong sandbox SePay.';
  if (!document.querySelector('#bank-link-consent')?.checked) return 'Đọc và đồng ý riêng với nội dung liên kết ngân hàng để tiếp tục.';
  return 'Sandbox đã sẵn sàng. SePay có thể yêu cầu bạn chọn lại ngân hàng trong Hosted Link.';
}

export function refreshBankHubConnectButton() {
  const bank = selectedBank();
  const consent = document.querySelector('#bank-link-consent');
  const button = document.querySelector('#bank-connect-button');
  const status = document.querySelector('#bank-selection-status');
  if (status) status.textContent = connectionStatusText(bank);
  if (button) {
    button.disabled = bankHubBusy || !bankHubReady || !bank || !sandboxBankCodes.has(bank.code) || !consent?.checked;
    button.dataset.bankCode = bank?.code || '';
    button.textContent = bankHubBusy ? 'Đang tạo liên kết…' : bank ? `Kết nối ${bank.name}` : 'Chọn ngân hàng để tiếp tục';
  }
}

export function applyBankHubReadiness(status = {}) {
  bankHubReady = status.configured === true;
  bankHubConsentVersion = status.consentVersion || '1.0.0';
  bankHubAttempt = status.attempt || null;
  refreshBankHubConnectButton();
}

export function applyBankHubAttempt(attempt) {
  bankHubAttempt = attempt || null;
  refreshBankHubConnectButton();
}

export function getBankLinkRequest() {
  const bank = selectedBank();
  const consent = document.querySelector('#bank-link-consent');
  if (!bank || !consent?.checked) return null;
  return { bankCode: bank.code, consent: true, consentVersion: bankHubConsentVersion };
}

export function setBankHubBusy(busy) {
  bankHubBusy = Boolean(busy);
  refreshBankHubConnectButton();
}

export function renderBankTargetCatalog() {
  const bank = selectedBank();
  return `<section class="bank-selector-card" aria-labelledby="bank-selector-title">
    <div class="bank-selector-top"><div><h3 id="bank-selector-title">Chọn ngân hàng</h3><p>Chọn một ngân hàng trong danh sách Bank Hub để xem phạm vi dữ liệu được công bố (đối chiếu 16/10/2026).</p></div><a class="bank-target-source" href="https://developer.sepay.vn/vi/bankhub/tong-quan" target="_blank" rel="noopener noreferrer">Tài liệu SePay Bank Hub ${icon('arrowRight', 13)}</a></div>
    <div class="bank-selector-field"><label for="bank-hub-select">Ngân hàng</label><select id="bank-hub-select" aria-describedby="bank-selection-status"><option value="">Chọn ngân hàng…</option>${bankHubBanks.map((item) => `<option value="${escapeHtml(item.code)}" ${item.code === bank?.code ? 'selected' : ''}>${escapeHtml(item.name)}</option>`).join('')}</select></div>
    <div class="bank-selection-details" id="bank-selection-details" aria-live="polite">${selectionDetails(bank)}</div>
    <label class="bank-link-consent" for="bank-link-consent"><input id="bank-link-consent" type="checkbox" ${bank ? '' : 'disabled'}><span>Tôi đồng ý riêng cho Ví Mình gửi yêu cầu liên kết ngân hàng đã chọn đến SePay Bank Hub và xử lý trạng thái liên kết cùng 4 số cuối tài khoản để hiển thị kết quả. Không cấp quyền chuyển tiền. <a href="/legal.html#privacy" target="_blank" rel="noopener noreferrer">Xem quyền riêng tư</a>.</span></label>
    <div class="bank-connect-row"><div class="bank-connect-status" id="bank-selection-status" role="status">${connectionStatusText(bank)}</div><button class="button button-primary bank-connect-button" id="bank-connect-button" data-action="bank-connect" type="button" disabled>${bank ? `Kết nối ${escapeHtml(bank.name)}` : 'Chọn ngân hàng để tiếp tục'}</button></div>
  </section>`;
}

export function updateBankSelection(code) {
  selectedBankCode = bankHubBanks.some((bank) => bank.code === code) ? code : '';
  const bank = selectedBank();
  const details = document.querySelector('#bank-selection-details');
  const status = document.querySelector('#bank-selection-status');
  const consent = document.querySelector('#bank-link-consent');
  if (details) details.innerHTML = selectionDetails(bank);
  if (consent) {
    consent.checked = false;
    consent.disabled = !bank;
  }
  if (status) status.textContent = connectionStatusText(bank);
  refreshBankHubConnectButton();
}
