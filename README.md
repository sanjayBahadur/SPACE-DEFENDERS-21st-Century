# Space Defenders — 21st Century

A dual-view space survival game built with Phaser, TypeScript and MediaPipe Hands. Pilot your ship through hazards on the left while defending it from incoming threats on the right.

The local `0.9` branch is a polish iteration. See [the review and next playtest priorities](docs/0.9-review.md) for findings, design recommendations and remaining production-readiness work.

## Play locally

Requires Node.js 20.19+ or 22.12+.

```sh
npm ci
npm run dev
```

Open the displayed local URL. Choose **Keyboard & mouse** and launch immediately, or choose **Hand gestures** to enable your camera. Camera frames stay in your browser. Camera controls require HTTPS or localhost. Desktop landscape is recommended; gameplay does not yet provide touch controls.

| Station            | Keyboard / mouse                                                      | Hand gestures                                                  |
| ------------------ | --------------------------------------------------------------------- | -------------------------------------------------------------- |
| Pilot, left view   | WASD / arrows to move; hold Shift for shield                          | Left fist to move; left open palm for shield                   |
| Gunner, right view | Mouse to aim; left click to fire; hold Space / right click for cannon | Right index to aim; thumb flick to fire; right fist for cannon |
| Pause              | Esc / P, or the Pilot pause button                                    | Return to keyboard controls from the pause menu                |

Protect both stations to survive. The pilot shield absorbs damage before hull and drains while held; release it to recharge. The cannon heats over six seconds of sustained fire and warns at half heat. Overheating locks it until cooled, rather than destroying the ship.

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

Check keyboard launch without a permission prompt, camera denial fallback, movement/fire/cannon/shield, pause/resume, focus-loss pause, defeat/retry and menu/credits transitions. Repeat twenty mission cycles and watch for duplicate input/events or accumulating objects. Test failed asset loading and retry, narrow/short viewports and zoom, and a subpath production build.

Real gesture accuracy and long-run performance need physical camera and representative hardware checks. Details are in the review.

Created by Sanjay Malla / [sanjayBahadur](https://github.com/sanjayBahadur).
