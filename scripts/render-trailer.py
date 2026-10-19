#!/usr/bin/env python3
"""Render the Space Defenders 45-second teaser or its 720p review copy."""

from __future__ import annotations

import argparse
import hashlib
import os
import shlex
import shutil
import subprocess
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont


ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "output" / "trailer"
REVIEW = ROOT / "output" / "trailer-review"

STORY_V2 = [
    ("output/recordings/20261012_174626.mp4", 89.0, 4.0, 0.70),
    ("output/recordings/20261012_174626.mp4", 8.0, 5.0, 0.70),
    ("output/recordings/20261012_173558.mp4", 0.0, 4.0, 0.70),
    ("output/recordings/20261012_174626.mp4", 18.0, 4.0, 0.70),
    ("output/recordings/space-defenders-2026-10-18T22-26-14-162Z-b331acfe.webm", 49.0, 4.0, 0.50),
    ("output/recordings/space-defenders-2026-10-18T22-26-14-162Z-b331acfe.webm", 67.0, 6.0, 0.50),
    ("output/recordings/20261012_174626.mp4", 70.0, 6.0, 0.70),
    ("output/recordings/space-defenders-2026-10-18T22-26-14-162Z-b331acfe.webm", 90.0, 2.0, 0.50),
    ("output/recordings/20261012_174907.mp4", 49.0, 6.0, 0.70),
]

# The v3 cuts land near measured peaks in the continuous licensed theme.  The
# selected phone shots from 173558 stay upright without a destructive crop.
STORY_V3 = [
    ("output/recordings/20261012_174626.mp4", 89.0, 116 / 30, 0.30),
    ("output/recordings/20261012_174626.mp4", 8.0, 151 / 30, 0.30),
    ("output/recordings/20261012_173558.mp4", 0.0, 125 / 30, 0.30),
    ("output/recordings/20261012_173558.mp4", 8.0, 120 / 30, 0.30),
    ("output/recordings/space-defenders-2026-10-18T22-26-14-162Z-b331acfe.webm", 49.0, 122 / 30, 0.35),
    ("output/recordings/space-defenders-2026-10-18T22-26-14-162Z-b331acfe.webm", 67.0, 175 / 30, 0.35),
    ("output/recordings/20261012_173558.mp4", 14.0, 183 / 30, 0.30),
    ("output/recordings/space-defenders-2026-10-18T22-26-14-162Z-b331acfe.webm", 90.0, 65 / 30, 0.35),
    ("output/recordings/20261012_174907.mp4", 49.0, 173 / 30, 0.30),
]

CAPTIONS_V3 = [
    (0 / 30, 116 / 30, ("YOUR HANDS. YOUR GALAXY.",), "phone_right"),
    (116 / 30, 267 / 30, ("YOUR NEXT STUDY BREAK.",), "phone"),
    (267 / 30, 392 / 30, ("LEARN THE GESTURES.",), "phone"),
    (392 / 30, 512 / 30, ("LEFT HAND: FLY.", "RIGHT HAND: AIM + FIRE."), "phone"),
    (512 / 30, 634 / 30, ("DODGE METEORS.",), "game"),
    (634 / 30, 809 / 30, ("MAKE A FIST. FIRE THE CANNON.",), "game"),
    (992 / 30, 1057 / 30, ("ESCAPE BLACK HOLES.",), "game"),
]


def find_font(bold: bool = False) -> Path:
    family = "DejaVu Sans:style=Bold" if bold else "DejaVu Sans"
    found = subprocess.run(
        ["fc-match", "-f", "%{file}", family], capture_output=True, text=True, check=True
    ).stdout.strip()
    if not found:
        raise RuntimeError("DejaVu Sans font not found (install fonts-dejavu or set up fc-match)")
    return Path(found)


