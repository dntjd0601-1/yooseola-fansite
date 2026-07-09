/**
 * VOD Library — 숲 다시보기 | 유튜브 | 쇼츠 | 기타
 */

function buildYoutubeEmbed(videoId, autoplay = '1') {
  const params = new URLSearchParams({
    autoplay,
    rel: '0',
    playsinline: '1',
    modestbranding: '1',
  });
  if (location.origin && location.origin !== 'null') {
    params.set('origin', location.origin);
    params.set('widget_referrer', location.href.split('#')[0]);
  }
  return `https://www.youtube.com/embed/${encodeURIComponent(videoId)}?${params.toString()}`;
}

const VOD_ETC_PLAYLIST_ID = 'PLR2c_oelBOVU';
const VOD_PLAYLIST_API = '/.netlify/functions/youtube-playlist';

const VOD_DEFAULT = {
  type: 'youtube',
  title: '【끝났다는 것은 다시 시작된다는 것을】 버컴퍼니 1주년 커버곡',
  url: 'https://www.youtube.com/watch?v=XtVEV7wh76A',
  embedUrl: buildYoutubeEmbed('XtVEV7wh76A', '0'),
};

const VOD_MAX_ITEMS = 15;

const YOUTUBE_FEED_URL =
  'https://www.youtube.com/feeds/videos.xml?channel_id=UCCeCOBCcnkMxy7Hb09u8dxg';

let youtubeFeedPromise = null;

const VOD_SOURCES = {
  replay: {
    title: '숲 다시보기',
    moreUrl: 'https://www.sooplive.com/station/yeveee/vod',
    fetch: () =>
      fetch('https://chapi.sooplive.com/api/yeveee/vods/review?page=1&per_page=15&orderby=reg_date')
        .then((r) => r.json())
        .then((json) =>
          (json.data || []).map((item) => mapSoopItem(item.title_name, item.title_no, item))
        ),
  },
  youtube: {
    title: '유튜브',
    moreUrl: 'https://www.youtube.com/@yoo_seola/videos',
    // 롱폼만 — @yoo_seola/videos 탭 순서 (fetch_vod.ps1로 생성된 VOD_DATA 사용)
    fetch: () => Promise.resolve([]),
  },
  shorts: {
    title: '쇼츠',
    moreUrl: 'https://www.youtube.com/@yoo_seola/shorts',
    fetch: () => fetchYoutubeEntries().then((items) => items.filter((item) => isYoutubeShort(item.url))),
  },
  etc: {
    title: '기타',
    moreUrl: `https://www.youtube.com/playlist?list=${VOD_ETC_PLAYLIST_ID}`,
    fetch: () => fetchEtcPlaylist(),
  },
};

const vodCache = {};
let activeVodTab = 'etc';
let currentPlayerItem = { ...VOD_DEFAULT };

function isYoutubeShort(url) {
  return /youtube\.com\/shorts\//.test(url || '');
}

function mapYoutubePlaylistItem(item) {
  const videoId = item.videoId || extractYoutubeId(item.url);
  if (!videoId) return null;
  return {
    type: 'youtube',
    title: item.title || videoId,
    url: `https://www.youtube.com/watch?v=${videoId}`,
    embedUrl: buildYoutubeEmbed(videoId),
    thumb: item.thumb || `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
    date: item.date || '',
    duration: item.duration || '',
    views: Number(item.views) || 0,
  };
}

async function fetchEtcPlaylist() {
  const res = await fetch(`${VOD_PLAYLIST_API}?list=${encodeURIComponent(VOD_ETC_PLAYLIST_ID)}`);
  if (!res.ok) return [];
  const data = await res.json();
  return (data.items || []).map(mapYoutubePlaylistItem).filter(Boolean);
}

function fetchYoutubeEntries() {
  if (!youtubeFeedPromise) {
    youtubeFeedPromise = fetch(YOUTUBE_FEED_URL)
      .then((r) => r.text())
      .then(parseYoutubeFeed)
      .catch(() => []);
  }
  return youtubeFeedPromise;
}

function mapSoopItem(title, titleNo, raw) {
  return {
    type: 'soop',
    title,
    url: `https://vod.sooplive.com/player/${titleNo}`,
    embedUrl: buildSoopEmbed(titleNo),
    thumb: raw?.ucc?.thumb
      ? raw.ucc.thumb.startsWith('//')
        ? `https:${raw.ucc.thumb}`
        : raw.ucc.thumb
      : '',
    date: formatVodDate(raw?.reg_date),
    duration: formatVodDuration(raw?.ucc?.total_file_duration),
    views: raw?.count?.vod_read_cnt || 0,
  };
}

