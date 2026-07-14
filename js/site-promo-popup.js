(function () {
  const POPUP_ID = 'promoPopup';
  const STORAGE_PREFIX = 'lingti-promo-202607-dismiss';
  const PROMO_START = new Date('2026-07-14T00:00:00+09:00');
  const PROMO_END = new Date('2026-07-21T00:00:00+09:00');

  function isPromoActive(now) {
    return now >= PROMO_START && now < PROMO_END;
  }

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
    popup.classList.add('promo-popup--open');
    popup.setAttribute('aria-hidden', 'false');
    document.body.classList.add('promo-popup-open');
  }

  function closePopup(popup) {
    const dismissToday = document.getElementById('promoPopupDismissToday');
    if (dismissToday?.checked) {
      try {
        localStorage.setItem(getTodayStorageKey(), '1');
      } catch (_) {}
    }

    popup.classList.remove('promo-popup--open');
    popup.setAttribute('aria-hidden', 'true');
    popup.hidden = true;
    document.body.classList.remove('promo-popup-open');

    if (dismissToday) {
      dismissToday.checked = false;
    }
  }

  function tryOpenPromo() {
    const popup = document.getElementById(POPUP_ID);
    if (!popup) return;
    if (!document.body.classList.contains('is-home')) return;
    if (!isPromoActive(new Date())) return;
    if (isDismissedToday()) return;
    if (popup.classList.contains('promo-popup--open')) return;

    openPopup(popup);
  }

  function initPromoPopup() {
    const popup = document.getElementById(POPUP_ID);
    if (!popup) return;

    const closeBtn = document.getElementById('promoPopupClose');
    const backdrop = document.getElementById('promoPopupBackdrop');

    closeBtn?.addEventListener('click', () => closePopup(popup));
    backdrop?.addEventListener('click', () => closePopup(popup));

    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && popup.classList.contains('promo-popup--open')) {
        closePopup(popup);
      }
    });

    document.addEventListener('home:show', tryOpenPromo);
    tryOpenPromo();
  }

  document.addEventListener('DOMContentLoaded', initPromoPopup);
})();
