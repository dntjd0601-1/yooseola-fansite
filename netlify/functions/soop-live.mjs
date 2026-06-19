const SOOP_BJ_ID = 'yeveee';
const PLAY_URL = `https://play.sooplive.com/${SOOP_BJ_ID}`;

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

function parseLiveFromHtml(html) {
  const isLive = /broadcasting-type=["']live["']/i.test(html);
  if (!isLive) return { live: false };

  const broadNo = Number((html.match(/window\.nBroadNo\s*=\s*(\d+)/) || [])[1] || 0);
  if (!broadNo) return { live: false };

  const titleMatch = html.match(/window\.szBroadTitle\s*=\s*"((?:\\.|[^"\\])*)"/)
    || html.match(/window\.szBroadTitle\s*=\s*'((?:\\.|[^'\\])*)'/);
  const thumbMatch = html.match(/window\.szBroadThumPath\s*=\s*'([^']*)'/)
    || html.match(/window\.szBroadThumPath\s*=\s*"([^"]*)"/);

  let title = titleMatch ? titleMatch[1] : 'SOOP 생방송';
  title = title.replace(/\\"/g, '"').replace(/\\'/g, "'");

  return {
    live: true,
    broadNo,
    title,
    thumb: thumbMatch ? thumbMatch[1] : `https://liveimg.sooplive.com/m/${broadNo}`,
    url: `https://play.sooplive.com/${SOOP_BJ_ID}/${broadNo}`,
  };
}

export default async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }
  if (req.method !== 'GET') {
    return json({ error: 'Method not allowed' }, 405);
  }

  try {
    const res = await fetch(PLAY_URL, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; YooseolaFanSite/1.0)' },
    });
    if (!res.ok) return json({ live: false });
    return json(parseLiveFromHtml(await res.text()));
  } catch {
    return json({ live: false });
  }
};
