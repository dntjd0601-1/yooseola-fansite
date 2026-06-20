/**
 * 유설아 Fan Site — Main Script
 */

function cleanTitle(title) {
  return (title || '')
    .replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/gu, '')
    .replace(/\s*\+\s*\+\s*/g, ' + ')
    .replace(/\s*\+\s*$/g, '')
    .replace(/^\s*\+\s*/g, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

function decodeScheduleTitle(title) {
  const el = document.createElement('textarea');
  el.innerHTML = title || '';
  return cleanTitle(el.value);
}

function isScheduleOff(ev) {
  if (!ev) return false;
  if (ev.type === 'off') return true;
  const plain = decodeScheduleTitle(ev.title);
  if (!plain) return false;
  return plain === '휴방' || plain === '튜방' || /^휴방\b/.test(plain);
}

function getScheduleDisplay(ev) {
  const off = isScheduleOff(ev);
  const plain = decodeScheduleTitle(ev.title);
  if (!off) {
    return { off: false, badge: '방송', title: plain };
  }
  if (plain === '휴방' || plain === '튜방') {
    return { off: true, badge: '휴방', title: '' };
  }
  const rest = plain.replace(/^휴방\s*\+?\s*/, '').trim();
  return { off: true, badge: '휴방', title: rest };
}

document.addEventListener('DOMContentLoaded', () => {
  initPageViews();
  initNavigation();
  initHeroSchedule();
  initHeroLive();
  initCalendar();
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

async function fetchGalleryFeed() {
  const statusEl = document.getElementById('galleryStatus');
  if (statusEl) statusEl.textContent = '최신 사진을 불러오는 중…';

  try {
    const res = await fetch(GALLERY_FEED_API, { cache: 'no-store' });
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data.items) && data.items.length) {
        return data.items;
      }
    }
  } catch {
    /* fallback below */
  }

  if (typeof GALLERY_DATA !== 'undefined' && GALLERY_DATA.length) {
    return [...GALLERY_DATA];
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

  if (item.imageCount > 1 && item.imageIndex === 0) {
    const badge = document.createElement('span');
    badge.className = 'gallery__badge';
    badge.textContent = `${item.imageCount}장`;
    figure.appendChild(badge);
  }

  figure.appendChild(img);
  figure.appendChild(caption);
  return figure;
}

function updateGalleryMeta() {
  const items = getGalleryItems();
  const total = items.length;
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
  const items = getGalleryItems();
  if (!grid || !items.length) return false;
  if (galleryLoading || galleryRendered >= items.length) return false;

  galleryLoading = true;
  const end = Math.min(galleryRendered + GALLERY_BATCH_SIZE, items.length);
  const fragment = document.createDocumentFragment();

  for (let i = galleryRendered; i < end; i++) {
    fragment.appendChild(createGalleryItem(items[i], i));
  }

  grid.appendChild(fragment);
  galleryRendered = end;
  galleryLoading = false;
  updateGalleryMeta();

  const newItems = grid.querySelectorAll('.gallery__item:not(.visible)');
  if (revealObserver) {
    newItems.forEach((el) => revealObserver.observe(el));
  }

  if (galleryRendered >= items.length && galleryObserver) {
    const sentinel = document.getElementById('gallerySentinel');
    if (sentinel) galleryObserver.unobserve(sentinel);
  }

  return galleryRendered < items.length;
}

function initGalleryInfiniteScroll() {
  const sentinel = document.getElementById('gallerySentinel');
  const items = getGalleryItems();
  if (!sentinel || !items.length) return;

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
    events.forEach((ev) => {
      const display = getScheduleDisplay(ev);
      const item = document.createElement('div');
      item.className = `hero__schedule-item${display.off ? ' hero__schedule-item--off' : ''}`;

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
    });
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

    document.body.classList.toggle('is-home', id === 'home');
    document.body.classList.toggle('is-memory-playlist', id === 'memory-playlist');

    target.querySelectorAll('.reveal').forEach((el) => el.classList.add('visible'));

    if (updateHash) {
      history.replaceState(null, '', `#${id}`);
    }

    if (id === 'memory-playlist') {
      document.dispatchEvent(new CustomEvent('memory-playlist:show'));
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

  function createEventEl(ev) {
    const display = getScheduleDisplay(ev);
    const item = document.createElement('div');
    item.className = `cal-event${display.off ? ' cal-event--off' : ' cal-event--live'}`;

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
      mark.className = `cal-cell__mark cal-cell__mark--${isScheduleOff(events[0]) ? 'off' : 'live'}`;
      mark.setAttribute('aria-label', '일정 있음');
      head.appendChild(mark);
    }
    cell.appendChild(head);

    if (events.length) {
      const list = document.createElement('div');
      list.className = 'cal-cell__events';
      events.forEach((ev) => list.appendChild(createEventEl(ev)));
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
    '.profile__main, .profile__card, .profile__overview, .profile__history, .profile__content, .schedule-board, .timeline__item, .churudan-hub, .minigame, .rolling-paper, .section__header, .memory-playlist__header, .memory-playlist__picker, .memory-playlist__layout, .memory-playlist__player-wrap, .memory-playlist__tracks, .memory-playlist__source'
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

function getLightboxGroup(startIndex) {
  const items = getGalleryItems();
  const start = items[startIndex];
  if (!start) return { indices: [], slide: 0 };

  if (!start.postId) {
    return { indices: [startIndex], slide: 0 };
  }

  const indices = [];
  items.forEach((item, idx) => {
    if (item.postId === start.postId) indices.push(idx);
  });

  if (!indices.length) {
    return { indices: [startIndex], slide: 0 };
  }

  const slide = indices.indexOf(startIndex);
  return { indices, slide: slide >= 0 ? slide : 0 };
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

async function downloadGalleryImage(item) {
  const filename = getDownloadFilename(item);
  try {
    const res = await fetch(item.src, { referrerPolicy: 'no-referrer' });
    if (!res.ok) throw new Error('fetch failed');
    const blob = await res.blob();
    const blobUrl = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = blobUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(blobUrl);
  } catch {
    window.open(item.src, '_blank', 'noopener,noreferrer');
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
  const grid = document.getElementById('galleryGrid');

  if (!lightbox || !grid || !getGalleryItems().length) return;

  let groupIndices = [];
  let slideIndex = 0;

  function openLightbox(index) {
    const group = getLightboxGroup(index);
    groupIndices = group.indices;
    slideIndex = group.slide;
    renderLightbox();
    lightbox.classList.add('active');
    lightbox.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
  }

  function closeLightbox() {
    lightbox.classList.remove('active');
    lightbox.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
  }

  function renderLightbox() {
    const items = getGalleryItems();
    const itemIndex = groupIndices[slideIndex];
    const item = items[itemIndex];
    if (!item) return;

    lightboxImage.src = item.src;
    lightboxImage.alt = getGalleryCaption(item);
    lightboxCaption.textContent = getGalleryCaption(item);

    if (groupIndices.length > 1) {
      lightboxCounter.textContent = `${slideIndex + 1} / ${groupIndices.length}`;
      lightboxCounter.hidden = false;
    } else {
      lightboxCounter.textContent = '';
      lightboxCounter.hidden = true;
    }
  }

  function navigate(direction) {
    if (!groupIndices.length) return;
    slideIndex = (slideIndex + direction + groupIndices.length) % groupIndices.length;
    renderLightbox();
  }

  grid.addEventListener('click', (event) => {
    const item = event.target.closest('.gallery__item');
    if (!item || !grid.contains(item)) return;
    const index = Number(item.dataset.index);
    if (Number.isNaN(index)) return;
    openLightbox(index);
  });

  closeBtn.addEventListener('click', closeLightbox);
  prevBtn.addEventListener('click', () => navigate(-1));
  nextBtn.addEventListener('click', () => navigate(1));
  downloadBtn?.addEventListener('click', () => {
    const items = getGalleryItems();
    const item = items[groupIndices[slideIndex]];
    if (item) downloadGalleryImage(item);
  });

  lightbox.addEventListener('click', (e) => {
    if (e.target === lightbox) closeLightbox();
  });

  document.addEventListener('keydown', (e) => {
    if (!lightbox.classList.contains('active')) return;
    if (e.key === 'Escape') closeLightbox();
    if (e.key === 'ArrowLeft') navigate(-1);
    if (e.key === 'ArrowRight') navigate(+1);
  });
}
