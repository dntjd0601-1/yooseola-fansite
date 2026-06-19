const CAFE_ID = '31396984';
const CAFE_REFERER = 'https://cafe.naver.com/yoonanana';
const CAFE_MENUS = [
  { id: 22, source: 'fan-cafe', label: '팬아트' },
  { id: 18, source: 'cafe-photo', label: '츄스타그램' },
];
const VCOMPANY_MEMBER = 'yeveee';
const VCOMPANY_URL = 'https://v-company.xyz/gallery';

const MAX_CAFE_PER_MENU = 60;
const MAX_VCOMPANY = 200;
const CAFE_PAGES = 4;
const CAFE_PAGE_SIZE = 50;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Cache-Control': 'no-store',
};

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json; charset=utf-8',
    },
  });
}

function isGif(url = '') {
  return /\.gif($|\?)/i.test(url);
}

function addItem(items, seen, src, caption, source, url) {
  if (!src || seen.has(src) || isGif(src)) return false;
  seen.add(src);
  items.push({
    src,
    caption: caption || '',
    source,
    url: url || '',
  });
  return true;
}

async function fetchCafeMenu(menuId, source) {
  const items = [];
  const seen = new Set();
  let count = 0;

  for (let page = 1; page <= CAFE_PAGES; page += 1) {
    if (count >= MAX_CAFE_PER_MENU) break;
    const apiUrl =
      `https://apis.naver.com/cafe-web/cafe-boardlist-api/v1/cafes/${CAFE_ID}` +
      `/menus/${menuId}/articles?page=${page}&pageSize=${CAFE_PAGE_SIZE}`;

    try {
      const res = await fetch(apiUrl, {
        headers: { Referer: CAFE_REFERER },
      });
      if (!res.ok) break;
      const data = await res.json();
      const list = data?.result?.articleList;
      if (!list?.length) break;

      for (const row of list) {
        if (count >= MAX_CAFE_PER_MENU) break;
        const it = row.item;
        if (!it?.hasImage) continue;
        if (!['I', 'M'].includes(it.representImageType)) continue;
        const img = decodeURIComponent(it.representImage || '');
        const link = `${CAFE_REFERER}/${it.articleId}`;
        if (addItem(items, seen, img, it.subject, source, link)) {
          count += 1;
        }
      }

      if (!data?.result?.pageInfo?.visibleNextButton) break;
    } catch {
      break;
    }
  }

  return items;
}

async function fetchVCompany() {
  const items = [];
  const seen = new Set();
  let offset = 0;
  const batch = 100;

  while (items.length < MAX_VCOMPANY) {
    const apiUrl =
      `https://v-company.xyz/api/gallery?member_id=${VCOMPANY_MEMBER}&limit=${batch}&offset=${offset}`;

    try {
      const res = await fetch(apiUrl);
      if (!res.ok) break;
      const data = await res.json();
      const rows = data?.data;
      if (!rows?.length) break;

      let added = 0;
      for (const row of rows) {
        if (items.length >= MAX_VCOMPANY) break;
        if (row.member_id !== VCOMPANY_MEMBER) continue;
        if (row.image_type?.includes('gif') || isGif(row.image_url)) continue;
        const caption = row.artist || '유설아';
        if (addItem(items, seen, row.image_url, caption, 'v-company', VCOMPANY_URL)) {
          added += 1;
        }
      }

      if (rows.length < batch || added === 0) break;
      offset += batch;
    } catch {
      break;
    }
  }

  return items;
}

export default async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }
  if (req.method !== 'GET') {
    return json({ error: 'Method not allowed' }, 405);
  }

  try {
    const cafeResults = await Promise.all(
      CAFE_MENUS.map((menu) => fetchCafeMenu(menu.id, menu.source))
    );
    const vCompanyItems = await fetchVCompany();

    const merged = [];
    const seen = new Set();
    const pushAll = (list) => {
      for (const item of list) {
        if (seen.has(item.src)) continue;
        seen.add(item.src);
        merged.push(item);
      }
    };

    pushAll(cafeResults[0] || []);
    pushAll(vCompanyItems);
    for (let i = 1; i < cafeResults.length; i += 1) {
      pushAll(cafeResults[i] || []);
    }

    return json({
      items: merged,
      counts: {
        'fan-cafe': (cafeResults[0] || []).length,
        'v-company': vCompanyItems.length,
        'cafe-photo': (cafeResults[1] || []).length,
        total: merged.length,
      },
      updatedAt: new Date().toISOString(),
    });
  } catch {
    return json({ items: [], counts: { total: 0 }, updatedAt: null });
  }
};
