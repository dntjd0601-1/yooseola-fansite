/** Manual schedule overrides from schedule-overrides.json */
(function () {
  if (typeof SCHEDULE_EVENTS === 'undefined') return;
  const overrides = {
  "2026-07-09": [{ "type": "celebration", "title": "버컴퍼니\n1주년" }],
  "2026-07-10": [{ "type": "special", "title": "충동서버 공약\n제주도" }],
  "2026-07-11": [{ "type": "special", "title": "충동서버 공약\n제주도" }],
  "2026-07-12": [{ "type": "special", "title": "충동서버 공약\n제주도" }],
  "2026-07-13": [{ "type": "special", "title": "충동서버 공약\n제주도" }],
  "2026-07-15": [{ "type": "live", "title": "링티커머스\n용형 알아보기\n삼연서버 연습" }]
};
  Object.keys(overrides).forEach((date) => {
    SCHEDULE_EVENTS[date] = overrides[date];
  });
})();
