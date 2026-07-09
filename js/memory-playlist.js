const PLAYLIST_FEED_API = '/.netlify/functions/youtube-playlist';

const MEMORY_MAIN_TRACK = {
  title: window.SITE_MAIN_SONG?.title || [
    String.fromCodePoint(0xBC84, 0xCEF4),
    ' 1',
    String.fromCodePoint(0xC8FC, 0xB144),
    ' ',
    String.fromCodePoint(0xCEE4, 0xBC84, 0xACE1),
    ' - ',
    String.fromCodePoint(0xB05D, 0xB798, 0xB2E4, 0xB294),
    ' ',
    String.fromCodePoint(0xAC83, 0xC740),
    ' ',
    String.fromCodePoint(0xB2E4, 0xC2DC),
    ' ',
    String.fromCodePoint(0xC2DC, 0xC791, 0xB41C, 0xB2E4, 0xB294),
    ' ',
    String.fromCodePoint(0xAC83, 0xC744),
  ].join(''),
  videoId: window.SITE_MAIN_SONG?.videoId || 'XtVEV7wh76A',
  thumb: window.SITE_MAIN_SONG?.thumb || 'https://i.ytimg.com/vi/XtVEV7wh76A/hqdefault.jpg',
  mood: window.SITE_MAIN_SONG?.mood || '\uBA54\uC778',
  isMainTrack: true,
};

const memoryPlaylistCatalog = Array.isArray(MEMORY_YOUTUBE_PLAYLISTS)
  ? MEMORY_YOUTUBE_PLAYLISTS
  : (typeof MEMORY_YOUTUBE_PLAYLIST === 'object' && MEMORY_YOUTUBE_PLAYLIST.id
    ? [{ key: 'default', ...MEMORY_YOUTUBE_PLAYLIST }]
    : []);

const memoryPlaylistStaticData = typeof MEMORY_PLAYLIST_DATA === 'object' && !Array.isArray(MEMORY_PLAYLIST_DATA)
  ? MEMORY_PLAYLIST_DATA
  : { default: Array.isArray(MEMORY_PLAYLIST_DATA) ? MEMORY_PLAYLIST_DATA : [] };

let memoryPlaylistActiveKey = memoryPlaylistCatalog[0]?.key || '';
let memoryPlaylistMeta = { ...memoryPlaylistCatalog[0] };
let memoryPlaylistItems = [];
let memoryPlaylistActiveIndex = -1;
let memoryPlaylistPlayer = null;
let memoryPlaylistPlayerReady = false;
let memoryPlaylistPlaying = false;
let memoryPlaylistUsingOwnPlayer = false;
let youtubeApiPromise = null;

function isMainTrack(track) {
  return Boolean(track?.isMainTrack || track?.videoId === MEMORY_MAIN_TRACK.videoId);
}

function getMainTrackIndex() {
  const index = memoryPlaylistItems.findIndex(isMainTrack);
  return index >= 0 ? index : 0;
}

function getMemoryPlaylistStaticItems(key) {
  return Array.isArray(memoryPlaylistStaticData[key]) ? memoryPlaylistStaticData[key] : [];
}

function withMainTrackFirst(items) {
  const rest = (items || []).filter((item) => item.videoId !== MEMORY_MAIN_TRACK.videoId);
  return [MEMORY_MAIN_TRACK, ...rest];
}

function ensureYouTubeApi() {
  if (window.YT?.Player) {
    return Promise.resolve();
  }

  if (!youtubeApiPromise) {
    youtubeApiPromise = new Promise((resolve) => {
      const previousReady = window.onYouTubeIframeAPIReady;
      window.onYouTubeIframeAPIReady = () => {
        if (typeof previousReady === 'function') previousReady();
        resolve();
      };

      if (!document.getElementById('youtube-iframe-api')) {
        const tag = document.createElement('script');
        tag.id = 'youtube-iframe-api';
        tag.src = 'https://www.youtube.com/iframe_api';
        document.head.appendChild(tag);
      }
    });
  }

  return youtubeApiPromise;
}

function destroyMemoryPlaylistPlayer() {
  if (memoryPlaylistPlayer?.destroy) {
    memoryPlaylistPlayer.destroy();
  }
  memoryPlaylistPlayer = null;
  memoryPlaylistPlayerReady = false;
  memoryPlaylistPlaying = false;
}

