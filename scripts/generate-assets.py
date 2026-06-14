#!/usr/bin/env python3
"""Generate brand logo and OG image PNGs without external dependencies."""

import struct
import zlib
import os

PRIMARY = (59, 122, 92)      # #3B7A5C
ACCENT = (212, 114, 155)     # #D4729B
DARK = (26, 60, 52)          # #1A3C34
WHITE = (255, 255, 255)
CREAM = (250, 247, 242)


def create_png(width, height, draw_fn):
    """Create a PNG file from a draw function that sets RGB pixels."""
    pixels = []
    for y in range(height):
        row = [0]  # filter byte
        for x in range(width):
            r, g, b = draw_fn(x, y, width, height)
            row.extend([r, g, b])
        pixels.append(bytes(row))

    raw_data = b"".join(pixels)
    compressed = zlib.compress(raw_data, 9)

    def chunk(chunk_type, data):
        c = chunk_type + data
        crc = struct.pack(">I", zlib.crc32(c) & 0xFFFFFFFF)
        return struct.pack(">I", len(data)) + c + crc

    ihdr = struct.pack(">IIBBBBB", width, height, 8, 2, 0, 0, 0)
    png = b"\x89PNG\r\n\x1a\n"
    png += chunk(b"IHDR", ihdr)
    png += chunk(b"IDAT", compressed)
    png += chunk(b"IEND", b"")
    return png


def draw_logo(x, y, w, h):
    """Draw a simple tooth/smile logo icon."""
    cx, cy = w // 2, h // 2
    size = min(w, h)

    # Rounded square background
    margin = size * 0.08
    corner = size * 0.22
    in_rect = (
        margin <= x <= w - margin
        and margin <= y <= h - margin
    )
    if in_rect:
        # Check rounded corners
        corners = [
            (margin + corner, margin + corner),
            (w - margin - corner, margin + corner),
            (margin + corner, h - margin - corner),
            (w - margin - corner, h - margin - corner),
        ]
        for ccx, ccy in corners[:2]:
            if x < margin + corner and y < margin + corner:
                if (x - ccx) ** 2 + (y - ccy) ** 2 > corner ** 2:
                    in_rect = False
            if x > w - margin - corner and y < margin + corner:
                if (x - (w - margin - corner)) ** 2 + (y - ccy) ** 2 > corner ** 2:
                    in_rect = False
        for ccx, ccy in corners[2:]:
            if x < margin + corner and y > h - margin - corner:
                if (x - ccx) ** 2 + (y - (h - margin - corner)) ** 2 > corner ** 2:
                    in_rect = False
            if x > w - margin - corner and y > h - margin - corner:
                if (x - (w - margin - corner)) ** 2 + (y - (h - margin - corner)) ** 2 > corner ** 2:
                    in_rect = False

    if in_rect:
        # Tooth shape (simplified)
        tooth_cx = cx
        tooth_top = cy - size * 0.18
        tooth_bottom = cy + size * 0.22
        tooth_half_w = size * 0.2

        in_tooth = (
            tooth_top <= y <= tooth_bottom
            and abs(x - tooth_cx) <= tooth_half_w
        )
        # Rounded top
        if y < tooth_top + size * 0.08 and abs(x - tooth_cx) <= tooth_half_w:
            top_r = size * 0.08
            if (x - tooth_cx) ** 2 + (y - (tooth_top + top_r)) ** 2 > tooth_half_w ** 2:
                in_tooth = False

        # Smile arc
        arc_y = cy + size * 0.05
        arc_r = size * 0.15
        dist = ((x - cx) ** 2 + (y - arc_y) ** 2) ** 0.5
        on_arc = abs(dist - arc_r) < 2.5 and x > cx - arc_r and x < cx + arc_r and y > arc_y

        if in_tooth or on_arc:
            return WHITE
        return PRIMARY

    return (0, 0, 0, 0) if False else (0, 0, 0)  # transparent - use white bg instead


