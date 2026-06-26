/**
 * 츄르단 수박게임 — 유설아 움짤/이미지 단계 (11단계)
 * 참고: https://v-company.xyz/games/suika
 */
const SUIKA_TIERS = [
  { name: '츄르', emoji: '🍒', radius: 18, color: '#e74c3c', points: 1, image: 'images/suika/tier-0.jpg' },
  { name: '냥', emoji: '🍓', radius: 25, color: '#e91e63', points: 3, image: 'images/suika/tier-1.png' },
  { name: '설창', emoji: '🍇', radius: 32, color: '#9b59b6', points: 6, image: 'images/suika/tier-2.png' },
  { name: '모에', emoji: '🍊', radius: 40, color: '#f39c12', points: 10, image: 'images/suika/tier-3.png' },
  { name: '궁디', emoji: '🍅', radius: 48, color: '#e67e22', points: 15, image: 'images/suika/tier-4.png' },
  { name: '사랑해', emoji: '🍎', radius: 58, color: '#c0392b', points: 21, image: 'images/suika/tier-5.png' },
  { name: 'ㅋㅋㅋ', emoji: '🍐', radius: 68, color: '#a8d666', points: 28, image: 'images/suika/tier-6.png' },
  { name: '흡성', emoji: '🍑', radius: 78, color: '#ffb6c1', points: 36, image: 'images/suika/tier-7.png' },
  { name: '설아', emoji: '🍍', radius: 90, color: '#f1c40f', points: 45, image: 'images/suika/tier-8.png' },
  { name: '설아맛집', emoji: '🍈', radius: 102, color: '#2ecc71', points: 55, image: 'images/suika/tier-9.png' },
  { name: '대설아', emoji: '🍉', radius: 115, color: '#27ae60', points: 100, image: 'images/suika/tier-10.gif' },
];

const SUIKA_BOARD = { width: 560, height: 760, dropY: 100, dangerY: 130 };
const SUIKA_STORAGE_KEY = 'churudan_suika_best';
