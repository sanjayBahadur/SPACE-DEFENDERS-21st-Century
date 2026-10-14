# Audio design and sources

Audio branch: `feat/game-audio`. This adds presentation and feedback; combat rules, gestures and mission timing are unchanged. The published 1.0.1 release remains the baseline until the audio branch is reviewed and released.

## Categories and actions

| Category | Trigger | Cue / local asset |
| --- | --- | --- |
| Intro / credits | Opening crawl and credits, after sound is enabled | `out-there.mp3`, quiet space ambience |
| Menu screen | Main menu / settings / controls | Same music bed; `hover.wav`, `confirm.wav`, `back.wav` |
| Pause screen | Pause, hand/camera loss, resume | Music reduced to 18% of configured music volume; `pause.wav` or `warning.wav`, resume `launch.wav` |
| Game instruction | Controls page, four-second briefing | `ready.wav`, once-per-second `tick.wav`, mission `launch.wav` |
| In-game | Mission starts | Music at 60% of configured music volume; effects stay in front |
| Shoot enemy | An actual player shot, including a miss | `laser.wav` |
| Enemy / missile destroyed | Destruction explosion | `explosion.wav`, rate limited across simultaneous kills |
| Pilot / Gunner damage | An accepted impact, after damage recovery checks | `impact.wav`; rejected overlaps stay silent |
| Cannon | Fist / keyboard cannon is actively firing | `cannon.wav` sustained loop; stops on release, overheat, pause, focus loss or scene shutdown |
| Heat | Cross 50% heat or enter overheat | `warning.wav`, rate limited |
| Cannon ready | Heat returns to zero | `ready.wav` |
| Critical health | Hull crosses 25%, or defenses cross 20% | `warning.wav`; continuous black-hole damage does not beep every frame |
| Hand reconnected | Both hands return during disconnect pause | `ready.wav` once per reconnection |
| Game defeat | Defeat screen opens | `defeat.wav` once; music and combat loops stop |

Deferred optional cues: enemy target-lock acquisition, missile/ray incoming warnings, ship thruster movement and distinct weapon/kill variants. These can crowd the mix and should be judged after listening to this first pass. There are no pickup/victory cues because those actions are not part of the current game.

## Free online sources

All selected assets are published as **CC0 1.0** by their creators. No copyrighted film music or franchise sound recordings are included.

- **Kenney — [Sci-fi Sounds](https://kenney.nl/assets/sci-fi-sounds)**, 70 effects, CC0. Selected originals: `laserSmall_002.ogg` (laser), `engineCircular_001.ogg` (cannon), `explosionCrunch_000.ogg` (explosion), `impactMetal_000.ogg` (impact), `computerNoise_001.ogg` (warning).
- **Kenney — [Interface Sounds](https://kenney.nl/assets/interface-sounds)**, 100 effects, CC0. Selected originals: `select_001.ogg`, `confirmation_001.ogg`, `back_001.ogg`, `tick_001.ogg`, `open_001.ogg`, `close_001.ogg`, `error_001.ogg`, `confirmation_002.ogg`.
- **yd — [Space Music: Out There](https://opengameart.org/content/space-music-out-there)**, approximately four minutes of space background music, CC0. Original download: <https://opengameart.org/sites/default/files/OutThere_0.ogg>.

Creator credits are included in the credits screen and `public/legal/audio-notices.txt`. Kenney's supplied licenses are retained alongside the other distribution notices. `public/audio/manifest.json` records the original filenames and SHA-256 of each source and distributed file.

## Formats, loading and mix

FFmpeg converts the selected effects to mono 22,050 Hz PCM WAV with a five-millisecond fade-in. The warning is shortened to 0.65 seconds with a 0.1-second fade-out to avoid masking other cues. Music is converted to 96 kbps MP3. Both formats work with the browser audio stack without extra runtime dependencies. The selected files total approximately 3.3 MB; only short effects are decoded into memory. Music streams through an HTML audio element.

`src/services/GameAudio.ts` uses Web Audio for effects and HTML audio for music. No sound download or audio context creation occurs until a trusted click/key event. The persistent **ENABLE SOUND** button allows listening during the opening crawl; browsers require an interaction before audio playback. Gesture menu clicks work after the initial camera/control choice unlocks audio.

Defaults: music 22%, effects 60%, sound enabled after interaction. Settings offers gesture-accessible volume buttons stepping through levels to 100% and then zero. A persistent sound button mutes immediately; preferences are stored locally when browser storage is available. Hidden pages pause music and stop effects. Defeat stops music; pause keeps a quiet bed. Returning to gameplay restores its mix.

Effects have per-cue cooldowns and at most ten simultaneous voices plus one cannon loop. Missing/unsupported audio, failed downloads, denied autoplay and unavailable storage never block loading, camera setup or gameplay. Sounds dropped while loading are not replayed later as stale weapon events.

## Validation

Unit coverage checks settings sanitization, voice limits, explosion/warning throttling, single cannon-loop ownership, pause/mute/defeat cleanup and hidden/locked silence. Production browser smoke checks cover menu cycles, camera-denial fallback and actual model loading with audio enabled by those interactions. Additional browser checks cover audio download/decode, unlock, mute, volume persistence and cannon cleanup. Physical listening on speakers/headphones remains part of playtesting; this first mix is intended for iteration.
