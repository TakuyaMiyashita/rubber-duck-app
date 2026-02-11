/**
 * Whisper — whisper.cpp (whisper-cli) を使ったローカル音声認識
 *
 * フロー: Float32 PCM → WAV変換 → whisper-cli実行 → テキスト返却
 */
const { execFile } = require('child_process');
const { app } = require('electron');
const path = require('path');
const fs = require('fs');
const os = require('os');

// パッケージ済みアプリか開発モードかで参照先を切り替え
const isPackaged = app.isPackaged;

function getResourcePath() {
  return isPackaged ? process.resourcesPath : path.join(__dirname, '..', '..');
}

function getModelPath() {
  return path.join(getResourcePath(), 'models', 'ggml-base.bin');
}

// whisper-cli のバイナリパスを解決
let whisperBin = null;

function findBinary() {
  // 1. バンドル済みバイナリ（パッケージ時）
  const bundled = path.join(getResourcePath(), 'bin', 'whisper-cli');
  if (fs.existsSync(bundled)) return bundled;

  // 2. Homebrew（開発時）
  const candidates = [
    '/opt/homebrew/bin/whisper-cli',   // ARM Mac
    '/usr/local/bin/whisper-cli',      // Intel Mac
  ];
  for (const c of candidates) {
    if (fs.existsSync(c)) return c;
  }
  return 'whisper-cli'; // PATH に頼る
}

function getBinary() {
  if (!whisperBin) whisperBin = findBinary();
  return whisperBin;
}

// WAV ヘッダ書き込みヘルパー
function writeString(view, offset, str) {
  for (let i = 0; i < str.length; i++) {
    view.setUint8(offset + i, str.charCodeAt(i));
  }
}

function float32ToWav(float32Array, sampleRate) {
  const numSamples = float32Array.length;
  const buffer = new ArrayBuffer(44 + numSamples * 2);
  const view = new DataView(buffer);

  writeString(view, 0, 'RIFF');
  view.setUint32(4, 36 + numSamples * 2, true);
  writeString(view, 8, 'WAVE');
  writeString(view, 12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);       // PCM
  view.setUint16(22, 1, true);       // mono
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);       // block align
  view.setUint16(34, 16, true);      // 16-bit
  writeString(view, 36, 'data');
  view.setUint32(40, numSamples * 2, true);

  for (let i = 0; i < numSamples; i++) {
    const s = Math.max(-1, Math.min(1, float32Array[i]));
    view.setInt16(44 + i * 2, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
  }

  return Buffer.from(buffer);
}

// Whisper 出力のゴミを除去
const NOISE_PATTERNS = [
  /^\(.*\)$/,          // (音楽), (雑音) 等
  /^\[.*\]$/,          // [BLANK_AUDIO] 等
  /^\.+$/,             // ... だけ
  /^♪+$/,              // 音符記号
  /^ご視聴ありがとう/, // Whisper のハルシネーション
  /^ありがとうございました/,
  /^お疲れ様/,
];

function cleanTranscription(raw) {
  return raw
    .split('\n')
    .map(line => line.replace(/\[[\d:.]+\s*-->\s*[\d:.]+\]\s*/, '').trim())
    .filter(line => {
      if (!line) return false;
      return !NOISE_PATTERNS.some(p => p.test(line));
    })
    .join(' ')
    .trim();
}

function transcribe(audioData, sampleRate = 16000) {
  return new Promise((resolve, reject) => {
    const float32 = audioData instanceof Float32Array
      ? audioData
      : new Float32Array(audioData);

    if (float32.length < sampleRate * 0.3) {
      resolve('');
      return;
    }

    const tmpFile = path.join(os.tmpdir(), `duck_audio_${Date.now()}.wav`);
    const wavBuffer = float32ToWav(float32, sampleRate);
    fs.writeFileSync(tmpFile, wavBuffer);

    const binPath = getBinary();
    const binDir = path.dirname(binPath);

    execFile(binPath, [
      '-m', getModelPath(),
      '-l', 'ja',
      '-np',
      tmpFile,
    ], {
      timeout: 30000,
      env: { ...process.env, DYLD_LIBRARY_PATH: binDir },
    }, (error, stdout, stderr) => {
      try { fs.unlinkSync(tmpFile); } catch (_) {}

      if (error) {
        reject(error);
        return;
      }

      const text = cleanTranscription(stdout);
      resolve(text);
    });
  });
}

function isReady() {
  if (!fs.existsSync(getModelPath())) return false;
  try {
    const bin = getBinary();
    return fs.existsSync(bin) || bin === 'whisper-cli';
  } catch (_) {
    return false;
  }
}

module.exports = { transcribe, isReady };
