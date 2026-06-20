const CAFE_ID = '31396984';
const CAFE_REFERER = 'https://cafe.naver.com/yoonanana';
const ARTICLE_API = `https://apis.naver.com/cafe-web/cafe-articleapi/cafes/${CAFE_ID}/articles`;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Cache-Control': 'public, max-age=300',
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

export default async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }
  if (req.method !== 'GET') {
    return json({ error: 'Method not allowed' }, 405);
  }

  const postId = new URL(req.url).searchParams.get('postId') || '';
  if (!/^\d+$/.test(postId)) {
    return json({ images: [] });
  }

  try {
    const res = await fetch(`${ARTICLE_API}/${postId}`, {
      headers: { Referer: CAFE_REFERER },
    });
    if (!res.ok) return json({ images: [] });
    const data = await res.json();
    return json({ images: extractImagesFromArticlePayload(data) });
  } catch {
    return json({ images: [] });
  }
};
