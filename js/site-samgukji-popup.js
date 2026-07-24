(function () {
  const POPUP_ID = 'samgukjiPopup';
  const ZOOM_ID = 'samgukjiZoom';
  const STORAGE_PREFIX = 'samgukji-promo-202607-dismiss';

  let zoomApi = null;

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
    zoomApi?.closeZoom();

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

  function initSamgukjiZoom(popup) {
    const zoom = document.getElementById(ZOOM_ID);
    const zoomImage = document.getElementById('samgukjiZoomImage');
    const zoomCaption = document.getElementById('samgukjiZoomCaption');
    const zoomCounter = document.getElementById('samgukjiZoomCounter');
    const zoomClose = document.getElementById('samgukjiZoomClose');
    const zoomBackdrop = document.getElementById('samgukjiZoomBackdrop');
    const zoomPrev = document.getElementById('samgukjiZoomPrev');
    const zoomNext = document.getElementById('samgukjiZoomNext');

    if (!zoom || !popup) return null;

    const slides = [...popup.querySelectorAll('.samgukji-popup__zoom-btn')].map((button) => {
      const img = button.querySelector('img');
      const caption = button.closest('.samgukji-popup__figure')?.querySelector('.samgukji-popup__caption')?.textContent?.trim() || '';
      return {
        src: img?.currentSrc || img?.src || '',
        alt: img?.alt || caption,
        caption,
      };
    }).filter((slide) => slide.src);

    let slideIndex = 0;
    let touchStartX = 0;

    function renderZoom() {
      const slide = slides[slideIndex];
      if (!slide) return;

      zoomImage.src = slide.src;
      zoomImage.alt = slide.alt;
      zoomCaption.textContent = slide.caption;
      zoomCounter.textContent = `${slideIndex + 1} / ${slides.length}`;
    }

    function openZoom(index) {
      if (!slides.length) return;
      slideIndex = ((index % slides.length) + slides.length) % slides.length;
      renderZoom();
      zoom.hidden = false;
      zoom.classList.add('samgukji-zoom--open');
      zoom.setAttribute('aria-hidden', 'false');
      document.body.classList.add('samgukji-zoom-open');
    }

    function closeZoom() {
      if (!zoom.classList.contains('samgukji-zoom--open')) return;
      zoom.classList.remove('samgukji-zoom--open');
      zoom.setAttribute('aria-hidden', 'true');
      zoom.hidden = true;
      document.body.classList.remove('samgukji-zoom-open');
      zoomImage.removeAttribute('src');
    }

    function navigate(direction) {
      if (slides.length <= 1) return;
      slideIndex = (slideIndex + direction + slides.length) % slides.length;
      renderZoom();
    }

    popup.querySelectorAll('.samgukji-popup__zoom-btn').forEach((button) => {
      button.addEventListener('click', (event) => {
        event.stopPropagation();
        const index = Number(button.dataset.zoomIndex);
        if (Number.isNaN(index)) return;
        openZoom(index);
      });
    });

    zoomClose?.addEventListener('click', (event) => {
      event.stopPropagation();
      closeZoom();
    });

    zoomBackdrop?.addEventListener('click', () => closeZoom());
    zoomPrev?.addEventListener('click', (event) => {
      event.stopPropagation();
      navigate(-1);
    });
    zoomNext?.addEventListener('click', (event) => {
      event.stopPropagation();
      navigate(1);
    });

    zoomImage?.addEventListener('click', (event) => {
      event.stopPropagation();
      closeZoom();
    });

    function bindZoomSwipe(target) {
      if (!target) return;
      target.addEventListener('touchstart', (event) => {
        touchStartX = event.changedTouches[0]?.clientX || 0;
      }, { passive: true });

      target.addEventListener('touchend', (event) => {
        if (slides.length <= 1) return;
        const touchEndX = event.changedTouches[0]?.clientX || 0;
        const delta = touchEndX - touchStartX;
        if (Math.abs(delta) < 40) return;
        navigate(delta > 0 ? -1 : 1);
      }, { passive: true });
    }

    bindZoomSwipe(zoomImage);
    bindZoomSwipe(zoom.querySelector('.samgukji-zoom__content'));

    return {
      openZoom,
      closeZoom,
      navigate,
      isOpen: () => zoom.classList.contains('samgukji-zoom--open'),
    };
  }

  function initSamgukjiPopup() {
    const popup = document.getElementById(POPUP_ID);
    if (!popup) return;

    const closeBtn = document.getElementById('samgukjiPopupClose');
    const backdrop = document.getElementById('samgukjiPopupBackdrop');
    zoomApi = initSamgukjiZoom(popup);

    closeBtn?.addEventListener('click', () => closePopup(popup));
    backdrop?.addEventListener('click', () => closePopup(popup));

    document.addEventListener('keydown', (event) => {
      if (zoomApi?.isOpen()) {
        if (event.key === 'Escape') {
          zoomApi.closeZoom();
          return;
        }
        if (event.key === 'ArrowLeft') {
          event.preventDefault();
          zoomApi.navigate(-1);
          return;
        }
        if (event.key === 'ArrowRight') {
          event.preventDefault();
          zoomApi.navigate(1);
          return;
        }
      }

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
