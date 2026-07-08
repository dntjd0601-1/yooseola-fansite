/**
 * Site entry popup — 7월 9일 버컴퍼니 1주년
 */
(function () {
  const COPY = {
    title: '7월 9일 버컴퍼니 1주년',
    subtitle: '축하합니다!',
    desc: '7월 9일, 버컴퍼니 1주년을 함께 축하해 주세요. 앞으로도 설아와 버컴퍼니와 함께해 주세요.',
    hideToday: '오늘 하루 보지 않기',
    confirm: '축하합니다! \uD83C\uDF89',
    close: '닫기',
    imageAlt: '7월 9일 버컴퍼니 1주년 축하 이미지',
  };

  const HIDE_TODAY_KEY = 'fansite:vercompany-1st-popup-july9:v2';

  function getKstDateString(date = new Date()) {
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Seoul',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(date);
  }

  function shouldShowPopup() {
    try {
      const hideDate = localStorage.getItem(HIDE_TODAY_KEY);
      if (hideDate && hideDate === getKstDateString()) return false;
    } catch (_) {}
    return true;
  }

  function hidePopup(popup) {
    if (!popup) return;
    popup.hidden = true;
    popup.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('site-popup-open');
  }

  function showPopup(popup) {
    if (!popup) return;
    popup.hidden = false;
    popup.removeAttribute('hidden');
    popup.setAttribute('aria-hidden', 'false');
    document.body.classList.add('site-popup-open');
    popup.querySelector('.site-popup__confirm')?.focus();
  }

  function persistDismiss(hideToday) {
    if (!hideToday) return;
    try {
      localStorage.setItem(HIDE_TODAY_KEY, getKstDateString());
    } catch (_) {}
  }

  function applyPopupCopy(popup) {
    const titleEl = document.getElementById('vercompanyAnniversaryTitle');
    const subtitleEl = document.getElementById('vercompanyAnniversarySubtitle');
    const descEl = document.getElementById('vercompanyAnniversaryDesc');
    const hideLabelEl = document.getElementById('vercompanyAnniversaryHideLabel');
    const confirmEl = document.getElementById('vercompanyAnniversaryConfirm');
    const imageEl = document.getElementById('vercompanyAnniversaryImage');
    const backdrop = document.getElementById('vercompanyAnniversaryBackdrop');
    const closeBtn = document.getElementById('vercompanyAnniversaryClose');

    if (titleEl) titleEl.textContent = COPY.title;
    if (subtitleEl) subtitleEl.textContent = COPY.subtitle;
    if (descEl) descEl.textContent = COPY.desc;
    if (hideLabelEl) hideLabelEl.textContent = COPY.hideToday;
    if (confirmEl) confirmEl.textContent = COPY.confirm;
    if (imageEl) imageEl.alt = COPY.imageAlt;
    if (backdrop) backdrop.setAttribute('aria-label', COPY.close);
    if (closeBtn) closeBtn.setAttribute('aria-label', COPY.close);
    if (popup) popup.setAttribute('aria-labelledby', 'vercompanyAnniversaryTitle');
  }

  function initVercompanyAnniversaryPopup() {
    const popup = document.getElementById('vercompanyAnniversaryPopup');
    if (!popup) return;

    applyPopupCopy(popup);

    const backdrop = document.getElementById('vercompanyAnniversaryBackdrop');
    const closeBtn = document.getElementById('vercompanyAnniversaryClose');
    const confirmBtn = document.getElementById('vercompanyAnniversaryConfirm');
    const hideTodayCheckbox = document.getElementById('vercompanyAnniversaryHideToday');

    function closePopup() {
      persistDismiss(Boolean(hideTodayCheckbox?.checked));
      hidePopup(popup);
    }

    backdrop?.addEventListener('click', closePopup);
    closeBtn?.addEventListener('click', closePopup);
    confirmBtn?.addEventListener('click', closePopup);

    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && !popup.hidden) closePopup();
    });

    if (!shouldShowPopup()) return;

    window.setTimeout(() => showPopup(popup), 300);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initVercompanyAnniversaryPopup);
  } else {
    initVercompanyAnniversaryPopup();
  }
})();
