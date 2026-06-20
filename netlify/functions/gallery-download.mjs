const ALLOWED_HOSTS = new Set([
  'cafeptthumb-phinf.pstatic.net',
  'phinf.pstatic.net',
  'v-company.xyz',
]);

const REFERERS = {
  'cafeptthumb-phinf.pstatic.net': 'https://cafe.naver.com/yoonanana',
  'phinf.pstatic.net': 'https://cafe.naver.com/yoonanana',
};

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
};

function isAllowedImageUrl(urlString) {
  try {
    const url = new URL(urlString);
    return url.protocol === 'https:' && ALLOWED_HOSTS.has(url.hostname);
  } catch {
    return false;
  }
}

function sanitizeFilename(name = 'image.jpg') {
  const cleaned = name.replace(/[\\/:*?"<>|]/g, '').trim().slice(0, 120);
  return cleaned || 'image.jpg';
}

export default async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }
  if (req.method !== 'GET') {
    return new Response('Method not allowed', { status: 405, headers: corsHeaders });
  }

  const params = new URL(req.url).searchParams;
  const imageUrl = params.get('url') || '';
  const filename = sanitizeFilename(params.get('name') || 'image.jpg');

  if (!isAllowedImageUrl(imageUrl)) {
    return new Response('Invalid image URL', { status: 400, headers: corsHeaders });
  }

  try {
    const host = new URL(imageUrl).hostname;
    const headers = { 'User-Agent': 'Mozilla/5.0' };
    if (REFERERS[host]) headers.Referer = REFERERS[host];

    const res = await fetch(imageUrl, { headers });
    if (!res.ok) {
      return new Response('Image fetch failed', { status: 502, headers: corsHeaders });
    }

    const contentType = res.headers.get('content-type') || 'application/octet-stream';
    const encodedName = encodeURIComponent(filename);

    return new Response(await res.arrayBuffer(), {
      status: 200,
      headers: {
        ...corsHeaders,
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="${encodedName}"; filename*=UTF-8''${encodedName}`,
        'Cache-Control': 'no-store',
      },
    });
  } catch {
    return new Response('Download failed', { status: 502, headers: corsHeaders });
  }
};
