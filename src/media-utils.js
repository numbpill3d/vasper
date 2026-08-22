(function initMediaBoxUtils(root) {
  'use strict';

  const MEDIA_EXTENSION_RE = /\.(?:avif|bmp|gif|heic|heif|ico|jpe?g|png|svg|webp|apng|mp4|m4v|mov|webm|ogv|avi|mkv|mp3|m4a|aac|ogg|oga|wav|flac)(?:$|[?#])/i;
  const TYPE_EXTENSIONS = {
    image: 'jpg',
    video: 'mp4',
    audio: 'mp3',
    media: 'bin',
  };

  function rectanglesIntersect(a, b) {
    if (!a || !b || a.right <= a.left || a.bottom <= a.top || b.right <= b.left || b.bottom <= b.top) {
      return false;
    }
    return a.left <= b.right && a.right >= b.left && a.top <= b.bottom && a.bottom >= b.top;
  }

  function extractCssUrls(value) {
    if (!value || value === 'none') return [];
    const urls = [];
    const pattern = /url\(\s*(['"]?)(.*?)\1\s*\)/gi;
    let match;
    while ((match = pattern.exec(value)) !== null) {
      if (match[2]) urls.push(match[2]);
    }
    return urls;
  }

  function isLikelyMediaUrl(url) {
    return typeof url === 'string' && (MEDIA_EXTENSION_RE.test(url) || /^(?:data|blob):(image|video|audio)\//i.test(url));
  }

  function dedupeMedia(items) {
    const seen = new Set();
    return items.filter((item) => {
      if (!item || !item.url || seen.has(item.url)) return false;
      seen.add(item.url);
      return true;
    });
  }

  function safeFilename(value) {
    const cleaned = String(value || '')
      .replace(/[\\/:*"<>|?\u0000-\u001f]+/g, '_')
      .replace(/\s+/g, '_')
      .replace(/^\.+|\.+$/g, '')
      .slice(0, 120);
    return cleaned || 'media';
  }

  function extensionFromDataUrl(url) {
    const match = /^data:(image|video|audio)\/([a-z0-9.+-]+)/i.exec(url || '');
    if (!match) return null;
    const subtype = match[2].toLowerCase().replace('jpeg', 'jpg').replace('svg+xml', 'svg');
    return subtype.replace(/[^a-z0-9]/g, '') || null;
  }

  function buildDownloadPath(item, index) {
    const number = String(index + 1).padStart(3, '0');
    let filename = '';
    try {
      const parsed = new URL(item.url);
      filename = decodeURIComponent(parsed.pathname.split('/').pop() || '');
    } catch (_) {
      filename = '';
    }

    if (!filename || !/\.[a-z0-9]{2,8}$/i.test(filename)) {
      const extension = extensionFromDataUrl(item.url) || TYPE_EXTENSIONS[item.type] || TYPE_EXTENSIONS.media;
      filename = `${item.type || 'media'}.${extension}`;
    }

    return `Media Box Downloads/${number}-${safeFilename(filename)}`;
  }

  const api = {
    rectanglesIntersect,
    extractCssUrls,
    isLikelyMediaUrl,
    dedupeMedia,
    safeFilename,
    buildDownloadPath,
  };

  root.MediaBoxUtils = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
