#!/usr/bin/env python3
"""Encode authored images as lossless WebP without changing frame geometry.

Requires Pillow (python -m pip install Pillow). Originals are kept outside public
so only the optimized runtime assets ship. Run after updating assets/source.
"""
from pathlib import Path
from PIL import Image

root = Path(__file__).resolve().parents[1]
source = root / 'assets' / 'source'
target = root / 'public' / 'assets'
before = after = 0
for path in sorted(source.rglob('*')):
    if path.suffix.lower() not in {'.png', '.jpg'}:
        continue
    destination = (target / path.relative_to(source)).with_suffix('.webp')
    destination.parent.mkdir(parents=True, exist_ok=True)
    with Image.open(path) as original:
        image = original.convert('RGBA')
        image.save(destination, 'WEBP', lossless=True, method=6, exact=True)
        with Image.open(destination) as encoded:
            if image.size != encoded.size or image.tobytes() != encoded.convert('RGBA').tobytes():
                raise RuntimeError(f'Pixel mismatch: {destination}')
    before += path.stat().st_size
    after += destination.stat().st_size
print(f'Lossless assets: {before:,} -> {after:,} bytes ({100 * (1-after/before):.1f}% smaller)')
