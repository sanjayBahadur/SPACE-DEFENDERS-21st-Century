# Changelog

## Unreleased — audio branch

- Start the first opening crawl and its ten-second timer only after the theme begins playing, with explicit sound/silent choices and playback failure recovery.

- Trim the intro/credits theme's 0.46-second opening silence for an immediate musical start.

- Add gesture-accessible sound controls, saved music/effect volumes, scene mixes and bounded action feedback.
- Use a credited heroic sci-fi theme for intro/credits, with quiet cockpit ambience elsewhere.
- Add movement-driven engine hum, damaging black-hole siphon, meteor approach/impact and distinct enemy shots/rays.
- Credit Masyn Akira Knight for the promotional video and Masyn Akira Knight, Jackson Poynor and Max as beta testers.
- Document audio sources, per-file licenses and edits; verify audio loading, music switching and loop cleanup.

## 1.0.1 — 14 October 2026

- Fix exaggerated horizontal menu cursor motion by using the mirrored index fingertip before gameplay zone expansion. Align it with the skeleton frame across home, pause and recovery menus.
- Preserve Gunner aim, thumb-flick selection and dwell/cooldown protections. Reset menu smoothing after hand loss, stalled tracking and camera shutdown.
- Add regression checks for fingertip alignment outside the gameplay active zone, screen offsets and invalid samples.

## 1.0.0 — 14 October 2026

Promote the verified v0.9.4 desktop game to the first stable release. Gameplay, menu pointing and assets are unchanged. The menu pointer alignment improvement will follow separately in v1.0.1.

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
