const { app, BrowserWindow, Menu, Tray, ipcMain, nativeImage, dialog, shell } = require('electron');
const { spawn } = require('node:child_process');
const path = require('node:path');
const dotenv = require('dotenv');

const projectRoot = path.resolve(__dirname, '..');
dotenv.config({ path: path.join(projectRoot, '.env') });

const port = Number(process.env.PORT || 3000);
const configuredBaseUrl = process.env.APP_BASE_URL || `http://localhost:${port}`;
const baseUrl = new URL(configuredBaseUrl);
const localHosts = new Set(['localhost', '127.0.0.1', '::1']);

if (baseUrl.protocol !== 'http:' || !localHosts.has(baseUrl.hostname)) {
  throw new Error('Mini app chỉ hỗ trợ website Ví Mình chạy cục bộ qua HTTP localhost.');
}

const appOrigin = baseUrl.origin;
const startupPath = process.execPath;
const startupArgs = app.isPackaged ? [] : [projectRoot];
const miniAppProtocol = 'viminh';
let tray = null;
let miniWindow = null;
let serverProcess = null;
let isQuitting = false;
const hasSingleInstanceLock = app.requestSingleInstanceLock();

if (hasSingleInstanceLock) {
  const protocolRegistered = app.isPackaged
    ? app.setAsDefaultProtocolClient(miniAppProtocol)
    : app.setAsDefaultProtocolClient(miniAppProtocol, process.execPath, [projectRoot]);
  if (!protocolRegistered) console.warn('[desktop] Không đăng ký được liên kết viminh:// trên hệ điều hành.');
}

if (!hasSingleInstanceLock) app.quit();
else app.on('second-instance', () => {
  if (app.isReady()) showMini();
  else app.whenReady().then(() => showMini());
});

function isMiniAppLink(value) {
  try {
    const url = new URL(value);
    return url.protocol === `${miniAppProtocol}:` && url.hostname === 'open'
      && (url.pathname === '' || url.pathname === '/') && !url.search && !url.hash;
  } catch {
    return false;
  }
}

app.on('open-url', (event, value) => {
  event.preventDefault();
  if (!isMiniAppLink(value)) return;
  if (app.isReady()) showMini();
  else app.whenReady().then(() => showMini());
});

function healthRequest() {
  return new Promise((resolve) => {
    const request = require('node:http').get(new URL('/healthz', appOrigin), { timeout: 1500 }, (response) => {
      response.resume();
      resolve({ responding: true, healthy: response.statusCode === 200 });
    });
    request.on('timeout', () => request.destroy());
    request.on('error', () => resolve({ responding: false, healthy: false }));
  });
}

