let workerPromise = null;

export function validateReceiptImage(file) {
  const acceptedTypes = new Set(['image/jpeg', 'image/png', 'image/webp']);
  if (!file || !acceptedTypes.has(file.type)) throw new Error('Chọn ảnh hóa đơn JPG, PNG hoặc WebP.');
  if (file.size > 8 * 1024 * 1024) throw new Error('Ảnh hóa đơn tối đa 8 MB.');
  return true;
}

async function prepareReceiptImage(file) {
  const bitmap = await createImageBitmap(file);
  try {
    const maxSide = 2_600;
    const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    const context = canvas.getContext('2d', { alpha: false });
    if (!context) throw new Error('Không khởi tạo được vùng xử lý ảnh.');
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    return await new Promise((resolve, reject) => canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error('Không chuyển đổi được ảnh.')), 'image/png'));
  } finally {
    bitmap.close();
  }
}

async function getWorker(onProgress) {
  if (!workerPromise) {
    workerPromise = import('/vendor/tesseract/tesseract.esm.min.js')
      .then((module) => {
        const createWorker = module.createWorker || module.default?.createWorker;
        if (typeof createWorker !== 'function') throw new Error('Không nạp được API OCR cục bộ.');
        return createWorker('vie', 1, {
          workerPath: '/vendor/tesseract/worker.min.js',
          corePath: '/vendor/tesseract/core',
          langPath: '/vendor/tesseract/lang',
          workerBlobURL: false,
          gzip: true,
          logger: ({ status, progress }) => onProgress?.({ status, progress: Math.max(0, Math.min(1, Number(progress) || 0)) })
        });
      })
      .catch((error) => {
        workerPromise = null;
        throw error;
      });
  }
  return workerPromise;
}

export async function recognizeReceipt(file, onProgress, categories = []) {
  validateReceiptImage(file);
  const preparedImage = await prepareReceiptImage(file);
  const worker = await getWorker(onProgress);
  const result = await worker.recognize(preparedImage, { rotateAuto: true });
  const recognizedText = result.data.text || '';
  return {
    ...parseReceiptText(recognizedText),
    categorySuggestion: predictReceiptCategory(recognizedText, categories)
  };
}

export async function releaseReceiptWorker() {
  if (!workerPromise) return;
  const pending = workerPromise;
  workerPromise = null;
  try { await (await pending).terminate(); } catch {}
}

const normalizeText = (value) => String(value || '').toLocaleLowerCase('vi').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd');

const categoryProfiles = [
  { names: ['an uong', 'do an', 'food', 'am thuc'], cues: [['nha hang', 4], ['quan an', 4], ['com ga', 3], ['com', 3], ['pho', 3], ['bun', 3], ['mi quang', 3], ['tra sua', 3], ['ca phe', 3], ['cafe', 3], ['coffee', 3], ['do an', 3], ['mon an', 3], ['banh mi', 3], ['thuc an', 2], ['rau', 1], ['thit', 1], ['gao', 1]] },
  { names: ['di chuyen', 'di lai', 'transport', 'transportation'], cues: [['taxi', 3], ['grab', 3], ['gojek', 3], ['uber', 3], ['xang', 3], ['ve xe', 3], ['xe buyt', 3], ['metro', 3], ['gui xe', 3], ['do xe', 3], ['ve tau', 3], ['ve may bay', 3]] },
  { names: ['hoa don', 'dien nuoc', 'utilities', 'dich vu'], cues: [['tien dien', 4], ['hoa don dien', 4], ['tien nuoc', 4], ['hoa don nuoc', 4], ['cuoc internet', 4], ['cuoc dien thoai', 4], ['internet', 3], ['wifi', 3], ['evn', 3], ['cap nuoc', 3]] },
  { names: ['mua sam', 'shopping'], cues: [['sieu thi', 3], ['winmart', 3], ['coopmart', 3], ['big c', 3], ['lotte mart', 3], ['dien may', 3], ['quan ao', 3], ['giay dep', 3], ['my pham', 3], ['do gia dung', 3], ['shopee', 3], ['lazada', 3]] },
  { names: ['suc khoe', 'y te', 'health'], cues: [['nha thuoc', 4], ['thuoc', 3], ['benh vien', 4], ['phong kham', 4], ['xet nghiem', 4], ['nha khoa', 4], ['vien phi', 4], ['y te', 3]] },
  { names: ['giao duc', 'education'], cues: [['hoc phi', 4], ['truong hoc', 4], ['khoa hoc', 3], ['lop hoc', 3], ['sach giao khoa', 4], ['tien hoc', 4], ['tuition', 4]] },
  { names: ['giai tri', 'entertainment'], cues: [['rap phim', 4], ['ve xem phim', 4], ['karaoke', 3], ['netflix', 3], ['spotify', 3], ['game', 3], ['ve cong vien', 3]] },
  { names: ['nha o', 'housing'], cues: [['tien thue nha', 4], ['thue phong', 4], ['thue nha', 4], ['tien phong', 4], ['noi that', 3], ['sua nha', 3]] },
  { names: ['thu cung', 'thu nuoi', 'pets'], cues: [['thuc an cho meo', 4], ['thuc an cho cho', 4], ['thuc an thu cung', 4], ['pet shop', 4], ['thu y', 3], ['cho meo', 3], ['cho cho', 3]] }
];

