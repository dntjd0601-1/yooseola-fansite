const DEFAULT_PLAYLIST_ID = 'PLDmzzSPk7ZiAFX3Gk9kOR0AwTeId5WolD';

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

function decodeXml(text = '') {
  return text
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

function parseTitleFromChunk(chunk = '') {
  const runs = chunk.match(/"title":\{"runs":\[\{"text":"([^"]+)"/);
  if (runs?.[1]) return runs[1];

  const runList = chunk.match(/"title":\{"runs":\[([\s\S]*?)\]/);
  if (runList?.[1]) {
    const parts = [...runList[1].matchAll(/"text":"([^"]*)"/g)].map((m) => m[1]);
    if (parts.length) return parts.join('');
  }

  const simple = chunk.match(/"title":\{"simpleText":"([^"]+)"/);
  if (simple?.[1]) return simple[1];

  const accessibility = chunk.match(/"accessibility":\{"accessibilityData":\{"label":"([^"]+)"/);
  if (accessibility?.[1]) return accessibility[1];

  return '';
}

function needsTitleLookup(title, videoId) {
  return !title || title === videoId || /^[a-zA-Z0-9_-]{11}$/.test(title);
}

async function fetchOembedTitle(videoId) {
  try {
    const oembedUrl =
      `https://www.youtube.com/oembed?url=${encodeURIComponent(`https://www.youtube.com/watch?v=${videoId}`)}&format=json`;
    const res = await fetch(oembedUrl);
    if (!res.ok) return '';
    const data = await res.json();
    return data?.title || '';
  } catch {
    return '';
  }
}

async function enrichItemTitles(items) {
  return Promise.all(
    items.map(async (item) => {
      if (!needsTitleLookup(item.title, item.videoId)) return item;
      const title = await fetchOembedTitle(item.videoId);
      return title ? { ...item, title } : item;
    })
  );
}

function parsePlaylistRss(xmlText) {
  const titleById = new Map();
  const entryBlocks = xmlText.match(/<entry>[\s\S]*?<\/entry>/g) || [];

  for (const block of entryBlocks) {
    const videoId = (block.match(/<yt:videoId>([^<]+)<\/yt:videoId>/) || [])[1];
    if (!videoId) continue;
    const title = decodeXml((block.match(/<title>([^<]+)<\/title>/) || [])[1] || videoId);
    titleById.set(videoId, title);
  }

  const playlistTitle = decodeXml((xmlText.match(/<feed[\s\S]*?<title>([^<]+)<\/title>/) || [])[1] || '');
  return { playlistTitle, titleById };
}

function parsePlaylistHtml(htmlText, titleById) {
  const items = [];
  const seen = new Set();
  const idMatches = htmlText.matchAll(/"videoId":"([a-zA-Z0-9_-]{11})"/g);

  for (const match of idMatches) {
    const videoId = match[1];
    if (seen.has(videoId) || videoId === 'CeCOBCcnkMxy7Hb09u8dxg') continue;
    seen.add(videoId);

    let title = titleById.get(videoId) || '';
    if (!title) {
      const idx = htmlText.indexOf(`"videoId":"${videoId}"`);
      if (idx >= 0) {
        title = parseTitleFromChunk(htmlText.slice(idx, idx + 5000));
      }
    }
    if (!title) title = videoId;

    items.push({
      title,
      videoId,
      thumb: `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
      mood: '노래',
    });
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

  const url = new URL(req.url);
  const listId = url.searchParams.get('list') || DEFAULT_PLAYLIST_ID;

  try {
    const feedUrl = `https://www.youtube.com/feeds/videos.xml?playlist_id=${encodeURIComponent(listId)}`;
    const pageUrl = `https://www.youtube.com/playlist?list=${encodeURIComponent(listId)}`;

    const [feedRes, pageRes] = await Promise.all([
      fetch(feedUrl),
      fetch(pageUrl, { headers: { 'User-Agent': 'Mozilla/5.0' } }),
    ]);

    let playlistTitle = '';
    let titleById = new Map();
    let pageHtml = '';

    if (feedRes.ok) {
      const parsed = parsePlaylistRss(await feedRes.text());
      playlistTitle = parsed.playlistTitle;
      titleById = parsed.titleById;
    }

    if (pageRes.ok) {
      pageHtml = await pageRes.text();
    }

    let items = [];
    if (pageHtml) {
      items = parsePlaylistHtml(pageHtml, titleById);
    } else if (titleById.size) {
      items = [...titleById.entries()].map(([videoId, title]) => ({
        title,
        videoId,
        thumb: `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
        mood: '노래',
      }));
    }

    if (!playlistTitle && pageHtml) {
      const titleMatch = pageHtml.match(/<title>([^<]+)<\/title>/);
      if (titleMatch?.[1]) {
        playlistTitle = titleMatch[1].replace(/ - YouTube$/, '').trim();
      }
    }

    items = await enrichItemTitles(items);

    return json({
      playlist: {
        id: listId,
        title: playlistTitle,
        url: `https://www.youtube.com/playlist?list=${listId}`,
      },
      items,
      updatedAt: new Date().toISOString(),
    });
  } catch {
    return json({ playlist: { id: listId }, items: [], updatedAt: null });
  }
};
