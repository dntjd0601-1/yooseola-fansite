const PLAYLIST_FEED_API = '/.netlify/functions/youtube-playlist';

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

function getMemoryPlaylistStaticItems(key) {
  return Array.isArray(memoryPlaylistStaticData[key]) ? memoryPlaylistStaticData[key] : [];
}

function memoryPlaylistEmbedUrl(videoId, index, autoplay = '1') {
  const params = new URLSearchParams({
    autoplay,
    rel: '0',
    playsinline: '1',
    modestbranding: '1',
  });
  if (memoryPlaylistMeta.id) {
    params.set('list', memoryPlaylistMeta.id);
    params.set('index', String(index + 1));
  }
  if (location.origin && location.origin !== 'null') {
    params.set('origin', location.origin);
    params.set('widget_referrer', location.href.split('#')[0]);
  }
  return `https://www.youtube.com/embed/${encodeURIComponent(videoId)}?${params.toString()}`;
}

function getMemoryStartIndex(items) {
  const startId = memoryPlaylistMeta.startVideoId;
  if (!startId) return 0;
  const idx = items.findIndex((item) => item.videoId === startId);
  return idx >= 0 ? idx : 0;
}

function setMemoryPlaylistFrame(videoId, index) {
  const frameEl = document.getElementById('memoryPlaylistFrame');
  if (!frameEl || !videoId) return;

  const nextSrc = memoryPlaylistEmbedUrl(videoId, index);
  if (frameEl.src === nextSrc) {
    frameEl.src = 'about:blank';
    window.requestAnimationFrame(() => {
      frameEl.src = nextSrc;
    });
    return;
  }
  frameEl.src = nextSrc;
}

function playMemoryTrack(index) {
  const listEl = document.getElementById('memoryPlaylistTracks');
  const nowEl = document.getElementById('memoryPlaylistNow');
  const track = memoryPlaylistItems[index];
  if (!track || !listEl || !nowEl) return;

  memoryPlaylistActiveIndex = index;
  setMemoryPlaylistFrame(track.videoId, index);
  nowEl.textContent = track.title;

  listEl.querySelectorAll('.memory-playlist__track').forEach((btn, i) => {
    btn.classList.toggle('is-active', i === index);
    btn.setAttribute('aria-current', i === index ? 'true' : 'false');
  });
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

    body.append(title, mood);
    btn.append(thumb, body);
    btn.addEventListener('click', () => playMemoryTrack(index));
    item.appendChild(btn);
    fragment.appendChild(item);
  });

  listEl.appendChild(fragment);
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
    descEl.innerHTML = `밤하늘 아래, <strong>${playlistTitle}</strong> 재생목록 ${count}곡을 불러옵니다.<br>곡을 누르면 유튜브 재생목록 맥락으로 재생됩니다.`;
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

  const staticItems = getMemoryPlaylistStaticItems(playlist.key);
  const feed = await fetchMemoryPlaylistFeed(playlist.id);
  if (feed?.items?.length) {
    memoryPlaylistItems = mergePlaylistItems(feed.items, staticItems);
    if (feed.playlist) {
      memoryPlaylistMeta.title = feed.playlist.title || memoryPlaylistMeta.title;
      memoryPlaylistMeta.url = feed.playlist.url || memoryPlaylistMeta.url;
    }
  } else if (staticItems.length) {
    memoryPlaylistItems = [...staticItems];
  } else {
    memoryPlaylistItems = [];
  }

  return memoryPlaylistItems.length > 0;
}

async function switchMemoryPlaylist(key, autoplay = true) {
  const section = document.getElementById('memory-playlist');
  const loaded = await loadMemoryPlaylistItems(key);
  if (!loaded) return;

  renderMemoryPlaylistPicker();
  renderMemoryPlaylistTracks();
  updateMemoryPlaylistMeta();

  if (autoplay) {
    playMemoryTrack(getMemoryStartIndex(memoryPlaylistItems));
  } else if (section?.classList.contains('page-section--active')) {
    playMemoryTrack(getMemoryStartIndex(memoryPlaylistItems));
  }
}

async function initMemoryPlaylist() {
  const section = document.getElementById('memory-playlist');
  const frameEl = document.getElementById('memoryPlaylistFrame');
  if (!section || !frameEl || !memoryPlaylistCatalog.length) return;

  await switchMemoryPlaylist(memoryPlaylistActiveKey, false);

  document.addEventListener('memory-playlist:show', () => {
    if (memoryPlaylistActiveIndex < 0) {
      playMemoryTrack(getMemoryStartIndex(memoryPlaylistItems));
    }
  });

  if (section.classList.contains('page-section--active')) {
    playMemoryTrack(getMemoryStartIndex(memoryPlaylistItems));
  }
}

document.addEventListener('DOMContentLoaded', initMemoryPlaylist);
