/**
 * 유설아 Fan Site — Main Script
 */

function cleanTitle(title) {
  return (title || '')
    .split(/\n+/)
    .map((line) => line
      .replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/gu, '')
      .replace(/\s*\+\s*\+\s*/g, ' + ')
      .replace(/\s*\+\s*$/g, '')
      .replace(/^\s*\+\s*/g, '')
      .replace(/\s{2,}/g, ' ')
      .trim())
    .filter(Boolean)
    .join('\n');
}

function decodeScheduleTitle(title) {
  const el = document.createElement('textarea');
  el.innerHTML = title || '';
  return cleanTitle(el.value);
}

function isScheduleOff(ev) {
  if (!ev) return false;
  if (ev.type === 'special' || ev.type === 'celebration') return false;
  if (ev.type === 'off') return true;
  const plain = decodeScheduleTitle(ev.title);
  if (!plain) return false;
  return plain === '휴방' || plain === '튜방' || /^휴방\b/.test(plain);
}

function getScheduleKind(ev) {
  if (!ev) return 'live';
  if (ev.type === 'celebration') return 'celebration';
  if (ev.type === 'special') return 'special';
  if (ev.type === 'off' || isScheduleOff(ev)) return 'off';
  return 'live';
}

function getScheduleDisplay(ev) {
  const kind = getScheduleKind(ev);
  const plain = decodeScheduleTitle(ev.title);
  if (kind === 'celebration') {
    return { kind, off: false, badge: '🎉 축하', title: plain };
  }
  if (kind === 'special') {
    return { kind, off: false, badge: '일정', title: plain };
  }
  if (kind === 'off') {
    if (plain === '휴방' || plain === '튜방') {
      return { kind, off: true, badge: '휴방', title: '' };
    }
    const rest = plain.replace(/^휴방\s*\+?\s*/, '').trim();
    return { kind, off: true, badge: '휴방', title: rest };
  }
  return { kind: 'live', off: false, badge: '방송', title: plain };
}

function getCombinedScheduleDisplay(events) {
  if (!events?.length) return null;

  const displays = events.map(getScheduleDisplay);
  const kindPriority = { celebration: 4, special: 3, off: 2, live: 1 };
  const kind = displays.reduce(
    (best, display) => (kindPriority[display.kind] > kindPriority[best] ? display.kind : best),
    'live'
  );
  const primary = displays.find((display) => display.kind === kind) || displays[0];
  const titles = events
    .map((ev) => decodeScheduleTitle(ev.title))
    .flatMap((text) => text.split(/\n+/).map((part) => part.trim()).filter(Boolean));

  return {
    kind,
    off: kind === 'off',
    badge: primary.badge,
    title: titles.join('\n'),
  };
}

const SCHEDULE_OVERRIDE_URL =
  'https://dntjd0601-1.github.io/yooseola-fansite/schedule-overrides.json';

async function loadScheduleOverrides() {
  if (typeof SCHEDULE_EVENTS === 'undefined') return;

  try {
    const res = await fetch(`${SCHEDULE_OVERRIDE_URL}?v=${Date.now()}`);
    if (!res.ok) return;
    const overrides = await res.json();
    Object.entries(overrides).forEach(([date, events]) => {
      SCHEDULE_EVENTS[date] = events;
    });
  } catch (_) {}
}

document.addEventListener('DOMContentLoaded', async () => {
  await loadScheduleOverrides();
  initPageViews();
  initNavigation();
  initHeroSchedule();
  initHeroLive();
  initCalendar();
  initMonthlySeola();
  initScrollReveal();
  initGallery();
});

const SOOP_BJ_ID = 'yeveee';
const SOOP_LIVE_API = '/.netlify/functions/soop-live';
const SOOP_LIVE_POLL_MS = 90_000;
const SOOP_LIVE_THUMB_FALLBACK = 'images/hero-seola.png';

function normalizeSoopThumb(url) {
  if (!url) return '';
  return url.startsWith('//') ? `https:${url}` : url;
}

async function fetchSoopLiveStatus() {
  try {
    const res = await fetch(SOOP_LIVE_API);
    if (!res.ok) return null;
    const data = await res.json();
    if (!data?.live || !data.broadNo) return null;

    return {
      broadNo: data.broadNo,
      title: decodeScheduleTitle(data.title || 'SOOP 생방송'),
      thumb: normalizeSoopThumb(data.thumb || ''),
    };
  } catch {
    return null;
  }
}