function hasPhrase(text, phrase) {
  const normalized = normalizeText(text).replace(/[^a-z0-9]+/g, ' ').trim();
  const needle = normalizeText(phrase).replace(/[^a-z0-9]+/g, ' ').trim();
  return Boolean(needle) && ` ${normalized} `.includes(` ${needle} `);
}

function predictReceiptCategory(text, categories) {
  const usableLines = String(text || '').split(/\r?\n/).map((line) => line.trim()).filter((line) => line
    && !/^(?:hoa don ban hang|hoa don gia tri gia tang|mau du lieu|ngay giao dich|ma hoa don|tam tinh|tong cong|thanh toan|cam on|khong co gia tri)/.test(normalizeText(line)));
  if (!usableLines.length) return null;

  const candidates = categoryProfiles.flatMap((profile) => {
    const category = (categories || []).find((item) => item.kind === 'expense' && !item.isArchived
      && profile.names.includes(normalizeText(item.name).trim()));
    if (!category) return [];
    const matchedCues = profile.cues.filter(([cue]) => usableLines.some((line) => hasPhrase(line, cue)));
    const score = matchedCues.reduce((sum, [, weight]) => sum + weight, 0);
    return score >= 3 ? [{ category, score, matchedTerms: matchedCues.map(([cue]) => cue) }] : [];
  }).sort((a, b) => b.score - a.score);

  const best = candidates[0];
  const runnerUp = candidates[1];
  if (!best || runnerUp && best.score - runnerUp.score < 2) return null;
  return { categoryId: best.category.id, categoryName: best.category.name, matchedTerms: best.matchedTerms };
}

function validIsoDate(year, month, day) {
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day
    ? `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    : '';
}

function parseDate(text) {
  const iso = /\b(20\d{2})[-/.](\d{1,2})[-/.](\d{1,2})\b/.exec(text);
  if (iso) return validIsoDate(Number(iso[1]), Number(iso[2]), Number(iso[3]));
  const local = /\b(\d{1,2})[-/.](\d{1,2})[-/.](20\d{2})\b/.exec(text);
  return local ? validIsoDate(Number(local[3]), Number(local[2]), Number(local[1])) : '';
}

function moneyCandidates(line) {
  const withoutTime = line.replace(/\b\d{1,2}:\d{2}\b/g, ' ');
  const withoutDates = withoutTime
    .replace(/\b20\d{2}[-/.]\d{1,2}[-/.]\d{1,2}\b/g, ' ')
    .replace(/\b\d{1,2}[-/]\d{1,2}(?:[-/]\d{2,4})?\b/g, ' ')
    .replace(/\b\d{1,2}\.\d{1,2}\.\d{2,4}\b/g, ' ');
  const matches = withoutDates.match(/\d{1,3}(?:[.,\s]\d{3})+|\d{4,}|\d{1,3}/g) || [];
  return matches.map((match) => Number(match.replace(/\D/g, '')))
    .filter((amount) => Number.isSafeInteger(amount) && amount > 0 && amount <= 1_000_000_000);
}

/** Extract likely values only; every value remains editable and requires user confirmation. */
export function parseReceiptText(text) {
  const lines = String(text || '').split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  const priorityTerms = ['phai tra', 'thanh toan', 'tong cong', 'tong thanh toan', 'grand total', 'amount due', 'total'];
  const secondaryTerms = ['thanh tien', 'cong tien hang', 'tong tien'];
  const ranked = lines.flatMap((line, index) => {
    const normalized = normalizeText(line);
    const priority = priorityTerms.findIndex((term) => normalized.includes(term));
    const secondary = secondaryTerms.findIndex((term) => normalized.includes(term));
    const score = priority >= 0 ? 100 - priority : secondary >= 0 ? 50 - secondary : /(?:₫|\bvnd\b|\bd\b)/i.test(line) ? 10 : 0;
    return moneyCandidates(line).map((amount) => ({ amount, score, index }));
  }).filter((item) => item.score > 0);
  ranked.sort((a, b) => b.score - a.score || b.index - a.index || b.amount - a.amount);
  const date = parseDate(lines.join(' '));
  return {
    amount: ranked[0]?.amount || null,
    date: date || null,
    matchedFields: [ranked[0]?.amount ? 'amount' : '', date ? 'date' : ''].filter(Boolean)
  };
}
