/**
 * Storage — セッション管理
 * Main Process のファイルI/Oとpreload経由で通信
 */
const Storage = (() => {
  let currentSession = null;

  function createSession() {
    const now = new Date();
    currentSession = {
      id: `session_${Date.now()}`,
      createdAt: now.toISOString(),
      messages: [],
    };
    return currentSession;
  }

  function getCurrentSession() {
    return currentSession;
  }

  function addMessage(sender, text) {
    if (!currentSession) return null;
    const msg = {
      id: `msg_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      sender,
      text,
      timestamp: new Date().toISOString(),
    };
    currentSession.messages.push(msg);
    return msg;
  }

  async function save() {
    if (!currentSession || currentSession.messages.length === 0) return;
    await window.duckAPI.saveSession(currentSession);
  }

  async function getAllSessions() {
    return await window.duckAPI.getSessions();
  }

  async function loadSession(sessionId) {
    return await window.duckAPI.loadSession(sessionId);
  }

  function setCurrentSession(session) {
    currentSession = session;
  }

  return {
    createSession,
    getCurrentSession,
    addMessage,
    save,
    getAllSessions,
    loadSession,
    setCurrentSession,
  };
})();
