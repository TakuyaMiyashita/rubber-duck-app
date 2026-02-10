/**
 * App — アプリケーションエントリポイント
 */
(function () {
  // DOM要素
  const chatArea = document.getElementById('chat-area');
  const inputField = document.getElementById('input-field');
  const sendBtn = document.getElementById('send-btn');
  const duckEl = document.getElementById('duck');
  const titlebar = document.getElementById('titlebar');

  const btnNewSession = document.getElementById('btn-new-session');
  const btnHistory = document.getElementById('btn-history');
  const historyPanel = document.getElementById('history-panel');
  const historyList = document.getElementById('history-list');
  const btnHistoryClose = document.getElementById('btn-history-close');

  const micBtn = document.getElementById('mic-btn');

  // Window controls
  const btnMinimize = document.getElementById('btn-minimize');
  const btnMaximize = document.getElementById('btn-maximize');
  const btnClose = document.getElementById('btn-close');

  let historyOpen = false;
  let viewingHistory = false; // 過去セッション閲覧中フラグ

  // ===== 初期化 =====
  function init() {
    // macOSのタイトルバースタイル
    if (window.duckAPI.platform === 'darwin') {
      titlebar.classList.add('titlebar--mac');
    }

    Chat.init(chatArea);
    Duck.init(duckEl);

    // 新しいセッションを作成
    Storage.createSession();

    // イベントリスナー
    sendBtn.addEventListener('click', handleSend);
    inputField.addEventListener('keydown', handleKeyDown);
    inputField.addEventListener('input', autoResizeInput);

    btnNewSession.addEventListener('click', handleNewSession);
    btnHistory.addEventListener('click', toggleHistory);
    btnHistoryClose.addEventListener('click', toggleHistory);

    btnMinimize.addEventListener('click', () => window.duckAPI.windowMinimize());
    btnMaximize.addEventListener('click', () => window.duckAPI.windowMaximize());
    btnClose.addEventListener('click', () => window.duckAPI.windowClose());

    // 音声入力の初期化
    initVoice();

    // キーボードショートカット
    document.addEventListener('keydown', handleGlobalKeyDown);

    // フォーカス
    inputField.focus();
  }

  // ===== 音声入力 =====
  function initVoice() {
    if (!Voice.isSupported) {
      micBtn.style.display = 'none';
      return;
    }

    Voice.init({
      onResult: ({ final: finalText }) => {
        if (finalText) {
          sendMessage(finalText.trim());
        }
      },
      onStateChange: (state) => {
        micBtn.classList.toggle('mic-btn--listening', state === 'listening' || state === 'processing');
        micBtn.classList.toggle('mic-btn--processing', state === 'processing');
        if (state === 'listening') {
          inputField.placeholder = 'Listening...';
        } else if (state === 'processing') {
          inputField.placeholder = 'Transcribing...';
        } else if (state === 'idle') {
          inputField.placeholder = 'Talk to your duck...';
        } else if (state === 'denied') {
          micBtn.classList.add('mic-btn--denied');
          micBtn.title = 'Microphone access denied';
        }
      },
    });

    micBtn.addEventListener('click', () => {
      if (viewingHistory) return;
      Voice.toggle();
    });
  }

  // ===== メッセージ送信 =====
  function sendMessage(text) {
    if (!text || viewingHistory) return;

    // ユーザーメッセージ
    const userMsg = Storage.addMessage('user', text);
    Chat.renderMessage(userMsg);

    // ダックの応答
    Chat.showTypingIndicator();
    Duck.triggerBounce();

    const delay = Duck.getResponseDelay();
    setTimeout(() => {
      Chat.hideTypingIndicator();
      const responseText = Duck.generateResponse();
      const duckMsg = Storage.addMessage('duck', responseText);
      Chat.renderMessage(duckMsg);

      // セッション保存
      Storage.save();
    }, delay);
  }

  function handleSend() {
    const text = inputField.value.trim();
    if (!text) return;

    // 録音中なら停止
    if (Voice.getIsListening()) {
      Voice.stop();
    }

    sendMessage(text);

    // 入力クリア
    inputField.value = '';
    resetInputHeight();
  }

  // ===== キーボードハンドリング =====
  function handleKeyDown(e) {
    // IME変換確定のEnterを無視（日本語入力対応）
    if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) {
      e.preventDefault();
      handleSend();
    }
  }

  function handleGlobalKeyDown(e) {
    const mod = e.metaKey || e.ctrlKey;

    if (mod && e.key === 'n') {
      e.preventDefault();
      handleNewSession();
    }

    if (mod && e.key === 'h') {
      e.preventDefault();
      toggleHistory();
    }

    if (e.key === 'Escape' && historyOpen) {
      toggleHistory();
    }
  }

  // ===== テキストエリア自動リサイズ =====
  function autoResizeInput() {
    inputField.style.height = 'auto';
    inputField.style.height = Math.min(inputField.scrollHeight, 120) + 'px';
  }

  function resetInputHeight() {
    inputField.style.height = 'auto';
  }

  // ===== 新規セッション =====
  function handleNewSession() {
    Storage.createSession();
    Chat.clearMessages();
    viewingHistory = false;
    inputField.disabled = false;
    inputField.placeholder = 'Talk to your duck...';
    inputField.focus();
  }

  // ===== 履歴パネル =====
  function toggleHistory() {
    historyOpen = !historyOpen;
    historyPanel.classList.toggle('history-panel--open', historyOpen);
    btnHistory.classList.toggle('footer__btn--active', historyOpen);

    if (historyOpen) {
      loadHistoryList();
    }
  }

  async function loadHistoryList() {
    const sessions = await Storage.getAllSessions();
    historyList.innerHTML = '';

    if (sessions.length === 0) {
      historyList.innerHTML = '<div class="history-panel__empty">No sessions yet.</div>';
      return;
    }

    const currentSession = Storage.getCurrentSession();

    sessions.forEach(session => {
      const item = document.createElement('div');
      item.className = 'history-item';

      if (currentSession && session.id === currentSession.id) {
        item.classList.add('history-item--active');
      }

      const date = document.createElement('div');
      date.className = 'history-item__date';
      date.textContent = formatSessionDate(session.createdAt);

      const count = document.createElement('div');
      count.className = 'history-item__count';
      count.textContent = `${session.messageCount} messages`;

      item.appendChild(date);
      item.appendChild(count);

      item.addEventListener('click', () => openSession(session.id));
      historyList.appendChild(item);
    });
  }

  async function openSession(sessionId) {
    const session = await Storage.loadSession(sessionId);
    if (!session) return;

    const currentSession = Storage.getCurrentSession();

    if (currentSession && sessionId === currentSession.id) {
      // 現在のセッションに戻る
      viewingHistory = false;
      inputField.disabled = false;
      inputField.placeholder = 'Talk to your duck...';
      Chat.renderAllMessages(session.messages);
    } else {
      // 過去セッションを閲覧
      viewingHistory = true;
      inputField.disabled = true;
      inputField.placeholder = 'Viewing past session...';
      Chat.renderAllMessages(session.messages);
    }

    // パネルを閉じる
    toggleHistory();
  }

  function formatSessionDate(isoString) {
    const date = new Date(isoString);
    return date.toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  // ===== 起動 =====
  init();
})();
