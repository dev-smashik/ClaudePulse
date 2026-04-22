# 🚀 Release Notes - ClaudePulse

All notable changes to **ClaudePulse** will be documented in this file. This project adheres to [Semantic Versioning](https://semver.org/).

---

## 🛠️ Installation Guide

1. **Download/Clone** the project repository.
2. Go to `chrome://extensions/` in your browser.
3. Enable **Developer mode** (top right).
4. Click **Load unpacked** and select the project folder.
5. **Pin** the extension from the toolbar and refresh [Claude.ai](https://claude.ai).

---



## [1.0.0] - 2026-04-22
### 🚀 Initial Public Release
This major release introduces the complete architectural shift to robust network-level interception and premium Glassmorphism UI.

**Features:**
- **Network Interceptor:** introduced `interceptor.js` which executes in the `MAIN` world to sniff `fetch` requests directly from Claude's internal API.
- **Glassmorphism UI:** A premium, floating UI strip that mirrors Claude's native design language.
- **Background Persistence:** Implemented a Service Worker that runs even when the tab is closed to manage usage reset alarms.
- **Smart Notifications:** Native Chrome notifications for capacity thresholds (80%, 100%).
- **Deep Storage Sync:** Improved `storage.js` utility for reliable data persistence across sessions.
- **Privacy First:** 100% local processing with zero telemetry.


---

> [!TIP]
> Keep your extension updated to the latest version to ensure compatibility with Claude.ai's frequent updates. If something breaks, please [open an issue](https://github.com/dev-smashik/Claude-AI-Session-monitor-Chrome-Extention/issues).
