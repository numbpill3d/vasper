const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const popup = fs.readFileSync(path.join(__dirname, '../src/popup.html'), 'utf8');

test('the popup uses the current Vasper name', () => {
  assert.match(popup, />VASPER<\/p>/);
  assert.doesNotMatch(popup, /MEDIA BOX/i);
});
