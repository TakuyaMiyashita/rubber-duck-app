/**
 * Duck — ダックのふるまい管理
 */
const Duck = (() => {
  let duckEl = null;

  function init(element) {
    duckEl = element;
    duckEl.addEventListener('click', onDuckClick);
  }

  function onDuckClick() {
    triggerBounce();
  }

  function triggerBounce() {
    if (!duckEl) return;
    duckEl.classList.remove('bounce');
    // reflow で再トリガー
    void duckEl.offsetWidth;
    duckEl.classList.add('bounce');
    duckEl.addEventListener('animationend', () => {
      duckEl.classList.remove('bounce');
    }, { once: true });
  }

  /**
   * ダックの応答テキストを生成
   * 91%: "..."  /  5%: "...?"  /  3%: "......"  /  1%: "quack"
   */
  function generateResponse() {
    const roll = Math.random() * 100;
    if (roll < 1) return 'quack';
    if (roll < 4) return '......';
    if (roll < 9) return '...?';
    return '...';
  }

  /**
   * 応答ディレイ (1.0〜2.0秒)
   */
  function getResponseDelay() {
    return 1000 + Math.random() * 1000;
  }

  return {
    init,
    triggerBounce,
    generateResponse,
    getResponseDelay,
  };
})();
