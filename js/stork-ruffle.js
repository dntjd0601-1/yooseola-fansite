const RUFFLE_BASE = 'https://unpkg.com/@ruffle-rs/ruffle@0.2.0/';
const STORK_SWF = 'games/walk-the-stork.swf';

let storkRufflePromise = null;

function loadStorkRuffle() {
  if (window.RufflePlayer?.newest) {
    return Promise.resolve();
  }

  if (!storkRufflePromise) {
    storkRufflePromise = new Promise((resolve, reject) => {
      window.RufflePlayer = window.RufflePlayer || {};
      window.RufflePlayer.config = {
        publicPath: RUFFLE_BASE,
        autoplay: 'on',
        unmuteOverlay: 'hidden',
        letterbox: 'off',
        warnOnUnsupportedContent: false,
      };

      const script = document.createElement('script');
      script.src = `${RUFFLE_BASE}ruffle.js`;
      script.onload = () => resolve();
      script.onerror = () => reject(new Error('Ruffle load failed'));
      document.head.appendChild(script);
    });
  }

  return storkRufflePromise;
}

function showStorkError(message) {
  const host = document.getElementById('storkRuffleHost');
  if (!host) return;
  host.innerHTML = `<p class="stork-walk__error">${message}</p>`;
}

function initStorkGame() {
  const panel = document.getElementById('gameStork');
  const host = document.getElementById('storkRuffleHost');
  if (!panel || !host || panel.__storkReady) return;

  loadStorkRuffle()
    .then(() => {
      const ruffle = window.RufflePlayer.newest();
      const player = ruffle.createPlayer();
      player.style.width = '100%';
      player.style.height = '100%';
      host.replaceChildren(player);
      player.load(STORK_SWF);
      panel.__storkReady = true;
      panel.__storkPlayer = player;
    })
    .catch(() => {
      showStorkError('게임 플레이어를 불러오지 못했습니다.<br>새로고침 후 다시 시도해 주세요.');
    });
}

function focusStorkGame() {
  const host = document.getElementById('storkRuffleHost');
  const player = host?.querySelector('ruffle-player') || host?.firstElementChild;
  player?.focus?.();
  host?.focus?.();
}

function pauseStorkGame() {
  const panel = document.getElementById('gameStork');
  panel?.__storkPlayer?.pause?.();
}
