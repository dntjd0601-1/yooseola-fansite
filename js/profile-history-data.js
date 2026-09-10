/**
 * 프로필 연혁 — 나무위키「유키(버츄얼 스트리머)」기준 (2026.06.24)
 * https://namu.wiki/w/유키(버츄얼 스트리머)
 */
const PROFILE_HISTORY = [
  { date: '2024. 10. 21', title: '첫 방송 데뷔', text: 'SOOP에서 버츄얼 스트리머로 첫 방송을 시작했습니다.', icon: 'soop.svg' },
  { date: '2024. 11. 14', title: '싱킹 노래대회', text: '바밍의 싱킹 노래대회에 참가했습니다.', icon: 'group.svg' },
  { date: '2025. 01. 24', title: '마병대 시즌 2', text: '마병대2 2소대에 입대했습니다.', icon: 'mabyeong.png' },
  { date: '2025. 02. 28', title: '베스트 스트리머', text: 'SOOP 베스트 스트리머로 선발되었습니다.', icon: 'best-bj.webp' },
  { date: '2025. 07. 24', title: '킹콩서버 섭주', text: '직접 운영한 마인크래프트 수련회 서버 킹콩서버의 섭주를 맡았습니다.', icon: 'minecraft.svg' },
  { date: '2025. 07. 31', title: '격치원 4기', text: '짬타수아의 격치원 4기 멤버로 합류했습니다.', icon: 'group.svg' },
  { date: '2025. 09. 03', title: '버컴퍼니 합류', text: '버컴퍼니 1기 3차 영입 멤버로 합류했습니다.', icon: 'vcompany.webp' },
  { date: '2025. 09. 09', title: '버육대 2025', text: '황금쌀먹단 종합 2위, 역도 개인 은메달.', icon: 'bird.svg' },
  { date: '2025. 10. 10', title: '애청자 1만', text: 'SOOP 애청자 1만 명을 달성했습니다.', icon: 'soop.svg' },
  { date: '2025. 10. 13', title: '닉네임 변경', text: '활동명을 아마이 유키에서 유키로 변경했습니다.', icon: 'group.svg' },
  { date: '2025. 10. 21', title: '방송 1주년', text: '첫 방송 1주년을 맞았습니다.', icon: 'soop.svg' },
  { date: '2025. 11. 30', title: '홍신소 임대', text: '버컴퍼니에서 홍신소로 1개월 임대 이적했습니다.', icon: 'vcompany.webp' },
  { date: '2026. 01. 06', title: '버컴퍼니 복귀', text: '임대 만료로 버컴퍼니에 복귀했습니다.', icon: 'vcompany.webp' },
  { date: '2026. 03. 21', title: '버챔스', text: '두치와뿌꾸 버챔스에 버컴FC 소속으로 참가했습니다.', icon: 'gambasya.webp' },
  { date: '2026. 04. 13', title: '버컴퍼니 졸업', text: '버컴퍼니 1기 종료와 함께 졸업·탈퇴했습니다.', icon: 'vcompany.webp' },
  { date: '2026. 04. 26', title: '뚱딴지 합류', text: '뚱딴지 크루에 합류해 현재까지 활동 중입니다.', icon: 'group.svg' },
  { date: '2026. 05. 10', title: '뚱딴지 테마곡', text: '뚱딴지 AI 메인 테마곡 만들기를 진행했습니다.', icon: 'group.svg' },
  { date: '2026. 06. 01', title: '감니버스 올림픽', text: '감니버스 종겜 올림픽에 뚱딴지 소속으로 철권에 참가했습니다.', icon: 'group.svg' },
  { date: '2026. 06. 24', title: '뚱딴지 오락관', text: '뚱딴지 오락관 콘텐츠에 참여했습니다.', icon: 'group.svg' },
];

