/** Manual schedule overrides from schedule-overrides.json */
(function () {
  if (typeof SCHEDULE_EVENTS === 'undefined') return;
  const overrides = {
  "2026-07-15": [{ "type": "live", "title": "링티커머스\n용형 알아보기\n삼연서버 연습" }]
};
  Object.keys(overrides).forEach((date) => {
    SCHEDULE_EVENTS[date] = overrides[date];
  });
})();