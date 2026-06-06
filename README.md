# Tab Graveyard 🪦

A sleek, modern Chrome extension that automatically archives browser tabs you haven't touched in a while, keeping your browser fast and clutter-free. 

## Features
- **Auto-Archive**: Set a custom inactivity timeout (e.g., 3 days). Untouched tabs are automatically closed and saved to your graveyard.
- **Cloud Sync**: Archived tabs are synced securely across all your Chrome browsers using `chrome.storage.sync`.
- **Domain Whitelist**: Add domains like `youtube.com` to prevent them from ever being auto-archived.
- **Context Menu**: Right-click anywhere on a webpage to instantly send the active tab to the graveyard.
- **Sleek UI**: A beautiful popup featuring favicons, sorting (Newest, Oldest, A-Z), hover animations, and a "Clear All" button.
- **Badge Notifications**: See exactly how many tabs are archived at a glance on the extension icon.

## Installation (Developer Mode)
1. Clone this repository or download the ZIP.
2. Open Google Chrome and navigate to `chrome://extensions/`.
3. Enable **Developer mode** in the top right corner.
4. Click **Load unpacked** and select the extension directory.

## Web Store Publishing
To package for the Chrome Web Store:
1. Zip the repository (excluding `.git` and `README.md`).
2. Upload the ZIP file to the Chrome Developer Dashboard.
