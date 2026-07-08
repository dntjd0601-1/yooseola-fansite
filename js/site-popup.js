/**
 * Site entry popup — 버컴퍼니 1주년 축하
 */
(function () {
  const STORAGE_KEY = 'fansite:vercompany-1st-popup:v1';
  const HIDE_TODAY_KEY = 'fansite:vercompany-1st-popup-hide-date';

  function shouldShowPopup() {
    try {
      if (localStorage.getItem(STORAGE_KEY) === '1') return false;
      const hideDate = localStorage.getItem(HIDE_TODAY_KEY);
      if (hideDate) {
        const today = new Date().toISOString().slice(0, 10);
        if (hideDate === today) return false;
      }
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
    popup.setAttribute('aria-hidden', 'false');
    document.body.classList.add('site-popup-open');
    const focusTarget = popup.querySelector('.site-popup__confirm');
    focusTarget?.focus();
  }

  function persistDismiss(hideToday) {
    try {
      if (hideToday) {
        localStorage.setItem(HIDE_TODAY_KEY, new Date().toISOString().slice(0, 10));
      } else {
        localStorage.setItem(STORAGE_KEY, '1');
      }
    } catch (_) {}
  }

  function initVercompanyAnniversaryPopup() {
    const popup = document.getElementById('vercompanyAnniversaryPopup');
    if (!popup || !shouldShowPopup()) return;

    const backdrop = document.getElementById('vercompanyAnniversaryBackdrop');
    const closeBtn = document.getElementById('vercompanyAnniversaryClose');
    const confirmBtn = document.getElementById('vercompanyAnniversaryConfirm');
    const hideTodayCheckbox = document.getElementById('vercompanyAnniversaryHideToday');

    function closePopup() {
      const hideToday = Boolean(hideTodayCheckbox?.checked);
      persistDismiss(hideToday);
      hidePopup(popup);
    }

    backdrop?.addEventListener('click', closePopup);
    closeBtn?.addEventListener('click', closePopup);
    confirmBtn?.addEventListener('click', closePopup);

    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && !popup.hidden) closePopup();
    });

    window.setTimeout(() => showPopup(popup), 400);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initVercompanyAnniversaryPopup);
  } else {
    initVercompanyAnniversaryPopup();
  }
})();
