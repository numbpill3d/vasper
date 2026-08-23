# Vasper

A privacy-conscious Manifest V3 Chrome extension that lets you drag a rectangle over a web page, review the media found inside it, and download selected files in bulk.

## Features

- Drag-to-select any visible rectangular area.
- Finds regular images, animated GIFs, video, audio, image inputs, SVG images, canvases, direct media links, and CSS background images.
- Reviews results in a side panel before downloading.
- Select all, clear all, or toggle individual files.
- Deduplicates repeated URLs.
- Saves normal downloads under `Downloads/Vasper Downloads/` with numbered filenames.
- Uses `activeTab`; it has no persistent access to browsing history or every page you visit.

## Install manually before the Chrome Web Store release

Until the extension is published in the Chrome Web Store, install it directly from this repository.

### Download the source

Choose either method:

- **Without Git:** Open the [GitHub repository](https://github.com/numbpill3d/vasper), click **Code → Download ZIP**, and extract the downloaded archive.
- **With Git:** Run:

  ```bash
  git clone https://github.com/numbpill3d/vasper.git
  ```

### Load it in Chrome or Chromium

1. Open `chrome://extensions`.
2. Enable **Developer mode** in the upper-right corner.
3. Click **Load unpacked**.
4. Select the extracted or cloned `vasper` folder—the folder containing `manifest.json`.
5. Optionally pin **Vasper** from the browser's Extensions menu.

Chrome may display a developer-mode notice because this installation did not come from the Web Store. The extension remains installed between browser restarts.

### Update a manual installation

1. Download and extract the latest source again, or run `git pull` inside the cloned repository.
2. Return to `chrome://extensions`.
3. Click the **Reload** button on the Vasper card.

## Use

1. Open a normal `http://` or `https://` page.
2. Click the extension icon, then **Select an area**.
3. Drag a box over the media you want. A small click also selects media under the pointer.
4. Review the detected items, clear any you do not want, and click **Download**.
5. Press `Esc` to cancel the selector or close the review panel.

If Chrome's **Ask where to save each file before downloading** option is enabled, Chrome may prompt for each file. Disable that browser setting for truly unattended bulk downloads.

## Known browser limitations

- Chrome blocks extensions on internal pages such as `chrome://`, the Chrome Web Store, and some PDF/browser viewers.
- Cross-origin iframe contents are not scanned from the top-level page.
- DRM streams, segmented HLS/DASH playback, MediaSource streams, expired signed URLs, and server-protected files may not be directly downloadable.
- Blob URLs are downloaded from the page context when possible; sites may revoke them before the download starts.
- Cross-origin canvases cannot be exported because of browser security rules.
- CSS images in pseudo-elements (`::before`/`::after`) are not currently included.

## Development

No build step or third-party runtime dependencies are required.

```bash
npm test
npm run check
```

Core utility behavior is covered with Node's built-in test runner. The extension service worker was also smoke-tested by loading the unpacked extension in headless Chromium.

## Project layout

```text
manifest.json            Manifest V3 configuration
src/popup.*              Toolbar popup
src/content-script.js    Box selection, media discovery, review panel
src/content.css          Injected selector/review UI
src/background.js        Chrome downloads API integration
src/media-utils.js       Shared, tested utility functions
icons/                   Extension icons
test/                    Node tests
```