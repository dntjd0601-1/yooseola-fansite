const ALLOWED_HOST = 'docs.google.com';
const ALLOWED_PATH_PREFIX = '/sheets-images-rt/';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
};

function isAllowedImageUrl(urlString) {
  try {
    const url = new URL(urlString);
    return (
      url.protocol === 'https:' &&
      url.hostname === ALLOWED_HOST &&
      url.pathname.startsWith(ALLOWED_PATH_PREFIX)
    );
  } catch {
    return false;
  }
}

export default async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }
  if (req.method !== 'GET') {
    return new Response('Method not allowed', { status: 405, headers: corsHeaders });
  }

  const imageUrl = new URL(req.url).searchParams.get('url') || '';
  if (!isAllowedImageUrl(imageUrl)) {
    return new Response('Invalid image URL', { status: 400, headers: corsHeaders });
  }

  try {
    const res = await fetch(imageUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0',
        Referer: 'https://docs.google.com/',
      },
    });

    if (!res.ok) {
      return new Response('Image fetch failed', { status: 502, headers: corsHeaders });
    }

    const contentType = res.headers.get('content-type') || 'image/png';

    return new Response(await res.arrayBuffer(), {
      status: 200,
      headers: {
        ...corsHeaders,
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=86400, stale-while-revalidate=604800',
      },
    });
  } catch {
    return new Response('Image proxy failed', { status: 502, headers: corsHeaders });
  }
};
