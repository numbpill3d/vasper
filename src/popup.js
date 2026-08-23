'use strict';

const startButton = document.getElementById('start');
const status = document.getElementById('status');

function showError(message) {
  status.textContent = message;
  status.classList.add('error');
  startButton.disabled = false;
}

startButton.addEventListener('click', async () => {
  startButton.disabled = true;
  status.classList.remove('error');
  status.textContent = 'Opening selector…';

  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.id || !/^https?:|^file:/.test(tab.url || '')) {
      throw new Error('This page does not allow extensions. Try a normal website tab.');
    }

    await chrome.scripting.insertCSS({ target: { tabId: tab.id }, files: ['src/content.css'] });
    await chrome.scripting.executeScript({ target: { tabId: tab.id }, files: ['src/media-utils.js', 'src/content-script.js'] });
    await chrome.tabs.sendMessage(tab.id, { type: 'VASPER_START' });
    window.close();
  } catch (error) {
    showError(error?.message || 'Could not start the selector on this page.');
  }
});