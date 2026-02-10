const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('duckAPI', {
  saveSession: (session) => ipcRenderer.invoke('save-session', session),
  getSessions: () => ipcRenderer.invoke('get-sessions'),
  loadSession: (sessionId) => ipcRenderer.invoke('load-session', sessionId),

  checkMicPermission: () => ipcRenderer.invoke('check-mic-permission'),
  transcribe: (audioData, sampleRate) => ipcRenderer.invoke('transcribe', audioData, sampleRate),
  whisperReady: () => ipcRenderer.invoke('whisper-ready'),

  windowMinimize: () => ipcRenderer.send('window-minimize'),
  windowMaximize: () => ipcRenderer.send('window-maximize'),
  windowClose: () => ipcRenderer.send('window-close'),

  platform: process.platform,
});
