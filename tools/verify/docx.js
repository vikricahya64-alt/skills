// ============================================================================
// DOCX — verifikator struktur dokumen WORD (.docx / .doc) tanpa dependensi.
//
// Sebagian keluaran kemampuan dapat berupa dokumen Word. Verifikasi ini memastikan
// dokumen itu benar-benar dokumen Office yang valid secara struktural:
//
//   *.docx  : ZIP/OOXML.
//              1. Harus arsip ZIP valid (signature PK\x03\x04).
//              2. Harus memuat entri wajib word/document.xml di dalamnya.
//              3. word/document.xml harus XML well-formed.
//              4. Memuat elemen dokumen (w:document) & paragraf (w:p).
//   *.doc   : Compound File Binary (CFB / OLE).
//              1. Header ajaib (magic) D0 CF 11 E0 A1 B1 1A E1.
//
// Digunakan baik via CLI (--docx <file>) maupun sebagai check terdaftar untuk
// dokumen yang disediakan repo/CI.
// ============================================================================
const zlib = require("zlib");

const OOXML = { PK: [0x50, 0x4b, 0x03, 0x04] };
const CFB = [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1];

function sameMagic(buf, magic) {
  if (buf.length < magic.length) return false;
  for (let i = 0; i < magic.length; i++) if (buf[i] !== magic[i]) return false;
  return true;
}

// Ekstrak entri ZIP sederhana (hanya metode deflate & stored) — cukup utk membuka
// arsip OOXML tempat document.xml berada.
function zipEntries(buf) {
  const entries = [];
  let off = 0;
  const dv = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
  while (off + 30 <= buf.length) {
    if (!sameMagic(buf.subarray(off, off + 4), OOXML.PK)) break;
    const method = dv.getUint16(off + 8, true);
    const csize = dv.getUint32(off + 18, true);
    const usize = dv.getUint32(off + 22, true);
    const nlen = dv.getUint16(off + 26, true);
    const elen = dv.getUint16(off + 28, true);
    const name = buf.toString("utf8", off + 30, off + 30 + nlen);
    const dataStart = off + 30 + nlen + elen;
    let data = null;
    if (method === 0) data = buf.subarray(dataStart, dataStart + usize);
    else if (method === 8) {
      try { data = zlib.inflateRawSync(buf.subarray(dataStart, dataStart + csize)); }
      catch (e) { data = Buffer.alloc(0); }
    }
    entries.push({ name, data });
    off = dataStart + csize;
  }
  return entries;
}

/** Validasi struktur .docx. Kembalikan { ok, problems[], summary }. */
function checkDocx(buf) {
  const problems = [];
  if (!sameMagic(buf, OOXML.PK))
    return { ok: false, problems: ["bukan arsip ZIP (tanda PK\\x03\\x04 tak ditemukan)"], summary: { kind: "docx", paragraphs: 0, runs: 0 } };

  let entries;
  try { entries = zipEntries(buf); }
  catch (e) { return { ok: false, problems: ["gagal membaca arsip ZIP: " + e.message], summary: null }; }

  if (entries.length === 0)
    return { ok: false, problems: ["arsip ZIP kosong / tanpa entri"], summary: null };

  const names = entries.map((e) => e.name);
  const required = ["[Content_Types].xml", "word/document.xml"];
  const missingReq = required.filter((r) => !names.some((n) => n === r || n.endsWith("/" + r)));
  if (missingReq.length)
    problems.push("entri wajib OOXML hilang: " + missingReq.join(", "));

  const doc = entries.find((e) => e.name === "word/document.xml" || e.name.endsWith("/word/document.xml"));
  if (!doc) {
    return { ok: false, problems: problems.length ? problems : ["word/document.xml tidak ditemukan"], summary: { kind: "docx", paragraphs: 0, runs: 0 } };
  }

  const xml = doc.data.toString("utf8");
  let wellFormed = true;
  let wfProblem = "";
  try { validateXml(xml); }
  catch (e) { wellFormed = false; wfProblem = e.message; }
  if (!wellFormed) {
    problems.push("word/document.xml bukan XML well-formed: " + wfProblem);
    return { ok: false, problems, summary: { kind: "docx", paragraphs: 0, runs: 0 } };
  }

  const countTag = (t) => { const m = xml.match(new RegExp("<" + t + "[\\s>]", "g")); return m ? m.length : 0; };
  const paragraphs = countTag("w:p");
  const runs = countTag("w:r");
  const texts = countTag("w:t");

  if (!/<w:document\b/.test(xml)) problems.push("elemen akar <w:document> tidak ditemukan");
  if (paragraphs === 0) problems.push("tidak ada paragraf <w:p> (dokumen kosong)");
  if (texts === 0) problems.push("tidak ada teks <w:t> (dokumen tanpa isi)");

  return {
    ok: problems.length === 0,
    problems,
    summary: { kind: "docx", paragraphs, runs, texts },
  };
}

/** Validasi struktur .doc (CFB/OLE). Kembalikan { ok, problems[] }. */
function checkDoc(buf) {
  if (!sameMagic(buf, CFB))
    return { ok: false, problems: ["bukan Compound File Binary (header DOC tak cocok)"], summary: { kind: "doc" } };
  return { ok: true, problems: [], summary: { kind: "doc" } };
}

/** Validasi dokumen Word dari buffer, pilah berdasarkan signature. */
function checkWord(buf) {
  if (sameMagic(buf, OOXML.PK)) return checkDocx(buf);
  if (sameMagic(buf, CFB)) return checkDoc(buf);
  return { ok: false, problems: ["tabel format Word tak dikenal (bukan .docx/.doc)"], summary: null };
}

// --- XML well-formedness minimal (buka/tutup tag seimbang) tanpa dependensi ----
function validateXml(xml) {
  const stack = [];
  const re = /<(\/?)([A-Za-z0-9_:]+)((?:"[^"]*"|'[^']*'|[^>"'])*?)(\/?)>/g;
  let m;
  while ((m = re.exec(xml)) !== null) {
    const close = m[1] === "/";
    const name = m[2];
    const selfClose = m[4] === "/";
    if (close) {
      const top = stack.pop();
      if (top !== name) throw new Error("tag penutup </" + name + "> tak cocok dgn <" + top + ">");
    } else if (!selfClose) {
      stack.push(name);
    }
  }
  if (stack.length) throw new Error("tag terbuka tanpa penutup: <" + stack[stack.length - 1] + ">");
}

module.exports = { checkDocx, checkDoc, checkWord, zipEntries };
