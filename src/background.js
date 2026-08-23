'use strict';

importScripts('media-utils.js');

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type !== 'VASPER_DOWNLOAD') return false;

  const items = Array.isArray(message.items) ? message.items.slice(0, 500) : [];
  Promise.all(items.map(async (item, index) => {
    try {
      const downloadId = await chrome.downloads.download({
        url: item.url,
        filename: VasperUtils.buildDownloadPath(item, index),
        conflictAction: 'uniquify',
        saveAs: false,
      });
      return { ok: true, url: item.url, downloadId };
    } catch (error) {
      return { ok: false, url: item.url, error: error?.message || String(error) };
    }
  })).then((results) => sendResponse({ results }));

  return true;
});