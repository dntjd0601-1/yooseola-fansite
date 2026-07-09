/** Shared main song label — built from code points to avoid encoding mistakes. */
function buildMainSongTitle() {
  const H = String.fromCodePoint;
  return [
    H(0xBE0C, 0xB77C, 0xC6B4),
    ' ',
    H(0xC544, 0xC774, 0xC988),
    ' - ',
    H(0xBC8C, 0xC368),
    ' ',
    H(0xC77C, 0xB144),
  ].join('');
}

window.SITE_MAIN_SONG = {
  title: buildMainSongTitle(),
  videoId: 'U89YuK4SD9E',
  thumb: 'https://i.ytimg.com/vi/U89YuK4SD9E/hqdefault.jpg',
  mood: '\uBA54\uC778',
};