function initHeroLive() {
  const card = document.getElementById('heroLiveBtn');
  const thumbEl = document.getElementById('heroLiveThumb');
  const titleEl = document.getElementById('heroLiveTitle');
  if (!card) return;

  const update = async () => {
    const live = await fetchSoopLiveStatus();
    if (!live) {
      card.hidden = true;
      return;
    }

    card.hidden = false;
    card.href = `https://play.sooplive.com/${SOOP_BJ_ID}/${live.broadNo}`;
    card.setAttribute('aria-label', `${live.title} SOOP 생방송 보러가기`);

    if (titleEl) titleEl.textContent = live.title;
    if (thumbEl) thumbEl.src = live.thumb || SOOP_LIVE_THUMB_FALLBACK;
  };

  update();
  setInterval(update, SOOP_LIVE_POLL_MS);
}

/* ── Gallery ── */
const GALLERY_BATCH_SIZE = 24;
const GALLERY_FEED_API = '/.netlify/functions/gallery-feed';
const GALLERY_DOWNLOAD_API = '/.netlify/functions/gallery-download';
const GALLERY_ARTICLE_IMAGES_API = '/.netlify/functions/gallery-article-images';
const gallerySourceLabel = {
  'fan-cafe': '팬카페',
  'cafe-photo': '카페 사진',
  'v-company': '버컴퍼니',
};

let galleryItems = [];
let galleryRendered = 0;
let galleryLoading = false;
let galleryObserver = null;
let galleryFeedLoaded = false;

function getGalleryItems() {
  return galleryItems;
}

function isCafeGallerySource(source) {
  return source === 'fan-cafe' || source === 'cafe-photo';
}

function sanitizeGalleryUrl(url) {
  if (!url) return '';
  return String(url)
    .trim()
    .replace(/^["']+|["']+$/g, '')
    .replace(/\?type=w\d+"?$/i, '');
}

function normalizeGalleryItem(item) {
  const images = Array.isArray(item.images)
    ? item.images.map(sanitizeGalleryUrl).filter(Boolean)
    : item.images;
  const src = sanitizeGalleryUrl(item.src) || (images?.[0] || '');
  const imageCount = Math.max(item.imageCount || 0, images?.length || 0, src ? 1 : 0);

  return {
    ...item,
    src,
    imageCount: images?.length || imageCount,
    images: images?.length ? images : (src ? [src] : []),
  };
}

function mergeGalleryImageList(items) {
  const images = [];
  const seen = new Set();
  for (const item of items) {
    const list = Array.isArray(item.images) && item.images.length ? item.images : [item.src];
    for (const src of list) {
      if (!src || seen.has(src)) continue;
      seen.add(src);
      images.push(src);
    }
  }
  return images;
}

/** 그리드에는 글(post)당 대표 썸네일 1장만 표시 */
function getGalleryGridEntries() {
  const items = getGalleryItems();
  const entries = [];
  const seenPosts = new Set();

  for (let i = 0; i < items.length; i += 1) {
    const item = items[i];
    if (!item.postId || !isCafeGallerySource(item.source)) {
      entries.push({ index: i, item });
      continue;
    }

    const key = `${item.source}:${item.postId}`;
    if (seenPosts.has(key)) continue;
    seenPosts.add(key);

    const group = items.filter(
      (candidate) =>
        candidate.postId === item.postId && candidate.source === item.source
    );
    group.sort((a, b) => (a.imageIndex || 0) - (b.imageIndex || 0));

    const images = mergeGalleryImageList(group);
    const imageCount = Math.max(
      images.length,
      ...group.map((entry) => entry.imageCount || 0)
    );

    entries.push({
      index: i,
      item: {
        ...item,
        src: images[0] || item.src,
        imageIndex: 0,
        imageCount,
        images: images.length ? images : item.images,
      },
    });
  }

  return entries;
}

async function fetchGalleryFeed() {
  const statusEl = document.getElementById('galleryStatus');
  if (statusEl) statusEl.textContent = '최신 사진을 불러오는 중…';

  try {
    const res = await fetch(GALLERY_FEED_API, { cache: 'no-store' });
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data.items) && data.items.length) {
        return data.items.map(normalizeGalleryItem);
      }
    }
  } catch {
    /* fallback below */
  }

  if (typeof GALLERY_DATA !== 'undefined' && GALLERY_DATA.length) {
    return GALLERY_DATA.map(normalizeGalleryItem);
  }

  return [];
}

async function initGallery() {
  galleryItems = await fetchGalleryFeed();
  galleryFeedLoaded = true;
  initGalleryGrid();
  initGalleryLightbox();
}

