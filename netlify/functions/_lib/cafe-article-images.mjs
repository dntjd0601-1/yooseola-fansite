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

function unwrapCafeImageUrl(raw = '') {
  let url = normalizeImageUrl(String(raw).trim());
  url = url.replace(/^["']+|["']+$/g, '');
  if (!url) return '';

  if (url.includes('dthumb-phinf.pstatic.net')) {
    try {
      const parsed = new URL(url);
      const srcParam = parsed.searchParams.get('src');
      if (srcParam) {
        url = normalizeImageUrl(srcParam.replace(/^["']+|["']+$/g, ''));
      }
    } catch {
      /* keep original url */
    }
  }

  url = url.replace(/^["']+|["']+$/g, '');
  return url.replace(/\?type=w\d+"?$/i, '');
}

export function extractImagesFromArticlePayload(data) {
  const urls = [];
  const seen = new Set();

  const pushUrl = (raw) => {
    const src = unwrapCafeImageUrl(raw);
    if (!src || seen.has(src) || isGif(src) || isCafeLogoThumb(src)) return;
    seen.add(src);
    urls.push(src);
  };

  const elementLists = [
    data?.contentElements,
    data?.article?.contentElements,
  ];
  for (const elements of elementLists) {
    if (!Array.isArray(elements)) continue;
    for (const element of elements) {
      if (element?.type !== 'IMAGE') continue;
      pushUrl(element.json?.image?.url || element.image?.url);
    }
  }

  const attachList = data?.attaches || data?.article?.attaches || [];
  for (const attach of attachList) {
    pushUrl(attach.imageUrl || attach.image?.url || attach.thumbnailUrl || attach.url);
  }

  if (urls.length) return urls;

  const html = data?.article?.content || '';
  const thumbRe = /https:\/\/cafeptthumb-phinf\.pstatic\.net\/[^"'\\<\s]+/gi;
  for (const match of html.matchAll(thumbRe)) {
    pushUrl(match[0]);
  }

  return urls;
}