async function initMemoryPlaylistPlayer() {
  const mountEl = document.getElementById('memoryPlaylistFrame');
  if (!mountEl) return;

  await ensureYouTubeApi();
  if (memoryPlaylistPlayer) return;

  memoryPlaylistPlayer = new YT.Player('memoryPlaylistFrame', {
    playerVars: {
      rel: 0,
      playsinline: 1,
      modestbranding: 1,
      enablejsapi: 1,
      origin: location.origin && location.origin !== 'null' ? location.origin : undefined,
    },
    events: {
      onReady: () => {
        memoryPlaylistPlayerReady = true;
      },
      onStateChange: onMemoryPlayerStateChange,
    },
  });
}

function withPlayerReady(callback) {
  initMemoryPlaylistPlayer().then(() => {
    if (memoryPlaylistPlayerReady && memoryPlaylistPlayer) {
      callback();
    }
  });
}

function syncTrackListUI() {
  const listEl = document.getElementById('memoryPlaylistTracks');
  if (!listEl) return;

  listEl.querySelectorAll('.memory-playlist__track').forEach((btn, i) => {
    btn.classList.toggle('is-active', i === memoryPlaylistActiveIndex);
    btn.setAttribute('aria-current', i === memoryPlaylistActiveIndex ? 'true' : 'false');
  });
}

function updateNowPlayingUI(track) {
  const nowEl = document.getElementById('memoryPlaylistNow');
  if (nowEl) nowEl.textContent = track?.title || '';
  updateNavMusicTitle(track?.title || '');
  syncTrackListUI();
}

function updateNavMusicTitle(title) {
  const titleEl = document.getElementById('navMusicTitle');
  if (titleEl) titleEl.textContent = title;
}

function hideNavMusicPlayer() {
  const playerEl = document.getElementById('navMusicPlayer');
  if (playerEl) playerEl.hidden = true;
}

function stopMemoryPlaylistPlayback() {
  withPlayerReady(() => {
    memoryPlaylistPlayer?.pauseVideo?.();
  });
  memoryPlaylistPlaying = false;
  memoryPlaylistUsingOwnPlayer = false;
  memoryPlaylistActiveIndex = -1;
  updateNavMusicControls();
  updateNavMusicTitle('');
  hideNavMusicPlayer();
}

function showNavMusicPlayer() {
  const playerEl = document.getElementById('navMusicPlayer');
  if (playerEl) playerEl.hidden = false;
  window.SiteBgm?.hideDock?.();
  updateNavMusicControls();
}

function updateNavMusicControls() {
  const playBtn = document.getElementById('navMusicPlay');
  const pauseBtn = document.getElementById('navMusicPause');
  const hasTrack = memoryPlaylistActiveIndex >= 0;

  if (playBtn) playBtn.disabled = !hasTrack || memoryPlaylistPlaying;
  if (pauseBtn) pauseBtn.disabled = !hasTrack || !memoryPlaylistPlaying;
}

function onMemoryPlayerStateChange(event) {
  const { PlayerState } = window.YT;
  memoryPlaylistPlaying = event.data === PlayerState.PLAYING;

  if (memoryPlaylistPlaying) {
    memoryPlaylistUsingOwnPlayer = true;
    window.SiteBgm?.pauseForOverlay?.();
  }

  updateNavMusicControls();

  if (event.data === PlayerState.ENDED) {
    nextMemoryTrack();
  }
}

function playMemoryTrack(index) {
  const track = memoryPlaylistItems[index];
  if (!track) return;

  memoryPlaylistActiveIndex = index;
  updateNowPlayingUI(track);
  syncTrackListUI();

  if (isMainTrack(track)) {
    memoryPlaylistPlaying = false;
    memoryPlaylistUsingOwnPlayer = false;
    hideNavMusicPlayer();
    showMainTrackInMemoryPlayer();
    window.SiteBgm?.resumeBgm?.();
    return;
  }

  window.SiteBgm?.pauseForOverlay?.();
  memoryPlaylistUsingOwnPlayer = true;
  showNavMusicPlayer();

  withPlayerReady(() => {
    memoryPlaylistPlayer.loadVideoById({
      videoId: track.videoId,
      startSeconds: 0,
    });
  });
}

function resumeMemoryTrack() {
  if (memoryPlaylistActiveIndex < 0) {
    if (memoryPlaylistItems.length) {
      playMemoryTrack(getMemoryStartIndex());
    }
    return;
  }

  withPlayerReady(() => {
    memoryPlaylistPlayer.playVideo();
  });
}

function pauseMemoryTrack() {
  withPlayerReady(() => {
    memoryPlaylistPlayer.pauseVideo();
  });
}

function nextMemoryTrack() {
  if (!memoryPlaylistItems.length) return;

  if (memoryPlaylistActiveIndex < 0) {
    playMemoryTrack(getMemoryStartIndex());
    return;
  }

  const nextIndex = (memoryPlaylistActiveIndex + 1) % memoryPlaylistItems.length;
  playMemoryTrack(nextIndex);
}

