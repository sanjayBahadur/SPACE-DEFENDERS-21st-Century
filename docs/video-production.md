# Gameplay capture and 30-second teaser

## One-command capture

From the project folder:

```sh
npm run record
```

The command builds the current game and opens a local recorder in Chrome when available. Keep that terminal open.

1. Select **Open game**. This opens the tested production game in another browser tab.
2. Return to the recorder tab and select **Start recording**.
3. In the browser's sharing dialog, choose the **Space Defenders game tab** and enable **tab audio**. This records the game, including its DOM instructions and hand skeleton overlay. Sharing a window or screen may not include sound on Linux; the recorder checks for an audio track before starting.
4. Switch to the game and play. Enable the game's sound, then play the intro or start a mission. Your microphone is not requested, so record your voice-over separately.
5. Use **Stop & save**, the browser's **Stop sharing** control, or let the default two-minute limit finish the clip.

Files save automatically to **`output/recordings/`**, with a metadata JSON alongside each video. A saved-file link appears after the final video chunk has reached disk. Recordings are ignored by Git and stay local. The default target is up to 1080p/60 FPS at 12 Mbps; actual resolution and frame rate depend on the selected source and the computer. Choose 30 FPS for a lighter capture.

If the port is busy:

```sh
npm run record -- --port 4188
```

Advanced: `--no-open` prints the URL without launching a browser; `--skip-build` reuses the existing production build. Close the terminal with Ctrl+C **after** the recording is saved.

Screen selection is required each time by browser capture permissions. The tool records only the source you select. Use the explicit video-only option if you intentionally want a silent clip.

## Footage to capture

For the teaser, collect a few short takes rather than one perfect run:

- Full opening with music, then the clean title/menu.
- Left-hand movement and a close meteor dodge, with the skeleton visible.
- A right-index shot connecting with an enemy.
- A fist cannon burst and a deliberate release to cool.
- Entering and escaping a black-hole core.
- A busy Gunner scene with incoming projectiles.
- A clean pause/resume and the credits.

For a tutorial, hold each gesture for a few seconds and leave pauses between actions. Record the game screen and a separate view of the player/hands if available. Use your existing real-player footage for genuine reactions; do not invent spoken reactions or testimonials.

## 30-second teaser script — draft

Widescreen 16:9, using the original gold/black presentation. Use clear cuts, short control labels, and a four-second readable end card. Match the precise cut points to the supplied footage and your recorded delivery.

| Time | Picture | Voice-over |
| --- | --- | --- |
| 0–3 s | Close-up of hands, cut immediately to a successful shot | “Your hands are the controls.” |
| 3–9 s | Split player/game view: Pilot movement, then Gunner shot | “Left hand: fly. Right hand: aim. Flick to fire.” |
| 9–13 s | Fist gesture matched to a cannon burst | “Make a fist. Unleash the cannon.” |
| 13–18 s | Meteor near miss, then black-hole escape | “Dodge meteors. Escape black holes.” |
| 18–23 s | Best authentic player reaction and rapid action | “How long can you survive?” Then leave room for the real reaction. |
| 23–26 s | Strongest gameplay moment, then the game title | “Space Defenders.” |
| 26–30 s | Logo and ‘PLAY FREE IN YOUR BROWSER · LINK IN DESCRIPTION’ | “Play free in your browser.” |

### Voice-over text to record

Your hands are the controls.

Left hand: fly. Right hand: aim. Flick to fire.

Make a fist. Unleash the cannon.

Dodge meteors. Escape black holes.

How long can you survive?

Space Defenders. Play free in your browser.

Record each line separately, with roughly one second of clean silence before and after. Deliver it clearly and confidently; the edit supplies the energy. A quiet room and a separate voice recording help keep the game mix clean. Leave game effects and genuine player audio audible in the gaps, and duck music under narration.

## Tutorial narration — recording guide

Use these as separate takes; demonstrate each action before moving to the next:

1. “Welcome to Space Defenders. You control the Pilot on the left and the Gunner on the right.”
2. “Choose gesture controls and allow camera access. Keep both hands visible. Keyboard and mouse are also available.”
3. “Your left hand flies the ship. Close it to grab and steer; open it to release.”
4. “Point your right index finger to aim. Flick your thumb to fire.”
5. “Close your right hand into a fist to use the cannon. Watch the heat bar, then release to cool.”
6. “Avoid meteors and enemy lasers. Black holes slow the ship and drain hull inside the core.”
7. “If a hand leaves view, the game pauses. Bring both hands back, point at Resume, and flick your thumb. Keyboard resume is also available.”
8. “Protect both stations and survive as long as you can.”

## Editing and delivery

The editing inputs still needed are the selected real-player footage and your voice recording. Keep the originals; the edit will use separate outputs. The edit can include trimming, split-screen, crop/scale, title overlays, captions, music ducking, level matching and export through FFmpeg. A cut list and render commands will make revisions repeatable.

The recorder usually writes VP9/Opus WebM, falling back to a supported browser format. This is an editing source, not the final delivery codec. FFmpeg H.264 and AAC encoding have been checked locally. Final YouTube delivery should use 1080p widescreen MP4 with H.264 video, AAC audio and fast-start metadata, preserving the chosen timeline's frame rate. See [YouTube's upload encoding guidance](https://support.google.com/youtube/answer/1722171?hl=en).

Browser recordings can lack duration and seek metadata. If an editor cannot seek through a clip, remux it without re-encoding, keeping the original:

```sh
ffmpeg -i "output/recordings/YOUR-CLIP.webm" -c copy "output/recordings/YOUR-CLIP-seekable.webm"
```

`npm run test:recorder` verifies encoding and saving with synthetic video/audio, including cancellation, missing audio, manual stop, sharing-ended stop, automatic stop and repeated takes. It does not capture your desktop or microphone.

Include soundtrack attribution from [the audio notices](../public/legal/audio-notices.txt), particularly Telaron's CC BY 3.0 theme if it appears in the trailer. The final playable link should point to the verified public release before uploading.

Draft upload title: **Space Defenders — Control the Galaxy With Your Hands | Gameplay Teaser**.

Canva is connected for artwork/layout work, but its currently exposed tools do not provide a full video-editing timeline. FFmpeg handles the actual video edit. No YouTube publishing connector is exposed in this session; the completed video, captions and description can be prepared for the user's upload.