function createGalleryItem(item, index) {
  const figure = document.createElement('figure');
  figure.className = 'gallery__item reveal';
  if (index % 5 === 1) figure.classList.add('gallery__item--wide');
  if (index % 7 === 4) figure.classList.add('gallery__item--tall');
  figure.dataset.index = String(index);

  const img = document.createElement('img');
  img.className = 'gallery__img';
  img.src = item.src;
  img.alt = item.caption || '';
  img.loading = 'lazy';
  img.referrerPolicy = 'no-referrer';

  const caption = document.createElement('figcaption');
  const tag = gallerySourceLabel[item.source] || item.source;
  caption.textContent = `${tag} · ${item.caption}`;

  const photoCount = Math.max(item.imageCount || 0, item.images?.length || 0);
  if (photoCount > 1) {
    const badge = document.createElement('span');
    badge.className = 'gallery__badge';
    badge.textContent = `${photoCount}장`;
    figure.appendChild(badge);
  }

  figure.appendChild(img);
  figure.appendChild(caption);
  return figure;
}

function updateGalleryMeta() {
  const total = getGalleryGridEntries().length;
  const countEl = document.getElementById('galleryCount');
  const statusEl = document.getElementById('galleryStatus');
  if (countEl) {
    countEl.textContent = total ? `총 ${total}장 · ${galleryRendered}장 표시 중` : '';
  }
  if (statusEl) {
    if (!galleryFeedLoaded) {
      statusEl.textContent = '최신 사진을 불러오는 중…';
    } else if (!total) {
      statusEl.textContent = '표시할 사진이 없습니다.';
    } else if (galleryRendered >= total) {
      statusEl.textContent = '모든 사진을 불러왔습니다.';
    } else {
      statusEl.textContent = '스크롤하면 더 많은 사진이 표시됩니다.';
    }
  }
}

function appendGalleryBatch() {
  const grid = document.getElementById('galleryGrid');
  const entries = getGalleryGridEntries();
  if (!grid || !entries.length) return false;
  if (galleryLoading || galleryRendered >= entries.length) return false;

  galleryLoading = true;
  const end = Math.min(galleryRendered + GALLERY_BATCH_SIZE, entries.length);
  const fragment = document.createDocumentFragment();

  for (let i = galleryRendered; i < end; i++) {
    const { item, index } = entries[i];
    fragment.appendChild(createGalleryItem(item, index));
  }

  grid.appendChild(fragment);
  galleryRendered = end;
  galleryLoading = false;
  updateGalleryMeta();

  const newItems = grid.querySelectorAll('.gallery__item:not(.visible)');
  if (revealObserver) {
    newItems.forEach((el) => revealObserver.observe(el));
  }

  if (galleryRendered >= entries.length && galleryObserver) {
    const sentinel = document.getElementById('gallerySentinel');
    if (sentinel) galleryObserver.unobserve(sentinel);
  }

  return galleryRendered < entries.length;
}

function initGalleryInfiniteScroll() {
  const sentinel = document.getElementById('gallerySentinel');
  const entries = getGalleryGridEntries();
  if (!sentinel || !entries.length) return;

  if (galleryObserver) galleryObserver.disconnect();
  galleryObserver = new IntersectionObserver(
    (entries) => {
      if (entries.some((entry) => entry.isIntersecting)) {
        appendGalleryBatch();
      }
    },
    { rootMargin: '320px 0px' }
  );
  galleryObserver.observe(sentinel);
}

function refreshGallerySection() {
  const gallery = document.getElementById('gallery');
  if (!gallery || !galleryFeedLoaded) return;

  gallery.querySelectorAll('.gallery__item.reveal').forEach((el) => {
    el.classList.add('visible');
  });

  if (getGalleryItems().length && galleryRendered === 0) {
    appendGalleryBatch();
  }

  initGalleryInfiniteScroll();
}

function initGalleryGrid() {
  const grid = document.getElementById('galleryGrid');
  if (!grid) return;

  galleryRendered = 0;
  galleryLoading = false;
  grid.replaceChildren();
  updateGalleryMeta();

  if (!getGalleryItems().length) return;

  appendGalleryBatch();
  initGalleryInfiniteScroll();
}

/* ── Hero Schedule — 오늘 / 내일 ── */
function initHeroSchedule() {
  const root = document.getElementById('heroSchedule');
  if (!root || typeof SCHEDULE_EVENTS === 'undefined') return;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const days = [0, 1].map((offset) => {
    const date = new Date(today);
    date.setDate(date.getDate() + offset);
    return date;
  });

  root.replaceChildren();
  days.forEach((date, index) => {
    root.appendChild(createHeroScheduleCard(date, index === 0 ? '오늘' : '내일'));
  });
}

