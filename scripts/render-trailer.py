#!/usr/bin/env python3
"""Render the Space Defenders 45-second teaser or its 720p review copy."""

from __future__ import annotations

import argparse
import os
import shlex
import shutil
import subprocess
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont


ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "output" / "trailer"
REVIEW = ROOT / "output" / "trailer-review"

STORY = [
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


def find_font(bold: bool = False) -> Path:
    family = "DejaVu Sans:style=Bold" if bold else "DejaVu Sans"
    found = subprocess.run(
        ["fc-match", "-f", "%{file}", family], capture_output=True, text=True, check=True
    ).stdout.strip()
    if not found:
        raise RuntimeError("DejaVu Sans font not found (install fonts-dejavu or set up fc-match)")
    return Path(found)


def graphics(width: int, height: int) -> tuple[Path, Path]:
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

    card_path = OUT / f"endcard-{width}x{height}.png"
    endcard.save(card_path)

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
    return card_path, caption_path


def run(cmd: list[str]) -> None:
    print("+", shlex.join(cmd), flush=True)
    subprocess.run(cmd, cwd=ROOT, check=True)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--full", action="store_true", help="Render final 1920x1080 instead of 1280x720 review copy")
    parser.add_argument("--version", default="v2", help="Output version label (for example v2 while a review is in progress)")
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

    width, height = (1920, 1080) if args.full else (1280, 720)
    label = f"teaser-{args.version}" if args.full else f"teaser-{args.version}-preview"
    work = OUT / f".work-{label}"
    work.mkdir(parents=True, exist_ok=True)
    card, caption = graphics(width, height)
    clip_paths: list[Path] = []

    for index, (source, start, duration, source_volume) in enumerate(STORY, start=1):
        clip = work / f"shot-{index:02d}.mp4"
        clip_paths.append(clip)
        if args.reuse_clips and clip.exists() and clip.stat().st_size > 0:
            continue
        scale_pad = (
            f"scale={width}:{height}:force_original_aspect_ratio=decrease:flags=lanczos,"
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

    music = ROOT / "public/audio/heroic-theme.mp3"
    ambience = ROOT / "public/audio/out-there.mp3"
    output = OUT / f"{label}.mp4"
    graph = (
        "[0:v][1:v]overlay=0:0:enable='between(t,0,4)'[v];"
        "[0:a]aresample=48000,volume=1.0[orig];"
        "[2:a]atrim=duration=20,asetpts=PTS-STARTPTS,aresample=48000,volume=1.0,"
        "afade=t=in:st=0:d=0.25,afade=t=out:st=18:d=2[theme];"
        "[3:a]atrim=duration=45,asetpts=PTS-STARTPTS,aresample=48000,volume=1.0,"
        "afade=t=in:st=17:d=3,afade=t=out:st=43:d=2[amb];"
        "[orig][theme][amb]amix=inputs=3:duration=first:dropout_transition=0:normalize=0:weights='1 0.35 0.20',"
        "loudnorm=I=-16:TP=-1.0:LRA=11[a]"
    )
    run([
        ffmpeg, "-hide_banner", "-loglevel", "error", "-y", "-i", str(joined),
        "-loop", "1", "-framerate", "30", "-i", str(caption), "-i", str(music), "-i", str(ambience),
        "-filter_complex_threads", "1", "-filter_complex", graph, "-map", "[v]", "-map", "[a]", "-t", "45",
        "-c:v", "libx264", "-threads", "2", "-preset", "ultrafast" if not args.full else "veryfast", "-crf", "22" if not args.full else "19", "-pix_fmt", "yuv420p",
        "-r", "30", "-c:a", "aac", "-b:a", "192k", "-ar", "48000", "-ac", "2",
        "-movflags", "+faststart", str(output),
    ])
    print(f"Rendered {output.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
