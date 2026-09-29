#!/usr/bin/env python3
"""Compose the home-page cuisine-card art from real catalog packshots.

Replaces the AI-generated food photos (29/09/2026): every item shown is a product
the shop sells, cut out of its white packshot background and set on a flat colour.
(The hero slides keep the owner-approved art; see public/brand/showcase/hero-*.)

    python3 scripts/showcase-art/build.py            # writes public/brand/showcase/*.webp
    python3 scripts/showcase-art/build.py --out /tmp/x  # preview elsewhere

Needs Pillow, numpy and scipy. Downloads are cached in /tmp/adg-showcase-art-cache.
"""
import argparse
import hashlib
import io
import json
import os
import urllib.request

import numpy as np
from PIL import Image, ImageDraw, ImageFilter
from scipy import ndimage

HERE = os.path.dirname(os.path.abspath(__file__))
CACHE = '/tmp/adg-showcase-art-cache'
WHITE = 236  # a pixel is background when all channels are at least this light


def fetch(url):
    os.makedirs(CACHE, exist_ok=True)
    path = os.path.join(CACHE, hashlib.sha1(url.encode()).hexdigest())
    if not os.path.exists(path):
        # The image CDN rejects urllib's default user agent with 403.
        request = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0 (showcase-art build)'})
        with urllib.request.urlopen(request, timeout=30) as response:
            data = response.read()
        with open(path, 'wb') as handle:
            handle.write(data)
    with open(path, 'rb') as handle:
        return Image.open(io.BytesIO(handle.read())).convert('RGB')


def cutout(image):
    """Drop the near-white background that touches the border; keep white inside the pack."""
    rgb = np.asarray(image)
    light = rgb.min(axis=2) >= WHITE
    labels, _ = ndimage.label(light, structure=np.ones((3, 3)))
    edge = np.unique(np.concatenate([labels[0], labels[-1], labels[:, 0], labels[:, -1]]))
    background = np.isin(labels, edge[edge > 0])
    alpha = Image.fromarray(np.where(background, 0, 255).astype(np.uint8))
    alpha = alpha.filter(ImageFilter.MinFilter(3)).filter(ImageFilter.GaussianBlur(0.8))
    rgba = image.convert('RGBA')
    rgba.putalpha(alpha)
    box = alpha.point(lambda value: 255 if value > 8 else 0).getbbox()
    return rgba.crop(box) if box else rgba


def compose(size, bg, items, base, center_x=0.5, baseline=0.86, max_width=0.86, grow=1.0):
    width, height = size
    canvas = Image.new('RGBA', size, bg)

    # A soft lighter disc behind the group keeps the flat colour from looking empty.
    glow = Image.new('L', size, 0)
    radius = int(height * 0.44)
    cx, cy = int(width * center_x), int(height * 0.5)
    ImageDraw.Draw(glow).ellipse((cx - radius, cy - radius, cx + radius, cy + radius), fill=110)
    glow = glow.filter(ImageFilter.GaussianBlur(height * 0.06))
    canvas.paste(Image.new('RGBA', size, '#ffffff'), (0, 0), glow)

    packs = []
    for item in items:
        url = item.get('url') or f"{base}{item['id']}/1.webp"
        pack = cutout(fetch(url))
        target_h = min(item['h'] * grow, 0.86) * height
        scale = target_h / pack.height
        target_w = pack.width * scale
        if target_w > width * 0.3:  # very wide packs (multipacks) would dominate
            scale = width * 0.3 / pack.width
        packs.append(pack.resize((max(1, int(pack.width * scale)), max(1, int(pack.height * scale))), Image.LANCZOS))

    overlap = 0.1
    total = sum(p.width for p in packs) * (1 - overlap) + packs[-1].width * overlap
    if total > width * max_width:
        shrink = width * max_width / total
        packs = [p.resize((int(p.width * shrink), int(p.height * shrink)), Image.LANCZOS) for p in packs]
        total *= shrink

    # A group shrunk by its width would sit on the floor with empty space above;
    # lift the shelf so the group stays roughly centred.
    floor_y = min(height * baseline, height * 0.54 + max(p.height for p in packs) / 2)
    x = width * center_x - total / 2
    placed = []
    for index, pack in enumerate(packs):
        placed.append((index, int(x), int(floor_y - pack.height), pack))
        x += pack.width * (1 - overlap)

    middle = (len(packs) - 1) / 2
    for index, left, top, pack in sorted(placed, key=lambda entry: -abs(entry[0] - middle)):
        floor = Image.new('L', size, 0)
        fw = pack.width * 0.46
        fx, fy = left + pack.width / 2, top + pack.height
        ImageDraw.Draw(floor).ellipse((fx - fw, fy - height * 0.018, fx + fw, fy + height * 0.022), fill=70)
        floor = floor.filter(ImageFilter.GaussianBlur(height * 0.014))
        canvas.paste(Image.new('RGBA', size, '#3a2a1a'), (0, 0), floor)

        shadow_alpha = pack.getchannel('A').point(lambda value: value * 0.22)
        shadow = Image.new('RGBA', pack.size, '#3a2a1a')
        shadow.putalpha(shadow_alpha)
        blur = int(height * 0.02)
        pad = blur * 3
        padded = Image.new('RGBA', (pack.width + pad * 2, pack.height + pad * 2), (0, 0, 0, 0))
        padded.paste(shadow, (pad, pad))
        padded = padded.filter(ImageFilter.GaussianBlur(blur))
        canvas.alpha_composite(padded, (left - pad + int(height * 0.012), top - pad + int(height * 0.018)))
        canvas.alpha_composite(pack, (left, top))
    return canvas.convert('RGB')


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--out', default=os.path.join(HERE, '..', '..', 'public', 'brand', 'showcase'))
    args = parser.parse_args()
    with open(os.path.join(HERE, 'picks.json')) as handle:
        picks = json.load(handle)
    os.makedirs(args.out, exist_ok=True)
    base = picks['base']

    cuisines = picks['cuisines']
    for name, tile in cuisines['tiles'].items():
        compose(cuisines['size'], tile['bg'], tile['items'], base, baseline=0.9, max_width=0.94, grow=1.35).save(
            os.path.join(args.out, f'{name}.webp'), quality=86)
        print('cuisine', name)


if __name__ == '__main__':
    main()