function formatScheduleDateKey(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function formatHeroScheduleLabel(date) {
  const weekdays = ['일', '월', '화', '수', '목', '금', '토'];
  return `${date.getMonth() + 1}.${date.getDate()} (${weekdays[date.getDay()]})`;
}

function createHeroScheduleCard(date, label) {
  const dateKey = formatScheduleDateKey(date);
  const events = SCHEDULE_EVENTS[dateKey] || [];

  const card = document.createElement('a');
  card.className = 'hero__schedule-card';
  card.href = '#schedule';

  const head = document.createElement('div');
  head.className = 'hero__schedule-head';
  head.textContent = `${label} · ${formatHeroScheduleLabel(date)}`;
  card.appendChild(head);

  const body = document.createElement('div');
  body.className = 'hero__schedule-body';

  if (!events.length) {
    const empty = document.createElement('p');
    empty.className = 'hero__schedule-empty';
    empty.textContent = '등록된 일정이 없습니다';
    body.appendChild(empty);
  } else {
    const display = getCombinedScheduleDisplay(events);
    const item = document.createElement('div');
    item.className = `hero__schedule-item${display.kind !== 'live' ? ` hero__schedule-item--${display.kind}` : ''}`;

    const badge = document.createElement('span');
    badge.className = 'hero__schedule-badge';
    badge.textContent = display.badge;
    item.appendChild(badge);

    if (display.title) {
      const title = document.createElement('p');
      title.className = 'hero__schedule-title';
      title.textContent = display.title;
      item.appendChild(title);
    }

    body.appendChild(item);
  }

  card.appendChild(body);
  return card;
}

/* ── Page Views — 접속 시 홈만 표시 ── */
function initPageViews() {
  const sections = document.querySelectorAll('main > section[id]');
  const navLinks = document.querySelectorAll('.nav__link[href^="#"]');
  const hashLinks = document.querySelectorAll('a[href^="#"]:not(.nav__link)');

  function showSection(id, { updateHash = true } = {}) {
    const target = document.getElementById(id);
    if (!target) return;

    sections.forEach((section) => {
      section.classList.toggle('page-section--active', section.id === id);
    });

    navLinks.forEach((link) => {
      link.classList.toggle('active', link.getAttribute('href') === `#${id}`);
    });

    const wasMemoryPlaylist = document.body.classList.contains('is-memory-playlist');

    document.body.classList.toggle('is-home', id === 'home');
    document.body.classList.toggle('is-memory-playlist', id === 'memory-playlist');

    target.querySelectorAll('.reveal').forEach((el) => el.classList.add('visible'));

    if (updateHash) {
      history.replaceState(null, '', `#${id}`);
    }

    if (id === 'memory-playlist') {
      document.dispatchEvent(new CustomEvent('memory-playlist:show'));
    } else if (wasMemoryPlaylist) {
      document.dispatchEvent(new CustomEvent('memory-playlist:hide'));
    }

    if (id === 'gallery') {
      refreshGallerySection();
    }

    if (id === 'home') {
      document.dispatchEvent(new CustomEvent('home:show'));
    }

    window.scrollTo(0, 0);
  }

  const initialHash = location.hash.slice(1);
  const initialSection =
    initialHash && document.getElementById(initialHash) ? initialHash : 'home';
  showSection(initialSection, { updateHash: !!initialHash });

  navLinks.forEach((link) => {
    link.addEventListener('click', (e) => {
      const id = link.getAttribute('href').slice(1);
      if (!document.getElementById(id)) return;
      e.preventDefault();
      showSection(id);
    });
  });

  hashLinks.forEach((link) => {
    link.addEventListener('click', (e) => {
      const href = link.getAttribute('href');
      if (!href || href === '#') return;
      const id = href.slice(1);
      if (!document.getElementById(id)) return;
      e.preventDefault();
      showSection(id);
    });
  });

  window.addEventListener('hashchange', () => {
    const id = location.hash.slice(1);
    if (id && document.getElementById(id)) {
      showSection(id, { updateHash: false });
    }
  });
}

/* ── Calendar ── */
function initCalendar() {
  const calendarDays = document.getElementById('calendarDays');
  const calendarTitle = document.getElementById('calendarTitle');
  const calendarEl = document.getElementById('calendar');
  const prevBtn = document.getElementById('calendarPrev');
  const nextBtn = document.getElementById('calendarNext');
  const todayBtn = document.getElementById('calendarToday');

  if (!calendarDays || !calendarTitle) return;

  const today = new Date();
  let viewYear = today.getFullYear();
  let viewMonth = today.getMonth();
  let viewWeekStart = getWeekStart(today);
  let viewMode = 'month';

  function formatDate(date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  function getWeekStart(date) {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() - d.getDay());
    return d;
  }

  function getEvents(dateStr) {
    return SCHEDULE_EVENTS[dateStr] || [];
  }

  function updateTitle() {
    if (viewMode === 'month') {
      calendarTitle.textContent = `${viewYear}년 ${viewMonth + 1}월`;
      return;
    }
    const weekEnd = new Date(viewWeekStart);
    weekEnd.setDate(weekEnd.getDate() + 6);
    if (viewWeekStart.getMonth() === weekEnd.getMonth()) {
      calendarTitle.textContent = `${viewWeekStart.getFullYear()}년 ${viewWeekStart.getMonth() + 1}월`;
    } else {
      calendarTitle.textContent = `${viewWeekStart.getFullYear()}년 ${viewWeekStart.getMonth() + 1}월 – ${weekEnd.getMonth() + 1}월`;
    }
  }

  function createEventEl(events) {
    const display = getCombinedScheduleDisplay(events);
    if (!display) return null;

    const item = document.createElement('div');
    item.className = `cal-event cal-event--${display.kind}`;

    const badge = document.createElement('span');
    badge.className = 'cal-event__badge';
    badge.textContent = display.badge;
    item.appendChild(badge);

    if (display.title) {
      const title = document.createElement('p');
      title.className = 'cal-event__title';
      title.textContent = display.title;
      item.appendChild(title);
    }

    return item;
  }

  function createDayCell(date, { inMonth = true } = {}) {
    const dateStr = formatDate(date);
    const day = date.getDate();
    const dayOfWeek = date.getDay();
    const events = getEvents(dateStr);
    const todayStr = formatDate(today);

    const cell = document.createElement('div');
    cell.className = 'cal-cell';
    cell.dataset.date = dateStr;
    if (!inMonth) cell.classList.add('cal-cell--muted');
    if (dayOfWeek === 0) cell.classList.add('cal-cell--sunday');
    if (dayOfWeek === 6) cell.classList.add('cal-cell--saturday');
    if (dateStr === todayStr) cell.classList.add('cal-cell--today');
    if (events.some((ev) => ev.type === 'celebration')) cell.classList.add('cal-cell--celebration');

    const head = document.createElement('div');
    head.className = 'cal-cell__head';

    const weekdays = ['일', '월', '화', '수', '목', '금', '토'];
    const num = document.createElement('span');
    num.className = 'cal-cell__date';
    num.dataset.weekday = weekdays[dayOfWeek];
    num.textContent = day;
    if (dateStr === todayStr) {
      const dot = document.createElement('i');
      dot.className = 'cal-cell__today-dot';
      num.appendChild(dot);
    }
    head.appendChild(num);

    if (events.length) {
      const mark = document.createElement('span');
      mark.className = `cal-cell__mark cal-cell__mark--${getScheduleKind(events[0])}`;
      mark.setAttribute('aria-label', '일정 있음');
      head.appendChild(mark);
    }
    cell.appendChild(head);

    if (events.length) {
      const list = document.createElement('div');
      list.className = 'cal-cell__events';
      const eventEl = createEventEl(events);
      if (eventEl) list.appendChild(eventEl);
      cell.appendChild(list);
    }

    return cell;
  }

  function renderMonthGrid() {
    calendarDays.className = 'schedule-board__grid schedule-board__grid--month';
    calendarDays.innerHTML = '';

    const firstDay = new Date(viewYear, viewMonth, 1);
    const lastDay = new Date(viewYear, viewMonth + 1, 0);
    const startOffset = firstDay.getDay();
    const totalDays = lastDay.getDate();

    const gridStart = new Date(viewYear, viewMonth, 1 - startOffset);
    const totalCells = Math.ceil((startOffset + totalDays) / 7) * 7;

    for (let i = 0; i < totalCells; i++) {
      const date = new Date(gridStart);
      date.setDate(gridStart.getDate() + i);
      const inMonth = date.getMonth() === viewMonth;
      calendarDays.appendChild(createDayCell(date, { inMonth }));
    }
  }

  function renderWeekGrid() {
    calendarDays.className = 'schedule-board__grid schedule-board__grid--week';
    calendarDays.innerHTML = '';

    for (let i = 0; i < 7; i++) {
      const date = new Date(viewWeekStart);
      date.setDate(viewWeekStart.getDate() + i);
      calendarDays.appendChild(createDayCell(date, { inMonth: true }));
    }
  }

  function scrollToTodayCell() {
    const todayStr = formatDate(today);
    const cell = calendarDays.querySelector(`.cal-cell[data-date="${todayStr}"]`);
    if (!cell) return;

    requestAnimationFrame(() => {
      cell.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
  }

  function renderCalendar({ scrollToToday = false } = {}) {
    updateTitle();
    calendarEl.dataset.view = viewMode;
    if (viewMode === 'week') renderWeekGrid();
    else renderMonthGrid();
    if (scrollToToday) scrollToTodayCell();
  }

  function setViewMode(mode) {
    viewMode = mode;
    if (mode === 'week') {
      const isCurrentMonth = viewYear === today.getFullYear() && viewMonth === today.getMonth();
      const anchor = isCurrentMonth ? today : new Date(viewYear, viewMonth, 1);
      viewWeekStart = getWeekStart(anchor);
    }
    calendarEl.querySelectorAll('[data-view]').forEach((btn) => {
      const active = btn.dataset.view === mode;
      btn.classList.toggle('active', active);
      btn.setAttribute('aria-selected', active);
    });
    renderCalendar();
  }

  prevBtn.addEventListener('click', () => {
    if (viewMode === 'week') {
      viewWeekStart.setDate(viewWeekStart.getDate() - 7);
      viewYear = viewWeekStart.getFullYear();
      viewMonth = viewWeekStart.getMonth();
    } else {
      viewMonth--;
      if (viewMonth < 0) {
        viewMonth = 11;
        viewYear--;
      }
    }
    renderCalendar();
  });

  nextBtn.addEventListener('click', () => {
    if (viewMode === 'week') {
      viewWeekStart.setDate(viewWeekStart.getDate() + 7);
      viewYear = viewWeekStart.getFullYear();
      viewMonth = viewWeekStart.getMonth();
    } else {
      viewMonth++;
      if (viewMonth > 11) {
        viewMonth = 0;
        viewYear++;
      }
    }
    renderCalendar();
  });

  todayBtn.addEventListener('click', () => {
    viewYear = today.getFullYear();
    viewMonth = today.getMonth();
    viewWeekStart = getWeekStart(today);
    renderCalendar({ scrollToToday: true });
  });

  calendarEl.querySelectorAll('[data-view]').forEach((btn) => {
    btn.addEventListener('click', () => setViewMode(btn.dataset.view));
  });

  renderCalendar();
}

/* ── Navigation ── */
function initNavigation() {
  const header = document.getElementById('header');
  const navToggle = document.getElementById('navToggle');
  const navMenu = document.getElementById('navMenu');
  const navLinks = document.querySelectorAll('.nav__link');

  window.addEventListener('scroll', () => {
    header.classList.toggle('header--scrolled', window.scrollY > 50);
  });

  navToggle.addEventListener('click', () => {
    const isOpen = navMenu.classList.toggle('active');
    navToggle.classList.toggle('active', isOpen);
    navToggle.setAttribute('aria-expanded', isOpen);
  });

  navLinks.forEach((link) => {
    link.addEventListener('click', () => {
      navMenu.classList.remove('active');
      navToggle.classList.remove('active');
      navToggle.setAttribute('aria-expanded', 'false');
    });
  });
}

let revealObserver = null;

/* ── Scroll Reveal ── */
function initScrollReveal() {
  const targets = document.querySelectorAll(
    '.profile__main, .profile__card, .profile__detail, .schedule-board, .timeline__item, .churudan-hub, .minigame, .rolling-paper, .section__header, .memory-playlist__header, .memory-playlist__picker, .memory-playlist__layout, .memory-playlist__player-wrap, .memory-playlist__tracks, .memory-playlist__source'
  );

  targets.forEach((el) => el.classList.add('reveal'));

  revealObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
        }
      });
    },
    { threshold: 0.1, rootMargin: '0px 0px -40px 0px' }
  );

  targets.forEach((el) => revealObserver.observe(el));
}

