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

document.addEventListener('DOMContentLoaded', () => {
  initPageViews();
  initNavigation();
  initHeroSchedule();
  initCalendar();
  initGalleryGrid();
  initScrollReveal();
  initGalleryLightbox();
});

/* ── Gallery ── */
function initGalleryGrid() {
  const grid = document.getElementById('galleryGrid');
  if (!grid || typeof GALLERY_DATA === 'undefined') return;

  const sourceLabel = {
    'fan-cafe': '팬카페',
    'v-company': '버컴퍼니',
  };

  grid.replaceChildren();
  GALLERY_DATA.forEach((item, index) => {
    const figure = document.createElement('figure');
    figure.className = 'gallery__item';
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
    const tag = sourceLabel[item.source] || item.source;
    caption.textContent = `${tag} · ${item.caption}`;

    figure.appendChild(img);
    figure.appendChild(caption);
    grid.appendChild(figure);
  });
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

function decodeScheduleTitle(title) {
  const el = document.createElement('textarea');
  el.innerHTML = title || '';
  return cleanTitle(el.value);
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
      const item = document.createElement('div');
      const isOff = ev.type === 'off';
      item.className = `hero__schedule-item${isOff ? ' hero__schedule-item--off' : ''}`;

      const badge = document.createElement('span');
      badge.className = 'hero__schedule-badge';
      badge.textContent = isOff ? '휴방' : '방송';
      item.appendChild(badge);

      if (!isOff) {
        const title = document.createElement('p');
        title.className = 'hero__schedule-title';
        title.textContent = decodeScheduleTitle(ev.title);
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

    if (updateHash) {
      history.replaceState(null, '', `#${id}`);
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
    const isOff = ev.type === 'off';
    const item = document.createElement('div');
    item.className = `cal-event${isOff ? ' cal-event--off' : ' cal-event--live'}`;

    const badge = document.createElement('span');
    badge.className = 'cal-event__badge';
    badge.textContent = isOff ? '휴방' : '방송';
    item.appendChild(badge);

    if (!isOff) {
      const title = document.createElement('p');
      title.className = 'cal-event__title';
      title.textContent = cleanTitle(ev.title);
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
    if (!inMonth) cell.classList.add('cal-cell--muted');
    if (dayOfWeek === 0) cell.classList.add('cal-cell--sunday');
    if (dayOfWeek === 6) cell.classList.add('cal-cell--saturday');
    if (dateStr === todayStr) cell.classList.add('cal-cell--today');

    const head = document.createElement('div');
    head.className = 'cal-cell__head';

    const num = document.createElement('span');
    num.className = 'cal-cell__date';
    num.textContent = day;
    if (dateStr === todayStr) {
      const dot = document.createElement('i');
      dot.className = 'cal-cell__today-dot';
      num.appendChild(dot);
    }
    head.appendChild(num);

    if (events.length) {
      const mark = document.createElement('span');
      mark.className = `cal-cell__mark cal-cell__mark--${events[0].type === 'off' ? 'off' : 'live'}`;
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

  function renderCalendar() {
    updateTitle();
    calendarEl.dataset.view = viewMode;
    if (viewMode === 'week') renderWeekGrid();
    else renderMonthGrid();
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
    renderCalendar();
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

/* ── Scroll Reveal ── */
function initScrollReveal() {
  const targets = document.querySelectorAll(
    '.profile__main, .profile__card, .profile__overview, .schedule-board, .timeline__item, .vod-card, .gallery__item, .minigame, .section__header'
  );

  targets.forEach((el) => el.classList.add('reveal'));

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
        }
      });
    },
    { threshold: 0.1, rootMargin: '0px 0px -40px 0px' }
  );

  targets.forEach((el) => observer.observe(el));
}

/* ── Gallery Lightbox ── */
function initGalleryLightbox() {
  const lightbox = document.getElementById('lightbox');
  const lightboxImage = document.getElementById('lightboxImage');
  const lightboxCaption = document.getElementById('lightboxCaption');
  const closeBtn = document.getElementById('lightboxClose');
  const prevBtn = document.getElementById('lightboxPrev');
  const nextBtn = document.getElementById('lightboxNext');
  const items = document.querySelectorAll('.gallery__item');

  if (!lightbox || items.length === 0) return;

  let currentIndex = 0;

  const galleryData = Array.from(items).map((item) => {
    const img = item.querySelector('.gallery__img');
    const caption = item.querySelector('figcaption');
    return {
      src: img?.src || '',
      caption: caption?.textContent || '',
    };
  });

  function openLightbox(index) {
    currentIndex = index;
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
    const data = galleryData[currentIndex];
    lightboxImage.src = data.src;
    lightboxImage.alt = data.caption;
    lightboxCaption.textContent = data.caption;
  }

  function navigate(direction) {
    currentIndex = (currentIndex + direction + galleryData.length) % galleryData.length;
    renderLightbox();
  }

  items.forEach((item, index) => {
    item.addEventListener('click', () => openLightbox(index));
  });

  closeBtn.addEventListener('click', closeLightbox);
  prevBtn.addEventListener('click', () => navigate(-1));
  nextBtn.addEventListener('click', () => navigate(1));

  lightbox.addEventListener('click', (e) => {
    if (e.target === lightbox) closeLightbox();
  });

  document.addEventListener('keydown', (e) => {
    if (!lightbox.classList.contains('active')) return;
    if (e.key === 'Escape') closeLightbox();
    if (e.key === 'ArrowLeft') navigate(-1);
    if (e.key === 'ArrowRight') navigate(1);
  });
}
