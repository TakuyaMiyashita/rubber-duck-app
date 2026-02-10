const { app, BrowserWindow, ipcMain, systemPreferences, session } = require('electron');
const path = require('path');
const fs = require('fs');
const whisper = require('./whisper');

const isDev = process.argv.includes('--dev');
const isMac = process.platform === 'darwin';

let mainWindow;

function getDataPath() {
  return path.join(app.getPath('userData'), 'sessions');
}

function ensureDataDir() {
  const dir = getDataPath();
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 480,
    height: 680,
    minWidth: 380,
    minHeight: 500,
    frame: false,
    titleBarStyle: isMac ? 'hiddenInset' : 'hidden',
    trafficLightPosition: isMac ? { x: 16, y: 16 } : undefined,
    backgroundColor: '#0d1117',
    webPreferences: {
      preload: path.join(__dirname, '..', 'preload', 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
    },
    show: false,
  });

  mainWindow.loadFile(path.join(__dirname, '..', 'renderer', 'index.html'));

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  if (isDev) {
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  }
}

// IPC: セッション保存
ipcMain.handle('save-session', async (_event, session) => {
  ensureDataDir();
  const filePath = path.join(getDataPath(), `${session.id}.json`);
  fs.writeFileSync(filePath, JSON.stringify(session, null, 2), 'utf-8');
  return true;
});

// IPC: セッション一覧取得
ipcMain.handle('get-sessions', async () => {
  ensureDataDir();
  const dir = getDataPath();
  const files = fs.readdirSync(dir).filter(f => f.endsWith('.json'));
  const sessions = files.map(f => {
    const data = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf-8'));
    return {
      id: data.id,
      createdAt: data.createdAt,
      messageCount: data.messages ? data.messages.length : 0,
    };
  });
  sessions.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  return sessions;
});

// IPC: セッション読み込み
ipcMain.handle('load-session', async (_event, sessionId) => {
  const filePath = path.join(getDataPath(), `${sessionId}.json`);
  if (!fs.existsSync(filePath)) return null;
  return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
});

// IPC: 音声認識（Whisper）
ipcMain.handle('transcribe', async (_event, audioData, sampleRate) => {
  return whisper.transcribe(audioData, sampleRate);
});

// IPC: Whisper の準備状態チェック
ipcMain.handle('whisper-ready', async () => {
  return whisper.isReady();
});

// IPC: マイク権限の確認・要求
ipcMain.handle('check-mic-permission', async () => {
  if (isMac) {
    const status = systemPreferences.getMediaAccessStatus('microphone');
    if (status === 'granted') return 'granted';
    if (status === 'denied') return 'denied';
    // 'not-determined' or 'restricted'
    const granted = await systemPreferences.askForMediaAccess('microphone');
    return granted ? 'granted' : 'denied';
  }
  // Windows: 権限はOS側のダイアログで自動処理される
  return 'granted';
});

// IPC: ウィンドウ操作
ipcMain.on('window-minimize', () => mainWindow?.minimize());
ipcMain.on('window-maximize', () => {
  if (mainWindow?.isMaximized()) {
    mainWindow.unmaximize();
  } else {
    mainWindow?.maximize();
  }
});
ipcMain.on('window-close', () => mainWindow?.close());

app.whenReady().then(() => {
  // メディア権限（マイク等）のリクエストを許可する
  session.defaultSession.setPermissionRequestHandler((webContents, permission, callback) => {
    const allowed = ['media', 'microphone', 'speech-recognition'];
    callback(allowed.includes(permission));
  });

  createWindow();
});

app.on('window-all-closed', () => {
  if (!isMac) {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