async function ensureServer() {
  const initial = await healthRequest();
  if (initial.healthy) return;
  if (initial.responding) throw new Error('Máy chủ Ví Mình đang chạy nhưng PostgreSQL chưa sẵn sàng.');

  const nodeCommand = process.env.NODE_BINARY || 'node';
  serverProcess = spawn(nodeCommand, [path.join(projectRoot, 'server', 'local.js')], {
    cwd: projectRoot,
    env: process.env,
    windowsHide: true,
    stdio: 'ignore'
  });
  serverProcess.once('error', () => {});

  const deadline = Date.now() + 30000;
  while (Date.now() < deadline) {
    if (serverProcess.exitCode !== null) break;
    const result = await healthRequest();
    if (result.healthy) return;
    if (result.responding) throw new Error('Máy chủ đã mở nhưng PostgreSQL chưa sẵn sàng.');
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  stopOwnedServer();
  throw new Error('Không khởi động được website Ví Mình. Kiểm tra Node.js, PostgreSQL và file .env.');
}

function stopOwnedServer() {
  if (!serverProcess || serverProcess.exitCode !== null || serverProcess.signalCode !== null) return;
  serverProcess.kill('SIGTERM');
  serverProcess = null;
}

function urlFor(pathname) {
  return new URL(pathname, appOrigin).toString();
}

function lockNavigation(window) {
  window.webContents.on('will-navigate', (event, target) => {
    if (new URL(target).origin !== appOrigin) event.preventDefault();
  });
  window.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
}

function showMini(kind = null) {
  const query = kind === 'income' || kind === 'expense' ? `?kind=${kind}` : '';
  if (miniWindow && !miniWindow.isDestroyed()) {
    miniWindow.show();
    miniWindow.focus();
    miniWindow.webContents.send('mini:quick-kind', kind);
    return;
  }
  miniWindow = new BrowserWindow({
    width: 424,
    height: 900,
    minWidth: 380,
    minHeight: 680,
    maxWidth: 500,
    show: false,
    resizable: true,
    title: 'Trợ lý Ví Mình',
    icon: path.join(projectRoot, 'desktop', 'vi-minh-tray.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  });
  lockNavigation(miniWindow);
  miniWindow.webContents.on('page-title-updated', (event) => {
    event.preventDefault();
    miniWindow?.setTitle('Trợ lý Ví Mình');
  });
  miniWindow.webContents.on('did-fail-load', (_event, errorCode, description) => {
    console.error('[desktop] Không tải được giao diện mini app:', errorCode, description);
  });
  miniWindow.on('focus', () => miniWindow?.webContents.send('mini:refresh'));
  miniWindow.once('ready-to-show', () => {
    miniWindow?.show();
    if (kind) miniWindow?.webContents.send('mini:quick-kind', kind);
  });
  miniWindow.on('close', (event) => {
    if (!isQuitting) {
      event.preventDefault();
      miniWindow.hide();
    }
  });
  miniWindow.loadURL(urlFor(`/desktop/mini.html${query}`));
}

function startupEnabled() {
  return app.getLoginItemSettings({ path: startupPath, args: startupArgs }).openAtLogin;
}

function buildTrayMenu() {
  return Menu.buildFromTemplate([
    { label: 'Mở Trợ lý Ví Mình', click: () => showMini() },
    { label: 'Mở website trên trình duyệt', click: () => shell.openExternal(urlFor('/')) },
    { label: 'Ghi nhanh khoản thu', click: () => showMini('income') },
    { label: 'Ghi nhanh khoản chi', click: () => showMini('expense') },
    { type: 'separator' },
    {
      label: 'Mở cùng Windows',
      type: 'checkbox',
      checked: startupEnabled(),
      click: (item) => app.setLoginItemSettings({ openAtLogin: item.checked, path: startupPath, args: startupArgs })
    },
    { type: 'separator' },
    { label: 'Thoát Ví Mình', click: () => { isQuitting = true; app.quit(); } }
  ]);
}

ipcMain.handle('desktop:open-website', async (event) => {
  const senderUrl = new URL(event.senderFrame.url);
  if (senderUrl.origin !== appOrigin || senderUrl.pathname !== '/desktop/mini.html') throw new Error('Nguồn gọi không hợp lệ.');
  await shell.openExternal(urlFor('/'));
});

app.on('before-quit', () => { isQuitting = true; });
app.on('activate', () => showMini());

app.whenReady().then(async () => {
  if (!hasSingleInstanceLock) return;
  try {
    await ensureServer();
    const icon = nativeImage.createFromPath(path.join(projectRoot, 'desktop', 'vi-minh-tray.png'));
    tray = new Tray(icon);
    tray.setToolTip('Ví Mình — Quản lý chi tiêu cá nhân');
    tray.setContextMenu(buildTrayMenu());
    tray.on('click', () => showMini());
    showMini();
  } catch (error) {
    await dialog.showMessageBox({
      type: 'error',
      title: 'Không mở được Ví Mình',
      message: error.message,
      detail: 'Đảm bảo PostgreSQL đang chạy và file .env đã được cấu hình.'
    });
    stopOwnedServer();
    app.quit();
  }
});

app.on('will-quit', () => stopOwnedServer());
