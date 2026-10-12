# Space Defenders — 21st Century

A dual-view space survival game built with Phaser, TypeScript and MediaPipe Hand Landmarker. Pilot your ship through hazards on the left while defending it from incoming threats on the right.

The local `0.9` branch is a polish iteration. See [the review and next playtest priorities](docs/0.9-review.md) for findings, design recommendations and remaining production-readiness work. [Libraries, tools and feature ownership](docs/technology.md) maps each feature to its implementation and documents runtime and development dependencies.

## Play locally

Requires Node.js 20.19+ or 22.12+.

```sh
npm ci
npm run dev
```

Open the displayed local URL. A ten-second, skippable opening crawl leads into the original space-opera menu. Each fresh visit offers **USE GESTURE CONTROLS** first, with **PLAY WITH KEYBOARD & MOUSE** available beside it. Choosing gestures requests camera access; the browser controls whether its permission dialog appears again. After choosing controls, select **START MISSION**. A four-second mission briefing shows both stations’ gestures and wishes you “Good luck, Pilot. May the Force be with you.” before gameplay begins. Retry shows the same briefing. The **HAND SKELETON** setting defaults to on and helps align gestures. Camera frames stay in your browser. Camera controls require HTTPS or localhost. Desktop landscape is recommended; gameplay does not yet provide touch controls.

Point with your right index finger in a gun pose and flick your thumb to select menu actions. A moving selection box shows the current target on the home, pause, retry and credits screens; the home menu includes an animated gesture example. An active gesture session stays available when returning to menus. Choosing keyboard controls or leaving the page releases the camera. Credits automatically return after fifteen seconds; Back / Esc returns immediately.

| Station            | Keyboard / mouse                                                      | Hand gestures                                                  |
| ------------------ | --------------------------------------------------------------------- | -------------------------------------------------------------- |
| Pilot, left view   | WASD / arrows to move                                                 | Left fist to move; release to let go                           |
| Gunner, right view | Mouse to aim; left click to fire; hold Space / right click for cannon | Right index to aim; thumb flick to fire; right fist for cannon |
| Pause / menus     | Esc / P to pause or resume; click buttons                             | Right index to point; thumb flick to select                    |

Protect both stations to survive. Pilot hull starts at 100: a meteor costs 18, a death ray costs 30, and black-hole exposure drains 8 per second. Accepted impacts grant 0.9 seconds of recovery against further discrete hits; black holes continue their gradual drain. Gunner defenses lose 25 per accepted hit with the same recovery window and retain three lives. Numeric health labels and the defeat message show which station was lost. The cannon heats over six seconds of sustained fire and warns at half heat. Overheating locks it until cooled.

Losing either hand pauses the mission and names the missing station. Pose diagrams on the left show Pilot grab/release; diagrams on the right show Gunner aim/fire and the fist laser cannon. Return both hands, point at Resume with your right index, and flick to continue. Esc/P or mouse resume provides a manual fallback; **USE KEYBOARD & MOUSE** explicitly switches modes. Returning hands establish a fresh motion baseline so reconnection or a menu confirmation does not produce a stray shot.

Controls process each new camera frame once, avoiding a display-timing gate that could reduce tracking cadence. Hand filtering and active ship/aim following are tuned for faster response while retaining jitter suppression. See the [technology guide](docs/technology.md) for the settings and validation limits.

## Checks and production build

```sh
npm test
npm run check
npm run build
npm run preview
```

CI runs the tests and TypeScript/production build. There is no separate linter configured. Serve `dist/` through a static host. For a repository subpath, build with:

```sh
npm run build -- --base=/SPACE-DEFENDERS-21st-Century/
```

Use HTTPS for deployed camera play. All required models and WASM files are hosted locally under `public/models`; no model download is needed for keyboard play.

## Artwork pipeline

Authored artwork is kept in `assets/source`. Runtime assets live in `public/assets` as lossless WebP. The encoding script checks every decoded pixel and preserves frame dimensions, transparency and animation alignment. Install Pillow in a Python environment to regenerate:

```sh
python scripts/optimize-assets.py
```

The image pass reduces bytes from 8,249,693 to 5,349,500 (35.2%). Decoded texture memory is unchanged.

## Browser playtest

Check the ten-second intro and Skip action, fresh-visit gesture choice, keyboard launch without camera permission, camera denial fallback, visible hand skeleton feedback, movement/fire/cannon, the four-second briefing on launch/retry, and point/flick selection through home, pause, defeat/retry and credits. Confirm no hazards run behind the briefing and that Back / Esc cancels its launch timer. Lose and recover each hand separately, confirm that gesture Resume requires both hands, and check manual fallback and focus-loss pause. Verify gradual health loss and recovery after overlapping impacts, and fifteen-second credits return. Repeat twenty mission cycles and watch for duplicate input/events or accumulating objects. Test failed asset loading and retry, narrow/short viewports and zoom, and a subpath production build.

Real gesture accuracy and long-run performance need physical camera and representative hardware checks. Details are in the review.

Created by Sanjay Malla / [sanjayBahadur](https://github.com/sanjayBahadur).
