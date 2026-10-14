# Libraries, tools and feature ownership

This guide describes the `0.9` implementation. The versions below are resolved in [package-lock.json](../package-lock.json), rather than the version ranges in [package.json](../package.json). Run `npm ci` to reproduce them and `npm ls --depth=0` to inspect the installed direct dependencies.

## Runtime libraries

| Library | Resolved version | Features it supplies | Project integration |
| --- | --- | --- | --- |
| [Phaser](https://docs.phaser.io/phaser/getting-started/what-is-phaser) | 3.90.0 | Game canvas, scene lifecycle, cameras, sprites and groups, animation, timers, tweens and input events. | [main.ts](../src/main.ts) configures the 1280×720 canvas and FIT scaling. [Strategic.ts](../src/scenes/Strategic.ts) and [Tactical.ts](../src/scenes/Tactical.ts) implement the two stations; the other [scenes](../src/scenes) manage loading and menus. |
| [MediaPipe Tasks Vision](https://developers.google.com/edge/mediapipe/solutions/vision/hand_landmarker/web_js) | 0.10.32 | `HandLandmarker` supplies 21 landmarks per detected hand and left/right handedness. | [HandTracker.ts](../src/services/HandTracker.ts) loads `FilesetResolver` and `HandLandmarker` on demand, uses VIDEO mode with up to two hands, and tries GPU inference before CPU fallback. The model and WASM runtime are served from [public/models](../public/models). |

Phaser does not determine the combat balance or hand poses. MediaPipe identifies hand landmarks; this game interprets those landmarks using its own heuristics. It does not use MediaPipe's `GestureRecognizer` task or a separately trained gun-gesture classifier.

## Features implemented by the game

| Feature | Implementation and ownership |
| --- | --- |
| Camera opt-in and release | Browser `getUserMedia`, a hidden video element and `requestAnimationFrame` in [HandTracker.ts](../src/services/HandTracker.ts). Camera setup starts only after the player chooses gestures. Keyboard selection and page exit release camera tracks and the landmarker; an active gesture session remains available across the home, pause, retry and credits screens. Camera frames are processed in the browser and are not uploaded. |
| Left/right station mapping | The tracker assigns left handedness to Pilot and right handedness to Gunner. It mirrors horizontal coordinates, maps each station's hand zone to normalized coordinates and uses the right index tip for aiming. These are project choices, not MediaPipe defaults. |
| Fist, palm and gun poses | Custom landmark-distance rules in [HandTracker.ts](../src/services/HandTracker.ts). A gun pose extends index and thumb while curling the remaining fingers. Thumb flicks compare thumb-to-index-base distance relative to palm size. Losing a hand or resuming after stale frames resets its motion baseline. |
| Pointer smoothing | [OneEuroFilter.ts](../src/utils/OneEuroFilter.ts) is a local TypeScript implementation of the [1€ filter](https://gery.casiez.net/1euro/), used independently for each hand's X/Y coordinates. The game profile in [input.ts](../src/utils/input.ts) uses min cutoff 2 Hz, beta 0.15 and derivative cutoff 1 Hz for normalized coordinates. It reduces jitter while adapting smoothing to movement speed. No external filtering package is installed. |
| Gesture menu navigation | [GestureMenu.ts](../src/ui/GestureMenu.ts) supplies a shared controller and scene-owned pointer/selection outline. The right index points, a short stable hover arms a target, and a fresh thumb flick confirms it. Release gating and a cooldown prevent one flick from activating successive screens. Canvas targets are translated to browser coordinates so FIT scaling and letterboxing stay aligned. |
| Hand skeleton overlay | The browser Canvas 2D API draws landmark connections and fingertip highlights in [HandTracker.ts](../src/services/HandTracker.ts). The overlay defaults to on, can be toggled in Settings, and does not intercept clicks. It is separate from the Phaser combat canvas. |
| Menus and gesture instructions | Native HTML buttons and CSS in [MainMenu.ts](../src/scenes/MainMenu.ts), [screens.ts](../src/ui/screens.ts) and [style.css](../src/style.css). The small gun-pose demonstration uses project SVG and CSS in [gestureTutorial.ts](../src/ui/gestureTutorial.ts). [handPoses.ts](../src/ui/handPoses.ts) supplies four reference pose diagrams, and [stationGuides.ts](../src/ui/stationGuides.ts) groups Pilot grab/release and Gunner pointer/cannon instructions. Pause guides follow the canvas scale and position, with pointer events disabled. Pause and defeat retain themed Phaser buttons and share the same gesture navigator. No UI component framework or animation library is installed. |
| Mission briefing | [MissionBriefing.ts](../src/scenes/MissionBriefing.ts) shows the gesture diagrams and a gold space-opera message for four seconds after successful asset loading and on mission retry. Gameplay scenes and their mission clock start afterward. A browser timer is cancelled on exit/shutdown; Esc or the gesture-accessible Back action returns to the menu. |
| Opening and credits crawls | Native DOM/CSS presentation in [MainMenu.ts](../src/scenes/MainMenu.ts) and [Credits.ts](../src/scenes/Credits.ts), with scene cleanup and explicit return controls. The opening lasts ten seconds and is skippable; credits return after fifteen seconds. |
| Missing-hand pause and resume | Each station checks its own hand in [Strategic.ts](../src/scenes/Strategic.ts) or [Tactical.ts](../src/scenes/Tactical.ts). [PauseScene.ts](../src/scenes/PauseScene.ts) identifies the disconnected role, updates reconnection feedback and gates gesture resume until both hands return. Esc/P and mouse controls provide a manual escape; choosing keyboard controls releases the camera. |
| Health and damage | [hull.ts](../src/utils/hull.ts) defines pilot hull budgets and impact recovery. Pilot starts at 100: meteors cost 18, death rays 30, and black-hole exposure drains 8 per second. Discrete accepted hits start 900 ms recovery; continuous black-hole drain remains active. Tactical defenses lose 25 per accepted hit and use the same recovery window, with the existing three-life system. Numeric HUD labels and [GameOverScene.ts](../src/scenes/GameOverScene.ts) distinguish the station that was lost. |
| Responsive movement and aim | [input.ts](../src/utils/input.ts) defines active Pilot following at 0.35 and aim following at 0.5 per reference 60 Hz frame; [combat.ts](../src/utils/combat.ts) converts these to the actual frame duration. Released Pilot drift retains its existing slow response. Camera-frame caching runs inference once per new video frame, without an additional display-clock timer. The skeleton is drawn only while its setting is on. |
| Cannon heating and collision math | [combat.ts](../src/utils/combat.ts) and [Tactical.ts](../src/scenes/Tactical.ts) implement heat, cooling, delta normalization and beam geometry. Cannon heating takes six seconds of sustained use; overheating causes cooling lockout. Collision decisions combine project math with Phaser object bounds. |
| Asset loading and retry | Phaser's loader in [Boot.ts](../src/scenes/Boot.ts) and [MissionLoad.ts](../src/scenes/MissionLoad.ts), plus native progress and recovery controls. URLs respect Vite's `BASE_URL`. Successfully loaded assets remain cached for mission retries. |

Hand inference currently runs synchronously on the main browser thread, as described in the [Hand Landmarker guide](https://developers.google.com/edge/mediapipe/solutions/vision/hand_landmarker/web_js). The tracker requests 640×480 camera frames at up to 30 FPS, skips duplicate video frames and hidden tabs, and rejects stale hand data. Moving inference into a worker is future profiling work; there is no worker pipeline in this branch.

## Development and verification tools

| Tool | Version / configuration | Purpose and location |
| --- | --- | --- |
| [TypeScript](https://www.typescriptlang.org/docs/) | 5.9.3 | Static checks for game source (`tsconfig.json` includes `src`). The test files are executed by tsx; they are not included in this TypeScript check. `npm run check` runs `tsc --noEmit`; `npm run build` runs `tsc` before bundling. Configuration: [tsconfig.json](../tsconfig.json). |
| [Vite](https://vite.dev/guide/) | 7.3.7 | Local development server, module reloads, production build and local preview. Its base URL supports a repository-subpath deployment. Scripts are in [package.json](../package.json). |
| [tsx](https://github.com/privatenumber/tsx) | 4.23.15 | Executes the TypeScript tests through `tsx --test tests/*.test.ts`. |
| [Node.js test runner](https://nodejs.org/api/test.html) and `node:assert/strict` | Built into the executing Node.js version | Assertions and test execution in [tests](../tests). Coverage includes asset paths, heat/collision math, hull damage, filtering, tracker lifecycle/reacquisition and gesture menu selection. |
| `@types/node` | 25.1.0 | Development-only Node type declarations; this is not the Node runtime version. |
| Node.js / npm | Node 20.19+ or 22.12+ locally; CI uses Node 22 | Runs the toolchain; `npm ci` installs the lockfile. |
| [GitHub Actions](https://docs.github.com/en/actions) | `actions/checkout@v4`, `actions/setup-node@v4` | [ci.yml](../.github/workflows/ci.yml) runs `npm ci`, `npm test` and `npm run build` on pushes and pull requests. The production browser checks run after the Pages-path build. No separate linter is configured. |
| [Playwright](https://playwright.dev/docs/intro) | 1.64.1, development dependency | [smoke-production.mjs](../scripts/smoke-production.mjs) checks the built site in Chromium, including keyboard/menu transitions, denied-camera fallback and real model/WASM startup with a generated camera stream. CI and deployment run it before publication. Physical-hand recognition quality remains a separate hardware measurement. |

## Optional artwork tooling

[Python and Pillow](https://pillow.readthedocs.io/en/stable/handbook/image-file-formats.html#webp) are used only by [scripts/optimize-assets.py](../scripts/optimize-assets.py). Pillow is not an npm dependency and its version is not pinned by this repository. Install it in a Python environment when regenerating artwork.

The script converts originals in [assets/source](../assets/source) to lossless WebP in [public/assets](../public/assets), preserving dimensions and transparency. It compares the decoded RGBA bytes against each source before accepting an output. The current conversion saves 35.2% of image transfer bytes; it does not reduce decoded texture memory. Neither Python nor Pillow is required to play the game or build unchanged assets.

Git manages the branch and focused commits; GitHub Issues records the reported bugs. These development tools do not ship with the game. The static production output is `dist/`; there is no application backend or camera-upload service.

## Input validation limits

The synthetic 30 FPS hand stream in [input-response.test.ts](../tests/input-response.test.ts) checks the complete filter plus scene-following response at 30/60/120/144 Hz. At a 60 Hz display, an aim step reaches 90% in approximately 167 ms with the current profile versus 483 ms with the previous profile. These figures model camera sample delivery and smoothing; they do not measure exposure, MediaPipe inference or hardware latency. Tests also require more than 50% attenuation of stationary alternating jitter. [hand-tracker.test.ts](../tests/hand-tracker.test.ts) checks that 30 FPS camera frames are retained across 59.94/60/60.1/120/144 Hz display clocks, while duplicate frames and hidden tabs do no inference.

## Audio branch

The audio layer uses browser **Web Audio** buffer sources for short effects and **HTMLAudioElement** streaming for music. `GameAudio.ts` owns unlock, mixing, bounded voices, loop cleanup and optional localStorage preferences; no new runtime library is required. **FFmpeg** converts the downloaded CC0 assets for distribution and is an asset preparation tool, not a runtime/build dependency. [Audio design and source records](audio.md) lists every cue, original filename, license and conversion. Browser smoke checks decode all thirteen effects and exercise music, mute, preference persistence and cannon cleanup.