def graphics(width: int, height: int, version: str) -> tuple[Path, list[tuple[float, float, Path]]]:
    OUT.mkdir(parents=True, exist_ok=True)
    logo = Image.open(ROOT / "public/assets/titlescreen/SpaceDefenders.webp").convert("RGBA")
    endcard = Image.new("RGBA", (width, height), (0, 0, 0, 255))
    draw = ImageDraw.Draw(endcard)

    alpha_bounds = logo.getchannel("A").getbbox()
    if alpha_bounds:
        logo = logo.crop(alpha_bounds)
    logo_w = int(width * 0.68)
    logo_h = int(height * 0.40)
    fit = min(logo_w / logo.width, logo_h / logo.height)
    logo = logo.resize((round(logo.width * fit), round(logo.height * fit)), Image.Resampling.LANCZOS)
    endcard.alpha_composite(logo, ((width - logo.width) // 2, int(height * 0.20)))

    gold = (225, 176, 48, 255)
    font = ImageFont.truetype(str(find_font(True)), max(20, int(height * 0.050)))
    credit = ImageFont.truetype(str(find_font()), max(14, int(height * 0.022)))
    tagline = "PLAY FREE IN YOUR BROWSER"
    bounds = draw.textbbox((0, 0), tagline, font=font)
    draw.text(((width - (bounds[2] - bounds[0])) // 2, int(height * 0.70)), tagline, font=font, fill=gold)

    attribution = "Music: Space Marines — Telaron · CC BY 3.0"
    bounds = draw.textbbox((0, 0), attribution, font=credit)
    draw.text(((width - (bounds[2] - bounds[0])) // 2, int(height * 0.92)), attribution, font=credit, fill=(205, 205, 205, 255))

    card_path = OUT / f"endcard-{version}-{width}x{height}.png"
    endcard.save(card_path)

    if version == "v2":
        caption = Image.new("RGBA", (width, height), (0, 0, 0, 0))
        draw = ImageDraw.Draw(caption)
        caption_font = ImageFont.truetype(str(find_font(True)), max(22, int(height * 0.046)))
        line = "YOUR HANDS. YOUR GALAXY."
        bounds = draw.textbbox((0, 0), line, font=caption_font, stroke_width=1)
        x = (width - (bounds[2] - bounds[0])) // 2
        y = int(height * 0.78)
        draw.text((x + 2, y + 3), line, font=caption_font, fill=(0, 0, 0, 220), stroke_width=3, stroke_fill=(0, 0, 0, 180))
        draw.text((x, y), line, font=caption_font, fill=gold, stroke_width=1, stroke_fill=(0, 0, 0, 220))
        caption_path = OUT / f"gesture-caption-{width}x{height}.png"
        caption.save(caption_path)
        return card_path, [(0.0, 4.0, caption_path)]

    cues = []
    caption_font = ImageFont.truetype(str(find_font(True)), max(23, int(height * 0.044)))
    panel_x, panel_y = int(width * 0.065), int(height * 0.755)
    panel_w, panel_h = int(width * 0.82), int(height * 0.17)
    for index, (start, end, lines, placement) in enumerate(CAPTIONS_V3, start=1):
        caption = Image.new("RGBA", (width, height), (0, 0, 0, 0))
        draw = ImageDraw.Draw(caption)
        if placement == "game":
            caption_font = ImageFont.truetype(str(find_font(True)), max(22, int(height * 0.035)))
            panel_x, panel_y = int(width * 0.05), int(height * 0.923)
            panel_w, panel_h = int(width * 0.90), int(height * 0.064)
        elif placement == "phone_right":
            caption_font = ImageFont.truetype(str(find_font(True)), max(23, int(height * 0.040)))
            panel_x, panel_y = int(width * 0.56), int(height * 0.10)
            panel_w, panel_h = int(width * 0.40), int(height * 0.16)
        else:
            caption_font = ImageFont.truetype(str(find_font(True)), max(23, int(height * 0.040)))
            panel_x, panel_y = int(width * 0.04), int(height * 0.10)
            panel_w, panel_h = int(width * 0.39), int(height * 0.16)
        draw.rounded_rectangle(
            (panel_x, panel_y, panel_x + panel_w, panel_y + panel_h),
            radius=max(8, int(height * 0.018)), fill=(7, 11, 20, 218), outline=(225, 176, 48, 205),
            width=max(1, int(height * 0.002)),
        )
        bar_w = max(4, int(width * 0.006))
        draw.rounded_rectangle((panel_x, panel_y, panel_x + bar_w, panel_y + panel_h), radius=bar_w // 2, fill=(225, 176, 48, 255))
        line_gap = int(caption_font.size * 1.15)
        total_h = len(lines) * line_gap
        y = panel_y + (panel_h - total_h) // 2 - int(caption_font.size * 0.10)
        for line in lines:
            text_inset = int(width * (0.025 if placement == "game" else 0.015))
            draw.text((panel_x + text_inset, y), line, font=caption_font, fill=(250, 247, 237, 255), stroke_width=0)
            y += line_gap
        path = OUT / f"caption-v3-{index:02d}-{width}x{height}.png"
        caption.save(path)
        cues.append((start, end, path))
    return card_path, cues


def run(cmd: list[str]) -> None:
    print("+", shlex.join(cmd), flush=True)
    subprocess.run(cmd, cwd=ROOT, check=True)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--full", action="store_true", help="Render final 1920x1080 instead of 1280x720 review copy")
    parser.add_argument("--version", choices=("v2", "v3"), default="v3", help="Select the preserved v2 cut or the v3 callout revision")
    parser.add_argument("--reuse-clips", action="store_true", help="Reuse cached shots only if sources, trims and gains are unchanged")
    parser.add_argument("--ffmpeg", default=os.environ.get("FFMPEG"), help="FFmpeg executable path")
    args = parser.parse_args()
    ffmpeg = args.ffmpeg or str(REVIEW / ".pydeps/imageio_ffmpeg/binaries/ffmpeg-linux-x86_64-v7.0.2")
    if args.ffmpeg:
        ffmpeg = shutil.which(ffmpeg) or ffmpeg
    elif not Path(ffmpeg).exists():
        ffmpeg = shutil.which("ffmpeg") or ffmpeg
    if not Path(ffmpeg).exists():
        raise SystemExit("FFmpeg not found; pass --ffmpeg /path/to/ffmpeg")

    continuous_music = OUT / "music" / "space-marines-original.mp3"
    expected_sha = "dfdb6aa4ca5510bce0bd415a36f9abcca0387b920868c7ea71af29ed2b1d116a"
    use_continuous = args.version == "v3"
    if use_continuous and not continuous_music.is_file():
        raise SystemExit(f"v3 requires {continuous_music}. Prepare the music using docs/trailer-edit.md before rendering.")
    if use_continuous and hashlib.sha256(continuous_music.read_bytes()).hexdigest() != expected_sha:
        raise SystemExit(f"Unexpected licensed music hash: {continuous_music}")

    width, height = (1920, 1080) if args.full else (1280, 720)
    label = f"teaser-{args.version}" if args.full else f"teaser-{args.version}-preview"
    work = OUT / f".work-{label}"
    work.mkdir(parents=True, exist_ok=True)
    story = STORY_V2 if args.version == "v2" else STORY_V3
    card, captions = graphics(width, height, args.version)
    clip_paths: list[Path] = []

    for index, (source, start, duration, source_volume) in enumerate(story, start=1):
        clip = work / f"shot-{index:02d}.mp4"
        clip_paths.append(clip)
        if args.reuse_clips and clip.exists() and clip.stat().st_size > 0:
            continue
        grade = "eq=contrast=1.035:brightness=0.003:saturation=0.94,colorbalance=rh=0.012:gm=-0.012:bm=-0.008," if args.version == "v3" and source.endswith(".mp4") else ""
        if args.version == "v3" and source.endswith(".webm"):
            gameplay_width = int(width * 0.92) // 2 * 2
            fit = f"scale={gameplay_width}:{height}:force_original_aspect_ratio=decrease:flags=lanczos,"
        else:
            fit = f"scale={width}:{height}:force_original_aspect_ratio=decrease:flags=lanczos,"
        scale_pad = (
            grade + fit +
            f"pad={width}:{height}:(ow-iw)/2:(oh-ih)/2:color=black,"
            f"fps=30,setsar=1,format=yuv420p"
        )
        run([
            ffmpeg, "-hide_banner", "-loglevel", "error", "-y", "-ss", str(start),
            "-i", str(ROOT / source), "-t", str(duration), "-vf", scale_pad,
            "-af", f"aresample=48000,aformat=sample_fmts=fltp:channel_layouts=stereo,volume={source_volume},"
                  f"afade=t=in:st=0:d=0.08,afade=t=out:st={max(0, duration - 0.16):.3f}:d=0.16",
            "-c:v", "libx264", "-preset", "ultrafast", "-crf", "18" if args.full else "25", "-pix_fmt", "yuv420p",
            "-r", "30", "-c:a", "aac", "-b:a", "128k", "-ar", "48000", "-ac", "2",
            "-t", str(duration), str(clip),
        ])

    endcard_video = work / "endcard.mp4"
    run([
        ffmpeg, "-hide_banner", "-loglevel", "error", "-y", "-loop", "1", "-framerate", "30",
        "-i", str(card), "-f", "lavfi", "-i", "anullsrc=r=48000:cl=stereo", "-t", "4",
        "-vf", "format=yuv420p", "-c:v", "libx264", "-preset", "ultrafast", "-crf", "18" if args.full else "25",
        "-r", "30", "-c:a", "aac", "-b:a", "128k", "-shortest", str(endcard_video),
    ])
    clip_paths.append(endcard_video)

    concat_list = work / "concat.txt"
    concat_list.write_text("".join(f"file '{path.resolve()}'\n" for path in clip_paths), encoding="utf-8")
    joined = work / "joined.mp4"
    run([ffmpeg, "-hide_banner", "-loglevel", "error", "-y", "-f", "concat", "-safe", "0",
         "-i", str(concat_list), "-c", "copy", str(joined)])

    legacy_music = ROOT / "public/audio/heroic-theme.mp3"
    ambience = ROOT / "public/audio/out-there.mp3"
    output = OUT / f"{label}.mp4"
    command = [ffmpeg, "-hide_banner", "-loglevel", "error", "-y", "-i", str(joined)]
    for _start, _end, caption in captions:
        command += ["-loop", "1", "-framerate", "30", "-i", str(caption)]
    music_index = 1 + len(captions)
    if use_continuous:
        command += ["-i", str(continuous_music)]
        effect_paths = [ROOT / "public/audio/tick.wav", ROOT / "public/audio/confirm.wav", ROOT / "public/audio/meteor-whoosh.wav"]
        effect_times = [267 / 30, 392 / 30, 512 / 30]
        for effect in effect_paths:
            command += ["-i", str(effect)]
    else:
        command += ["-i", str(legacy_music), "-i", str(ambience)]
        effect_paths, effect_times = [], []

    graph_parts = []
    video_label = "0:v"
    for idx, (start, end, _caption) in enumerate(captions, start=1):
        label_in = f"cap{idx}"
        label_out = f"v{idx}"
        graph_parts.append(
            f"[{idx}:v]trim=duration={end-start:.6f},setpts=PTS-STARTPTS+{start:.6f}/TB,format=rgba,"
            f"fade=t=in:st={start:.6f}:d=0.18:alpha=1,fade=t=out:st={end-0.18:.6f}:d=0.18:alpha=1[{label_in}];"
            f"[{video_label}][{label_in}]overlay=0:0:eof_action=pass:repeatlast=0[{label_out}]"
        )
        video_label = label_out
    graph_parts.append(f"[0:a]aresample=48000,volume=1.0[orig]")
    if use_continuous:
        graph_parts.append(
            f"[{music_index}:a]atrim=start=0.46:duration=45,asetpts=PTS-STARTPTS,aresample=48000,volume=1.0,"
            "afade=t=in:st=0:d=0.08,afade=t=out:st=43:d=2[theme]"
        )
        mix_labels = ["[orig]", "[theme]"]
        for offset, (effect_time, gain) in enumerate(zip(effect_times, (0.18, 0.18, 0.25)), start=1):
            idx = music_index + offset
            label_fx = f"fx{offset}"
            delay = round(effect_time * 1000)
            graph_parts.append(f"[{idx}:a]aresample=48000,volume={gain},adelay={delay}|{delay}[{label_fx}]")
            mix_labels.append(f"[{label_fx}]")
        graph_parts.append(
            "".join(mix_labels) +
            f"amix=inputs={len(mix_labels)}:duration=first:dropout_transition=0:normalize=0:weights='1 0.80 1 1 1',"
            "loudnorm=I=-16:TP=-1.0:LRA=11[a]"
        )
    else:
        graph_parts.append(
            f"[{music_index}:a]atrim=duration=20,asetpts=PTS-STARTPTS,aresample=48000,volume=1.0,"
            "afade=t=in:st=0:d=0.25,afade=t=out:st=18:d=2[theme]"
        )
        graph_parts.append(
            f"[{music_index+1}:a]atrim=duration=45,asetpts=PTS-STARTPTS,aresample=48000,volume=1.0,"
            "afade=t=in:st=17:d=3,afade=t=out:st=43:d=2[amb]"
        )
        graph_parts.append("[orig][theme][amb]amix=inputs=3:duration=first:dropout_transition=0:normalize=0:weights='1 0.35 0.20',loudnorm=I=-16:TP=-1.0:LRA=11[a]")
    graph = ";".join(graph_parts) + f";[{video_label}]null[v]"
    command += [
        "-filter_complex_threads", "1", "-filter_complex", graph, "-map", "[v]", "-map", "[a]", "-t", "45",
        "-c:v", "libx264", "-threads", "2", "-preset", "ultrafast" if not args.full else "veryfast", "-crf", "22" if not args.full else "19", "-pix_fmt", "yuv420p",
        "-r", "30", "-c:a", "aac", "-b:a", "192k", "-ar", "48000", "-ac", "2",
        "-movflags", "+faststart", str(output),
    ]
    run(command)
    print(f"Rendered {output.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
