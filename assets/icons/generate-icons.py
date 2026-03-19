#!/usr/bin/env python3
"""Generate simple PNG icons for the Liero PWA."""
import struct
import zlib
import math
import os

def create_png(size, output_path):
    """Create a PNG with dark purple bg, green circle, white 'L'."""
    bg = (0x1a, 0x0a, 0x2e)
    green = (0x00, 0xcc, 0x00)
    white = (0xff, 0xff, 0xff)

    cx, cy = size / 2, size / 2
    radius = size * 0.30

    # L letter dimensions
    l_left = cx - size * 0.10
    l_stroke = size * 0.06
    l_top = cy - size * 0.16
    l_bottom = cy + size * 0.16
    l_right = cx + size * 0.12
    l_foot_top = l_bottom - l_stroke

    raw = bytearray()
    for y in range(size):
        raw.append(0)  # filter byte
        for x in range(size):
            dx, dy = x - cx, y - cy
            dist = math.sqrt(dx*dx + dy*dy)

            if dist <= radius:
                in_vert = (l_left <= x <= l_left + l_stroke and l_top <= y <= l_bottom)
                in_horiz = (l_foot_top <= y <= l_bottom and l_left <= x <= l_right)
                if in_vert or in_horiz:
                    r, g, b = white
                else:
                    r, g, b = green
            elif dist <= radius + 2:
                t = (dist - radius) / 2
                r = int(green[0] * (1-t) + bg[0] * t)
                g = int(green[1] * (1-t) + bg[1] * t)
                b = int(green[2] * (1-t) + bg[2] * t)
            else:
                r, g, b = bg

            raw.extend([r, g, b])

    compressed = zlib.compress(bytes(raw), 9)

    def make_chunk(chunk_type, data):
        chunk = chunk_type + data
        crc = zlib.crc32(chunk) & 0xffffffff
        return struct.pack('>I', len(data)) + chunk + struct.pack('>I', crc)

    ihdr_data = struct.pack('>IIBBBBB', size, size, 8, 2, 0, 0, 0)

    png = b'\x89PNG\r\n\x1a\n'
    png += make_chunk(b'IHDR', ihdr_data)
    png += make_chunk(b'IDAT', compressed)
    png += make_chunk(b'IEND', b'')

    with open(output_path, 'wb') as f:
        f.write(png)

    print(f"Created {output_path} ({len(png)} bytes, {size}x{size})")

script_dir = os.path.dirname(os.path.abspath(__file__))
create_png(192, os.path.join(script_dir, 'icon-192.png'))
create_png(512, os.path.join(script_dir, 'icon-512.png'))
