/** Shared main song label — built from code points to avoid encoding mistakes. */
function buildMainSongTitle() {
  const H = String.fromCodePoint;
  return [
    H(0xB9DD, 0xAD6C, 0xB791),
    ' - ',
    H(0xBC84, 0xCEF4, 0xD37C, 0xB2C8, 0xC8FC, 0xB144),
    ' ',
    H(0xCEE4, 0xBC84, 0xACE1),
  ].join('');
}

window.SITE_MAIN_SONG = {
  title: buildMainSongTitle(),
  videoId: 'XtVEV7wh76A',
  thumb: 'https://i.ytimg.com/vi/XtVEV7wh76A/hqdefault.jpg',
  mood: '\uBA54\uC778',
};
