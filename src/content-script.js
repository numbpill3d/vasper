(function mediaBoxContentScript() {
  'use strict';

  if (window.__mediaBoxDownloaderLoaded) return;
  window.__mediaBoxDownloaderLoaded = true;

  const { rectanglesIntersect, extractCssUrls, isLikelyMediaUrl, dedupeMedia, safeFilename } = MediaBoxUtils;
  let root = null;
  let onEscape = null;

  function removeUi() {
    if (onEscape) document.removeEventListener('keydown', onEscape, true);
    onEscape = null;
    root?.remove();
    root = null;
  }

  function absoluteUrl(raw) {
    if (!raw || /^(?:javascript|chrome|chrome-extension):/i.test(raw)) return null;
    try {
      return new URL(raw, document.baseURI).href;
    } catch (_) {
      return null;
    }
  }

  function typeFromUrl(url, fallback = 'media') {
    if (/^(?:data|blob):image\//i.test(url) || /\.(?:avif|bmp|gif|heic|heif|ico|jpe?g|png|svg|webp|apng)(?:$|[?#])/i.test(url)) return 'image';
    if (/^(?:data|blob):video\//i.test(url) || /\.(?:mp4|m4v|mov|webm|ogv|avi|mkv)(?:$|[?#])/i.test(url)) return 'video';
    if (/^(?:data|blob):audio\//i.test(url) || /\.(?:mp3|m4a|aac|ogg|oga|wav|flac)(?:$|[?#])/i.test(url)) return 'audio';
    return fallback;
  }

  function itemLabel(element, url, type) {
    const explicit = element.getAttribute?.('alt') || element.getAttribute?.('aria-label') || element.getAttribute?.('title');
    if (explicit?.trim()) return explicit.trim();
    try {
      const name = decodeURIComponent(new URL(url).pathname.split('/').pop() || '');
      if (name) return name;
    } catch (_) { /* data/blob URL */ }
    return `${type} item`;
  }

  function addItem(items, element, rawUrl, fallbackType, extra = {}) {
    const url = absoluteUrl(rawUrl);
    if (!url) return;
    const type = typeFromUrl(url, fallbackType);
    items.push({
      url,
      type,
      label: itemLabel(element, url, type),
      width: Math.round(extra.width || element.naturalWidth || element.videoWidth || element.clientWidth || 0),
      height: Math.round(extra.height || element.naturalHeight || element.videoHeight || element.clientHeight || 0),
      previewUrl: extra.previewUrl || (type === 'image' ? url : ''),
    });
  }

  function collectFromElement(element, items) {
    const tag = element.tagName;

    if (tag === 'IMG') {
      addItem(items, element, element.currentSrc || element.src, 'image');
    } else if (tag === 'VIDEO') {
      addItem(items, element, element.currentSrc || element.src, 'video', { previewUrl: absoluteUrl(element.poster) || '' });
      element.querySelectorAll('source[src]').forEach((source) => addItem(items, element, source.src, 'video'));
      if (element.poster) addItem(items, element, element.poster, 'image');
    } else if (tag === 'AUDIO') {
      addItem(items, element, element.currentSrc || element.src, 'audio');
      element.querySelectorAll('source[src]').forEach((source) => addItem(items, element, source.src, 'audio'));
    } else if (tag === 'INPUT' && element.type === 'image') {
      addItem(items, element, element.src, 'image');
    } else if (tag === 'SVG' || tag === 'IMAGE') {
      element.querySelectorAll?.('image').forEach((image) => addItem(items, element, image.href?.baseVal || image.getAttribute('href'), 'image'));
      if (tag === 'IMAGE') addItem(items, element, element.href?.baseVal || element.getAttribute('href'), 'image');
    } else if (tag === 'OBJECT') {
      if (isLikelyMediaUrl(element.data)) addItem(items, element, element.data, 'media');
    } else if (tag === 'EMBED') {
      if (isLikelyMediaUrl(element.src)) addItem(items, element, element.src, 'media');
    } else if (tag === 'A') {
      if (isLikelyMediaUrl(element.href)) addItem(items, element, element.href, 'media');
    } else if (tag === 'CANVAS') {
      try {
        addItem(items, element, element.toDataURL('image/png'), 'image');
      } catch (_) { /* Cross-origin canvas cannot be serialized. */ }
    }

    let background = '';
    try {
      background = getComputedStyle(element).backgroundImage;
    } catch (_) { /* Ignore detached or inaccessible elements. */ }
    extractCssUrls(background).forEach((url) => addItem(items, element, url, 'image'));
  }

  function findMedia(selectionRect) {
    const items = [];
    const elements = document.body?.querySelectorAll('*') || [];

    for (const element of elements) {
      if (element.closest?.('#mbd-root')) continue;
      const rect = element.getBoundingClientRect();
      if (!rectanglesIntersect(selectionRect, rect)) continue;
      collectFromElement(element, items);
    }

    return dedupeMedia(items);
  }

  function make(tag, className, text) {
    const element = document.createElement(tag);
    if (className) element.className = className;
    if (text !== undefined) element.textContent = text;
    return element;
  }

  function mediaPreview(item) {
    if (item.type === 'image' || item.previewUrl) {
      const image = make('img', 'mbd-preview');
      image.src = item.previewUrl || item.url;
      image.alt = '';
      image.referrerPolicy = 'no-referrer';
      return image;
    }
    return make('div', 'mbd-preview mbd-placeholder', item.type.toUpperCase());
  }

  function renderPanel(items) {
    removeUi();
    root = make('div');
    root.id = 'mbd-root';
    const panel = make('section', 'mbd-panel');
    panel.setAttribute('role', 'dialog');
    panel.setAttribute('aria-label', 'Selected media');

    const header = make('header', 'mbd-header');
    const titleRow = make('div', 'mbd-title-row');
    titleRow.append(make('h2', 'mbd-title', 'Review media'));
    const close = make('button', 'mbd-close', '×');
    close.type = 'button';
    close.setAttribute('aria-label', 'Close');
    close.addEventListener('click', removeUi);
    titleRow.append(close);
    header.append(titleRow);

    const count = make('p', 'mbd-count');
    header.append(count);
    const toolbar = make('div', 'mbd-toolbar');
    const selectAll = make('button', 'mbd-small', 'Select all');
    const clearAll = make('button', 'mbd-small', 'Clear');
    selectAll.type = clearAll.type = 'button';
    toolbar.append(selectAll, clearAll);
    header.append(toolbar);
    panel.append(header);

    const list = make('div', 'mbd-list');
    const checks = [];
    if (!items.length) {
      list.append(make('div', 'mbd-empty', 'No downloadable media was found inside that box. Close this panel and try a slightly larger area.'));
    }

    items.forEach((item, index) => {
      const row = make('label', 'mbd-item');
      const checkbox = make('input', 'mbd-check');
      checkbox.type = 'checkbox';
      checkbox.checked = true;
      checkbox.dataset.index = String(index);
      checks.push(checkbox);
      row.append(checkbox, mediaPreview(item));

      const meta = make('div', 'mbd-meta');
      const dimensions = item.width && item.height ? ` · ${item.width}×${item.height}` : '';
      meta.append(make('div', 'mbd-name', `${item.label}${dimensions}`));
      meta.append(make('div', 'mbd-url', item.url));
      row.append(meta);
      list.append(row);
    });
    panel.append(list);

    const footer = make('footer', 'mbd-footer');
    const download = make('button', 'mbd-primary');
    download.type = 'button';
    const status = make('p', 'mbd-status', 'Files are saved under “Media Box Downloads”.');
    footer.append(download, status);
    panel.append(footer);
    root.append(panel);
    document.documentElement.append(root);

    function updateCount() {
      const selected = checks.filter((checkbox) => checkbox.checked).length;
      count.textContent = `${items.length} unique item${items.length === 1 ? '' : 's'} found · ${selected} selected`;
      download.textContent = selected ? `Download ${selected} item${selected === 1 ? '' : 's'}` : 'Select media to download';
      download.disabled = selected === 0;
    }

    checks.forEach((checkbox) => checkbox.addEventListener('change', updateCount));
    selectAll.addEventListener('click', () => { checks.forEach((checkbox) => { checkbox.checked = true; }); updateCount(); });
    clearAll.addEventListener('click', () => { checks.forEach((checkbox) => { checkbox.checked = false; }); updateCount(); });

    download.addEventListener('click', async () => {
      const selectedItems = checks.filter((checkbox) => checkbox.checked).map((checkbox) => items[Number(checkbox.dataset.index)]);
      download.disabled = true;
      download.textContent = 'Starting downloads…';
      status.textContent = 'Sending files to Chrome’s download manager.';

      const blobItems = selectedItems.filter((item) => item.url.startsWith('blob:'));
      const extensionItems = selectedItems.filter((item) => !item.url.startsWith('blob:'));
      let successes = 0;
      let failures = 0;

      for (const item of blobItems) {
        try {
          const anchor = document.createElement('a');
          anchor.href = item.url;
          anchor.download = safeFilename(item.label || `${item.type}-item`);
          anchor.style.display = 'none';
          document.documentElement.append(anchor);
          anchor.click();
          anchor.remove();
          successes += 1;
        } catch (_) {
          failures += 1;
        }
      }

      if (extensionItems.length) {
        try {
          const response = await chrome.runtime.sendMessage({ type: 'MEDIA_BOX_DOWNLOAD', items: extensionItems });
          for (const result of response?.results || []) result.ok ? successes += 1 : failures += 1;
        } catch (_) {
          failures += extensionItems.length;
        }
      }

      download.disabled = false;
      download.textContent = 'Download selected again';
      status.textContent = failures
        ? `${successes} started · ${failures} failed (the site may protect or expire those URLs).`
        : `${successes} download${successes === 1 ? '' : 's'} started.`;
    });

    updateCount();
    onEscape = (event) => { if (event.key === 'Escape') removeUi(); };
    document.addEventListener('keydown', onEscape, true);
  }

  function startSelection() {
    removeUi();
    root = make('div');
    root.id = 'mbd-root';
    const capture = make('div', 'mbd-capture');
    const tip = make('div', 'mbd-tip', 'Drag over media · Esc to cancel');
    const box = make('div', 'mbd-box');
    capture.append(tip, box);
    root.append(capture);
    document.documentElement.append(root);

    let start = null;
    let current = null;

    function paint() {
      if (!start || !current) return;
      const left = Math.min(start.x, current.x);
      const top = Math.min(start.y, current.y);
      box.style.display = 'block';
      box.style.left = `${left}px`;
      box.style.top = `${top}px`;
      box.style.width = `${Math.abs(current.x - start.x)}px`;
      box.style.height = `${Math.abs(current.y - start.y)}px`;
    }

    capture.addEventListener('pointerdown', (event) => {
      if (event.button !== 0) return;
      start = { x: event.clientX, y: event.clientY };
      current = start;
      capture.setPointerCapture(event.pointerId);
      paint();
    });
    capture.addEventListener('pointermove', (event) => {
      if (!start) return;
      current = { x: event.clientX, y: event.clientY };
      paint();
    });
    capture.addEventListener('pointerup', (event) => {
      if (!start) return;
      current = { x: event.clientX, y: event.clientY };
      const width = Math.abs(current.x - start.x);
      const height = Math.abs(current.y - start.y);
      const selectionRect = {
        left: Math.min(start.x, current.x) - (width < 4 ? 2 : 0),
        top: Math.min(start.y, current.y) - (height < 4 ? 2 : 0),
        right: Math.max(start.x, current.x) + (width < 4 ? 2 : 0),
        bottom: Math.max(start.y, current.y) + (height < 4 ? 2 : 0),
      };
      const items = findMedia(selectionRect);
      renderPanel(items);
    });

    onEscape = (event) => { if (event.key === 'Escape') removeUi(); };
    document.addEventListener('keydown', onEscape, true);
  }

  chrome.runtime.onMessage.addListener((message) => {
    if (message?.type === 'MEDIA_BOX_START') startSelection();
  });
})(window);
