/**
 * Chat — チャットUIの描画とインタラクション
 */
const Chat = (() => {
  let chatArea = null;
  let isTyping = false;

  function init(element) {
    chatArea = element;
  }

  function renderMessage(msg) {
    const div = document.createElement('div');
    div.className = `message message--${msg.sender}`;

    const bubble = document.createElement('div');
    bubble.className = 'message__bubble';
    bubble.textContent = msg.text;

    const time = document.createElement('div');
    time.className = 'message__time';
    time.textContent = formatTime(msg.timestamp);

    div.appendChild(bubble);
    div.appendChild(time);
    chatArea.appendChild(div);
    scrollToBottom();
  }

  function showTypingIndicator() {
    if (isTyping) return;
    isTyping = true;

    const div = document.createElement('div');
    div.className = 'typing-indicator';
    div.id = 'typing-indicator';

    for (let i = 0; i < 3; i++) {
      const dot = document.createElement('div');
      dot.className = 'typing-indicator__dot';
      div.appendChild(dot);
    }

    chatArea.appendChild(div);
    scrollToBottom();
  }

  function hideTypingIndicator() {
    isTyping = false;
    const indicator = document.getElementById('typing-indicator');
    if (indicator) indicator.remove();
  }

  function clearMessages() {
    chatArea.innerHTML = '';
  }

  function renderAllMessages(messages) {
    clearMessages();
    messages.forEach(msg => {
      const div = document.createElement('div');
      div.className = `message message--${msg.sender}`;
      div.style.animation = 'none';

      const bubble = document.createElement('div');
      bubble.className = 'message__bubble';
      bubble.textContent = msg.text;

      const time = document.createElement('div');
      time.className = 'message__time';
      time.textContent = formatTime(msg.timestamp);

      div.appendChild(bubble);
      div.appendChild(time);
      chatArea.appendChild(div);
    });
    scrollToBottom();
  }

  function scrollToBottom() {
    requestAnimationFrame(() => {
      chatArea.scrollTop = chatArea.scrollHeight;
    });
  }

  function formatTime(isoString) {
    const date = new Date(isoString);
    return date.toLocaleTimeString('ja-JP', {
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  return {
    init,
    renderMessage,
    showTypingIndicator,
    hideTypingIndicator,
    clearMessages,
    renderAllMessages,
    scrollToBottom,
  };
})();