function getMemoryStartIndex() {
  return getMainTrackIndex();
}

function showMainTrackInMemoryPlayer() {
  const track = memoryPlaylistItems[getMainTrackIndex()] || MEMORY_MAIN_TRACK;
  const startSeconds = window.SiteBgm?.isPlaying?.()
    ? (window.SiteBgm.getCurrentTime?.() || 0)
    : 0;

  withPlayerReady(() => {
    if (!memoryPlaylistPlayer) return;
    memoryPlaylistPlayer.mute?.();
    memoryPlaylistPlayer.cueVideoById({
      videoId: track.videoId,
      startSeconds,
    });
  });
}

function syncMemoryPlaylistWithBgm() {
  if (!memoryPlaylistItems.length) return;

  if (memoryPlaylistUsingOwnPlayer && memoryPlaylistPlaying) return;

  const mainIndex = getMainTrackIndex();
  memoryPlaylistActiveIndex = mainIndex;
  updateNowPlayingUI(memoryPlaylistItems[mainIndex]);
  hideNavMusicPlayer();
  showMainTrackInMemoryPlayer();
  window.SiteBgm?.showDock?.();
}

function renderMemoryPlaylistTracks() {
  const listEl = document.getElementById('memoryPlaylistTracks');
  if (!listEl || !memoryPlaylistItems.length) return;

  listEl.replaceChildren();
  const fragment = document.createDocumentFragment();

  memoryPlaylistItems.forEach((track, index) => {
    const item = document.createElement('li');
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'memory-playlist__track';
    btn.setAttribute('aria-current', 'false');

    const thumb = document.createElement('img');
    thumb.className = 'memory-playlist__track-thumb';
    thumb.src = track.thumb;
    thumb.alt = '';
    thumb.loading = 'lazy';
    thumb.decoding = 'async';
    thumb.referrerPolicy = 'no-referrer';

    const body = document.createElement('span');
    body.className = 'memory-playlist__track-body';

    const title = document.createElement('span');
    title.className = 'memory-playlist__track-title';
    title.textContent = track.title;

    const mood = document.createElement('span');
    mood.className = 'memory-playlist__track-mood';
    mood.textContent = track.mood || memoryPlaylistMeta.title || 'Playlist';
    if (track.isMainTrack) {
      mood.classList.add('memory-playlist__track-mood--main');
    }

    body.append(title, mood);
    btn.append(thumb, body);
    btn.addEventListener('click', () => playMemoryTrack(index));
    item.appendChild(btn);
    fragment.appendChild(item);
  });

  listEl.appendChild(fragment);
  syncTrackListUI();
}

function renderMemoryPlaylistPicker() {
  const pickerEl = document.getElementById('memoryPlaylistPicker');
  if (!pickerEl || memoryPlaylistCatalog.length < 2) {
    if (pickerEl) pickerEl.hidden = true;
    return;
  }

  pickerEl.hidden = false;
  pickerEl.replaceChildren();
  pickerEl.setAttribute('role', 'tablist');
  pickerEl.setAttribute('aria-label', '재생목록 선택');

  memoryPlaylistCatalog.forEach((playlist) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'memory-playlist__picker-btn';
    btn.dataset.playlistKey = playlist.key;
    btn.setAttribute('role', 'tab');
    btn.setAttribute('aria-selected', playlist.key === memoryPlaylistActiveKey ? 'true' : 'false');
    btn.textContent = playlist.title || '재생목록';
    btn.classList.toggle('is-active', playlist.key === memoryPlaylistActiveKey);
    btn.addEventListener('click', () => {
      if (playlist.key !== memoryPlaylistActiveKey) {
        switchMemoryPlaylist(playlist.key);
      }
    });
    pickerEl.appendChild(btn);
  });
}

function updateMemoryPlaylistMeta() {
  const descEl = document.querySelector('.memory-playlist__desc');
  const sourceEl = document.getElementById('memoryPlaylistSource');
  const count = memoryPlaylistItems.length;
  const playlistTitle = memoryPlaylistMeta.title || 'YouTube 재생목록';

  if (descEl) {
    descEl.innerHTML = `밤하늘 아래, <strong>${playlistTitle}</strong> 재생목록 ${count}곡을 불러옵니다.`;
  }
  if (sourceEl && memoryPlaylistMeta.url) {
    sourceEl.href = memoryPlaylistMeta.url;
    sourceEl.textContent = `${playlistTitle} · YouTube에서 보기`;
  }
}

