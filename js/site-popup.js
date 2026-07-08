/**
 * Site entry popup - Vercompany 1st anniversary (July 9)
 * Korean copy uses Unicode escapes to survive Windows git encoding issues.
 */
(function () {
  const COPY = {
    title: '\u0037\uC6D4 \u0039\uC77C \uBC84\uCEF4\uD37C\uB2C8 1\uC8FC\uB144',
    subtitle: '\uCD95\uD558\uD569\uB2C8\uB2E4!',
    desc:
      '\u0037\uC6D4 \u0039\uC77C, \uBC84\uCEF4\uD37C\uB2C8 1\uC8FC\uB144\uC744 \uD568\uAED8 \uCD95\uD558\uD574 \uC8FC\uC138\uC694. \uC55E\uC73C\uB85C\uB3C4 \uC124\uC544\uC640 \uBC84\uCEF4\uD37C\uB2C8\uC640 \uD568\uAED8\uD574 \uC8FC\uC138\uC694.',
    hideToday: '\uC624\uB298 \uD558\uB8E8 \uBCF4\uC9C0 \uC54A\uAE30',
    confirm: '\uCD95\uD558\uD569\uB2C8\uB2E4! \uD83C\uDF89',
    close: '\uB2EB\uAE30',
    imageAlt: '\u0037\uC6D4 \u0039\uC77C \uBC84\uCEF4\uD37C\uB2C8 1\uC8FC\uB144 \uCD95\uD558 \uC774\uBBF8\uC9C0',
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