/* ── Gallery Lightbox ── */
function getGalleryCaption(item) {
  const tag = gallerySourceLabel[item.source] || item.source;
  return `${tag} · ${item.caption}`;
}

function getDownloadFilename(item) {
  const extMatch = item.src.match(/\.(jpe?g|png|webp|gif)(?:$|\?)/i);
  const ext = extMatch ? extMatch[1].toLowerCase() : 'jpg';
  const base = (item.caption || 'yooseola')
    .replace(/[\\/:*?"<>|]/g, '')
    .trim()
    .slice(0, 40) || 'yooseola';
  const suffix = item.imageCount > 1 ? `-${(item.imageIndex || 0) + 1}` : '';
  return `${base}${suffix}.${ext}`;
}

function buildSlideItem(baseItem, src, imageIndex, imageCount) {
  return {
    ...baseItem,
    src,
    imageIndex,
    imageCount,
    images: baseItem.images || (imageCount > 1 ? [] : [src]),
  };
}

function findGalleryGridEntry(index) {
  return getGalleryGridEntries().find((entry) => entry.index === index) || null;
}

function buildLightboxSlides(startIndex, hintItem) {
  const items = getGalleryItems();
  const start = hintItem || items[startIndex];
  if (!start) return { slides: [], startSlide: 0 };

  const imageList = Array.isArray(start.images) && start.images.length
    ? start.images
    : null;

  if (imageList && imageList.length > 1) {
    const slides = imageList.map((src, imageIndex) => {
      const slideItem = buildSlideItem(start, src, imageIndex, imageList.length);
      return { src, item: slideItem, caption: getGalleryCaption(slideItem) };
    });
    const startSlide = Number.isFinite(start.imageIndex)
      ? Math.min(Math.max(start.imageIndex, 0), slides.length - 1)
      : 0;
    return { slides, startSlide };
  }

  if (start.postId) {
    const group = [];
    items.forEach((item, idx) => {
      if (item.postId === start.postId) group.push({ idx, item });
    });
    group.sort((a, b) => (a.item.imageIndex || 0) - (b.item.imageIndex || 0));

    if (group.length > 1) {
      return {
        slides: group.map(({ item }) => ({
          src: item.src,
          item,
          caption: getGalleryCaption(item),
        })),
        startSlide: Math.max(0, group.findIndex(({ idx }) => idx === startIndex)),
      };
    }
  }

  return {
    slides: [{ src: start.src, item: start, caption: getGalleryCaption(start) }],
    startSlide: 0,
  };
}

async function fetchArticleImages(postId) {
  if (!postId) return [];
  try {
    const res = await fetch(
      `${GALLERY_ARTICLE_IMAGES_API}?postId=${encodeURIComponent(postId)}`,
      { cache: 'no-store' }
    );
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data.images) ? data.images : [];
  } catch {
    return [];
  }
}

async function resolveLightboxSlides(startIndex, hintItem) {
  const built = buildLightboxSlides(startIndex, hintItem);
  if (built.slides.length > 1) return built;

  const start = hintItem || getGalleryItems()[startIndex];
  if (!start?.postId) return built;

  const shouldFetch =
    isCafeGallerySource(start.source) || (start.imageCount > 1);
  if (!shouldFetch) return built;

  const images = await fetchArticleImages(start.postId);
  const cleaned = images.map(sanitizeGalleryUrl).filter(Boolean);
  if (cleaned.length <= 1) return built;

  const slides = cleaned.map((src, imageIndex) => {
    const slideItem = buildSlideItem(start, src, imageIndex, cleaned.length);
    return { src, item: slideItem, caption: getGalleryCaption(slideItem) };
  });

  const startSlide = Number.isFinite(start.imageIndex)
    ? Math.min(Math.max(start.imageIndex, 0), slides.length - 1)
    : 0;

  return { slides, startSlide };
}

function triggerBlobDownload(blob, filename) {
  const blobUrl = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = blobUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(blobUrl);
}

async function downloadGalleryImage(item) {
  const filename = getDownloadFilename(item);
  const proxyUrl =
    `${GALLERY_DOWNLOAD_API}?url=${encodeURIComponent(item.src)}` +
    `&name=${encodeURIComponent(filename)}`;

  try {
    const res = await fetch(proxyUrl, { cache: 'no-store' });
    if (res.ok) {
      triggerBlobDownload(await res.blob(), filename);
      return;
    }
  } catch {
    /* try direct fetch below */
  }

  try {
    const res = await fetch(item.src, { referrerPolicy: 'no-referrer' });
    if (!res.ok) throw new Error('fetch failed');
    triggerBlobDownload(await res.blob(), filename);
  } catch {
    const link = document.createElement('a');
    link.href = proxyUrl;
    link.download = filename;
    link.rel = 'noopener';
    document.body.appendChild(link);
    link.click();
    link.remove();
  }
}

function initGalleryLightbox() {
  const lightbox = document.getElementById('lightbox');
  const lightboxImage = document.getElementById('lightboxImage');
  const lightboxCaption = document.getElementById('lightboxCaption');
  const lightboxCounter = document.getElementById('lightboxCounter');
  const downloadBtn = document.getElementById('lightboxDownload');
  const closeBtn = document.getElementById('lightboxClose');
  const prevBtn = document.getElementById('lightboxPrev');
  const nextBtn = document.getElementById('lightboxNext');
  const lightboxContent = lightbox.querySelector('.lightbox__content');
  const grid = document.getElementById('galleryGrid');

  if (!lightbox || !grid || !getGalleryItems().length) return;

  let slides = [];
  let slideIndex = 0;
  let touchStartX = 0;

  function updateNavButtons() {
    const hasMultiple = slides.length > 1;
    if (prevBtn) prevBtn.hidden = !hasMultiple;
    if (nextBtn) nextBtn.hidden = !hasMultiple;
  }

  function renderLightbox() {
    const slide = slides[slideIndex];
    if (!slide) return;

    lightboxImage.src = slide.src;
    lightboxImage.alt = slide.caption;
    lightboxImage.referrerPolicy = 'no-referrer';
    lightboxCaption.textContent = slide.caption;

    if (slides.length > 1) {
      lightboxCounter.textContent = `${slideIndex + 1} / ${slides.length}`;
      lightboxCounter.hidden = false;
    } else {
      lightboxCounter.textContent = '';
      lightboxCounter.hidden = true;
    }

    updateNavButtons();
  }

  async function openLightbox(index) {
    const gridEntry = findGalleryGridEntry(index);
    const start = gridEntry?.item || getGalleryItems()[index];
    if (!start) return;

    slides = [{
      src: start.src,
      item: start,
      caption: getGalleryCaption(start),
    }];
    slideIndex = 0;

    lightbox.classList.add('active', 'lightbox--loading');
    lightbox.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
    renderLightbox();

    const resolved = await resolveLightboxSlides(index, gridEntry?.item);
    lightbox.classList.remove('lightbox--loading');
    slides = resolved.slides;
    slideIndex = resolved.startSlide;
    if (!slides.length) {
      closeLightbox();
      return;
    }

    renderLightbox();
  }

  function closeLightbox() {
    lightbox.classList.remove('active');
    lightbox.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
  }

  function navigate(direction) {
    if (slides.length <= 1) return;
    slideIndex = (slideIndex + direction + slides.length) % slides.length;
    renderLightbox();
  }

  grid.addEventListener('click', (event) => {
    const item = event.target.closest('.gallery__item');
    if (!item || !grid.contains(item)) return;
    const index = Number(item.dataset.index);
    if (Number.isNaN(index)) return;
    openLightbox(index);
  });

  closeBtn?.addEventListener('click', (event) => {
    event.stopPropagation();
    closeLightbox();
  });

  prevBtn?.addEventListener('click', (event) => {
    event.stopPropagation();
    navigate(-1);
  });

  nextBtn?.addEventListener('click', (event) => {
    event.stopPropagation();
    navigate(1);
  });

  downloadBtn?.addEventListener('click', (event) => {
    event.stopPropagation();
    const slide = slides[slideIndex];
    if (slide?.item) downloadGalleryImage(slide.item);
  });

  lightbox.addEventListener('click', (e) => {
    if (e.target === lightbox) closeLightbox();
  });

  function bindLightboxSwipe(target) {
    if (!target) return;
    target.addEventListener('touchstart', (e) => {
      touchStartX = e.changedTouches[0]?.clientX || 0;
    }, { passive: true });

    target.addEventListener('touchend', (e) => {
      if (slides.length <= 1) return;
      const touchEndX = e.changedTouches[0]?.clientX || 0;
      const delta = touchEndX - touchStartX;
      if (Math.abs(delta) < 40) return;
      navigate(delta > 0 ? -1 : 1);
    }, { passive: true });
  }

  bindLightboxSwipe(lightboxImage);
  bindLightboxSwipe(lightboxContent);

  document.addEventListener('keydown', (e) => {
    if (!lightbox.classList.contains('active')) return;
    if (e.key === 'Escape') closeLightbox();
    if (e.key === 'ArrowLeft') navigate(-1);
    if (e.key === 'ArrowRight') navigate(+1);
  });
}
