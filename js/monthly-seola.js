const monthlySeolaMonths = Array.isArray(MONTHLY_SEOLA_MONTHS) ? MONTHLY_SEOLA_MONTHS : [];
const MONTHLY_SEOLA_NETLIFY_ORIGIN = 'https://yooseolafansite.netlify.app';

function getMonthlySeolaImageProxyBase() {
  const host = window.location.hostname;
  if (host.endsWith('.netlify.app') || host === 'localhost' || host === '127.0.0.1') {
    return '/.netlify/functions/monthly-seola-image';
  }
  return `${MONTHLY_SEOLA_NETLIFY_ORIGIN}/.netlify/functions/monthly-seola-image`;
}

function getMonthlySeolaImageUrl(url) {
  if (!url) return null;
  return `${getMonthlySeolaImageProxyBase()}?url=${encodeURIComponent(url)}`;
}

function formatMonthlySeolaSummary(text) {
  if (!text) return '설아 월간정리';
  return text
    .replace(/^[가-힣]+\([A-Z]+\)\s*/, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function isMonthlySeolaOffDay(text) {
  if (!text) return false;
  return /휴\s*방|휴방|OFFDAY/i.test(text);
}

function getMonthlySeolaTodayIndex() {
  const now = new Date();
  const index = monthlySeolaMonths.findIndex(
    (item) => item.year === now.getFullYear() && item.month === now.getMonth() + 1
  );
  return index >= 0 ? index : monthlySeolaMonths.length - 1;
}

function createMonthlySeolaEventEl(text) {
  const item = document.createElement('div');
  const off = isMonthlySeolaOffDay(text);
  item.className = `cal-event${off ? ' cal-event--off' : ' cal-event--live'}`;

  const badge = document.createElement('span');
  badge.className = 'cal-event__badge';
  badge.textContent = off ? '휴방' : '방송';
  item.appendChild(badge);

  if (text) {
    const title = document.createElement('p');
    title.className = 'cal-event__title';
    title.textContent = text.replace(/\s+/g, ' ').trim();
    item.appendChild(title);
  }

  return item;
}

function createMonthlySeolaDayCell(day, imageUrl, eventText, dayIndex) {
  const cell = document.createElement('div');
  cell.className = 'cal-cell monthly-seola__cell';
  if (!day) {
    cell.classList.add('cal-cell--muted');
  }
  if (dayIndex === 0) cell.classList.add('cal-cell--sunday');
  if (dayIndex === 6) cell.classList.add('cal-cell--saturday');

  const head = document.createElement('div');
  head.className = 'cal-cell__head';

  const num = document.createElement('span');
  num.className = 'cal-cell__date';
  const weekdays = ['일', '월', '화', '수', '목', '금', '토'];
  num.dataset.weekday = weekdays[dayIndex];
  num.textContent = day || '';
  head.appendChild(num);

  if (eventText) {
    const mark = document.createElement('span');
    mark.className = `cal-cell__mark cal-cell__mark--${isMonthlySeolaOffDay(eventText) ? 'off' : 'live'}`;
    mark.setAttribute('aria-label', '일정 있음');
    head.appendChild(mark);
  }

  cell.appendChild(head);

  if (imageUrl) {
    const media = document.createElement('div');
    media.className = 'monthly-seola__photo';
    const img = document.createElement('img');
    img.className = 'monthly-seola__photo-img';
    img.src = getMonthlySeolaImageUrl(imageUrl);
    img.alt = eventText ? `${day}일 방송 썸네일` : `${day}일`;
    img.loading = 'lazy';
    img.decoding = 'async';
    img.referrerPolicy = 'no-referrer';
    media.appendChild(img);
    cell.appendChild(media);
  }

  if (eventText) {
    const list = document.createElement('div');
    list.className = 'cal-cell__events';
    list.appendChild(createMonthlySeolaEventEl(eventText));
    cell.appendChild(list);
  }

  return cell;
}

function renderMonthlySeolaCalendar(monthData, gridEl) {
  if (!gridEl || !monthData) return;
  gridEl.innerHTML = '';

  (monthData.weeks || []).forEach((week) => {
    const days = Array.isArray(week.days) ? week.days : [];
    const images = Array.isArray(week.images) ? week.images : [];
    const events = Array.isArray(week.events) ? week.events : [];

    for (let i = 0; i < 7; i++) {
      gridEl.appendChild(
        createMonthlySeolaDayCell(days[i] ?? null, images[i] ?? null, events[i] ?? null, i)
      );
    }
  });
}

function initMonthlySeola() {
  const section = document.getElementById('monthly-seola');
  const boardEl = document.getElementById('monthlySeolaBoard');
  const titleEl = document.getElementById('monthlySeolaTitle');
  const summaryEl = document.getElementById('monthlySeolaSummary');
  const gridEl = document.getElementById('monthlySeolaDays');
  const prevBtn = document.getElementById('monthlySeolaPrev');
  const nextBtn = document.getElementById('monthlySeolaNext');
  const todayBtn = document.getElementById('monthlySeolaToday');
  const sourceEl = document.getElementById('monthlySeolaSource');

  if (!section || !monthlySeolaMonths.length || !gridEl) return;

  let activeIndex = getMonthlySeolaTodayIndex();

  function renderMonth() {
    const monthData = monthlySeolaMonths[activeIndex];
    if (!monthData) return;

    const label = (monthData.label || `${monthData.month}월`).split('\n')[0].trim();

    if (titleEl) {
      titleEl.textContent = `${monthData.year}년 ${label}`;
    }

    if (summaryEl) {
      summaryEl.textContent = formatMonthlySeolaSummary(monthData.summary);
    }

    if (boardEl) {
      boardEl.dataset.month = String(monthData.month);
      boardEl.dataset.year = String(monthData.year);
    }

    renderMonthlySeolaCalendar(monthData, gridEl);

    if (prevBtn) prevBtn.disabled = activeIndex <= 0;
    if (nextBtn) nextBtn.disabled = activeIndex >= monthlySeolaMonths.length - 1;
  }

  if (sourceEl && typeof MONTHLY_SEOLA_SOURCE_URL === 'string') {
    sourceEl.href = MONTHLY_SEOLA_SOURCE_URL;
  }

  prevBtn?.addEventListener('click', () => {
    if (activeIndex <= 0) return;
    activeIndex -= 1;
    renderMonth();
  });

  nextBtn?.addEventListener('click', () => {
    if (activeIndex >= monthlySeolaMonths.length - 1) return;
    activeIndex += 1;
    renderMonth();
  });

  todayBtn?.addEventListener('click', () => {
    activeIndex = getMonthlySeolaTodayIndex();
    renderMonth();
  });

  renderMonth();
}
