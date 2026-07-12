#!/usr/bin/env python3
"""Generate PWA icon PNGs with programmatic circles."""
import struct, zlib, os

def create_png(size, filename):
    width = height = size
    cx = size // 2; cy = size // 2; r = size // 2 - 4
    pixels = []
    for y in range(height):
        row = []
        for x in range(width):
            dx, dy = x - cx, y - cy
            dist = (dx*dx + dy*dy) ** 0.5
            if dist < r - 2:
                t = dist / r
                rv = int(20 + (1-t)*40)
                gv = int(20 + t*60)
                bv = int(40 + (1-t)*40 + t*20)
                row.append((rv, gv, bv, 255))
            elif dist < r:
                row.append((255, 215, 0, 255))
            else:
                row.append((0, 0, 0, 0))
        pixels.append(row)

    raw = b''
    for y in range(height):
        raw += b'\x00'
        for x in range(width):
            raw += struct.pack('BBBB', *pixels[y][x])

    def chk(t, d):
        c = t + d
        return struct.pack('>I', len(d)) + c + struct.pack('>I', zlib.crc32(c) & 0xffffffff)

    with open(filename, 'wb') as f:
        f.write(b'\x89PNG\r\n\x1a\n')
        f.write(chk(b'IHDR', struct.pack('>IIBBBBB', width, height, 8, 6, 0, 0, 0)))
        f.write(chk(b'IDAT', zlib.compress(raw)))
        f.write(chk(b'IEND', b''))
    print(f'OK {size}x{size} -> {filename}')

os.makedirs('/Users/skat/projects/solar-terms-game/icons', exist_ok=True)
create_png(192, '/Users/skat/projects/solar-terms-game/icons/icon-192.png')
create_png(512, '/Users/skat/projects/solar-terms-game/icons/icon-512.png')
create_png(96, '/Users/skat/projects/solar-terms-game/icons/play-96.png')
print('Done.')