const PROFILE_CONTENT_GROUPS = [
  {
    title: '소속 · 크루',
    items: [
      {
        name: '크레비쥬',
        meta: 'MCN · Crevizu',
        note: '버츄얼 스트리머 소속사 크레비쥬에서 활동합니다.',
        icon: 'group.svg',
      },
      {
        name: '뚱딴지',
        meta: '2026. 04. 26 ~ 현재',
        note: '현재 소속 크루. 합방·종겜·일상 콘텐츠를 함께합니다.',
        icon: 'group.svg',
      },
      {
        name: '버컴퍼니',
        meta: '2025. 09. 03 ~ 2026. 04. 13',
        note: '1기 3차 영입 멤버. 홍신소 임대 후 복귀, 1기 졸업으로 탈퇴.',
        icon: 'vcompany.webp',
      },
      {
        name: '홍신소',
        meta: '2025. 11. 30 ~ 2026. 01. 06',
        note: '버컴퍼니에서 1개월 임대 이적.',
        icon: 'vcompany.webp',
      },
    ],
  },
  {
    title: '마인크래프트 · 서버',
    items: [
      { name: '마병대 2·3', meta: '감스트 · 2소대', note: '마병대2 2소대 입대, 이후 시즌 3도 참여.', icon: 'mabyeong.png' },
      { name: '킹콩서버', meta: '2025. 07 · 섭주', note: '직접 운영한 마크 수련회 서버.', icon: 'minecraft.svg' },
      { name: '돌발서버', meta: '감스트', note: '마병대·돌발서버 참여.', icon: 'group.svg' },
      { name: '충동서버', meta: '감스트', note: '감스트 충동서버 참여.', icon: 'minecraft.svg' },
      { name: '로나월드 2.5', meta: '로나땅', note: '로나월드 2.5 참여.', icon: 'ronaworld.webp' },
      { name: '더켓몬서버', meta: '더빙레이디', note: '더켓몬서버, 다이아 런 2회차 참여.', icon: 'minecraft.svg' },
      { name: '린코레일', meta: '린코', note: '린코레일·린코레일2 참여.', icon: 'minecraft.svg' },
      { name: '치종대', meta: '컵치킨 · 2팀', note: '치종대 2팀 멤버.', icon: 'group.svg' },
      { name: '각공대', meta: '김부각 · 4중대장', note: '각공대 4중대장.', icon: 'group.svg' },
      { name: '미미네팜', meta: '미쑬쩡', note: '미미네팜 서버 참여. 유임어택 등 자체 콘텐츠.', icon: 'minecraft.svg' },
      { name: '꾸다방', meta: '꾸야', note: '꾸다방 참여.', icon: 'group.svg' },
      { name: '마크 FPS', meta: '클로이', note: '클로이 마크 FPS 참여.', icon: 'minecraft.svg' },
    ],
  },
  {
    title: '합방 · 대회 · 콘텐츠',
    items: [
      { name: '숲퍼소닉 MC', meta: '크레비쥬', note: '1회차 게스트 뉴냥이·뱌링·메루, 2회차 라벤·백서향·투미츠.', icon: 'soop.svg' },
      { name: '크레비쥬 콘서트 MC', meta: '미르·아야네 세나·뉴냥이', note: '크레비쥬 콘서트 MC로 참여.', icon: 'group.svg' },
      { name: '버육대 2025', meta: '황금쌀먹단', note: '종합 2위, 역도 개인 은메달.', icon: 'bird.svg' },
      { name: '격치원 4기', meta: '짬타수아 · 격겜동', note: '스트리트 파이터 6 격치원 4기.', icon: 'group.svg' },
      { name: '버챔스', meta: '2026. 03 · 버컴FC', note: '두치와뿌꾸 버챔스 참가.', icon: 'gambasya.webp' },
      { name: '감니버스', meta: '2026. 06 · 뚱딴지', note: '종겜 올림픽·철권8 대회 참가.', icon: 'group.svg' },
      { name: '뚱딴지 오락관', meta: '2026. 06. 24', note: '크루 오락관 콘텐츠.', icon: 'group.svg' },
      { name: '노래 커버', meta: '유튜브', note: '에일 피날레, 고추잠자리 너라는별 등 커버곡.', icon: 'group.svg' },
    ],
  },
];