function isBrokenPlaylistTitle(title, videoId) {
  if (!title) return true;
  if (title === videoId) return true;
  return /^[a-zA-Z0-9_-]{11}$/.test(title);
}

function mergePlaylistItems(feedItems, staticItems) {
  const staticById = new Map(staticItems.map((item) => [item.videoId, item]));

  return feedItems.map((item) => {
    const fallback = staticById.get(item.videoId);
    const title = isBrokenPlaylistTitle(item.title, item.videoId)
      ? (fallback?.title || item.title)
      : item.title;

    return {
      ...item,
      title,
      mood: item.mood || fallback?.mood || '노래',
      thumb: item.thumb || fallback?.thumb || `https://i.ytimg.com/vi/${item.videoId}/hqdefault.jpg`,
    };
  });
}

async function fetchMemoryPlaylistFeed(playlistId) {
  if (!playlistId) return null;
  try {
    const res = await fetch(`${PLAYLIST_FEED_API}?list=${encodeURIComponent(playlistId)}`, {
      cache: 'no-store',
    });
    if (!res.ok) return null;
    const data = await res.json();
    if (!Array.isArray(data.items) || !data.items.length) return null;
    return data;
  } catch {
    return null;
  }
}

async function loadMemoryPlaylistItems(key) {
  const playlist = memoryPlaylistCatalog.find((entry) => entry.key === key) || memoryPlaylistCatalog[0];
  if (!playlist) return false;

  memoryPlaylistActiveKey = playlist.key;
  memoryPlaylistMeta = { ...playlist };
  memoryPlaylistActiveIndex = -1;
  memoryPlaylistPlaying = false;
  updateNavMusicControls();

  const staticItems = getMemoryPlaylistStaticItems(playlist.key);
  const feed = await fetchMemoryPlaylistFeed(playlist.id);
  if (feed?.items?.length) {
    memoryPlaylistItems = withMainTrackFirst(mergePlaylistItems(feed.items, staticItems));
    if (feed.playlist) {
      memoryPlaylistMeta.title = feed.playlist.title || memoryPlaylistMeta.title;
      memoryPlaylistMeta.url = feed.playlist.url || memoryPlaylistMeta.url;
    }
  } else if (staticItems.length) {
    memoryPlaylistItems = withMainTrackFirst(staticItems);
  } else {
    memoryPlaylistItems = [];
  }

  return memoryPlaylistItems.length > 0;
}

async function switchMemoryPlaylist(key) {
  const previousPlaylistId = memoryPlaylistMeta?.id;
  const loaded = await loadMemoryPlaylistItems(key);
  if (!loaded) return;

  if (previousPlaylistId !== memoryPlaylistMeta.id || !memoryPlaylistPlayer) {
    destroyMemoryPlaylistPlayer();
    await initMemoryPlaylistPlayer();
  }

  renderMemoryPlaylistPicker();
  renderMemoryPlaylistTracks();
  updateMemoryPlaylistMeta();

  const section = document.getElementById('memory-playlist');
  if (section?.classList.contains('page-section--active')) {
    syncMemoryPlaylistWithBgm();
  }
}

function initNavMusicPlayer() {
  document.getElementById('navMusicPlay')?.addEventListener('click', resumeMemoryTrack);
  document.getElementById('navMusicPause')?.addEventListener('click', pauseMemoryTrack);
  document.getElementById('navMusicNext')?.addEventListener('click', nextMemoryTrack);
  updateNavMusicControls();
}

async function initMemoryPlaylist() {
  const section = document.getElementById('memory-playlist');
  const frameEl = document.getElementById('memoryPlaylistFrame');
  if (!section || !frameEl || !memoryPlaylistCatalog.length) return;

  initNavMusicPlayer();
  await initMemoryPlaylistPlayer();
  await switchMemoryPlaylist(memoryPlaylistActiveKey);

  document.addEventListener('memory-playlist:show', () => {
    syncMemoryPlaylistWithBgm();
  });

  document.addEventListener('memory-playlist:hide', () => {
    if (memoryPlaylistUsingOwnPlayer) {
      stopMemoryPlaylistPlayback();
    }
    window.SiteBgm?.resumeBgm?.();
  });

  if (section.classList.contains('page-section--active')) {
    syncMemoryPlaylistWithBgm();
  }
}

window.MemoryPlaylist = {
  isPlaying: () => memoryPlaylistUsingOwnPlayer && memoryPlaylistPlaying,
  pauseAll: stopMemoryPlaylistPlayback,
};

document.addEventListener('DOMContentLoaded', initMemoryPlaylist);
