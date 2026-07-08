/**
 * Homepage background music - Brown Eyes "Already One Year"
 * Starts muted autoplay (browser policy), then unmutes on first user gesture.
 */
(function () {
  const BGM_VIDEO_ID = 'LZlIqfMn4cc';
  const BGM_START_SECONDS = 102;
  const BGM_END_SECONDS = 310;
  const BGM_VOLUME = 42;
  const STORAGE_KEY = 'fansite:bgm-muted:v1';

  const COPY = {
    song: '\uBE14\uB77C\uC6B4\uC544\uC774\uC988 - \uBC8C\uC350 \uC77C\uB144',
    ariaOn: '\uBC30\uACBD\uC74C\uC545 \uB044\uAE30',
    ariaOff: '\uBC30\uACBD\uC74C\uC545 \uCF1C\uAE30',
  };

  let bgmPlayer = null;
  let bgmReady = false;
  let bgmPlaying = false;
  let bgmAudible = false;
  let bgmMuted = false;
  let bgmPausedByOverlay = false;
  let bgmLoopTimer = null;
  let bgmUnlockBound = false;
  let youtubeApiPromise = null;

  function ensureYouTubeApi() {
    if (window.YT?.Player) return Promise.resolve();

    if (!youtubeApiPromise) {
      youtubeApiPromise = new Promise((resolve) => {
        const finish = () => {
          if (window.YT?.Player) resolve();
        };

        const previousReady = window.onYouTubeIframeAPIReady;
        window.onYouTubeIframeAPIReady = () => {
          if (typeof previousReady === 'function') previousReady();
          finish();
        };

        if (!document.getElementById('youtube-iframe-api')) {
          const tag = document.createElement('script');
          tag.id = 'youtube-iframe-api';
          tag.src = 'https://www.youtube.com/iframe_api';
          document.head.appendChild(tag);
        }

        const poll = window.setInterval(() => {
          if (window.YT?.Player) {
            window.clearInterval(poll);
            resolve();
          }
        }, 50);
        window.setTimeout(() => window.clearInterval(poll), 15000);
      });
    }

    return youtubeApiPromise;
  }

  function readMutedPreference() {
    try {
      return localStorage.getItem(STORAGE_KEY) === '1';
    } catch (_) {
      return false;
    }
  }

  function saveMutedPreference(muted) {
    try {
      localStorage.setItem(STORAGE_KEY, muted ? '1' : '0');
    } catch (_) {}
  }

  function updateToggleUI() {
    const toggle = document.getElementById('siteBgmToggle');
    if (!toggle) return;

    toggle.classList.toggle('is-muted', bgmMuted);
    toggle.classList.toggle('is-playing', bgmPlaying && bgmAudible && !bgmMuted);
    toggle.classList.toggle('is-waiting', bgmPlaying && !bgmAudible && !bgmMuted);
    toggle.setAttribute('aria-pressed', bgmMuted ? 'false' : 'true');
    toggle.setAttribute('aria-label', bgmMuted ? COPY.ariaOff : COPY.ariaOn);
    toggle.title = COPY.song;
  }

  function stopBgmLoopWatch() {
    if (bgmLoopTimer) {
      window.clearInterval(bgmLoopTimer);
      bgmLoopTimer = null;
    }
  }

  function startBgmLoopWatch() {
    stopBgmLoopWatch();
    bgmLoopTimer = window.setInterval(() => {
      if (!bgmPlayer || !bgmPlaying) return;
      const current = bgmPlayer.getCurrentTime?.() ?? 0;
      if (current >= BGM_END_SECONDS || current < BGM_START_SECONDS - 4) {
        bgmPlayer.seekTo(BGM_START_SECONDS, true);
      }
    }, 1000);
  }

  function setBgmPlaying(playing) {
    bgmPlaying = playing;
    if (playing) startBgmLoopWatch();
    else stopBgmLoopWatch();
    updateToggleUI();
  }

  function applyAudibleState() {
    if (!bgmPlayer) return;
    if (bgmMuted) {
      bgmPlayer.mute?.();
      bgmAudible = false;
      updateToggleUI();
      return;
    }
    bgmPlayer.unMute?.();
    bgmPlayer.setVolume?.(BGM_VOLUME);
    bgmAudible = true;
    updateToggleUI();
  }

  function playBgm({ audible = null } = {}) {
    if (!bgmReady || !bgmPlayer || bgmMuted) return;
    bgmPlayer.seekTo?.(BGM_START_SECONDS, true);
    bgmPlayer.playVideo?.();
    if (audible === true) applyAudibleState();
    if (audible === false) {
      bgmPlayer.mute?.();
      bgmAudible = false;
      updateToggleUI();
    }
  }

  function pauseBgm() {
    if (!bgmPlayer) return;
    bgmPlayer.pauseVideo?.();
    setBgmPlaying(false);
    bgmAudible = false;
    updateToggleUI();
  }

  function unlockFromGesture() {
    if (bgmMuted || !bgmReady) return;
    bgmPausedByOverlay = false;
    if (!bgmPlaying) {
      playBgm({ audible: true });
      return;
    }
    applyAudibleState();
  }

  function bindGestureUnlock() {
    if (bgmUnlockBound) return;
    bgmUnlockBound = true;

    const unlock = () => unlockFromGesture();
    document.addEventListener('pointerdown', unlock, { passive: true });
    document.addEventListener('keydown', unlock);
  }

  function tryMutedAutoplay() {
    if (!bgmReady || bgmMuted || bgmPlaying || bgmPausedByOverlay) return;
    playBgm({ audible: false });
  }

  function onBgmReady() {
    bgmReady = true;
    updateToggleUI();
    bindGestureUnlock();
    window.setTimeout(tryMutedAutoplay, 300);
  }

  function onBgmStateChange(event) {
    const { PlayerState } = window.YT;
    if (event.data === PlayerState.PLAYING) {
      setBgmPlaying(true);
      return;
    }
    if (
      event.data === PlayerState.PAUSED
      || event.data === PlayerState.ENDED
    ) {
      setBgmPlaying(false);
      bgmAudible = false;
      updateToggleUI();
    }
  }

  function toggleBgm() {
    if (!bgmPlaying && !bgmMuted) {
      unlockFromGesture();
      return;
    }

    bgmMuted = !bgmMuted;
    saveMutedPreference(bgmMuted);
    updateToggleUI();

    if (bgmMuted) {
      pauseBgm();
      return;
    }

    bgmPausedByOverlay = false;
    playBgm({ audible: true });
  }

  function pauseForOverlay() {
    if (!bgmPlaying) return;
    bgmPausedByOverlay = true;
    pauseBgm();
  }

  function resumeIfEnabled() {
    if (bgmMuted || !bgmPausedByOverlay) return;
    bgmPausedByOverlay = false;
    playBgm({ audible: true });
  }

  function initSiteBgm() {
    const mount = document.getElementById('siteBgmMount');
    const toggle = document.getElementById('siteBgmToggle');
    if (!mount || !toggle) return;

    bgmMuted = readMutedPreference();
    updateToggleUI();
    toggle.addEventListener('click', toggleBgm);
    bindGestureUnlock();

    ensureYouTubeApi().then(() => {
      bgmPlayer = new YT.Player('siteBgmMount', {
        height: '200',
        width: '200',
        videoId: BGM_VIDEO_ID,
        playerVars: {
          autoplay: 0,
          controls: 0,
          disablekb: 1,
          fs: 0,
          iv_load_policy: 3,
          modestbranding: 1,
          playsinline: 1,
          rel: 0,
          start: BGM_START_SECONDS,
          enablejsapi: 1,
          origin: location.origin && location.origin !== 'null' ? location.origin : undefined,
        },
        events: {
          onReady: onBgmReady,
          onStateChange: onBgmStateChange,
        },
      });
    });
  }

  window.SiteBgm = {
    pauseForOverlay,
    resumeIfEnabled,
    unlockFromGesture,
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initSiteBgm);
  } else {
    initSiteBgm();
  }
})();
