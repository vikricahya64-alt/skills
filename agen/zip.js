// ZIP builder sederhana (mode "stored", tanpa kompresi) — zero dependency.
// Cukup untuk membungkus file project teks menjadi arsip .zip yang bisa diunduh.
const fs = require("fs");
const path = require("path");

// CRC32 (standar ZIP)
const CRC_TABLE = (() => {
  const t = new Int32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c;
  }
  return t;
})();

function crc32(buf) {
  let crc = -1;
  for (let i = 0; i < buf.length; i++) crc = CRC_TABLE[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
  return (crc ^ -1) >>> 0;
}

function dosDateTime(d) {
  const time = (d.getHours() << 11) | (d.getMinutes() << 5) | (d.getSeconds() >> 1);
  const date = (((d.getFullYear() - 1980) & 0x7f) << 9) | ((d.getMonth() + 1) << 5) | d.getDate();
  return { time: time & 0xffff, date: date & 0xffff };
}

function u16(v) { const b = Buffer.alloc(2); b.writeUInt16LE(v & 0xffff, 0); return b; }
function u32(v) { const b = Buffer.alloc(4); b.writeUInt32LE(v >>> 0, 0); return b; }

// Kumpulkan file (kecuali node_modules dan hidden) dari dir, kembalikan [{rel, buf}]
function collectFiles(dir, maxBytes = 8 * 1024 * 1024) {
  const out = [];
  let total = 0;
  function walk(cur, rel) {
    let entries = [];
    try { entries = fs.readdirSync(cur, { withFileTypes: true }); } catch (_) { return; }
    for (const e of entries) {
      if (e.name.startsWith(".") && e.name !== ".git") continue;
      if (e.name === "node_modules") continue;
      const full = path.join(cur, e.name);
      const r = rel ? rel + "/" + e.name : e.name;
      if (e.isDirectory()) { walk(full, r); continue; }
      let buf;
      try { buf = fs.readFileSync(full); } catch (_) { continue; }
      total += buf.length;
      if (total > maxBytes) return;
      out.push({ rel: r, buf });
    }
  }
  walk(dir, "");
  return out;
}

function buildZip(files) {
  const now = dosDateTime(new Date());
  const chunks = [];
  const central = [];
  let offset = 0;

  for (const f of files) {
    const nameBuf = Buffer.from(f.rel, "utf8");
    const crc = crc32(f.buf);
    const size = f.buf.length;
    const local = Buffer.concat([
      Buffer.from("PK\x03\x04"),
      u16(20), u16(0), u16(0), // version, flags, method (stored)
      u16(now.time), u16(now.date),
      u32(crc), u32(size), u32(size),
      u16(nameBuf.length), u16(0),
      nameBuf, f.buf,
    ]);
    chunks.push(local);

    const cent = Buffer.concat([
      Buffer.from("PK\x01\x02"),
      u16(20), u16(20), // version made by, version needed
      u16(0), u16(0), // flags, method
      u16(now.time), u16(now.date),
      u32(crc), u32(size), u32(size),
      u16(nameBuf.length), u16(0), u16(0), // name, extra, comment
      u16(0), u16(0), u32(0), // disk, internal attrs, external attrs
      u32(offset),
      nameBuf,
    ]);
    central.push(cent);
    offset += local.length;
  }

  const centralBuf = Buffer.concat(central);
  const eocd = Buffer.concat([
    Buffer.from("PK\x05\x06"),
    u16(0), u16(0), // this disk, disk with CD
    u16(files.length & 0xffff), u16(files.length & 0xffff),
    u32(centralBuf.length), u32(offset),
    u16(0),
  ]);

  return Buffer.concat([...chunks, centralBuf, eocd]);
}

module.exports = { collectFiles, buildZip };
