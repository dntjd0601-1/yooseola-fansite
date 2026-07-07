/** Manual schedule overrides from schedule-overrides.json */
(function () {
  if (typeof SCHEDULE_EVENTS === 'undefined') return;
  const overrides = {
  "2026-07-03": [{ "type": "live", "title": "소통방송" }],
  "2026-07-05": [{ "type": "live", "title": "휴방" }],
  "2026-07-06": [{ "type": "live", "title": "휴방" }],
  "2026-07-07": [{ "type": "live", "title": "소통방송" }]
};
  Object.keys(overrides).forEach((date) => {
    SCHEDULE_EVENTS[date] = overrides[date];
  });
})();