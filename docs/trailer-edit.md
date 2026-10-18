# 45-second campus teaser

The current **v3** edit uses supplied phone footage and game capture to show a college playtest: learning the gestures, playing in the green USF room, and two friends smiling together. Seven animated feature callouts tell the story without a voice-over. The final four seconds hold the original game logo and a browser-play invitation.

The edit stays in 16:9 landscape. Heavily rolled phone passages were replaced with upright takes, retaining the hands, faces and filmed USF bull mark. Phone footage receives restrained contrast, saturation and color-balance corrections; the green room stays green and skin tones stay natural. Gameplay fits into a slightly smaller frame with a dedicated caption strip below the HUD. Callouts fade in and out over 180 ms, using ivory text, a dark backplate and gold accents.

## Timeline

Times in the source column are input seek positions used by the renderer, in seconds. Variable-frame-rate phone footage and WebM are converted to a common 30 FPS timeline. Cuts use frame boundaries `[0, 116, 267, 392, 512, 634, 809, 992, 1057, 1230, 1350]`, aligned with measured energy attacks in the continuous theme. The times below are rounded for readability.

| Trailer | Source | Moment |
| --- | --- | --- |
| 0–3.87 s | `20261012_174626.mp4`, 89–92.87 | Your hands. Your galaxy. |
| 3.87–8.90 s | `20261012_174626.mp4`, 8–13.03 | Your next study break; enter the green room |
| 8.90–13.07 s | `20261012_173558.mp4`, 0–4.17 | Learn the gestures, under the USF bull mark |
| 13.07–17.07 s | `20261012_173558.mp4`, 8–12 | Left hand: fly. Right hand: aim + fire. |
| 17.07–21.13 s | Gameplay WebM, 49–53.07 | Dodge meteors |
| 21.13–26.97 s | Gameplay WebM, 67–72.83 | Make a fist. Fire the cannon. |
| 26.97–33.07 s | `20261012_173558.mp4`, 14–20.10 | Upright view of the player, hands and monitor |
| 33.07–35.23 s | Gameplay WebM, 90–92.17 | Escape black holes |
| 35.23–41 s | `20261012_174907.mp4`, 49–54.77 | Both students smiling and giving thumbs-up |
| 41–45 s | Existing logo and title card | Game title, call to play, music credit |

The gameplay source is `space-defenders-2026-10-18T22-26-14-162Z-b331acfe.webm`. All inputs live in `output/recordings/`. `20261012_174826.mp4` was reviewed and omitted because it is primarily game-over footage and conversation. The edit shows friends playing and watching; it does not describe the game as multiplayer.

## Render

The recipe is [scripts/render-trailer.py](../scripts/render-trailer.py). It reads the originals and writes separate files under ignored `output/trailer/`. Video and render intermediates stay out of Git.

Requirements: Python 3, Pillow (tested with 12.3.0), Fontconfig with DejaVu Sans, and FFmpeg with HEVC/VP9 decoding plus H.264/AAC encoding. The system FFmpeg lacked HEVC decoding during this edit, so the local render uses the FFmpeg 7.0.2 binary bundled with `imageio-ffmpeg` 0.6.0. `--ffmpeg /path/to/ffmpeg` or the `FFMPEG` environment variable selects another compatible build.

To install the Python packages locally with the available `uv` tool:

```sh
uv pip install --target output/trailer-review/.pydeps Pillow==12.3.0 imageio-ffmpeg==0.6.0
```

From the project root, render the review copy or full-resolution master:

v3 uses the original licensed theme rather than the game's twenty-second excerpt. Prepare the source once; its checksum must match the existing game audio manifest:

```sh
python3 - <<'PY'
import hashlib, json, urllib.request
from pathlib import Path
manifest = json.loads(Path('public/audio/manifest.json').read_text())
asset = next(a for a in manifest['files'] if a['file'] == 'heroic-theme.mp3')
request = urllib.request.Request(asset['download'], headers={'User-Agent': 'SpaceDefendersTrailer/1.0'})
with urllib.request.urlopen(request, timeout=45) as response:
    data = response.read(50_000_000)
assert hashlib.sha256(data).hexdigest() == asset['sourceSha256'], 'Source checksum mismatch'
target = Path('output/trailer/music/space-marines-original.mp3')
target.parent.mkdir(parents=True, exist_ok=True)
target.write_bytes(data)
PY
```

```sh
PYTHONPATH=output/trailer-review/.pydeps python3 scripts/render-trailer.py --version v3
PYTHONPATH=output/trailer-review/.pydeps python3 scripts/render-trailer.py --full --version v3
```

Outputs are `teaser-v3-preview.mp4` (1280×720) and `teaser-v3.mp4` (1920×1080), both 45 seconds, 30 FPS, H.264/yuv420p video and stereo 48 kHz AAC audio, with fast-start MP4 metadata. Full-resolution intermediates use CRF 18 and the final encode uses CRF 19. Change `STORY_V3` and `CAPTIONS_V3` to revise trims or callouts; source shots total 41 seconds before the four-second card. The prior cut remains available through `--version v2` and its existing MP4 files.

By default each render rebuilds the source shots so cut changes take effect. Add `--reuse-clips` only when source files, trims and gains are unchanged; it reuses existing shot intermediates while rebuilding the card, final mix and encode. The final encoder uses two threads and the filter graph uses one to keep memory use bounded.

## Sound and attribution

The same Telaron theme runs continuously from 0.46–45.46 seconds of its original recording, with a short entrance fade and a two-second ending fade. Cut points follow measured energy attacks rather than an assumed tempo grid. Quiet Kenney tick/confirm cues accompany tutorial callouts; a short whoosh introduces clean gameplay. Original game effects and reduced room sound remain underneath. The final mix targets −16 LUFS integrated and −1 dBTP; measured results are checked after encoding. v2 retains the earlier twenty-second theme/ambience arrangement.

Include this attribution in the YouTube description when uploading:

> Music: “Space Marines” by Telaron, from The War of Terrador. Source: https://opengameart.org/content/space-marines. Licensed under CC BY 3.0: https://creativecommons.org/licenses/by/3.0/. This trailer uses a forty-five-second excerpt starting at 0.46 seconds, with fades and mixing.

Recorded gameplay also contains “Out There” by yd, CC0 1.0, https://opengameart.org/content/space-music-out-there. Game and edit effects use Kenney's CC0 Sci-fi Sounds and Interface Sounds packs. Full source and modification details remain in [the audio notices](../public/legal/audio-notices.txt). The endcard also identifies Telaron and the CC BY 3.0 license.

Suggested upload title: **Space Defenders — A Study Break in Space | Campus Playtest**.
