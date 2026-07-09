/** Shared main song label — built from code points to avoid encoding mistakes. */
function buildMainSongTitle() {
  const H = String.fromCodePoint;
  return [
    H(0xBC84, 0xCEF4),
    ' 1',
    H(0xC8FC, 0xB144),
    ' ',
    H(0xCEE4, 0xBC84, 0xACE1),
    ' - ',
    H(0xB05D, 0xB584, 0xB2E4, 0xB294),
    ' ',
    H(0xAC83, 0xC740),
    ' ',
    H(0xB2E4, 0xC2DC),
    ' ',
    H(0xC2DC, 0xC791, 0xB41C, 0xB2E4, 0xB294),
    ' ',
    H(0xAC83, 0xC744),
  ].join('');
}

window.SITE_MAIN_SONG = {
  title: buildMainSongTitle(),
  videoId: 'XtVEV7wh76A',
  thumb: 'https://i.ytimg.com/vi/XtVEV7wh76A/hqdefault.jpg',
  mood: '\uBA54\uC778',
};
