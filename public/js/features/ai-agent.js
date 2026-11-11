import { post } from '../api/client.js';
import { downloadExport } from '../api/download.js?v=20261104-agent-exports-v1';
import { escapeHtml } from '../utils/dom.js';
import { today } from '../utils/dates.js';
import { formatMoney } from '../utils/money.js';
import { analyzePersonalFinanceQuestion, getFinanceQuestionContext } from '../utils/smart-finance.js?v=20261104-agent-context-export-v2';

const MAX_MESSAGES = 36;
const GENERAL_ROUTES = new Set(['dashboard', 'transactions', 'accounts', 'budgets', 'recurring', 'goals', 'reports', 'categories', 'settings', 'help']);
const ADMIN_ROUTES = new Set(['admin-overview', 'admin-users', 'admin-audit']);
const SETTINGS_SECTIONS = new Set(['settings-profile', 'settings-security', 'settings-preferences', 'settings-data', 'settings-mini-app', 'settings-bank', 'settings-help']);
const FORM_ACTIONS = new Set(['new-transaction', 'new-account', 'new-category', 'new-budget', 'new-recurring', 'new-goal', 'new-transfer']);
const suggestions = [
  { label: 'Tổng chi tháng này', prompt: 'Tổng chi tháng này' },
  { label: 'Dự báo số dư', prompt: 'Dự báo số dư 30 ngày tới' },
  { label: 'Tạo mục tiêu tiết kiệm', prompt: 'Tôi muốn tạo mục tiêu tiết kiệm' },
  { label: 'Xem lịch sử danh mục', prompt: 'Làm sao xem lịch sử giao dịch theo danh mục?' }
];

let opened = false;
let busy = false;
let draft = '';
let messages = [];
let pendingCommand = null;
let ownerId = null;
let panelSize = null;
let activeResize = null;

function getPanelLimits(panel) {
  const rect = panel.getBoundingClientRect();
  const styles = getComputedStyle(panel);
  const maxWidth = Number.parseFloat(styles.maxWidth);
  const maxHeight = Number.parseFloat(styles.maxHeight);
  return {
    minWidth: panelSize?.minWidth ?? rect.width,
    minHeight: panelSize?.minHeight ?? rect.height,
    maxWidth: Number.isFinite(maxWidth) ? Math.max(maxWidth, panelSize?.minWidth ?? 0) : window.innerWidth,
    maxHeight: Number.isFinite(maxHeight) ? Math.max(maxHeight, panelSize?.minHeight ?? 0) : window.innerHeight
  };
}

function rememberPanelSize(panel) {
  const rect = panel.getBoundingClientRect();
  if (!panelSize) {
    panelSize = { width: rect.width, height: rect.height, minWidth: rect.width, minHeight: rect.height };
  } else {
    panelSize.width = rect.width;
    panelSize.height = rect.height;
  }
  return panelSize;
}

function applyPanelSize(panel, width, height, limits = getPanelLimits(panel)) {
  const current = rememberPanelSize(panel);
  const nextWidth = Math.min(limits.maxWidth, Math.max(current.minWidth, width));
  const nextHeight = Math.min(limits.maxHeight, Math.max(current.minHeight, height));
  current.width = nextWidth;
  current.height = nextHeight;
  panel.style.setProperty('--ai-agent-width', `${nextWidth}px`);
  panel.style.setProperty('--ai-agent-height', `${nextHeight}px`);
  panel.style.setProperty('--ai-agent-min-width', `${current.minWidth}px`);
  panel.style.setProperty('--ai-agent-min-height', `${current.minHeight}px`);
}

function startPanelResize(event) {
  if (!(event.target instanceof Element) || event.button !== 0) return;
  const handle = event.target.closest('[data-ai-agent-resize]');
  const panel = handle?.closest('.ai-agent-panel');
  if (!handle || !panel) return;

  event.preventDefault();
  const size = rememberPanelSize(panel);
  const limits = getPanelLimits(panel);
  activeResize = {
    pointerId: event.pointerId,
    edge: handle.dataset.aiAgentResize,
    handle,
    panel,
    startX: event.clientX,
    startY: event.clientY,
    startWidth: panel.getBoundingClientRect().width,
    startHeight: panel.getBoundingClientRect().height,
    limits: { ...limits, minWidth: size.minWidth, minHeight: size.minHeight }
  };
  handle.setPointerCapture?.(event.pointerId);
  document.documentElement.classList.add('ai-agent-is-resizing', `ai-agent-is-resizing-${activeResize.edge}`);
}

function movePanelResize(event) {
  if (!activeResize || event.pointerId !== activeResize.pointerId) return;
  const { edge, panel, startX, startY, startWidth, startHeight, limits } = activeResize;
  const width = edge === 'left' || edge === 'corner' ? startWidth + startX - event.clientX : startWidth;
  const height = edge === 'top' || edge === 'corner' ? startHeight + startY - event.clientY : startHeight;
  applyPanelSize(panel, width, height, limits);
}

function endPanelResize(event) {
  if (!activeResize || (event?.pointerId != null && event.pointerId !== activeResize.pointerId)) return;
  const { handle, pointerId } = activeResize;
  activeResize = null;
  document.documentElement.classList.remove('ai-agent-is-resizing', 'ai-agent-is-resizing-top', 'ai-agent-is-resizing-left', 'ai-agent-is-resizing-corner');
  if (handle.hasPointerCapture?.(pointerId)) handle.releasePointerCapture(pointerId);
}

