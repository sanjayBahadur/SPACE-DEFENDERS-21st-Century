# Changelog

## 0.9.4 — 14 October 2026

Desktop release preserving the original space-opera theme and authored artwork.

- Offer gesture controls at startup, with explicit camera permission and keyboard fallback. Keep active camera sessions across menus, pause, credits and retries.
- Share right-index/thumb-flick navigation across menus, with a clear cursor and selection box. Recover either hand after a disconnect without stray shots; retain the visible skeleton overlay.
- Reduce tracking cadence drift and input smoothing delay while retaining jitter suppression and refresh-rate-independent movement.
- Balance Pilot hull and Gunner defenses with brief collision recovery. Keep cannon overheating as a cooling lockout, with its fill contained inside the heat track.
- Restore the themed menus, ten-second opening crawl, four-second mission briefing, fifteen-second credits, and Pilot/Gunner pose instructions.
- Improve asset loading/retry and reduce image transfer size by 35.2% through verified lossless WebP conversion.
- Package dependency notices and verified model/runtime provenance. Add GitHub Pages deployment of the exact tested build and production browser checks.

Keyboard play and model startup are checked automatically in Chromium. Physical camera feel depends on hardware and lighting. Desktop landscape is the supported layout; touch controls and audio are outside this release.
