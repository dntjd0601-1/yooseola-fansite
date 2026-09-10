/** Manual schedule overrides from schedule-overrides.json */
(function () {
  if (typeof SCHEDULE_EVENTS === 'undefined') return;
  const overrides = {};
  Object.keys(overrides).forEach((date) => {
    SCHEDULE_EVENTS[date] = overrides[date];
  });
})();