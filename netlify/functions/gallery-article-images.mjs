import { extractImagesFromArticlePayload } from './_lib/cafe-article-images.mjs';

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
