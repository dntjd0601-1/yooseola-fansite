(function () {
  const POPUP_ID = 'promoPopup';
  const STORAGE_KEY = 'lingti-promo-202607';
  const PROMO_START = new Date('2026-07-14T00:00:00+09:00');
  const PROMO_END = new Date('2026-07-21T00:00:00+09:00');

  function isPromoActive(now) {
    return now >= PROMO_START && now < PROMO_END;
  }

  function openPopup(popup) {
    popup.hidden = false;
    popup.classList.add('promo-popup--open');
    popup.setAttribute('aria-hidden', 'false');
    document.body.classList.add('promo-popup-open');
  }

  function closePopup(popup) {
    popup.classList.remove('promo-popup--open');
    popup.setAttribute('aria-hidden', 'true');
    popup.hidden = true;
    document.body.classList.remove('promo-popup-open');
    try {
      localStorage.setItem(STORAGE_KEY, 'closed');
    } catch (_) {}
  }

  function initPromoPopup() {
    const popup = document.getElementById(POPUP_ID);
    if (!popup) return;

    const now = new Date();
    if (!isPromoActive(now)) return;

    try {
      if (localStorage.getItem(STORAGE_KEY) === 'closed') return;
    } catch (_) {}

    const closeBtn = document.getElementById('promoPopupClose');
    const backdrop = document.getElementById('promoPopupBackdrop');

    openPopup(popup);

    closeBtn?.addEventListener('click', () => closePopup(popup));
    backdrop?.addEventListener('click', () => closePopup(popup));

    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && popup.classList.contains('promo-popup--open')) {
        closePopup(popup);
      }
    });
  }

  document.addEventListener('DOMContentLoaded', initPromoPopup);
})();
