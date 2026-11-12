"""Generate the portfolio's geometric icon and short tones (Python standard library)."""
from pathlib import Path
import math
import struct
import wave
import zlib

ROOT = Path(__file__).resolve().parents[1]


def polygon(x, y, points):
    inside = False
    for i, (a, b) in enumerate(points):
        c, d = points[i - 1]
        if (b > y) != (d > y) and x < (c - a) * (y - b) / (d - b) + a:
            inside = not inside
    return inside


def png(size):
    faces = [
        ([(.5, .16), (.83, .34), (.5, .53), (.17, .34)], (255, 194, 77, 255)),
        ([(.17, .34), (.5, .53), (.5, .88), (.17, .69)], (235, 132, 45, 255)),
        ([(.5, .53), (.83, .34), (.83, .69), (.5, .88)], (83, 184, 204, 255)),
    ]
    raw = bytearray()
    for y in range(size):
        raw.append(0)
        for x in range(size):
            color = (23, 29, 40, 255)
            for points, fill in faces:
                if polygon((x + .5) / size, (y + .5) / size, points):
                    color = fill
            raw.extend(color)

    def chunk(tag, data):
        return struct.pack('>I', len(data)) + tag + data + struct.pack('>I', zlib.crc32(tag + data))

    return (b'\x89PNG\r\n\x1a\n' + chunk(b'IHDR', struct.pack('>2I5B', size, size, 8, 6, 0, 0, 0))
            + chunk(b'IDAT', zlib.compress(bytes(raw))) + chunk(b'IEND', b''))


for path in (ROOT / 'src-tauri/icons').glob('*'):
    path.unlink()
for size, name in [(32, '32x32.png'), (128, '128x128.png'), (256, '128x128@2x.png'), (512, 'icon.png')]:
    (ROOT / 'src-tauri/icons' / name).write_bytes(png(size))
icon = png(256)
(ROOT / 'src-tauri/icons/icon.ico').write_bytes(
    struct.pack('<3H', 0, 1, 1) + struct.pack('<4B2H2I', 0, 0, 0, 0, 1, 32, len(icon), 22) + icon)
icon = png(512)
(ROOT / 'src-tauri/icons/icon.icns').write_bytes(
    b'icns' + struct.pack('>I', len(icon) + 16) + b'ic09' + struct.pack('>I', len(icon) + 8) + icon)
for name in ['icon.png', 'OMG_ICON.png']:
    (ROOT / 'public/images' / name).write_bytes(png(512))

for name, notes in [('StartUpSound.wav', [440, 554.37, 659.25]), ('CloseSound.wav', [659.25, 440])]:
    samples = []
    rate = 22050
    for frequency in notes:
        length = int(rate * .12)
        for i in range(length):
            envelope = math.sin(math.pi * i / length) ** 2
            samples.append(int(5000 * envelope * math.sin(2 * math.pi * frequency * i / rate)))
    with wave.open(str(ROOT / 'public/sounds' / name), 'wb') as output:
        output.setparams((1, 2, rate, 0, 'NONE', 'not compressed'))
        output.writeframes(struct.pack('<' + 'h' * len(samples), *samples))
