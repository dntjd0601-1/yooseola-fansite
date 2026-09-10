/**
 * 프로필 연혁 — 나무위키「유키(버츄얼 스트리머)」방송 역사·참여 콘텐츠 기준
 * https://namu.wiki/w/유키(버츄얼 스트리머)
 */
const PROFILE_HISTORY = [
  { date: '2024. 10. 21', title: '첫 방송 데뷔', text: 'SOOP에서 버츄얼 스트리머로 첫 방송을 시작했습니다.', icon: 'soop.svg' },
  { date: '2024. 11. 14', title: '싱킹 노래대회', text: '바밍의 싱킹 노래대회에 참가했습니다.', icon: 'group.svg' },
  { date: '2025. 01. 24', title: '마병대 시즌 2', text: '마병대2 2소대에 입대했습니다.', icon: 'mabyeong.png' },
  { date: '2025. 02. 28', title: '베스트 스트리머', text: 'SOOP 베스트 스트리머로 선발되었습니다.', icon: 'best-bj.webp' },
  { date: '2025. 07. 24', title: '킹콩서버 섭주', text: '마인크래프트 킹콩서버 섭주로 활동했습니다.', icon: 'minecraft.svg' },
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
        meta: '2026. 04. 26 ~',
        note: '현재 소속 크루. 합방·종겜·일상 콘텐츠를 함께합니다.',
        icon: 'group.svg',
      },
      {
        name: '버컴퍼니',
        meta: '2025. 09. 03 ~ 2026. 04. 13',
        note: '1기 3차 영입 멤버. 홍신소 임대 후 복귀, 1기 졸업으로 탈퇴.',
        icon: 'vcompany.webp',
      },
    ],
  },
  {
    title: '마인크래프트 · 서버',
    items: [
      { name: '마병대 시즌 2', meta: '2025. 01 · 2소대', note: '마병대2 2소대 입대.', icon: 'mabyeong.png' },
      { name: '킹콩서버', meta: '2025. 07 · 섭주', note: '직접 운영한 마크 관련 서버.', icon: 'minecraft.svg' },
      { name: '돌발서버', meta: '감스트', note: '마병대2·돌발서버 참여.', icon: 'group.svg' },
      { name: '로나월드 2.5', meta: '로나땅', note: '로나월드 2.5 참여.', icon: 'ronaworld.webp' },
      { name: '퍼켓몬', meta: '퍼드', note: '퍼켓몬 서버 참여.', icon: 'minecraft.svg' },
      { name: '린코레일', meta: '린코', note: '린코레일 참여.', icon: 'minecraft.svg' },
      { name: '치종대', meta: '컵치킨 · 2팀', note: '치종대 2팀 멤버.', icon: 'group.svg' },
      { name: '각공대', meta: '김부각 · 4중대장', note: '각공대 4중대장.', icon: 'group.svg' },
      { name: '공룡서버', meta: '바밍 · 사막부족', note: '공룡서버 사막부족.', icon: 'mingchin.webp' },
    ],
  },
  {
    title: '합방 · 대회 · 콘텐츠',
    items: [
      { name: '숲퍼소닉 MC', meta: '크레비쥬', note: '1회차 게스트 뉴냥이·뱌링·메루, 2회차 라벤·백서향·투미츠.', icon: 'soop.svg' },
      { name: '크레비쥬 콘서트 MC', meta: '라인업 미르·아야네 세나·뉴냥이', note: '크레비쥬 콘서트 MC로 참여.', icon: 'group.svg' },
      { name: '버육대 2025', meta: '황금쌀먹단', note: '종합 2위, 역도 개인 은메달.', icon: 'bird.svg' },
      { name: '격치원 4기', meta: '짬타수아 · 스트리트 파이터 6', note: '격겜동 격치원 4기.', icon: 'group.svg' },
      { name: '버챔스', meta: '2026. 03 · 버컴FC', note: '두치와뿌꾸 버챔스 참가.', icon: 'gambasya.webp' },
      { name: '여우도시', meta: 'GTA · 화양씨', note: 'GTA5 여우도시 참여.', icon: 'gta.svg' },
      { name: '노래 커버', meta: '유튜브', note: '에일 피날레, 고추잠자리 너라는별 등 커버곡.', icon: 'group.svg' },
    ],
  },
];
