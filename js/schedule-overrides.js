/** Manual schedule overrides from schedule-overrides.json */
(function () {
  if (typeof SCHEDULE_EVENTS === 'undefined') return;
  const overrides = {
  "2026-07-02": [{ "type": "live", "title": "감니버스 메챠카멜레온" }],
  "2026-07-03": [{ "type": "live", "title": "소통방송" }],
  "2026-07-05": [{ "type": "live", "title": "휴방" }],
  "2026-07-06": [{ "type": "live", "title": "휴방" }],
  "2026-07-07": [{ "type": "live", "title": "소통방송" }],
  "2026-07-09": [{ "type": "celebration", "title": "버컴퍼니 1주년" }],
  "2026-07-10": [{ "type": "special", "title": "제주도 한라산 공약" }],
  "2026-07-11": [{ "type": "special", "title": "제주도 한라산 공약" }],
  "2026-07-12": [{ "type": "special", "title": "제주도 한라산 공약" }],
  "2026-07-13": [{ "type": "live", "title": "휴방" }],
  "2026-07-14": [{ "type": "live", "title": "휴방" }],
  "2026-07-15": [{ "type": "live", "title": "소통방송" }]
};
  Object.keys(overrides).forEach((date) => {
    SCHEDULE_EVENTS[date] = overrides[date];
  });
})();