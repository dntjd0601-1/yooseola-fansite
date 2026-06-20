const CAFE_ID = '31396984';
const CAFE_REFERER = 'https://cafe.naver.com/yoonanana';
const ARTICLE_API = `https://apis.naver.com/cafe-web/cafe-articleapi/cafes/${CAFE_ID}/articles`;
const CAFE_MENUS = [
  { id: 22, source: 'fan-cafe', label: '팬카페' },
  { id: 18, source: 'cafe-photo', label: '카페 사진' },
];
const VCOMPANY_MEMBER = 'yeveee';
const VCOMPANY_URL = 'https://v-company.xyz/gallery';

const MAX_CAFE_PER_MENU = 60;
const MAX_VCOMPANY = 200;
const CAFE_PAGES = 4;
const CAFE_PAGE_SIZE = 50;
const ARTICLE_FETCH_CONCURRENCY = 10;

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

function isCafeLogoThumb(url = '') {
  return /\/image\.PNG$/i.test(url) || url.includes('/default/cafe_profile');
}

function normalizeImageUrl(url = '') {
  if (!url) return '';
  try {
    return decodeURIComponent(url);
  } catch {
    return url;
  }
}

function extractImagesFromArticlePayload(data) {
  const urls = [];
  const seen = new Set();
  const html = data?.article?.content || '';

  const pushUrl = (raw) => {
    const src = normalizeImageUrl(raw);
    if (!src || seen.has(src) || isGif(src) || isCafeLogoThumb(src)) return;
    seen.add(src);
    urls.push(src);
  };

  const thumbRe = /https:\/\/cafeptthumb-phinf\.pstatic\.net\/[^"'\\<\s]+/gi;
  for (const match of html.matchAll(thumbRe)) {
    pushUrl(match[0]);
  }

  const attachList = data?.attaches || data?.article?.attaches || [];
  for (const attach of attachList) {
    pushUrl(attach.imageUrl || attach.image?.url || attach.thumbnailUrl || attach.url);
  }

  return urls;
}

async function fetchArticleImages(articleId) {
  try {
    const res = await fetch(`${ARTICLE_API}/${articleId}`, {
      headers: { Referer: CAFE_REFERER },
    });
    if (!res.ok) return [];
    const data = await res.json();
    return extractImagesFromArticlePayload(data);
  } catch {
    return [];
  }
}

async function mapPool(items, mapper, concurrency = ARTICLE_FETCH_CONCURRENCY) {
  const results = new Array(items.length);
  let index = 0;

  async function worker() {
    while (index < items.length) {
      const current = index;
      index += 1;
      results[current] = await mapper(items[current], current);
    }
  }

  const workers = Array.from(
    { length: Math.min(concurrency, items.length) },
    () => worker()
  );
  await Promise.all(workers);
  return results;
}

function buildCafeItems(article, source, images) {
  const link = `${CAFE_REFERER}/${article.articleId}`;
  const caption = article.subject || '';
  const postId = String(article.articleId);
  const srcList = images.length
    ? images
    : [normalizeImageUrl(article.representImage || '')].filter(Boolean);

  return srcList.map((src, imageIndex) => ({
    src,
    caption,
    source,
    url: link,
    postId,
    imageIndex,
    imageCount: srcList.length,
  }));
}

async function fetchCafeMenu(menuId, source) {
  const articles = [];

  for (let page = 1; page <= CAFE_PAGES; page += 1) {
    if (articles.length >= MAX_CAFE_PER_MENU) break;
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
        if (articles.length >= MAX_CAFE_PER_MENU) break;
        const it = row.item;
        if (!it?.hasImage) continue;
        if (!['I', 'M'].includes(it.representImageType)) continue;
        articles.push(it);
      }

      if (!data?.result?.pageInfo?.visibleNextButton) break;
    } catch {
      break;
    }
  }

  const expanded = await mapPool(articles, async (article) => {
    const images = await fetchArticleImages(article.articleId);
    return buildCafeItems(article, source, images);
  });

  return expanded.flat();
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
        const src = row.image_url;
        if (!src || seen.has(src)) continue;
        seen.add(src);
        const caption = row.artist || '유설아';
        items.push({
          src,
          caption,
          source: 'v-company',
          url: VCOMPANY_URL,
          postId: row.id ? String(row.id) : '',
          imageIndex: 0,
          imageCount: 1,
        });
        added += 1;
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
