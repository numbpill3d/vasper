const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const {
  rectanglesIntersect,
  extractCssUrls,
  isLikelyMediaUrl,
  dedupeMedia,
  safeFilename,
  buildDownloadPath,
} = require('../src/media-utils.js');

test('rectanglesIntersect accepts overlapping and edge-touching rectangles', () => {
  assert.equal(rectanglesIntersect({ left: 0, top: 0, right: 20, bottom: 20 }, { left: 10, top: 10, right: 30, bottom: 30 }), true);
  assert.equal(rectanglesIntersect({ left: 0, top: 0, right: 20, bottom: 20 }, { left: 20, top: 5, right: 30, bottom: 10 }), true);
});

test('rectanglesIntersect rejects separated or zero-area elements', () => {
  assert.equal(rectanglesIntersect({ left: 0, top: 0, right: 10, bottom: 10 }, { left: 11, top: 0, right: 20, bottom: 10 }), false);
  assert.equal(rectanglesIntersect({ left: 0, top: 0, right: 10, bottom: 10 }, { left: 5, top: 5, right: 5, bottom: 8 }), false);
});

test('extractCssUrls reads quoted and unquoted background images', () => {
  assert.deepEqual(extractCssUrls('linear-gradient(#000,#fff), url("https://cdn.test/a.png"), url(../b.webp)'), [
    'https://cdn.test/a.png',
    '../b.webp',
  ]);
  assert.deepEqual(extractCssUrls('none'), []);
});

test('isLikelyMediaUrl recognizes common media extensions with query strings', () => {
  assert.equal(isLikelyMediaUrl('https://cdn.test/clip.MP4?token=abc'), true);
  assert.equal(isLikelyMediaUrl('https://cdn.test/animation.gif#frame'), true);
  assert.equal(isLikelyMediaUrl('https://cdn.test/page.html'), false);
});

test('dedupeMedia removes duplicate URLs while preserving the first item', () => {
  assert.deepEqual(dedupeMedia([
    { url: 'https://cdn.test/a.jpg', label: 'first' },
    { url: 'https://cdn.test/a.jpg', label: 'second' },
    { url: 'https://cdn.test/b.mp4', label: 'third' },
  ]), [
    { url: 'https://cdn.test/a.jpg', label: 'first' },
    { url: 'https://cdn.test/b.mp4', label: 'third' },
  ]);
});

test('safeFilename strips unsafe path and query characters', () => {
  assert.equal(safeFilename('cat photo?.jpg'), 'cat_photo_.jpg');
  assert.equal(safeFilename(''), 'media');
});

test('buildDownloadPath creates a stable numbered path and infers extension', () => {
  assert.equal(
    buildDownloadPath({ url: 'https://cdn.test/assets/photo.webp?width=500', type: 'image' }, 2),
    'Vasper Downloads/003-photo.webp',
  );
  assert.equal(
    buildDownloadPath({ url: 'data:image/png;base64,AAAA', type: 'image' }, 0),
    'Vasper Downloads/001-image.png',
  );
});

test('the review dialog exposes modal semantics and receives keyboard focus', () => {
  const contentScript = fs.readFileSync(path.join(__dirname, '../src/content-script.js'), 'utf8');
  assert.equal(contentScript.includes("panel.setAttribute('aria-modal', 'true');"), true);
  assert.equal(contentScript.includes('document.documentElement.append(root);'), true);
  assert.equal(contentScript.includes('close.focus();'), true);
});
