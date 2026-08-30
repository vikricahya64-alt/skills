const zlib = require('zlib');
const fs = require('fs');
const path = require('path');

function crc32(buf) {
  let table = crc32.table;
  if (!table) {
    table = crc32.table = new Int32Array(256);
    for (let n = 0; n < 256; n++) {
      let c = n;
      for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      table[n] = c;
    }
  }
  let c = ~0;
  for (let i = 0; i < buf.length; i++) c = table[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return ~c >>> 0;
}

function chunk(type, data) {
  const t = Buffer.from(type, 'ascii');
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([t, data])));
  return Buffer.concat([len, t, data, crc]);
}

function encodePNG(w, h, rgba) {
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0);
  ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8; ihdr[9] = 6; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  const raw = Buffer.alloc((w * 4 + 1) * h);
  for (let y = 0; y < h; y++) {
    raw[y * (w * 4 + 1)] = 0;
    for (let x = 0; x < w; x++) {
      const si = (y * w + x) * 4;
      const di = y * (w * 4 + 1) + 1 + x * 4;
      raw[di] = rgba[si];
      raw[di + 1] = rgba[si + 1];
      raw[di + 2] = rgba[si + 2];
      raw[di + 3] = rgba[si + 3];
    }
  }
  const idat = zlib.deflateSync(raw);
  return Buffer.concat([sig, chunk('IHDR', ihdr), chunk('IDAT', idat), chunk('IEND', Buffer.alloc(0))]);
}

// --- simple shape drawing ---
function makeIcon(size) {
  const px = new Uint8Array(size * size * 4);
  const BG = [11, 18, 32, 255];      // #0B1220
  const ACCENT = [56, 189, 248, 255]; // #38BDF8
  const WHITE = [255, 255, 255, 255];
  const cx = size / 2, cy = size / 2;
  const R = size * 0.28;

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 4;
      px[i] = BG[0]; px[i + 1] = BG[1]; px[i + 2] = BG[2]; px[i + 3] = BG[3];
      // rounded-rect clip (mask) radius ~ size*0.2
      const r = size * 0.2;
      const dx = Math.max(r - x, x - (size - r), 0);
      const dy = Math.max(r - y, y - (size - r), 0);
      const inRound = (dx * dx + dy * dy) <= r * r;
      if (!inRound) continue;

      // cloud: three overlapping circles + base
      const c1d = Math.hypot(x - (cx - R * 0.6), y - (cy - R * 0.35));
      const c2d = Math.hypot(x - (cx + R * 0.6), y - (cy - R * 0.3));
      const c3d = Math.hypot(x - cx, y - (cy - R * 0.75));
      const baseY = cy + R * 0.35;
      const inBase = (y >= baseY && y <= cy + R * 0.75) && (x >= cx - R * 0.9 && x <= cx + R * 0.9);
      const c1 = c1d <= R * 0.48, c2 = c2d <= R * 0.48, c3 = c3d <= R * 0.42;
      if (c1 || c2 || c3 || inBase) {
        px[i] = ACCENT[0]; px[i + 1] = ACCENT[1]; px[i + 2] = ACCENT[2]; px[i + 3] = ACCENT[3];
      }
    }
  }
  return encodePNG(size, size, px);
}

const outDir = path.join(__dirname, 'app', 'src', 'main', 'res');
const targets = [
  ['mipmap-mdpi', 48],
  ['mipmap-hdpi', 72],
  ['mipmap-xhdpi', 96],
  ['mipmap-xxhdpi', 144],
  ['mipmap-xxxhdpi', 192],
];
for (const [dir, size] of targets) {
  const d = path.join(outDir, dir);
  fs.mkdirSync(d, { recursive: true });
  const png = makeIcon(size);
  fs.writeFileSync(path.join(d, 'ic_launcher.png'), png);
  fs.writeFileSync(path.join(d, 'ic_launcher_round.png'), png);
  console.log('wrote', d, size + 'px', png.length + 'B');
}
