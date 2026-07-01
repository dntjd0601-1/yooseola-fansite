/**
 * 츄르단 수박게임 — 유설아 움짤 단계 (11단계)
 * 참고: https://v-company.xyz/games/suika
 */
const SUIKA_GIF_BASE = 'images/hero-seola.gif';

const SUIKA_TIERS = [
  { name: '츄르', emoji: '🍒', radius: 18, color: '#e74c3c', points: 1, image: SUIKA_GIF_BASE },
  { name: '냥', emoji: '🍓', radius: 25, color: '#e91e63', points: 3, image: SUIKA_GIF_BASE },
  { name: '설창', emoji: '🍇', radius: 32, color: '#9b59b6', points: 6, image: SUIKA_GIF_BASE },
  { name: '모에', emoji: '🍊', radius: 40, color: '#f39c12', points: 10, image: SUIKA_GIF_BASE },
  { name: '궁디', emoji: '🍅', radius: 48, color: '#e67e22', points: 15, image: SUIKA_GIF_BASE },
  { name: '사랑해', emoji: '🍎', radius: 58, color: '#c0392b', points: 21, image: SUIKA_GIF_BASE },
  { name: 'ㅋㅋㅋ', emoji: '🍐', radius: 68, color: '#a8d666', points: 28, image: SUIKA_GIF_BASE },
  { name: '흡성', emoji: '🍑', radius: 78, color: '#ffb6c1', points: 36, image: SUIKA_GIF_BASE },
  { name: '설아', emoji: '🍍', radius: 90, color: '#f1c40f', points: 45, image: SUIKA_GIF_BASE },
  { name: '설아맛집', emoji: '🍈', radius: 102, color: '#2ecc71', points: 55, image: SUIKA_GIF_BASE },
  { name: '대설아', emoji: '🍉', radius: 115, color: '#27ae60', points: 100, image: 'images/suika/tier-10.gif' },
];

const SUIKA_BOARD = {
  width: 560,
  height: 760,
  dropY: 88,
  dangerY: 130,
  dropCooldownMs: 1100,
  maxDropTier: 4,
};

const SUIKA_PHYSICS = {
  gravity: 0.55,
  restitution: 0.05,
  friction: 0.55,
  frictionAir: 0.035,
};

const SUIKA_STORAGE_KEY = 'churudan_suika_best';