def draw_logo_fixed(x, y, w, h):
    """Logo with green rounded square and white tooth icon."""
    size = min(w, h)
    margin = int(size * 0.06)
    corner_r = int(size * 0.2)

    # Background rounded rect
    inside = margin <= x < w - margin and margin <= y < h - margin

    if inside:
        # Corner rounding
        for corner_x, corner_y in [
            (margin + corner_r, margin + corner_r),
            (w - margin - corner_r, margin + corner_r),
            (margin + corner_r, h - margin - corner_r),
            (w - margin - corner_r, h - margin - corner_r),
        ]:
            in_corner_zone = False
            if corner_x == margin + corner_r and x < margin + corner_r:
                in_corner_zone = y < margin + corner_r if corner_y == margin + corner_r else y > h - margin - corner_r
            if corner_x == w - margin - corner_r and x > w - margin - corner_r:
                in_corner_zone = y < margin + corner_r if corner_y == margin + corner_r else y > h - margin - corner_r
            if in_corner_zone:
                if (x - corner_x) ** 2 + (y - corner_y) ** 2 > corner_r ** 2:
                    inside = False

    if not inside:
        return WHITE

    cx, cy = w // 2, h // 2

    # Tooth body
    tw = int(size * 0.22)
    th = int(size * 0.28)
    tooth_top = cy - th // 2
    tooth_bot = cy + th // 2 - int(size * 0.04)

    in_tooth = tooth_top <= y <= tooth_bot and abs(x - cx) <= tw // 2

    # Roots
    root_w = int(tw * 0.35)
    root_gap = int(tw * 0.15)
    root_top = tooth_bot
    root_bot = cy + th // 2 + int(size * 0.06)
    in_root_l = root_top <= y <= root_bot and abs(x - (cx - root_gap)) <= root_w // 2
    in_root_r = root_top <= y <= root_bot and abs(x - (cx + root_gap)) <= root_w // 2

    # Smile curve
    arc_cy = cy + int(size * 0.08)
    arc_r = int(size * 0.14)
    dist = ((x - cx) ** 2 + (y - arc_cy) ** 2) ** 0.5
    on_smile = abs(dist - arc_r) < 2 and y >= arc_cy - 2 and abs(x - cx) < arc_r

    if in_tooth or in_root_l or in_root_r or on_smile:
        return WHITE
    return PRIMARY


def draw_og(x, y, w, h):
    """OG image with brand gradient and text area."""
    # Gradient from dark green to primary
    t = x / w
    r = int(DARK[0] * (1 - t) + PRIMARY[0] * t)
    g = int(DARK[1] * (1 - t) + PRIMARY[1] * t)
    b = int(DARK[2] * (1 - t) + PRIMARY[2] * t)

    # Accent circle top-right
    acx, acy = int(w * 0.82), int(h * 0.25)
    ar = int(min(w, h) * 0.18)
    if (x - acx) ** 2 + (y - acy) ** 2 < ar ** 2:
        blend = 0.6
        r = int(r * (1 - blend) + ACCENT[0] * blend)
        g = int(g * (1 - blend) + ACCENT[1] * blend)
        b = int(b * (1 - blend) + ACCENT[2] * blend)

    # White text block area (simplified rectangle)
    tx1, ty1 = int(w * 0.08), int(h * 0.35)
    tx2, ty2 = int(w * 0.65), int(h * 0.72)

    if tx1 <= x <= tx2 and ty1 <= y <= ty2:
        # Title bar
        if ty1 <= y <= ty1 + int(h * 0.12):
            return WHITE
        # Accent line
        if ty1 + int(h * 0.14) <= y <= ty1 + int(h * 0.155):
            return ACCENT
        # Subtitle bars
        bar_h = int(h * 0.035)
        gap = int(h * 0.055)
        for i in range(3):
            by = ty1 + int(h * 0.2) + i * gap
            if by <= y <= by + bar_h:
                alpha = 0.7 - i * 0.15
                return (
                    int(WHITE[0] * alpha + r * (1 - alpha)),
                    int(WHITE[1] * alpha + g * (1 - alpha)),
                    int(WHITE[2] * alpha + b * (1 - alpha)),
                )

    return (r, g, b)


def parse_color(hex_color: str) -> tuple[int, int, int]:
    value = hex_color.strip().lstrip("#")
    if len(value) == 3:
        value = "".join(ch * 2 for ch in value)
    if len(value) != 6:
        raise ValueError(f"Invalid hex color: {hex_color}")
    return int(value[0:2], 16), int(value[2:4], 16), int(value[4:6], 16)


def main():
    import argparse

    parser = argparse.ArgumentParser(description="Generate brand logo and OG image PNGs.")
    parser.add_argument("--primary", default="#3B7A5C", help="Primary brand color (hex)")
    parser.add_argument("--accent", default="#D4729B", help="Accent brand color (hex)")
    parser.add_argument("--dark", default="#1A3C34", help="Dark brand color (hex)")
    parser.add_argument(
        "--output",
        default=os.path.join(os.path.dirname(__file__), "public"),
        help="Output directory for logo.png and og-image.png",
    )
    args = parser.parse_args()

    global PRIMARY, ACCENT, DARK
    PRIMARY = parse_color(args.primary)
    ACCENT = parse_color(args.accent)
    DARK = parse_color(args.dark)

    public_dir = args.output
    os.makedirs(public_dir, exist_ok=True)

    logo = create_png(256, 256, draw_logo_fixed)
    with open(os.path.join(public_dir, "logo.png"), "wb") as f:
        f.write(logo)

    og = create_png(1200, 630, draw_og)
    with open(os.path.join(public_dir, "og-image.png"), "wb") as f:
        f.write(og)

    print(f"Generated {public_dir}/logo.png and {public_dir}/og-image.png")


if __name__ == "__main__":
    main()