function buildSoopEmbed(titleNo) {
  return `https://vod.sooplive.com/player/${titleNo}?embed=true&autoPlay=true`;
}

function formatVodDate(value) {
  if (!value) return '';
  if (/^\d+$/.test(value)) {
    const d = new Date(Number(value));
    return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;
  }
  if (/^\d{4}-\d{2}-\d{2}/.test(value)) {
    return value.slice(0, 10).replace(/-/g, '.');
  }
  const d = new Date(value);
  if (!Number.isNaN(d.getTime())) {
    return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;
  }
  return value;
}

function formatVodDuration(ms) {
  if (!ms) return '';
  const total = Math.floor(ms / 1000);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  return `${m}:${String(s).padStart(2, '0')}`;
}

function extractYoutubeId(url) {
  if (!url) return '';
  const shorts = url.match(/youtube\.com\/shorts\/([^?&#/]+)/);
  if (shorts) return shorts[1];
  const watch = url.match(/[?&]v=([^?&#/]+)/);
  if (watch) return watch[1];
  const youtu = url.match(/youtu\.be\/([^?&#/]+)/);
  if (youtu) return youtu[1];
  return '';
}

function youtubeThumbUrls(videoId) {
  if (!videoId) return [];
  return [
    `https://i.ytimg.com/vi/${videoId}/maxresdefault.jpg`,
    `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
    `https://i.ytimg.com/vi/${videoId}/mqdefault.jpg`,
  ];
}

function attachYoutubeThumb(img, videoId, customThumb = '') {
  const urls = youtubeThumbUrls(videoId);
  if (!urls.length && customThumb) {
    img.src = customThumb;
    return;
  }
  if (!urls.length) return;

  let idx = 0;
  const markLoaded = () => img.classList.add('is-loaded');
  const tryNext = () => {
    if (idx >= urls.length - 1) return;
    idx += 1;
    img.src = urls[idx];
  };

  img.classList.remove('is-loaded');
  img.onload = () => {
    if (img.naturalWidth <= 120 && idx < urls.length - 1) {
      tryNext();
      return;
    }
    markLoaded();
  };
  img.onerror = tryNext;

  img.src = urls[0];
  if (img.complete && img.naturalWidth > 120) markLoaded();
}

function extractSoopId(text) {
  if (!text) return '';
  const match = text.match(/player\/(\d+)/) || text.match(/vod\.sooplive\.com\/(?:player|STATION)\/(\d+)/i);
  return match?.[1] || '';
}

function parseYoutubeFeed(xmlText) {
  const doc = new DOMParser().parseFromString(xmlText, 'text/xml');
  const entries = [...doc.querySelectorAll('entry')];
  return entries.map((entry) => {
    const videoId = entry.querySelector('videoId')?.textContent || '';
    const title =
      entry.querySelector('media\\:group media\\:title')?.textContent ||
      entry.querySelector('title')?.textContent ||
      '';
    const link =
      entry.querySelector('link[rel="alternate"]')?.getAttribute('href') ||
      `https://www.youtube.com/watch?v=${videoId}`;
    const published = entry.querySelector('published')?.textContent || '';
    const views = entry.querySelector('media\\:statistics')?.getAttribute('views') || '0';
    return {
      type: 'youtube',
      title,
      url: link,
      embedUrl: buildYoutubeEmbed(videoId),
      thumb: `https://i.ytimg.com/vi/${videoId}/maxresdefault.jpg`,
      date: formatVodDate(published),
      duration: '',
      views: Number(views) || 0,
    };
  });
}

function formatViews(n) {
  if (!n) return '';
  if (n >= 10000) return `조회 ${(n / 10000).toFixed(1).replace(/\.0$/, '')}만`;
  return `조회 ${n.toLocaleString('ko-KR')}`;
}

function normalizeItems(key, items) {
  return items.map((item) => {
    if (key === 'replay') {
      const id = extractSoopId(item.url) || extractSoopId(item.embedUrl);
      return {
        ...item,
        type: 'soop',
        embedUrl: id ? buildSoopEmbed(id) : item.embedUrl || item.url,
      };
    }
    if (key === 'youtube' || key === 'shorts' || key === 'etc') {
      const id = extractYoutubeId(item.url);
      return {
        ...item,
        type: 'youtube',
        embedUrl: id ? buildYoutubeEmbed(id) : item.embedUrl || item.url,
      };
    }
    return item;
  });
}

function isSameVodItem(a, b) {
  if (!a || !b) return false;
  if (a.url === b.url) return true;
  if (a.type === 'youtube' && b.type === 'youtube') {
    return extractYoutubeId(a.url) === extractYoutubeId(b.url);
  }
  if (a.type === 'soop' && b.type === 'soop') {
    return extractSoopId(a.url) === extractSoopId(b.url);
  }
  return a.embedUrl && a.embedUrl === b.embedUrl;
}

function highlightActiveCard() {
  document.querySelectorAll('.vod-card--active').forEach((el) => el.classList.remove('vod-card--active'));
  document.querySelectorAll('.vod-card').forEach((card) => {
    const url = card.dataset.url;
    if (url === currentPlayerItem.url) {
      card.classList.add('vod-card--active');
      return;
    }
    if (currentPlayerItem.type === 'youtube') {
      const cardId = extractYoutubeId(url);
      const currentId = extractYoutubeId(currentPlayerItem.url);
      if (cardId && cardId === currentId) card.classList.add('vod-card--active');
    }
    if (currentPlayerItem.type === 'soop') {
      const cardId = extractSoopId(url);
      const currentId = extractSoopId(currentPlayerItem.url);
      if (cardId && cardId === currentId) card.classList.add('vod-card--active');
    }
  });
}

function isFileProtocol() {
  return location.protocol === 'file:';
}

function hideYoutubeFallback() {
  const frame = document.getElementById('vodPlayerFrame');
  const fallback = document.getElementById('vodPlayerFallback');
  if (frame) frame.hidden = false;
  if (fallback) fallback.hidden = true;
}

function showYoutubeFallback(item) {
  const frame = document.getElementById('vodPlayerFrame');
  const fallback = document.getElementById('vodPlayerFallback');
  const thumb = document.getElementById('vodFallbackThumb');
  const watch = document.getElementById('vodFallbackWatch');
  if (!frame || !fallback) return;

  frame.hidden = true;
  frame.src = 'about:blank';
  fallback.hidden = false;

  const videoId = extractYoutubeId(item.url);
  if (thumb) {
    thumb.alt = item.title || '';
    if (videoId) attachYoutubeThumb(thumb, videoId, item.thumb);
    else if (item.thumb) thumb.src = item.thumb;
  }
  if (watch) watch.href = item.url || '#';
}

function loadIframe(frame, embedUrl) {
  frame.setAttribute('referrerpolicy', 'strict-origin-when-cross-origin');
  frame.setAttribute(
    'allow',
    'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share'
  );
  frame.removeAttribute('sandbox');
  frame.src = embedUrl;
}

function showVodPoster(item) {
  const poster = document.getElementById('vodPlayerPoster');
  const img = document.getElementById('vodPosterImg');
  const frame = document.getElementById('vodPlayerFrame');
  if (!poster || !img || !frame) return;

  hideYoutubeFallback();
  frame.src = 'about:blank';
  poster.hidden = false;

  const youtubeId = extractYoutubeId(item.url);
  if (youtubeId) {
    attachYoutubeThumb(img, youtubeId, item.thumb);
    img.alt = item.title || '';
  } else if (item.thumb) {
    img.src = item.thumb;
    img.alt = item.title || '';
  } else {
    img.removeAttribute('src');
    img.alt = '';
  }
}

function hideVodPoster() {
  const poster = document.getElementById('vodPlayerPoster');
  if (poster) poster.hidden = true;
}

function playVodPlayer(item = currentPlayerItem) {
  const frame = document.getElementById('vodPlayerFrame');
  if (!frame || !item?.embedUrl && !item?.url) return;

  hideVodPoster();

  if (item.type === 'youtube' && isFileProtocol()) {
    showYoutubeFallback(item);
    return;
  }

  hideYoutubeFallback();
  const youtubeId = extractYoutubeId(item.url);
  const embedUrl =
    item.type === 'youtube' && youtubeId
      ? buildYoutubeEmbed(youtubeId, '1')
      : item.embedUrl || item.url;
  loadIframe(frame, embedUrl);
}

function setVodPlayer(item, autoplay = false) {
  const frame = document.getElementById('vodPlayerFrame');
  const titleEl = document.getElementById('vodPlayerTitle');
  const linkEl = document.getElementById('vodPlayerLink');
  const player = document.querySelector('.vod-player');
  if (!frame || !titleEl || !linkEl) return;
  if (!item?.embedUrl && !item?.url) return;

  currentPlayerItem = item;
  frame.title = item.title;
  titleEl.textContent = item.title;
  linkEl.href = item.url;
  linkEl.textContent = '원본 보기';

  if (item.type === 'youtube' && isFileProtocol()) {
    hideVodPoster();
    showYoutubeFallback(item);
  } else if (autoplay) {
    playVodPlayer(item);
  } else {
    showVodPoster(item);
  }

  highlightActiveCard();
  player?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function resolveVodThumb(item) {
  const youtubeId = extractYoutubeId(item.url);
  if (youtubeId) return `https://i.ytimg.com/vi/${youtubeId}/maxresdefault.jpg`;
  return item.thumb || '';
}

function attachVodThumb(img, item) {
  const youtubeId = extractYoutubeId(item.url);
  if (youtubeId) {
    attachYoutubeThumb(img, youtubeId, item.thumb);
    return;
  }
  if (!item.thumb) return;

  const markLoaded = () => img.classList.add('is-loaded');
  img.addEventListener('load', markLoaded, { once: true });
  img.src = item.thumb;
  if (img.complete && img.naturalWidth > 0) markLoaded();
}

function createVodCard(item, tag, index = 0) {
  const card = document.createElement('button');
  card.type = 'button';
  card.className = 'vod-card';
  card.dataset.url = item.url;
  if (isSameVodItem(item, currentPlayerItem)) card.classList.add('vod-card--active');

  const thumb = document.createElement('div');
  thumb.className = 'vod-card__thumb';

  const thumbUrl = resolveVodThumb(item);
  if (thumbUrl) {
    const img = document.createElement('img');
    img.src = thumbUrl;
    img.alt = '';
    img.width = 320;
    img.height = 180;
    img.decoding = 'async';
    img.referrerPolicy = 'no-referrer';
    img.loading = index < 6 ? 'eager' : 'lazy';
    if (index < 3) img.fetchPriority = 'high';
    img.className = 'vod-card__img';
    attachVodThumb(img, item);
    thumb.appendChild(img);
  } else {
    const ph = document.createElement('div');
    ph.className = 'vod-card__placeholder';
    thumb.appendChild(ph);
  }

  const badge = document.createElement('span');
  badge.className = 'vod-card__tag';
  badge.textContent = tag;
  thumb.appendChild(badge);

  if (item.duration) {
    const dur = document.createElement('span');
    dur.className = 'vod-card__duration';
    dur.textContent = item.duration;
    thumb.appendChild(dur);
  }

  const body = document.createElement('div');
  body.className = 'vod-card__body';

  const title = document.createElement('h3');
  title.className = 'vod-card__title';
  title.textContent = item.title;
  body.appendChild(title);

  const meta = document.createElement('p');
  meta.className = 'vod-card__meta';
  const parts = [item.date, formatViews(item.views)].filter(Boolean);
  meta.textContent = parts.join(' · ');
  body.appendChild(meta);

  card.appendChild(thumb);
  card.appendChild(body);
  card.addEventListener('click', () => setVodPlayer(item, true));

  return card;
}

function updateMoreLink(key) {
  const more = document.getElementById('vodMoreLink');
  const source = VOD_SOURCES[key];
  if (more && source) more.href = source.moreUrl;
}

function renderVodGrid(key) {
  if (key !== activeVodTab) return;
  const grid = document.getElementById('vodGrid');
  const source = VOD_SOURCES[key];
  if (!grid || !source) return;

  updateMoreLink(key);
  const items = (vodCache[key] || []).slice(0, VOD_MAX_ITEMS);
  grid.replaceChildren();
  items.forEach((item, index) => grid.appendChild(createVodCard(item, source.title, index)));
  highlightActiveCard();
}

async function loadVodCategory(key) {
  const dataKey = key === 'shorts' ? 'shorts' : key;
  const fallback = normalizeItems(
    key,
    (typeof VOD_DATA !== 'undefined' ? VOD_DATA[dataKey] || [] : []).slice(0, VOD_MAX_ITEMS)
  );
  vodCache[key] = fallback;
  renderVodGrid(key);

  try {
    const items = await VOD_SOURCES[key].fetch();
    if (items?.length) {
      vodCache[key] = normalizeItems(key, items).slice(0, VOD_MAX_ITEMS);
      renderVodGrid(key);
    }
  } catch (_) {
    /* keep fallback */
  }
}

function switchVodTab(key) {
  activeVodTab = key;
  const filters = document.getElementById('vodFilters');
  filters?.querySelectorAll('.vod-filter-btn').forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.vodFilter === key);
  });
  renderVodGrid(key);
}

function getEtcDefaultItem() {
  const items = normalizeItems(
    'etc',
    (typeof VOD_DATA !== 'undefined' ? VOD_DATA.etc || [] : []).slice(0, 1)
  );
  if (items[0]) return items[0];
  return {
    ...VOD_DEFAULT,
    embedUrl: buildYoutubeEmbed(extractYoutubeId(VOD_DEFAULT.url), '0'),
  };
}

function initVodLibrary() {
  const layout = document.getElementById('vodLayout');
  const filters = document.getElementById('vodFilters');
  if (!layout || !filters) return;

  ['replay', 'youtube', 'shorts', 'etc'].forEach((key) => {
    loadVodCategory(key);
  });

  const defaultItem = getEtcDefaultItem();
  switchVodTab('etc');
  setVodPlayer({
    ...defaultItem,
    embedUrl: defaultItem.embedUrl || buildYoutubeEmbed(extractYoutubeId(defaultItem.url), '0'),
  });

  document.getElementById('vodPlayerPoster')?.addEventListener('click', () => {
    playVodPlayer(currentPlayerItem);
  });

  filters.addEventListener('click', (e) => {
    const btn = e.target.closest('.vod-filter-btn');
    if (!btn) return;
    switchVodTab(btn.dataset.vodFilter);
  });
}

document.addEventListener('DOMContentLoaded', initVodLibrary);
