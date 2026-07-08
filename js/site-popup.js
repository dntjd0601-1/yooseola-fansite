/**
 * Site entry popup — 7월 9일 버컴퍼니 1주년
 */
(function () {
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

  function initVercompanyAnniversaryPopup() {
    const popup = document.getElementById('vercompanyAnniversaryPopup');
    if (!popup) return;

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