function handleResizeKeydown(event) {
  if (!(event.target instanceof Element) || !['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.key)) return;
  const handle = event.target.closest('[data-ai-agent-resize]');
  const panel = handle?.closest('.ai-agent-panel');
  if (!handle || !panel) return;

  const edge = handle.dataset.aiAgentResize;
  if (edge !== 'corner' && ((edge === 'top' && !['ArrowUp', 'ArrowDown'].includes(event.key)) || (edge === 'left' && !['ArrowLeft', 'ArrowRight'].includes(event.key)))) return;
  event.preventDefault();
  const rect = panel.getBoundingClientRect();
  const step = event.shiftKey ? 48 : 20;
  const width = rect.width + (event.key === 'ArrowLeft' ? step : event.key === 'ArrowRight' ? -step : 0);
  const height = rect.height + (event.key === 'ArrowUp' ? step : event.key === 'ArrowDown' ? -step : 0);
  applyPanelSize(panel, width, height);
}

document.addEventListener('pointerdown', startPanelResize);
document.addEventListener('pointermove', movePanelResize);
document.addEventListener('pointerup', endPanelResize);
document.addEventListener('pointercancel', endPanelResize);
document.addEventListener('keydown', handleResizeKeydown);
window.addEventListener('blur', () => endPanelResize());

export function resetAgentSession() {
  opened = false;
  busy = false;
  draft = '';
  messages = [];
  pendingCommand = null;
  ownerId = null;
}

export function handleAgentInput(target) {
  draft = target.value;
  target.style.height = 'auto';
  target.style.height = `${Math.min(target.scrollHeight, 80)}px`;
}

export function handleAgentEscape(event, render) {
  if (!opened || event.key !== 'Escape' || document.querySelector('#modal[open], #admin-confirm-dialog[open], #admin-user-detail-dialog[open]')) return false;
  opened = false;
  render();
  document.querySelector('[data-action="ai-agent-open"]')?.focus({ preventScroll: true });
  return true;
}

function ensureOwner(state) {
  const nextId = state.user?.id || null;
  if (ownerId !== nextId) {
    resetAgentSession();
    ownerId = nextId;
  }
}

function addMessage(role, text, { variant = '', actions = [], choices = [], actionContext = null, financeExportContext = null } = {}) {
  messages.push({ id: `${Date.now()}-${messages.length}`, role, text, variant, actions, choices, actionContext, financeExportContext });
  if (messages.length > MAX_MESSAGES) messages = messages.slice(-MAX_MESSAGES);
}

function renderChoice(choice) {
  if (choice.type === 'account') {
    return `<button type="button" class="ai-agent-choice" data-action="ai-agent-account-choice" data-id="${escapeHtml(choice.id)}">${escapeHtml(choice.label)}</button>`;
  }
  if (choice.type === 'category') {
    return `<button type="button" class="ai-agent-choice" data-action="ai-agent-category-choice" data-id="${escapeHtml(choice.id)}">${escapeHtml(choice.label)}</button>`;
  }
  return '';
}

function actionContextAttribute(action, messageContext) {
  const context = { ...(messageContext || {}), ...(action.context || {}) };
  if (action.type === 'category-history') context.categoryId = action.categoryId;
  if (!Object.keys(context).length) return '';
  return ` data-agent-context="${escapeHtml(JSON.stringify(context))}"`;
}

function renderAction(action, state, messageContext) {
  const contextAttribute = actionContextAttribute(action, messageContext);
  if (action.type === 'export' && ['report', 'transactions', 'recurring', 'categories'].includes(action.dataset) && ['xlsx', 'pdf'].includes(action.format)) {
    const extension = action.format === 'xlsx' ? '.xlsx' : '.pdf';
    const label = action.format === 'xlsx' ? 'Tải Excel' : 'Tải PDF';
    const exportContext = { ...(messageContext || {}), ...(action.context || {}) };
    const from = exportContext.from || exportContext.period?.from || '';
    const to = exportContext.to || exportContext.period?.to || '';
    const kind = exportContext.kind || '';
    const categoryId = exportContext.categoryId || '';
    return `<button type="button" class="ai-agent-export-action" data-action="ai-agent-export" data-dataset="${action.dataset}" data-format="${action.format}" data-from="${escapeHtml(from)}" data-to="${escapeHtml(to)}" data-kind="${escapeHtml(kind)}" data-category-id="${escapeHtml(categoryId)}" data-all="${exportContext.all ? 'true' : ''}"${contextAttribute}><span class="ai-agent-export-type">${extension}</span><span class="ai-agent-export-copy"><strong>${label}</strong><small>${extension} · tệp dữ liệu</small></span></button>`;
  }
  if (action.type === 'link' && ['/legal.html#terms', '/legal.html#privacy'].includes(action.href)) {
    return `<a class="ai-agent-action" href="${action.href}" target="_blank" rel="noopener noreferrer">${escapeHtml(action.label)}</a>`;
  }
  if (action.type === 'route' && GENERAL_ROUTES.has(action.view)) {
    return `<button type="button" class="ai-agent-action" data-action="navigate" data-view="${action.view}"${contextAttribute}>${escapeHtml(action.label)}</button>`;
  }
  if (action.type === 'route' && state.user?.role === 'admin' && ADMIN_ROUTES.has(action.view)) {
    return `<button type="button" class="ai-agent-action" data-action="navigate" data-view="${action.view}"${contextAttribute}>${escapeHtml(action.label)}</button>`;
  }
  if (action.type === 'category-history' && state.snapshot.categories.some((item) => item.id === action.categoryId)) {
    return `<button type="button" class="ai-agent-action" data-action="navigate" data-view="transactions" data-id="${escapeHtml(action.categoryId)}"${contextAttribute}>${escapeHtml(action.label)}</button>`;
  }
  if (action.type === 'section' && action.view === 'settings' && SETTINGS_SECTIONS.has(action.section)) {
    return `<button type="button" class="ai-agent-action" data-action="ai-agent-settings-section" data-section="${action.section}">${escapeHtml(action.label)}</button>`;
  }
  if (action.type === 'form' && FORM_ACTIONS.has(action.action) && !state.view.startsWith('admin-')) {
    return `<button type="button" class="ai-agent-action" data-action="${action.action}"${contextAttribute}>${escapeHtml(action.label)}</button>`;
  }
  return '';
}

function renderMessage(message, state) {
  const isAssistant = message.role === 'assistant';
  const bodyClass = message.variant ? ` ai-agent-message-body--${message.variant}` : '';
  return `<article class="ai-agent-message ${isAssistant ? 'is-assistant' : 'is-user'}" aria-label="${isAssistant ? 'Trợ lý' : 'Bạn'}">
    ${isAssistant ? '<span class="ai-agent-message-avatar" aria-hidden="true">V</span>' : ''}
    <div class="ai-agent-message-content"><div class="ai-agent-message-body${bodyClass}">${escapeHtml(message.text)}</div>
      ${message.choices.length ? `<div class="ai-agent-choices">${message.choices.map(renderChoice).join('')}</div>` : ''}
      ${message.actions.length ? `<div class="ai-agent-actions">${message.actions.map((action) => renderAction(action, state, message.actionContext)).join('')}</div>` : ''}
    </div>
  </article>`;
}

export function renderAgentWidget(state) {
  if (!state.user) return '';
  ensureOwner(state);
  const panelStyle = panelSize ? ` style="--ai-agent-width:${panelSize.width}px;--ai-agent-height:${panelSize.height}px;--ai-agent-min-width:${panelSize.minWidth}px;--ai-agent-min-height:${panelSize.minHeight}px"` : '';
  const panel = opened ? `<section class="ai-agent-panel" role="dialog" aria-label="Trợ lý Ví Mình" aria-modal="false"${panelStyle}>
    <button type="button" class="ai-agent-resize-handle ai-agent-resize-handle--top" data-ai-agent-resize="top" aria-label="Thay đổi chiều cao trợ lý, dùng phím mũi tên lên hoặc xuống"></button>
    <button type="button" class="ai-agent-resize-handle ai-agent-resize-handle--left" data-ai-agent-resize="left" aria-label="Thay đổi chiều rộng trợ lý, dùng phím mũi tên trái hoặc phải"></button>
    <button type="button" class="ai-agent-resize-handle ai-agent-resize-handle--corner" data-ai-agent-resize="corner" aria-label="Thay đổi chiều rộng và chiều cao trợ lý, dùng phím mũi tên"></button>
    <header class="ai-agent-header"><span class="ai-agent-brand-mark" aria-hidden="true">V</span><div class="ai-agent-heading"><strong>Trợ lý Ví Mình</strong><small>Hướng dẫn và ghi chép thu chi</small></div><button type="button" class="ai-agent-header-button" data-action="ai-agent-clear" aria-label="Xóa cuộc trò chuyện">↻</button><button type="button" class="ai-agent-header-button" data-action="ai-agent-close" aria-label="Thu gọn trợ lý">×</button></header>
    <div class="ai-agent-thread" id="ai-agent-messages" role="log" aria-live="polite" aria-relevant="additions text">
      ${messages.length ? messages.map((message) => renderMessage(message, state)).join('') : `<div class="ai-agent-welcome"><span class="ai-agent-welcome-icon" aria-hidden="true">✦</span><strong>Xin chào${state.user.fullName ? `, ${escapeHtml(state.user.fullName.split(/\s+/).at(-1))}` : ''}!</strong><p>Mình có thể phân tích thu chi, dự báo số dư, theo dõi cảnh báo, hướng dẫn dùng app và ghi giao dịch sau khi bạn xác nhận.</p></div><div class="ai-agent-suggestions">${suggestions.map((item) => `<button type="button" data-action="ai-agent-suggestion" data-prompt="${escapeHtml(item.prompt)}">${escapeHtml(item.label)}</button>`).join('')}</div>`}
      ${busy ? '<div class="ai-agent-thinking" role="status"><span></span><span></span><span></span><small>Đang xử lý…</small></div>' : ''}
    </div>
    <form class="ai-agent-composer" data-form="ai-agent"><label class="sr-only" for="ai-agent-input">Nhập câu hỏi hoặc giao dịch</label><textarea id="ai-agent-input" name="message" data-agent-input rows="1" maxlength="1000" placeholder="Hỏi cách dùng hoặc nhập giao dịch…" ${busy ? 'disabled' : ''}>${escapeHtml(draft)}</textarea><button type="submit" class="ai-agent-send" aria-label="Gửi tin nhắn" ${busy ? 'disabled' : ''}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 12 20 4l-4 16-4.5-6L4 12Z"/><path d="m11.5 14 4-4"/></svg></button></form>
    <div class="ai-agent-footer">Phân tích theo quy tắc cục bộ · Chat chỉ giữ trong phiên</div>
  </section>` : '';
  return `<aside class="ai-agent-widget ${opened ? 'is-open' : ''}" aria-label="Trợ lý Ví Mình">${panel}<button type="button" class="ai-agent-bubble" data-action="${opened ? 'ai-agent-close' : 'ai-agent-open'}" aria-label="${opened ? 'Thu gọn trợ lý Ví Mình' : 'Mở trợ lý Ví Mình'}" aria-expanded="${opened}"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 11.5a7.5 7.5 0 0 1-8 7.5 8.5 8.5 0 0 1-3.3-.7L4 20l1.5-3.6A7.1 7.1 0 0 1 4 12c0-4.1 3.6-7.5 8-7.5s8 3.1 8 7Z"/><path d="M8 12h.01M12 12h.01M16 12h.01"/></svg></button></aside>`;
}

function normalizeText(value) {
  return String(value || '').toLocaleLowerCase('vi').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
}

function hasExplicitExportPeriod(value) {
  const query = normalizeText(value);
  return /\b(hom qua|hom nay|7 ngay|tuan nay|thang nay|thang truoc|thang (?:0?[1-9]|1[0-2]))\b/.test(query)
    || /\btu .+ den .+/.test(query);
}

function isWholeTransactionRequest(value) {
  const query = normalizeText(value);
  return !hasExplicitExportPeriod(query) && /\b(toan bo|tat ca|lich su(?: day du)?|moi giao dich)\b/.test(query);
}

function toIsoDate(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function addDays(iso, amount) {
  const [year, month, day] = iso.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  date.setDate(date.getDate() + amount);
  return toIsoDate(date);
}

function parseDate(text) {
  const normalized = normalizeText(text);
  const current = today();
  if (/\bhom qua\b/.test(normalized)) return addDays(current, -1);
  if (/\bngay mai\b/.test(normalized)) return addDays(current, 1);
  const monthName = normalized.match(/\b(?:ngay\s+)?(\d{1,2})\s+thang\s+(\d{1,2})(?:\s+(\d{4}))?\b/);
  const numericDate = text.match(/\b(?:ngày\s+)?(\d{1,2})\s*[/.\-]\s*(\d{1,2})(?:\s*[/.\-]\s*(\d{2,4}))?\b/iu);
  const parts = monthName || numericDate;
  if (!parts) return current;
  const day = Number(parts[1]);
  const month = Number(parts[2]);
  let year = Number(parts[3] || current.slice(0, 4));
  if (year < 100) year += 2000;
  const date = new Date(year, month - 1, day);
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) return null;
  return toIsoDate(date);
}

function parseTime(text) {
  const match = text.match(/\b(?:lúc\s*)?(\d{1,2})\s*(?::|h|giờ)\s*(\d{0,2})\b/iu)
    || normalizeText(text).match(/\b(?:luc\s*)?(\d{1,2})\s*(?:h|gio)\s*(\d{0,2})\b/);
  if (!match) return '';
  const hour = Number(match[1]);
  const minute = Number(match[2] || 0);
  if (hour > 23 || minute > 59) return '';
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
}

function parseAmount(text, defaultCurrency = 'VND') {
  const timeRanges = [...text.matchAll(/\b\d{1,2}\s*(?:h(?:\s*\d{1,2})?|giờ(?:\s*\d{1,2})?)/giu)].map((match) => [match.index, match.index + match[0].length]);
  const dateRanges = [...text.matchAll(/\b\d{1,2}\s*(?:[/.\-]\s*\d{1,2}|tháng\s+\d{1,2})/giu)].map((match) => [match.index, match.index + match[0].length]);
  const amountPattern = /(?:^|[^\p{L}\p{N}])(\d{1,3}(?:[.,\s]\d{3})+|\d+(?:[.,]\d+)?)(?:\s*(triệu|tr|nghìn|ngàn|nghin|ngan|k|đồng|dong|vnd|đ|usd|dollars?|đô(?:\s*la)?))?(?=$|[^\p{L}\p{N}])/giu;
  for (const match of text.matchAll(amountPattern)) {
    const start = match.index + match[0].indexOf(match[1]);
    const numberEnd = start + match[1].length;
    const previous = text[start - 1] || '';
    const following = text[numberEnd] || '';
    if ('/:.-'.includes(previous) || '/:.-'.includes(following)) continue;
    if (timeRanges.some(([from, to]) => start >= from && start < to) || dateRanges.some(([from, to]) => start >= from && start < to)) continue;
    const raw = match[1];
    const unit = (match[2] || '').toLocaleLowerCase('vi');
    const groupedThousands = /^\d{1,3}(?:[.,\s]\d{3})+$/.test(raw);
    const parsed = groupedThousands ? Number(raw.replace(/[.,\s]/g, '')) : Number(raw.replace(',', '.'));
    const multiplier = ['triệu', 'tr'].includes(unit) ? 1_000_000 : ['nghìn', 'ngàn', 'nghin', 'ngan', 'k'].includes(unit) ? 1_000 : 1;
    const normalizedUnit = normalizeText(unit);
    const isExplicitUsd = normalizedUnit === 'usd' || normalizedUnit === 'dollar' || normalizedUnit === 'dollars'
      || normalizedUnit === 'do' || normalizedUnit === 'do la' || text[start - 1] === '$';
    const isExplicitVnd = Boolean(unit) && !isExplicitUsd;
    const currency = isExplicitUsd ? 'USD' : isExplicitVnd ? 'VND' : defaultCurrency === 'USD' ? 'USD' : 'VND';
    const amount = currency === 'USD' ? Number((parsed * multiplier).toFixed(2)) : Math.round(parsed * multiplier);
    if (Number.isSafeInteger(amount) && amount > 0) return { amount, currency };
  }
  return null;
}

function transactionKind(text) {
  const normalized = ` ${normalizeText(text)} `;
  const income = [' thu ', ' thu nhap ', ' nhan ', ' nhan duoc ', ' luong ', ' thuong ', ' tien lai ', ' ban duoc ', ' duoc tra '].some((phrase) => normalized.includes(phrase));
  const expense = [' chi ', ' chi tieu ', ' tieu ', ' mua ', ' thanh toan ', ' het ', ' ton ', ' tra ', ' di an ', ' an uong ', ' do xang '].some((phrase) => normalized.includes(phrase));
  if (income === expense) return null;
  return income ? 'income' : 'expense';
}

function isQuestionOrGuide(text) {
  const normalized = normalizeText(text);
  return /\?$/.test(String(text).trim()) || /^(?:lam sao|lam the nao|cach|huong dan|tai sao|vi sao|bao nhieu|cho toi biet|toi muon biet|co nen|co the nao)\b/.test(normalized);
}

function isDuplicateReviewRequest(text) {
  const normalized = normalizeText(text);
  const mentionsDuplicate = /\b(?:giao dich|khoan chi|khoan thu)\b.{0,48}\b(?:trung|lap|giong nhau)\b|\b(?:trung|lap|giong nhau)\b.{0,48}\b(?:giao dich|khoan chi|khoan thu)\b/.test(normalized);
  const asksForReview = /\b(?:kiem tra|xem lai|tim|soat|phat hien|phan tich)\b/.test(normalized);
  return mentionsDuplicate && asksForReview;
}

function isNegativeAction(text) {
  return /\b(?:khong|chua|dung)\s+(?:can\s+)?(?:ghi|them|tao|luu)\b/.test(normalizeText(text));
}

function isTransactionEntry(text) {
  if (isQuestionOrGuide(text) || isNegativeAction(text)) return false;
  const normalized = ` ${normalizeText(text)} `;
  const explicitRecord = [' ghi nhan ', ' ghi lai ', ' ghi giao dich ', ' ghi khoan chi ', ' ghi khoan thu ', ' them giao dich ', ' tao giao dich ', ' luu giao dich ', ' them khoan chi ', ' them khoan thu '].some((phrase) => normalized.includes(phrase));
  if (explicitRecord) return true;
  if (normalized.includes(' muon ')) return false;
  const firstPerson = /^(?:toi|minh|em|anh)\b/.test(normalized.trim()) || /^chị\b/iu.test(text.trim());
  const dated = /\b(hom nay|hom qua|ngay mai)\b/.test(normalized) || Boolean(parseTime(text));
  const action = [' di an ', ' an uong ', ' mua ', ' tra ', ' thanh toan ', ' nhan ', ' luong ', ' thuong ', ' het ', ' ton ', ' chi ', ' thu '].some((phrase) => normalized.includes(phrase));
  return action && (firstPerson || dated);
}

function findCategory(text, kind, categories) {
  const normalized = normalizeText(text);
  const active = categories.filter((item) => item.kind === kind && !item.isArchived);
  const namedMatches = active.filter((item) => {
    const name = normalizeText(item.name);
    return name.length > 1 && ` ${normalized} `.includes(` ${name} `);
  });
  if (namedMatches.length) {
    const maxLength = Math.max(...namedMatches.map((item) => normalizeText(item.name).length));
    const longest = namedMatches.filter((item) => normalizeText(item.name).length === maxLength);
    return longest.length === 1 ? { category: longest[0] } : { choices: longest };
  }
  const aliases = kind === 'expense' ? [
    { pattern: /\b(an|di an|an sang|an trua|an toi|ca phe|cafe|do an|bua an)\b/, name: 'ăn uống' },
    { pattern: /\b(di chuyen|xang|taxi|grab|xe buyt|gui xe|ve xe)\b/, name: 'di chuyển' },
    { pattern: /\b(nha o|tien nha|thue nha|tien tro)\b/, name: 'nhà ở' },
    { pattern: /\b(hoa don|tien dien|tien nuoc|internet|wifi)\b/, name: 'hóa đơn' },
    { pattern: /\b(mua sam|quan ao|my pham|mua do)\b/, name: 'mua sắm' },
    { pattern: /\b(suc khoe|thuoc|kham benh|benh vien)\b/, name: 'sức khỏe' },
    { pattern: /\b(giai tri|xem phim|game|ca nhac)\b/, name: 'giải trí' },
    { pattern: /\b(giao duc|hoc phi|khoa hoc|sach|hoc tap)\b/, name: 'giáo dục' }
  ] : [
    { pattern: /\b(luong|tien luong)\b/, name: 'lương' },
    { pattern: /\b(thuong|tien thuong)\b/, name: 'thưởng' },
    { pattern: /\b(dau tu|co tuc|tien lai)\b/, name: 'đầu tư' },
    { pattern: /\b(thu nhap khac|ban hang|hoan tien)\b/, name: 'thu nhập khác' }
  ];
  const matchedNames = aliases.filter((alias) => alias.pattern.test(normalized)).map((alias) => alias.name);
  const aliasMatches = active.filter((item) => matchedNames.includes(normalizeText(item.name)));
  if (aliasMatches.length === 1) return { category: aliasMatches[0] };
  if (aliasMatches.length > 1) return { choices: aliasMatches };
  return { choices: active };
}

function parseTransaction(text, state) {
  const kind = transactionKind(text);
  const parsedAmount = parseAmount(text, state.user?.currency || 'VND');
  if (!kind || !parsedAmount?.amount || !isTransactionEntry(text)) return null;
  const date = parseDate(text);
  if (!date) return { error: 'Mình chưa đọc được ngày trong câu đó. Hãy dùng ngày hợp lệ, ví dụ 20/10/2026.' };
  const categoryMatch = findCategory(text, kind, state.snapshot.categories);
  const time = parseTime(text);
  return {
    kind,
    amount: parsedAmount.amount,
    currency: parsedAmount.currency,
    date,
    time,
    note: text.trim().slice(0, 500),
    categoryId: categoryMatch.category?.id || null,
    categoryChoices: categoryMatch.choices || []
  };
}

function parseCategoryCreation(text) {
  if (!/\b(?:tao|them)\b/.test(normalizeText(text)) || !/\bdanh muc\b/.test(normalizeText(text))) return null;
  const match = text.match(/(?:tạo|thêm)[\s\S]*?danh\s+mục\s+([\s\S]+)/iu);
  if (!match) return null;
  let name = match[1].trim().replace(/[.!?]+$/g, '').replace(/\s+(?:giúp tôi|giùm tôi|nhé|với|được không)$/iu, '').trim();
  name = name.replace(/^(?:một|mới)\s+/iu, '').trim();
  let kind = null;
  const kindPrefix = name.match(/^(khoản\s+chi|khoản\s+thu|chi(?:\s+tiêu)?|thu(?:\s+nhập)?|expense|income)\s*(?:[:：-]\s*|\s+)/iu);
  if (kindPrefix) {
    kind = /^(?:thu|khoan thu|income)/i.test(normalizeText(kindPrefix[1])) ? 'income' : 'expense';
    name = name.slice(kindPrefix[0].length).trim();
  }
  name = name.replace(/\s+(?:cho tôi|giúp mình|giúp tôi|giùm tôi|giùm mình|nhé|với|được không)$/iu, '').trim();
  if (!name || ['gì đó', 'nào đó', 'gi do', 'nao do'].includes(normalizeText(name))) return { vague: true };
  return { name, kind };
}

function route(label, view) { return { type: 'route', label, view }; }
function section(label, view, sectionId) { return { type: 'section', label, view, section: sectionId }; }
function form(label, action) { return { type: 'form', label, action }; }

function helpAnswer(text, state) {
  const query = normalizeText(text);
  const admin = state.view.startsWith('admin-') && state.user?.role === 'admin';
  if (admin) {
    if (/(nhat ky|audit|lich su thao tac)/.test(query)) return { text: 'Nhật ký quản trị ghi lại các thay đổi vai trò và trạng thái tài khoản. Mở trang này để xem sự kiện, thời điểm và người thực hiện.', actions: [route('Mở nhật ký quản trị', 'admin-audit')] };
    if (/(nguoi dung|tai khoan|khoa|mo khoa)/.test(query)) return { text: 'Trang Người dùng cho phép quản trị viên xem danh sách tài khoản và xử lý trạng thái theo quyền được cấp. Chatbot chỉ hướng dẫn; thao tác quản trị vẫn cần bạn thực hiện trên trang.', actions: [route('Mở Người dùng', 'admin-users')] };
    if (/(admin|quan tri|tong quan)/.test(query)) return { text: 'Tổng quan Admin hiển thị số liệu tổng hợp của hệ thống. Trang này không hiển thị chi tiết tài chính cá nhân của từng người dùng.', actions: [route('Mở Tổng quan Admin', 'admin-overview'), route('Mở nhật ký quản trị', 'admin-audit')] };
  }
  if (!admin) {
    const personalAnalysis = analyzePersonalFinanceQuestion(text, state.snapshot);
    if (personalAnalysis) return { ...personalAnalysis, isFinanceAnalysis: true };
  }
  if (/(chi.*bao nhieu|thu.*bao nhieu|bao nhieu.*(chi|thu)|toi da chi|chi tieu cua toi|so du.*cua toi|giao dich cua toi|tong thu cua toi|tong chi cua toi)/.test(query)) return { text: 'Mình có thể phân tích các giao dịch đã đồng bộ của tài khoản đang đăng nhập. Câu hỏi này chưa khớp cách tổng hợp hiện có; mở Báo cáo để chọn khoảng ngày hoặc mở Giao dịch để lọc từng khoản.', actions: [route('Mở Báo cáo', 'reports'), route('Mở Giao dịch', 'transactions')] };
  if (/(ngan hang|sepay|bank hub|ket noi ngan hang)/.test(query)) return { text: 'Trong Cài đặt, mục liên kết ngân hàng hiện hỗ trợ luồng sandbox của SePay. Luồng này chỉ xác nhận bước liên kết; đồng bộ lịch sử giao dịch ngân hàng chưa được triển khai.', actions: [section('Mở Liên kết ngân hàng', 'settings', 'settings-bank')] };
  if (/(dieu khoan|quyen rieng tu|bao ve du lieu|du lieu ca nhan)/.test(query)) return { text: 'Bạn có thể xem Điều khoản sử dụng và Thông báo quyền riêng tư tại đây.', actions: [{ type: 'link', label: 'Điều khoản sử dụng', href: '/legal.html#terms' }, { type: 'link', label: 'Thông báo quyền riêng tư', href: '/legal.html#privacy' }] };
  if (/(avatar|anh dai dien|email|xac minh email|ho so|profile)/.test(query)) return { text: 'Trong Hồ sơ, bạn có thể sửa tên, ảnh đại diện và xác minh email mới bằng mã OTP 6 chữ số trước khi lưu.', actions: [section('Mở Hồ sơ', 'settings', 'settings-profile')] };
  if (/(mat khau|bao mat)/.test(query)) return { text: 'Mục Bảo mật & mật khẩu cho phép gửi email đặt lại mật khẩu. Mật khẩu mới chỉ được lưu sau khi bạn mở liên kết hợp lệ và xác nhận.', actions: [section('Mở Bảo mật', 'settings', 'settings-security')] };
  if (/(tuy chinh|ngon ngu|thang mac dinh|don vi tien)/.test(query)) return { text: 'Tùy chỉnh hiển thị lưu lựa chọn tháng dashboard mặc định và ngôn ngữ trên ứng dụng.', actions: [section('Mở Tùy chỉnh', 'settings', 'settings-preferences')] };
  if (/(dong bo|cache|tai khoan va du lieu|dang xuat|cai dat)/.test(query)) return { text: 'Mục Tài khoản & dữ liệu cho phép đồng bộ từ máy chủ, xem trạng thái cache và đăng xuất. Đăng xuất sẽ hỏi xác nhận trước khi kết thúc phiên.', actions: [section('Mở Tài khoản & dữ liệu', 'settings', 'settings-data')] };
  if (/(muc tieu|tiet kiem|nap tien vao muc tieu|rut tien muc tieu)/.test(query)) return { text: 'Để tạo mục tiêu, mở Mục tiêu → Tạo mục tiêu, nhập tên, số tiền cần đạt và ngày dự kiến. Mỗi mục tiêu có ví riêng; nạp hoặc rút tiền bằng nút trong thẻ mục tiêu. Đây là chuyển khoản nội bộ nên không được tính thành thu/chi trong báo cáo.', actions: [route('Xem mục tiêu', 'goals'), form('Tạo mục tiêu', 'new-goal')] };
  if (/(ngan sach|han muc|vuot muc)/.test(query)) return { text: 'Ngân sách đặt hạn mức theo danh mục cho một tháng. Số đã dùng được tính từ các khoản chi đúng danh mục trong kỳ; chuyển khoản nội bộ không được tính. Mở Ngân sách để xem tiến độ hoặc tạo hạn mức mới.', actions: [route('Xem ngân sách', 'budgets'), form('Tạo ngân sách', 'new-budget')] };
  if (/(dinh ky|lap lai|hang thang|giao dich lap)/.test(query)) return { text: 'Giao dịch định kỳ lưu mẫu thu/chi theo lịch và tài khoản đã chọn. Bạn có thể xem, tạo, tạm dừng hoặc kiểm tra khoản đến hạn tại trang Định kỳ; trợ lý không tự bật hoặc tắt quy tắc.', actions: [route('Mở Định kỳ', 'recurring'), form('Tạo quy tắc', 'new-recurring')] };
  if (/(danh muc|lich su theo danh muc|xem lich su)/.test(query)) return { text: 'Trong Danh mục, chọn Khoản chi hoặc Khoản thu rồi nhấn thẻ danh mục. Trang Giao dịch sẽ mở với toàn bộ lịch sử của danh mục đó. Danh mục đã dùng được lưu trữ để giữ chính xác báo cáo cũ.', actions: [route('Mở Danh mục', 'categories'), form('Thêm danh mục', 'new-category')] };
  if (/(tai khoan|vi tien|so du|am tien|so du am|bi am|bao am|chuyen tien)/.test(query)) return { text: 'Số dư tài khoản được tính từ số dư ban đầu, giao dịch thu/chi và chuyển tiền. Không thể lưu khoản chi nếu làm tài khoản đã chọn bị âm; hãy kiểm tra số dư của đúng tài khoản. Chuyển giữa các ví dùng chức năng Chuyển tiền và không được tính là thu/chi.', actions: [route('Mở Tài khoản', 'accounts'), form('Thêm tài khoản', 'new-account'), form('Chuyển tiền', 'new-transfer')] };
  if (/(bao cao|dong tien|tong thu|tong chi)/.test(query)) return { text: 'Báo cáo tổng hợp các giao dịch thu/chi trong khoảng ngày đã chọn. Chuyển khoản nội bộ bị loại trừ để không làm tăng giả tạo tổng thu hoặc tổng chi.', actions: [route('Mở Báo cáo', 'reports')] };
  if (/(giao dich|khoan chi|khoan thu|them chi|them thu|ghi chep|tien mat)/.test(query)) return { text: 'Để ghi giao dịch, chọn Khoản chi hoặc Khoản thu, nhập số tiền, ngày, tài khoản và danh mục rồi lưu. Bạn cũng có thể nhắn rõ một câu như “Hôm nay đi ăn hết 100k”; nếu đủ thông tin trợ lý sẽ ghi qua máy chủ, còn thiếu tài khoản hoặc danh mục thì sẽ hỏi trước.', actions: [route('Xem giao dịch', 'transactions'), form('Thêm giao dịch', 'new-transaction')] };
  if (/(tong quan|dashboard|hom nay|thang nay)/.test(query)) return { text: 'Tổng quan hiển thị số dư, thu/chi trong kỳ, giao dịch gần đây và tiến độ ngân sách. Chọn kỳ ở đầu trang để xem dữ liệu tháng khác.', actions: [route('Mở Tổng quan', 'dashboard')] };
  if (/(tro giup|huong dan|vi minh|dung the nao|lam sao)/.test(query)) return { text: 'Mình có thể hướng dẫn các phần chính của Ví Mình: giao dịch, tài khoản, ngân sách, định kỳ, mục tiêu tiết kiệm, báo cáo, danh mục và cài đặt. Chọn một chủ đề bên dưới để mở trang tương ứng.', actions: [route('Giao dịch', 'transactions'), route('Ngân sách', 'budgets'), route('Mục tiêu', 'goals'), route('Thông tin & trợ giúp', 'help')] };
  return { text: 'Mình chưa tìm thấy hướng dẫn phù hợp trong nội dung trợ giúp hiện có. Bạn thử hỏi về giao dịch, tài khoản, ngân sách, định kỳ, mục tiêu tiết kiệm, báo cáo, danh mục hoặc cài đặt nhé.', actions: [route('Thông tin & trợ giúp', 'help')] };
}

function accountMatches(text, accounts) {
  const query = normalizeText(text);
  const matches = accounts.filter((item) => {
    const name = normalizeText(item.name);
    return name.length > 1 && ` ${query} `.includes(` ${name} `);
  });
  if (matches.length > 1) {
    const longestLength = Math.max(...matches.map((item) => normalizeText(item.name).length));
    return matches.filter((item) => normalizeText(item.name).length === longestLength);
  }
  return matches;
}

function displayDate(iso) {
  const [year, month, day] = iso.split('-');
  return `${day}/${month}/${year}`;
}

async function saveTransaction(command, state, context) {
  const category = state.snapshot.categories.find((item) => item.id === command.categoryId);
  const account = state.snapshot.accounts.find((item) => item.id === command.accountId);
  if (!category || category.isArchived || !account || account.isArchived || account.kind === 'goal') {
    throw new Error('Tài khoản hoặc danh mục đã thay đổi. Hãy đồng bộ dữ liệu rồi gửi lại câu lệnh.');
  }
  const payload = { kind: command.kind, amount: command.amount, currency: command.currency || 'VND', date: command.date, accountId: account.id, categoryId: category.id, note: command.note };
  const result = await post('/api/transactions', payload);
  if (!result?.id) throw new Error('Máy chủ chưa xác nhận giao dịch đã được ghi.');
  const refreshed = await context.refresh();
  const saved = refreshed ? state.snapshot.transactions.find((item) => item.id === result.id) : null;
  const actionContext = {
    period: { month: command.date.slice(0, 7), from: command.date, to: command.date, mode: 'range' },
    kind: command.kind,
    categoryId: category.id,
    accountId: account.id
  };
  if (!saved) {
    addMessage('assistant', 'Máy chủ đã nhận giao dịch, nhưng chưa đọc lại được bản ghi để xác nhận chi tiết. Hãy đồng bộ dữ liệu trước khi gửi lại câu lệnh để tránh ghi trùng.', { variant: 'success', actions: [route('Mở giao dịch', 'transactions')], actionContext });
    return;
  }
  const kindLabel = saved.kind === 'income' ? 'khoản thu' : 'khoản chi';
  const timeNote = command.time ? ` Mốc ${command.time} được giữ trong ghi chú vì giao dịch hiện lưu ngày, chưa có trường giờ riêng.` : '';
  addMessage('assistant', `Đã ghi ${kindLabel} ${formatMoney(saved.amount)} vào ${saved.categoryName}, tài khoản ${saved.accountName}, ngày ${displayDate(saved.date)}.${timeNote}`, { variant: 'success', actions: [route('Mở giao dịch', 'transactions')], actionContext });
}

async function createCategory(text, state, context) {
  const parsed = parseCategoryCreation(text);
  if (!parsed) return false;
  if (state.view.startsWith('admin-')) {
    addMessage('assistant', 'Lệnh tạo danh mục chỉ hoạt động trong khu vực tài chính cá nhân. Hãy quay lại khu vực cá nhân trước.', { actions: [route('Về khu vực cá nhân', 'dashboard')] });
    return true;
  }
  if (parsed.vague) {
    addMessage('assistant', 'Bạn muốn đặt tên danh mục là gì? Ví dụ: “Tạo danh mục chi tiêu Thú cưng”.');
    return true;
  }
  if (!parsed.kind) {
    addMessage('assistant', `Danh mục “${parsed.name}” là khoản chi hay khoản thu? Hãy nói rõ loại để mình tạo đúng.`, { actions: [route('Mở Danh mục', 'categories')] });
    return true;
  }
  if (parsed.name.length > 60) {
    addMessage('assistant', 'Tên danh mục tối đa 60 ký tự. Hãy gửi tên ngắn hơn nhé.', { variant: 'error' });
    return true;
  }
  const existing = state.snapshot.categories.find((item) => item.kind === parsed.kind && normalizeText(item.name) === normalizeText(parsed.name));
  if (existing) {
    addMessage('assistant', `Danh mục ${existing.isArchived ? 'đã lưu trữ' : 'đã tồn tại'} với tên “${existing.name}”.`, { actions: [route('Mở Danh mục', 'categories')], actionContext: { kind: existing.kind, categoryId: existing.id } });
    return true;
  }
  const result = await post('/api/categories', { name: parsed.name, kind: parsed.kind, color: '#2563EB' });
  if (!result?.id) throw new Error('Máy chủ chưa xác nhận danh mục đã được tạo.');
  const refreshed = await context.refresh();
  const saved = refreshed ? state.snapshot.categories.find((item) => item.id === result.id) : null;
  addMessage('assistant', saved
    ? `Đã tạo danh mục ${saved.kind === 'income' ? 'thu' : 'chi'} “${saved.name}”.`
    : 'Máy chủ đã nhận danh mục, nhưng chưa đọc lại được để xác nhận chi tiết. Hãy đồng bộ dữ liệu trước khi gửi lại câu lệnh.',
  { variant: 'success', actions: [route('Mở Danh mục', 'categories')], actionContext: saved ? { kind: saved.kind, categoryId: saved.id } : null });
  return true;
}

async function continueTransaction(command, state, context) {
  if (!command.categoryId) {
    const choices = command.categoryChoices.slice(0, 8).map((item) => ({ type: 'category', id: item.id, label: item.name }));
    if (!choices.length) {
      addMessage('assistant', `Chưa có danh mục ${command.kind === 'income' ? 'thu' : 'chi'} đang hoạt động. Hãy tạo danh mục rồi gửi lại câu lệnh.`, { actions: [route('Mở Danh mục', 'categories'), form('Thêm danh mục', 'new-category')] });
    } else {
      pendingCommand = command;
      addMessage('assistant', 'Bạn muốn xếp khoản này vào danh mục nào?', { choices, actions: command.categoryChoices.length > 8 ? [route('Mở Danh mục', 'categories')] : [] });
    }
    return;
  }
  const accounts = state.snapshot.accounts.filter((item) => !item.isArchived && item.kind !== 'goal');
  if (!accounts.length) {
    addMessage('assistant', 'Chưa có tài khoản để ghi giao dịch. Hãy tạo tài khoản trước, rồi gửi lại câu lệnh.', { actions: [route('Mở Tài khoản', 'accounts'), form('Tạo tài khoản', 'new-account')] });
    return;
  }
  if (!command.accountId) {
    const matches = accountMatches(command.note, accounts);
    if (matches.length === 1) command.accountId = matches[0].id;
    else if (accounts.length === 1) command.accountId = accounts[0].id;
    else {
      pendingCommand = command;
      addMessage('assistant', 'Bạn muốn ghi giao dịch vào tài khoản nào?', { choices: accounts.slice(0, 8).map((item) => ({ type: 'account', id: item.id, label: item.name })), actions: accounts.length > 8 ? [route('Mở Tài khoản', 'accounts')] : [] });
      return;
    }
  }
  pendingCommand = null;
  await saveTransaction(command, state, context);
}

function parseCommand(text, state) {
  const normalized = normalizeText(text);
  const previousAssistant = messages.slice(0, -1).reverse().find((message) => message.role === 'assistant');
  const exportRequest = parseUserExportRequest(text, state, previousAssistant?.financeExportContext || null);
  if (exportRequest) return { type: 'export', exportRequest };
  if (isDuplicateReviewRequest(text)) return { type: 'help' };
  const categoryCreate = !isQuestionOrGuide(text) && !isNegativeAction(text) && /\b(?:tao|them)\b/.test(normalized) && /\bdanh muc\b/.test(normalized);
  if (categoryCreate) return { type: 'category' };
  const transaction = parseTransaction(text, state);
  if (transaction) return { type: 'transaction', transaction };
  return { type: 'help' };
}

function monthRange(year, month) {
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return { from: `${year}-${String(month).padStart(2, '0')}-01`, to: `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}` };
}

function exportRange(text, state, previousContext = null) {
  const normalized = normalizeText(text);
  const current = today();
  const [currentYear, currentMonth] = current.split('-').map(Number);
  if (/\bhom qua\b/.test(normalized)) {
    const date = addDays(current, -1);
    return { from: date, to: date };
  }
  if (/\b(hom nay|ngay nay)\b/.test(normalized)) return { from: current, to: current };
  if (/\b7 ngay (gan nhat|qua|nay)\b/.test(normalized)) return { from: addDays(current, -6), to: current };
  if (/\btuan nay\b/.test(normalized)) {
    const dayOfWeek = new Date(`${current}T00:00:00Z`).getUTCDay();
    return { from: addDays(current, -((dayOfWeek + 6) % 7)), to: current };
  }
  if (/\bthang nay\b/.test(normalized)) return { from: `${current.slice(0, 7)}-01`, to: current };
  if (/\bthang truoc\b/.test(normalized)) {
    const previous = new Date(Date.UTC(currentYear, currentMonth - 2, 1));
    return monthRange(previous.getUTCFullYear(), previous.getUTCMonth() + 1);
  }
  const month = normalized.match(/\bthang\s+(0?[1-9]|1[0-2])(?:\s+(\d{4}))?\b/);
  if (month) return monthRange(Number(month[2] || currentYear), Number(month[1]));
  const range = text.match(/\btừ\s+(\d{1,2}\s*[/.\-]\s*\d{1,2}(?:\s*[/.\-]\s*\d{2,4})?)\s+(?:đến|tới)\s+(\d{1,2}\s*[/.\-]\s*\d{1,2}(?:\s*[/.\-]\s*\d{2,4})?)/iu);
  if (range) {
    const from = parseDate(range[1]);
    const to = parseDate(range[2]);
    if (from && to && from <= to) return { from, to };
  }
  if (/^\d{4}-\d{2}-\d{2}$/.test(previousContext?.from || '') && /^\d{4}-\d{2}-\d{2}$/.test(previousContext?.to || '') && previousContext.from <= previousContext.to) {
    return { from: previousContext.from, to: previousContext.to };
  }
  const selected = state.reportRange || {};
  if (/^\d{4}-\d{2}-\d{2}$/.test(selected.from || '') && /^\d{4}-\d{2}-\d{2}$/.test(selected.to || '') && selected.from <= selected.to) {
    return { from: selected.from, to: selected.to };
  }
  return { from: `${current.slice(0, 7)}-01`, to: current };
}

function exportDatasetForQuestion(text, context) {
  const query = normalizeText(text);
  if (/\b(dinh ky|lap lai|recurring)\b/.test(query)) return 'recurring';
  if (/\b(danh muc|hang muc|category)\b/.test(query) && !/\b(giao dich|lich su|chi tiet)\b/.test(query)) return 'categories';
  if (/\b(giao dich|transactions)\b/.test(query) || context.categoryId) return 'transactions';
  return 'report';
}

function parseUserExportRequest(text, state, previousContext = null) {
  const query = normalizeText(text);
  if (!/\b(xuat|export|excel|xlsx|pdf|tai tep|tai file)\b/.test(query)) return null;
  const requestedDataset = /\b(dinh ky|lap lai|recurring)\b/.test(query)
    ? 'recurring'
    : /\b(danh muc|hang muc|category)\b/.test(query) && !/(giao dich|lich su|chi tiet)/.test(query)
      ? 'categories'
      : /\b(bao cao|dong tien|report)\b/.test(query)
        ? 'report'
        : /\b(giao dich|thu|chi|transactions)\b/.test(query)
          ? 'transactions'
          : null;
  const dataset = requestedDataset || previousContext?.dataset || 'report';
  const requestedAllTransactions = dataset === 'transactions' && isWholeTransactionRequest(query);
  const all = dataset === 'transactions' && (requestedAllTransactions || (!requestedDataset && previousContext?.all === true && !hasExplicitExportPeriod(query)));
  const requestedKind = /\bthu\b/.test(query) && !/\bchi\b/.test(query)
    ? 'income'
    : /\bchi\b/.test(query) && !/\bthu\b/.test(query)
      ? 'expense'
      : null;
  const kind = requestedKind || (!requestedDataset && ['income', 'expense'].includes(previousContext?.kind) ? previousContext.kind : 'all');
  const activeCategories = state.snapshot.categories.filter((item) => !item.isArchived && (kind === 'all' || item.kind === kind));
  const categoryMatches = activeCategories.filter((item) => {
    const name = normalizeText(item.name);
    return name.length > 1 && ` ${query} `.includes(` ${name} `);
  });
  let categoryId = null;
  if (categoryMatches.length) {
    const longestLength = Math.max(...categoryMatches.map((item) => normalizeText(item.name).length));
    const longest = categoryMatches.filter((item) => normalizeText(item.name).length === longestLength);
    if (longest.length === 1) {
      categoryId = longest[0].id;
    }
  }
  if (!categoryId && !categoryMatches.length && !requestedDataset) categoryId = previousContext?.categoryId || null;
  const formats = [];
  if (/\b(excel|xlsx)\b/.test(query)) formats.push('xlsx');
  if (/\bpdf\b/.test(query)) formats.push('pdf');
  if (!formats.length) formats.push('xlsx', 'pdf');
  if (dataset === 'categories' && categoryId) return { dataset: 'transactions', kind, categoryId, all: false, formats, ...exportRange(text, state, previousContext) };
  return { dataset, kind, categoryId, ...(all ? { all: true } : exportRange(text, state, previousContext)), formats };
}

async function runPrompt(value, state, context) {
  const text = String(value || '').trim().slice(0, 1000);
  if (!text || busy) return;
  draft = '';
  pendingCommand = null;
  addMessage('user', text);
  busy = true;
  context.render();
  scrollThread();
  try {
    const command = parseCommand(text, state);
    if (command.type === 'export') {
      if (state.view.startsWith('admin-')) {
        addMessage('assistant', 'Hãy dùng Agent Admin để xuất dữ liệu quản trị.');
      } else {
        const request = command.exportRequest;
        const category = request.categoryId ? state.snapshot.categories.find((item) => item.id === request.categoryId) : null;
        const exportActions = request.formats.map((format) => ({
          type: 'export', dataset: request.dataset, format,
          label: format === 'xlsx' ? 'Tải Excel' : 'Tải PDF'
        }));
        const scope = category ? ` theo danh mục ${category.name}` : '';
        const detail = request.dataset === 'recurring'
          ? 'các giao dịch định kỳ'
          : request.dataset === 'categories'
            ? 'thống kê danh mục thu chi'
            : request.dataset === 'report'
              ? 'báo cáo dòng tiền'
              : 'giao dịch thu chi';
        const period = request.dataset === 'recurring'
          ? 'gồm tất cả quy tắc định kỳ đã lưu'
          : request.all
            ? 'gồm toàn bộ giao dịch đã lưu'
            : `từ ${displayDate(request.from)} đến ${displayDate(request.to)}`;
        addMessage('assistant', `Mình đã chuẩn bị ${detail}${scope} ${period}. Tệp chỉ chứa dữ liệu thuộc tài khoản đang đăng nhập.`, {
          actions: exportActions,
          actionContext: { dataset: request.dataset, from: request.from || '', to: request.to || '', kind: request.kind, all: request.all === true, ...(request.categoryId ? { categoryId: request.categoryId } : {}) },
          financeExportContext: { dataset: request.dataset, from: request.from || '', to: request.to || '', kind: request.kind, categoryId: request.categoryId || '', all: request.all === true }
        });
      }
    } else if (command.type === 'category') {
      const created = await createCategory(text, state, context);
      if (!created) {
        const answer = helpAnswer(text, state);
        addMessage('assistant', answer.text, { actions: answer.actions || [], actionContext: getFinanceQuestionContext(text, state.snapshot, { includeDefaultPeriod: true }) });
      }
    } else if (command.type === 'transaction') {
      if (state.view.startsWith('admin-')) addMessage('assistant', 'Mình không ghi giao dịch khi bạn đang ở khu vực Admin. Hãy chuyển về khu vực cá nhân rồi gửi lại câu lệnh.', { actions: [route('Về khu vực cá nhân', 'dashboard')] });
      else if (command.transaction.error) addMessage('assistant', command.transaction.error);
      else await continueTransaction(command.transaction, state, context);
    } else {
      const answer = helpAnswer(text, state);
      const actionContext = getFinanceQuestionContext(text, state.snapshot, { includeDefaultPeriod: true });
      const financeExportContext = answer.isFinanceAnalysis ? {
        dataset: exportDatasetForQuestion(text, actionContext),
        from: isWholeTransactionRequest(text) ? '' : actionContext.period?.from || '',
        to: isWholeTransactionRequest(text) ? '' : actionContext.period?.to || '',
        kind: actionContext.kind || 'all',
        categoryId: actionContext.categoryId || '',
        all: exportDatasetForQuestion(text, actionContext) === 'transactions' && isWholeTransactionRequest(text)
      } : null;
      addMessage('assistant', answer.text, { actions: answer.actions || [], actionContext, financeExportContext });
    }
  } catch (error) {
    addMessage('assistant', error.message || 'Chưa hoàn tất được thao tác. Kiểm tra kết nối rồi thử lại.', { variant: 'error' });
  } finally {
    busy = false;
    context.render();
    scrollThread();
    document.querySelector('#ai-agent-input')?.focus({ preventScroll: true });
  }
}

function scrollThread() {
  const thread = document.querySelector('#ai-agent-messages');
  if (thread) thread.scrollTop = thread.scrollHeight;
}

export async function handleAgentSubmit(form, context) {
  const text = new FormData(form).get('message');
  await runPrompt(text, context.state, context);
}

export async function handleAgentAction(action, button, context) {
  const { state } = context;
  if (action === 'ai-agent-export') {
    const dataset = button.dataset.dataset;
    const format = button.dataset.format;
    if (!['report', 'transactions', 'recurring', 'categories'].includes(dataset) || !['xlsx', 'pdf'].includes(format)) return;
    const params = { dataset, format };
    const values = { from: button.dataset.from, to: button.dataset.to, kind: button.dataset.kind, categoryId: button.dataset.categoryId };
    if (dataset === 'transactions' && button.dataset.all === 'true') params.all = 'true';
    for (const [key, value] of Object.entries(values)) {
      if (typeof value === 'string' && value) params[key] = value;
    }
    button.disabled = true;
    try {
      const filename = await downloadExport('/api/exports/user', params, `vi-minh-${dataset}.${format}`);
      context.toast?.(`Đã tải ${filename}.`, 'success');
    } catch (error) {
      context.toast?.(error.message || 'Chưa xuất được tệp. Hãy thử lại.', 'error');
    } finally {
      button.disabled = false;
    }
    return;
  }
  if (action === 'ai-agent-open' || action === 'ai-agent-close') {
    opened = action === 'ai-agent-open';
    context.render();
    if (opened) {
      document.querySelector('#ai-agent-input')?.focus({ preventScroll: true });
      scrollThread();
    } else document.querySelector('[data-action="ai-agent-open"]')?.focus({ preventScroll: true });
    return;
  }
  if (action === 'ai-agent-clear') {
    messages = [];
    pendingCommand = null;
    draft = '';
    context.render();
    document.querySelector('#ai-agent-input')?.focus({ preventScroll: true });
    return;
  }
  if (action === 'ai-agent-settings-section') {
    const sectionId = button.dataset.section;
    if (!SETTINGS_SECTIONS.has(sectionId)) return;
    if (state.view.startsWith('admin-')) history.pushState({}, document.title, '/');
    state.view = 'settings';
    history.pushState({}, document.title, `/#${sectionId}`);
    context.render();
    requestAnimationFrame(() => document.getElementById(sectionId)?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
    return;
  }
  if (action === 'ai-agent-suggestion') {
    await runPrompt(button.dataset.prompt, state, context);
    return;
  }
  if (action === 'ai-agent-open-category') {
    const category = state.snapshot.categories.find((item) => item.id === button.dataset.id);
    if (!category) return;
    state.filters = { month: '', kind: 'all', accountId: 'all', categoryId: category.id, from: '', to: '', minAmount: '', maxAmount: '', sort: 'newest' };
    state.search = '';
    state.categoryKind = category.kind;
    state.view = 'transactions';
    if (location.pathname.startsWith('/admin')) history.pushState({}, document.title, '/');
    context.render();
    return;
  }
  if (action === 'ai-agent-account-choice' || action === 'ai-agent-category-choice') {
    if (!pendingCommand || busy) return;
    if (action === 'ai-agent-account-choice') {
      const account = state.snapshot.accounts.find((item) => item.id === button.dataset.id && !item.isArchived && item.kind !== 'goal');
      if (!account) return;
      pendingCommand.accountId = account.id;
    } else {
      const category = state.snapshot.categories.find((item) => item.id === button.dataset.id && !item.isArchived && item.kind === pendingCommand.kind);
      if (!category) return;
      pendingCommand.categoryId = category.id;
    }
    busy = true;
    context.render();
    try { await continueTransaction(pendingCommand, state, context); }
    catch (error) { addMessage('assistant', error.message || 'Chưa ghi được giao dịch.', { variant: 'error' }); }
    finally {
      busy = false;
      context.render();
      scrollThread();
    }
  }
}
