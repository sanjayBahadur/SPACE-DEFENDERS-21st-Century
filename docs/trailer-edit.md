# 45-second campus teaser

This edit uses the supplied phone footage and game capture to show a real college playtest: learning the gestures, playing in the green USF room, and two friends smiling together. The USF bull mark stays in the filmed room. Handheld camera moves and cuts on movement provide the transitions. The opening has one short caption; the final four seconds hold the original game logo and a browser-play invitation. There is no added narration or invented dialogue.

## Timeline

Times in the source column are input seek positions used by the renderer, in seconds. The variable-frame-rate phone footage and WebM are converted to a common 30 FPS timeline. Gameplay keeps its original aspect ratio with black padding.

| Trailer | Source | Moment |
| --- | --- | --- |
| 0–4 s | `20261012_174626.mp4`, 89–93 | Front-facing gesture hook |
| 4–9 s | `20261012_174626.mp4`, 8–13 | Enter the green room and approach the player |
| 9–13 s | `20261012_173558.mp4`, 0–4 | Tutorial practice under the USF bull mark |
| 13–17 s | `20261012_174626.mp4`, 18–22 | Instructions and the transition into play |
| 17–21 s | Gameplay WebM, 49–53 | First action beat |
| 21–27 s | Gameplay WebM, 67–73 | Gameplay impacts and gesture overlay |
| 27–33 s | `20261012_174626.mp4`, 70–76 | Player, hands and monitor in the same shot |
| 33–35 s | Gameplay WebM, 90–92 | Short gameplay cutaway |
| 35–41 s | `20261012_174907.mp4`, 49–55 | Both students smiling and giving thumbs-up |
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

```sh
PYTHONPATH=output/trailer-review/.pydeps python3 scripts/render-trailer.py --version v2
PYTHONPATH=output/trailer-review/.pydeps python3 scripts/render-trailer.py --full --version v2
```

Outputs are `teaser-v2-preview.mp4` (1280×720) and `teaser-v2.mp4` (1920×1080), both 45 seconds, 30 FPS, H.264/yuv420p video and stereo 48 kHz AAC audio, with fast-start MP4 metadata. Full-resolution intermediates use CRF 18 and the final encode uses CRF 19. Change the `STORY` list to revise trims or ordering; durations total 41 seconds before the four-second card.

By default each render rebuilds the source shots so cut changes take effect. Add `--reuse-clips` only when source files, trims and gains are unchanged; it reuses existing shot intermediates while rebuilding the card, final mix and encode. The final encoder uses two threads and the filter graph uses one to keep memory use bounded.

## Sound and attribution

The edit keeps source room sound and game effects. A heroic opening crossfades into space ambience, with no repeated twenty-second music loop. The final mix targets −16 LUFS integrated and −1 dBTP; measured results are checked after encoding.

Include this attribution in the YouTube description when uploading:

> Music: “Space Marines” by Telaron, from The War of Terrador. Source: https://opengameart.org/content/space-marines. Licensed under CC BY 3.0: https://creativecommons.org/licenses/by/3.0/. This trailer uses a twenty-second excerpt with the original leading silence removed, additional fades and mixing.

Additional music: “Out There” by yd, CC0 1.0, https://opengameart.org/content/space-music-out-there. Game effects use Kenney's CC0 Sci-fi Sounds and Interface Sounds packs. Full source and modification details remain in [the audio notices](../public/legal/audio-notices.txt). The endcard also identifies Telaron and the CC BY 3.0 license.

Suggested upload title: **Space Defenders — A Study Break in Space | Campus Playtest**.
