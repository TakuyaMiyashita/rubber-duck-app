/**
 * Voice — ローカル Whisper による音声入力
 *
 * フロー: マイクON → Web Audio API で PCM 録音 → 無音検出で区切り
 *         → main process の whisper-cli で転写 → テキストをコールバック
 *         → 録音継続（マイクOFFまで）
 */
const Voice = (() => {
  let isListening = false;
  let onResultCallback = null;
  let onStateChangeCallback = null;

  // Audio nodes
  let audioContext = null;
  let mediaStream = null;
  let sourceNode = null;
  let processorNode = null;

  // 録音バッファ・VAD 状態
  let audioChunks = [];
  let silenceFrames = 0;
  let speechDetected = false;
  let processing = false;

  const SILENCE_THRESHOLD = 0.015;  // RMS がこれ以下 → 無音
  const SILENCE_LIMIT = 12;         // 無音フレーム数（≒1.5秒 @4096/16kHz）
  const MIN_SPEECH_FRAMES = 3;      // 最低限このフレーム数の発話がないと無視

  const isSupported = !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);

  function init({ onResult, onStateChange }) {
    if (!isSupported) return false;
    onResultCallback = onResult;
    onStateChangeCallback = onStateChange;
    return true;
  }

  // ===== 録音開始 =====
  async function start() {
    if (isListening) return;

    const permission = await window.duckAPI.checkMicPermission();
    if (permission === 'denied') {
      setState('denied');
      return;
    }

    try {
      mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true },
      });

      audioContext = new AudioContext({ sampleRate: 16000 });
      sourceNode = audioContext.createMediaStreamSource(mediaStream);
      processorNode = audioContext.createScriptProcessor(4096, 1, 1);

      audioChunks = [];
      silenceFrames = 0;
      speechDetected = false;

      processorNode.onaudioprocess = onAudioProcess;
      sourceNode.connect(processorNode);
      processorNode.connect(audioContext.destination);

      isListening = true;
      setState('listening');
    } catch (e) {
      console.warn('Failed to start recording:', e);
      setState('error');
    }
  }

  // ===== 録音停止 =====
  function stop() {
    if (!isListening) return;
    isListening = false;

    // 残りバッファがあれば送る
    if (speechDetected && audioChunks.length >= MIN_SPEECH_FRAMES) {
      flush();
    }

    cleanup();
    setState('idle');
  }

  function toggle() {
    isListening ? stop() : start();
  }

  // ===== オーディオ処理（VAD） =====
  function onAudioProcess(e) {
    if (processing) return; // 転写中は新規バッファリングしない

    const data = e.inputBuffer.getChannelData(0);
    const samples = new Float32Array(data);

    // RMS 計算
    let sum = 0;
    for (let i = 0; i < samples.length; i++) sum += samples[i] * samples[i];
    const rms = Math.sqrt(sum / samples.length);

    if (rms > SILENCE_THRESHOLD) {
      speechDetected = true;
      silenceFrames = 0;
      audioChunks.push(samples);
    } else if (speechDetected) {
      audioChunks.push(samples); // 末尾の無音も含める
      silenceFrames++;

      if (silenceFrames >= SILENCE_LIMIT) {
        if (audioChunks.length >= MIN_SPEECH_FRAMES) {
          flush();
        } else {
          audioChunks = [];
        }
        speechDetected = false;
        silenceFrames = 0;
      }
    }
  }

  // ===== バッファを転写に送る =====
  async function flush() {
    const chunks = audioChunks;
    audioChunks = [];
    speechDetected = false;
    silenceFrames = 0;

    const totalLen = chunks.reduce((s, c) => s + c.length, 0);
    const merged = new Float32Array(totalLen);
    let offset = 0;
    for (const chunk of chunks) {
      merged.set(chunk, offset);
      offset += chunk.length;
    }

    processing = true;
    setState('processing');

    try {
      const sampleRate = audioContext ? audioContext.sampleRate : 16000;
      const text = await window.duckAPI.transcribe(Array.from(merged), sampleRate);
      if (text && onResultCallback) {
        onResultCallback({ final: text, interim: '' });
      }
    } catch (e) {
      console.warn('Transcription failed:', e);
    }

    processing = false;
    if (isListening) setState('listening');
  }

  // ===== クリーンアップ =====
  function cleanup() {
    if (processorNode) { processorNode.disconnect(); processorNode = null; }
    if (sourceNode) { sourceNode.disconnect(); sourceNode = null; }
    if (audioContext) { audioContext.close(); audioContext = null; }
    if (mediaStream) { mediaStream.getTracks().forEach(t => t.stop()); mediaStream = null; }
    audioChunks = [];
  }

  function setState(state) {
    if (onStateChangeCallback) onStateChangeCallback(state);
  }

  function getIsListening() {
    return isListening;
  }

  return { init, start, stop, toggle, isSupported, getIsListening };
})();
