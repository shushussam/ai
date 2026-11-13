// 스도쿠 퍼즐 교실 — 윈도우용 데스크톱 앱 (Electron)
const { app, BrowserWindow, Menu, shell, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');

app.setAppUserModelId('kr.sudoku.classroom');

if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  let win = null;

  const ZOOM_MIN = 0.6, ZOOM_MAX = 2.0;
  function changeZoom(wc, delta) {
    const z = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, Math.round((wc.getZoomFactor() + delta) * 10) / 10));
    wc.setZoomFactor(z);
  }

  function createWindow() {
    win = new BrowserWindow({
      width: 1280,
      height: 900,
      minWidth: 380,
      minHeight: 560,
      title: '스도쿠 퍼즐 교실',
      icon: path.join(__dirname, 'app', 'icon.png'),
      backgroundColor: '#eef2f7',
      show: false,
      autoHideMenuBar: true,
      webPreferences: {
        preload: path.join(__dirname, 'preload.js'),
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: true,
        spellcheck: false
      }
    });
    Menu.setApplicationMenu(null);
    win.once('ready-to-show', () => {
      if (!process.env.SUDOKU_TEST_DIR) win.maximize();
      win.show();
    });
    win.loadFile(path.join(__dirname, 'app', 'index.html'));

    const wc = win.webContents;
    // 바깥 주소는 기본 브라우저로 연다
    wc.setWindowOpenHandler(({ url }) => {
      if (/^https?:\/\//i.test(url)) shell.openExternal(url);
      return { action: 'deny' };
    });
    wc.on('will-navigate', (e, url) => {
      if (!url.startsWith('file://')) {
        e.preventDefault();
        if (/^https?:\/\//i.test(url)) shell.openExternal(url);
      }
    });
    // F11 전체 화면, Ctrl +/-/0 화면 확대·축소 (전자칠판·TV용)
    wc.on('before-input-event', (e, input) => {
      if (input.type !== 'keyDown') return;
      if (input.key === 'F11') { win.setFullScreen(!win.isFullScreen()); e.preventDefault(); return; }
      if (!input.control || input.alt) return;
      if (input.key === '=' || input.key === '+') { changeZoom(wc, 0.1); e.preventDefault(); }
      else if (input.key === '-') { changeZoom(wc, -0.1); e.preventDefault(); }
      else if (input.key === '0') { wc.setZoomFactor(1); e.preventDefault(); }
    });
    // 입력 칸에서 오른쪽 클릭: 잘라내기·복사·붙여넣기
    wc.on('context-menu', (e, params) => {
      if (!params.isEditable) return;
      Menu.buildFromTemplate([
        { role: 'cut', label: '잘라내기' },
        { role: 'copy', label: '복사' },
        { role: 'paste', label: '붙여넣기' },
        { type: 'separator' },
        { role: 'selectAll', label: '모두 선택' }
      ]).popup({ window: win });
    });
  }

  // 문제지·정답지를 PDF로 저장하고 연다
  const safeName = (name) => String(name || '스도쿠.pdf').replace(/[<>:"/\\|?*\u0000-\u001f]/g, '_');
  ipcMain.handle('save-pdf', async (event, { filename }) => {
    const sender = event.sender;
    const owner = BrowserWindow.fromWebContents(sender);
    let target;
    if (process.env.SUDOKU_TEST_DIR) {
      target = path.join(process.env.SUDOKU_TEST_DIR, safeName(filename));
    } else {
      const r = await dialog.showSaveDialog(owner, {
        title: '문제지 PDF 저장',
        defaultPath: path.join(app.getPath('documents'), safeName(filename)),
        filters: [{ name: 'PDF 문서', extensions: ['pdf'] }]
      });
      if (r.canceled || !r.filePath) return { ok: false, canceled: true };
      target = r.filePath;
    }
    try {
      const data = await sender.printToPDF({ printBackground: true, preferCSSPageSize: true });
      await fs.promises.writeFile(target, data);
      if (!process.env.SUDOKU_TEST_DIR) shell.openPath(target);
      return { ok: true, path: target };
    } catch (err) {
      return { ok: false, error: String(err && err.message || err) };
    }
  });

  app.on('second-instance', () => {
    if (!win) return;
    if (win.isMinimized()) win.restore();
    win.focus();
  });
  app.whenReady().then(createWindow);
  app.on('window-all-closed', () => app.quit());
}
