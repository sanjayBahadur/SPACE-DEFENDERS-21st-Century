# Assets, model provenance and release notices

This records what the repository and release preparation can establish. Gameplay and asset contents were not changed during release packaging.

## Browser dependencies

- Phaser **3.90.0**: the installed `node_modules/phaser/LICENSE.md` is reproduced with normalized line endings to [phaser-license.txt](../public/legal/phaser-license.txt), including its Richard Davey / Phaser Studio copyright notice.
- Phaser's installed runtime dependency eventemitter3 **5.0.4**: its MIT license and Arnout Kazemier copyright notice are reproduced with normalized line endings to [eventemitter3-license.txt](../public/legal/eventemitter3-license.txt).
- Phaser also incorporates adapted components. The Matter.js notice included with Phaser is reproduced with normalized line endings to [matter-license.txt](../public/legal/matter-license.txt). Upstream licenses for the adapted [RBush](../public/legal/rbush-license.txt), [Earcut](../public/legal/earcut-license.txt) and [Quickselect](../public/legal/quickselect-license.txt) components are also included. These texts were obtained from their upstream repositories during release preparation; this does not identify a separate npm version for the copies inside Phaser. The optional Spine runtime plugins are not imported by this game.
- MediaPipe Tasks Vision **0.10.32**: the installed npm package declares `Apache-2.0`. [mediapipe-license.txt](../public/legal/mediapipe-license.txt) contains the [upstream project's license text](https://github.com/google-ai-edge/mediapipe/blob/master/LICENSE). All four JS/WASM files in `public/models` exactly match the corresponding installed package files by SHA-256; they are not modified runtime forks.

The root project [LICENSE](../LICENSE) is also reproduced with normalized line endings to [project-license.txt](../public/legal/project-license.txt). The deployed build includes the full [third-party notices](../public/legal/THIRD-PARTY-NOTICES.txt) and these license files under `legal/`, because Vite copies `public/` into the production output.

## Hand model

The bundled `hand_landmarker.task` has the same SHA-256 as both Google's [version 1 float16 model](https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task) and the `latest` URL linked by Google's [official Hand Landmarker guide](https://developers.google.com/edge/mediapipe/solutions/vision/hand_landmarker). Both downloads were read for comparison during release preparation; the game file was not replaced.

The guide's [Hand Tracking Lite/Full model card](https://storage.googleapis.com/mediapipe-assets/Model%20Card%20Hand%20Tracking%20%28Lite_Full%29%20with%20Fairness%20Oct%202021.pdf), page 2, identifies Apache License 2.0. The notices attribute the bundle to Google / MediaPipe and include that license text. The fixed version URL above is the reproducible source; `latest` may change.

### Shipped file hashes

| File in `public/models` | SHA-256 |
| --- | --- |
| `hand_landmarker.task` | `fbc2a30080c3c557093b5ddfc334698132eb341044ccee322ccf8bcf3607cde1` |
| `vision_wasm_internal.js` | `6f6b86509cf9e163ea1cfec7edc8cf53732699c04781e4c21c557c1ba402310e` |
| `vision_wasm_internal.wasm` | `cb3ec20026a9aecc2a81a93c25630ceb5389297ddb7a5f0bd61dd09cde606b9b` |
| `vision_wasm_nosimd_internal.js` | `9f8fc960e363f0fb2f42f7937b97ae9cf9a5630490f71031fa90caa9bb121938` |
| `vision_wasm_nosimd_internal.wasm` | `924274fcd5ac8985f6570a8573e7971b7bd2d580ba1b8f3beb0ba8f95db6347c` |

Verify the local model directory with `sha256sum public/models/*`. To check runtime provenance after a dependency update, compare those four JS/WASM files with `node_modules/@mediapipe/tasks-vision/wasm/` before changing this record.

## Artwork and theme

Original images supplied with this game's repository are stored in [assets/source](../assets/source). Runtime [public/assets](../public/assets) images are lossless WebP conversions made by [scripts/optimize-assets.py](../scripts/optimize-assets.py); its decoded-pixel comparison checks that the conversion preserves the source images.

The repository does not contain an asset-by-asset creator list, original download links, or permission records. This document therefore does not assert that every image was authored by the repository owner or that the project's Apache license grants rights to third-party artwork. If the owner has original artwork files or licenses, record those sources and permissions here. The theme includes Star Wars references; no affiliation or endorsement is claimed.

Skeleton instruction diagrams, the gesture cursor, menus and star fields are drawn by this project's SVG, CSS, Canvas and Phaser code. They do not require an additional downloaded image pack.

## Tooling

See [technology.md](technology.md) for the feature-to-library mapping, exact installed npm versions and optional Pillow conversion workflow. Development tools are not browser runtime dependencies.
