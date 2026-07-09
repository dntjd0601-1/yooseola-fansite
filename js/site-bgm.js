/**
 * Homepage background music - Brown Eyes "Already One Year"
 */
(function () {
  const MAIN = window.SITE_MAIN_SONG || {
    title: [
      String.fromCodePoint(0xBE0C, 0xB77C, 0xC6B4),
      ' ',
      String.fromCodePoint(0xC544, 0xC774, 0xC988),
      ' - ',
      String.fromCodePoint(0xBC8C, 0xC368),
      ' ',
      String.fromCodePoint(0xC77C, 0xB144),
    ].join(''),
    videoId: 'U89YuK4SD9E',
  };

  const BGM_VIDEO_ID = MAIN.videoId;
  const BGM_VOLUME = 42;
  const STORAGE_KEY = 'fansite:bgm-muted:v1';

  const COPY = {
    playlist: 'Now Playing',
    song: MAIN.title,
    ariaOn: '\uBC30\uACBD\uC74C\uC545 \uB044\uAE30',
    ariaOff: '\uBC30\uACBD\uC74C\uC545 \uCF1C\uAE30',
  };

  let bgmPlayer = null;
  let bgmReady = false;
  let bgmPlaying = false;
  let bgmAudible = false;
  let bgmMuted = false;
  let bgmPausedByOverlay = false;
  let bgmUnlockBound = false;
  let bgmPendingAudible = false;
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

  function isOtherMusicPlaying() {
    return Boolean(window.MemoryPlaylist?.isPlaying?.());
  }

  function canPlayBgm() {
    return !isOtherMusicPlaying();
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

  function updateDockControls() {
    const playBtn = document.getElementById('siteBgmPlay');
    const pauseBtn = document.getElementById('siteBgmPause');
    const active = !bgmMuted && bgmReady && canPlayBgm();

    if (playBtn) playBtn.disabled = !active || bgmPlaying;
    if (pauseBtn) pauseBtn.disabled = !active || !bgmPlaying;
  }

  function showBgmDock() {
    if (bgmMuted || isOtherMusicPlaying()) {
      hideBgmDock();
      return;
    }
    const dock = document.getElementById('siteBgmDock');
    if (dock) dock.hidden = false;
    updateDockControls();
  }

  function hideBgmDock() {
    const dock = document.getElementById('siteBgmDock');
    if (dock) dock.hidden = true;
    updateDockControls();
  }

  function syncDockVisibility() {
    if (bgmMuted || bgmPausedByOverlay || isOtherMusicPlaying()) {
      hideBgmDock();
      return;
    }
    if (bgmPlaying || bgmReady) showBgmDock();
  }

  function setBgmPlaying(playing) {
    bgmPlaying = playing;
    updateToggleUI();
    updateDockControls();
    syncDockVisibility();
  }

  function applyAudibleState() {
    if (!bgmPlayer) return;
    if (bgmMuted) {
      bgmPlayer.mute?.();
      bgmAudible = false;
      updateToggleUI();
      syncDockVisibility();
      return;
    }
    bgmPlayer.unMute?.();
    bgmPlayer.setVolume?.(BGM_VOLUME);
    bgmAudible = true;
    updateToggleUI();
    showBgmDock();
  }

  function playBgm({ audible = null, fromStart = false } = {}) {
    if (!bgmReady || !bgmPlayer || bgmMuted || !canPlayBgm()) return;
    window.MemoryPlaylist?.pauseAll?.();
    if (fromStart) bgmPlayer.seekTo?.(0, true);
    bgmPlayer.playVideo?.();
    if (audible === true) applyAudibleState();
    if (audible === false) {
      bgmPlayer.mute?.();
      bgmAudible = false;
      updateToggleUI();
      showBgmDock();
    }
  }

  function pauseBgm() {
    if (!bgmPlayer) return;
    bgmPlayer.pauseVideo?.();
    setBgmPlaying(false);
    bgmAudible = false;
    updateToggleUI();
    updateDockControls();
  }

  function getCurrentBgmVideoId() {
    return bgmPlayer?.getVideoData?.()?.video_id || '';
  }

  function isCorrectBgmVideoLoaded() {
    return getCurrentBgmVideoId() === BGM_VIDEO_ID;
  }

  function restartBgmLoop() {
    if (!bgmPlayer || !canPlayBgm()) return;
    bgmPendingAudible = !bgmMuted;
    bgmPlayer.loadVideoById({
      videoId: BGM_VIDEO_ID,
      startSeconds: 0,
    });
  }

  function unlockFromGesture() {
    if (!canPlayBgm() || bgmMuted || !bgmReady) return;
    bgmPausedByOverlay = false;
    if (!bgmPlaying) {
      playBgm({ audible: true, fromStart: true });
      return;
    }
    applyAudibleState();
  }

  function bindGestureUnlock() {
    if (bgmUnlockBound) return;
    bgmUnlockBound = true;

    document.addEventListener('pointerdown', () => unlockFromGesture(), { passive: true });
    document.addEventListener('keydown', () => unlockFromGesture());
  }

  function tryMutedAutoplay() {
    if (!canPlayBgm() || !bgmReady || bgmMuted || bgmPlaying || bgmPausedByOverlay) return;
    playBgm({ audible: false, fromStart: true });
  }

  function resumeBgm() {
    if (bgmMuted || isOtherMusicPlaying()) return;
    bgmPausedByOverlay = false;
    window.setTimeout(() => {
      if (!bgmPlaying) tryMutedAutoplay();
      else applyAudibleState();
      syncDockVisibility();
    }, 200);
  }

  function onBgmReady() {
    bgmReady = true;
    updateToggleUI();
    updateDockControls();
    bindGestureUnlock();
    if (!bgmMuted && canPlayBgm()) showBgmDock();
    window.setTimeout(tryMutedAutoplay, 300);
  }

  function onBgmStateChange(event) {
    const { PlayerState } = window.YT;
    if (event.data === PlayerState.PLAYING) {
      if (!isCorrectBgmVideoLoaded()) {
        restartBgmLoop();
        return;
      }
      if (!canPlayBgm()) {
        pauseBgm();
        return;
      }
      setBgmPlaying(true);
      if (bgmPendingAudible) {
        bgmPendingAudible = false;
        applyAudibleState();
      }
      return;
    }
    if (event.data === PlayerState.ENDED) {
      restartBgmLoop();
      return;
    }
    if (event.data === PlayerState.PAUSED) {
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
      hideBgmDock();
      return;
    }

    bgmPausedByOverlay = false;
    playBgm({ audible: true, fromStart: !bgmPlaying });
  }

  function pauseForOverlay() {
    bgmPausedByOverlay = true;
    pauseBgm();
    hideBgmDock();
  }

  function resumeIfEnabled() {
    resumeBgm();
  }

  function bindDockControls() {
    document.getElementById('siteBgmPlay')?.addEventListener('click', () => {
      if (bgmMuted) return;
      playBgm({ audible: true, fromStart: !bgmPlaying });
    });
    document.getElementById('siteBgmPause')?.addEventListener('click', () => {
      pauseBgm();
    });
  }

  function applyStaticLabels() {
    const titleEl = document.getElementById('siteBgmDockTitle');
    const labelEl = document.getElementById('siteBgmDockLabel');
    const dock = document.getElementById('siteBgmDock');

    if (titleEl) titleEl.textContent = COPY.song;
    if (labelEl) labelEl.textContent = COPY.playlist;
    if (dock) dock.setAttribute('aria-label', `${COPY.song} \uC7AC\uC0DD`);
  }

  function initSiteBgm() {
    const mount = document.getElementById('siteBgmMount');
    if (!mount) return;

    applyStaticLabels();
    bgmMuted = readMutedPreference();
    updateToggleUI();
    bindDockControls();
    bindGestureUnlock();

    document.addEventListener('memory-playlist:hide', () => {
      resumeBgm();
    });

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
    isPlaying: () => bgmPlaying,
    isMuted: () => bgmMuted,
    getCurrentTime: () => bgmPlayer?.getCurrentTime?.() ?? 0,
    pauseForOverlay,
    resumeIfEnabled,
    resumeBgm,
    unlockFromGesture,
    hideDock: hideBgmDock,
    showDock: showBgmDock,
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initSiteBgm);
  } else {
    initSiteBgm();
  }
})();
