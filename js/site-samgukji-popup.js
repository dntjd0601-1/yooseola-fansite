(function () {
  const POPUP_ID = 'samgukjiPopup';
  const STORAGE_PREFIX = 'samgukji-promo-202607-dismiss';

  function getTodayStorageKey() {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    return `${STORAGE_PREFIX}-${y}-${m}-${d}`;
  }

  function isDismissedToday() {
    try {
      return localStorage.getItem(getTodayStorageKey()) === '1';
    } catch (_) {
      return false;
    }
  }

  function openPopup(popup) {
    popup.hidden = false;
    popup.classList.add('samgukji-popup--open');
    popup.setAttribute('aria-hidden', 'false');
    document.body.classList.add('samgukji-popup-open');
  }

  function closePopup(popup) {
    const dismissToday = document.getElementById('samgukjiPopupDismissToday');
    if (dismissToday?.checked) {
      try {
        localStorage.setItem(getTodayStorageKey(), '1');
      } catch (_) {}
    }

    popup.classList.remove('samgukji-popup--open');
    popup.setAttribute('aria-hidden', 'true');
    popup.hidden = true;
    document.body.classList.remove('samgukji-popup-open');

    if (dismissToday) {
      dismissToday.checked = false;
    }
  }

  function isHomeVisible() {
    if (document.body.classList.contains('is-home')) return true;

    const homeSection = document.getElementById('home');
    if (homeSection?.classList.contains('page-section--active')) return true;

    const hash = location.hash.slice(1);
    return !hash || hash === 'home';
  }

  function tryOpenPopup() {
    const popup = document.getElementById(POPUP_ID);
    if (!popup) return;
    if (!isHomeVisible()) return;
    if (isDismissedToday()) return;
    if (popup.classList.contains('samgukji-popup--open')) return;

    openPopup(popup);
  }

  function scheduleOpenAttempts() {
    tryOpenPopup();
    requestAnimationFrame(() => tryOpenPopup());
    window.setTimeout(tryOpenPopup, 0);
    window.setTimeout(tryOpenPopup, 150);
    window.setTimeout(tryOpenPopup, 600);
  }

  function initSamgukjiPopup() {
    const popup = document.getElementById(POPUP_ID);
    if (!popup) return;

    const closeBtn = document.getElementById('samgukjiPopupClose');
    const backdrop = document.getElementById('samgukjiPopupBackdrop');

    closeBtn?.addEventListener('click', () => closePopup(popup));
    backdrop?.addEventListener('click', () => closePopup(popup));

    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && popup.classList.contains('samgukji-popup--open')) {
        closePopup(popup);
      }
    });

    document.addEventListener('home:show', tryOpenPopup);
    scheduleOpenAttempts();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initSamgukjiPopup);
  } else {
    initSamgukjiPopup();
  }
})();
