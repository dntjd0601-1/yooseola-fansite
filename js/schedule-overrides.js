/** Manual schedule overrides from schedule-overrides.json */
(function () {
  if (typeof SCHEDULE_EVENTS === 'undefined') return;
  const overrides = {
  "2026-07-09": [{ "type": "celebration", "title": "버컴퍼니\n1주년" }],
  "2026-07-10": [{ "type": "special", "title": "충동서버 공약\n제주도" }],
  "2026-07-11": [{ "type": "special", "title": "충동서버 공약\n제주도" }],
  "2026-07-12": [{ "type": "special", "title": "충동서버 공약\n제주도" }],
  "2026-07-13": [{ "type": "special", "title": "충동서버 공약\n제주도" }],
  "2026-07-15": [{ "type": "live", "title": "링티커머스\n용형 알아보기\n삼연서버 연습" }],
  "2026-07-17": [{ "type": "off", "title": "휴방" }],
  "2026-07-20": [{ "type": "off", "title": "비방 삼국지 연습" }],
  "2026-07-25": [{ "type": "live", "title": "삼국지 api 독려방송" }],
  "2026-07-26": [{ "type": "live", "title": "삼국지 api 독려방송" }],
  "2026-07-27": [{ "type": "live", "title": "삼국지 api 독려방송" }],
  "2026-07-28": [{ "type": "live", "title": "삼국지 api 독려방송" }],
  "2026-07-29": [{ "type": "live", "title": "삼국지 api 독려방송" }],
  "2026-07-30": [{ "type": "live", "title": "삼국지 api 독려방송" }],
  "2026-07-31": [{ "type": "live", "title": "삼국지 api 독려방송" }],
  "2026-08-10": [{ "type": "off", "title": "휴방" }],
  "2026-08-11": [{ "type": "live", "title": "짧은 소통방송" }],
  "2026-08-12": [{ "type": "off", "title": "휴방" }],
  "2026-08-13": [{ "type": "off", "title": "휴방" }],
  "2026-08-14": [{ "type": "off", "title": "휴방" }]
};
  Object.keys(overrides).forEach((date) => {
    SCHEDULE_EVENTS[date] = overrides[date];
  });
})();