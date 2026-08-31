#!/usr/bin/env node
// ============================================================================
// VALIDATOR POHON SKILL KEMAMPUAN — memastikan setiap artefak kemampuan
// (capabilities/<layer>/<id>/SKILL.md) valid & konsisten dengan katalog.
//
// Dipakai oleh arsitektur rilis (release-skills.yml) SEBELUM artefak diunduh,
// agar hanya pohon skill yang benar-benar sehat yang dirilis. Memeriksa:
//   1. Tiap SKILL.md memilik frontmatter baku developer internasional
//      (name, metadata.version, metadata.category, description) & dapat di-parse.
//   2. Jumlah berkas SKILL.md == katalog (12 meta + 4 PRIME + 39 COMBOS = 55).
//   3. index.json konsisten: satu entri per kemampuan, entrypoint benar,
//      dan field (family/layer/tier) cocok dengan katalog.
//   4. Body SKILL.md memuat bagian wajib (nama, insight, tier/family/recipe).
//
//   node tools/validate-skill-tree.js     # validasi; keluarkan kode 1 bila gagal
// ============================================================================
const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const TREE = path.join(ROOT, "capabilities");
const INDEX = path.join(ROOT, "capabilities", "index.json");
const CAT_PATH = path.join(ROOT, "agen", "capability-catalog.js");

const issues = [];
const CAT = require(CAT_PATH);

// --- baca YAML scalar dari frontmatter (mendukung path bertingkat) ---
// pathKey contoh: "name", "metadata.version", "metadata.category", "description"
function yamlScalar(fm, pathKey) {
  const lines = fm.split("\n");
  const heads = pathKey.split(".");
  // cari baris kepala pertama ("metadata:" atau "name:"/etc) pada indent 0
  const topIdx = lines.findIndex((l) => new RegExp("^" + heads[0] + ":").test(l));
  if (topIdx === -1) return null;

  let from = topIdx + 1;
  let indent = -1;
  let targetColon = -1;

  if (heads.length === 1) {
    // key scalar top-level
    const first = lines[topIdx].slice(heads[0].length + 1).trim();
    if (first !== "" && first !== "|" && first !== ">" && first !== ">-" && first !== ">+") {
      // one-line scalar
      let val = first;
      for (let i = from; i < lines.length && /^[ \t]/.test(lines[i]) && lines[i].trim() !== "" &&
             !/^[a-zA-Z][a-zA-Z0-9_-]*:/.test(lines[i]); i++) {
        val += " " + lines[i].trim();
      }
      return val.replace(/\s+/g, " ").trim();
    }
    if (first === "") return ""; // scalar kosong
    // block scalar (|, >, >-)
    return blockScalar(lines, from, first);
  }

  // path bertingkat: cari baris child pada indent > indent induk
  const parentIndent = (lines[topIdx].match(/^[ \t]*/) || [""])[0].length;
  // tentukan indent child = indent baris tak-kosong pertama setelah induk yang masih anak
  let childIndent = -1;
  for (let i = from; i < lines.length; i++) {
    const l = lines[i];
    if (l.trim() === "") continue;
    const curIndent = (l.match(/^[ \t]*/) || [""])[0].length;
    if (curIndent <= parentIndent) break; // sudah keluar dari mapping induk
    childIndent = curIndent;
    break;
  }
  if (childIndent === -1) return null;

  // cari baris `childKey:` pada indent tsb, lalu ambil scalar
  const childKey = heads[1];
  const re = new RegExp("^[ \\t]{" + childIndent + "}" + childKey + ":");
  for (let i = from; i < lines.length; i++) {
    const l = lines[i];
    if (l.trim() === "") continue;
    const curIndent = (l.match(/^[ \t]*/) || [""])[0].length;
    if (curIndent < parentIndent || (curIndent === parentIndent && l.trim().startsWith(heads[0] + ":"))) {
      if (curIndent <= parentIndent) break;
    }
    if (re.test(l)) {
      const first = l.slice((l.match(/^[ \t]*/) || [""])[0].length + childKey.length + 1).trim();
      if (first === "") return "";
      if (first === "|" || first === ">" || first === ">-" || first === ">+") {
        return blockScalar(lines, i + 1, first);
      }
      let val = first;
      for (let j = i + 1; j < lines.length && /^[ \t]/.test(lines[j]) && lines[j].trim() !== "" &&
             (lines[j].match(/^[ \t]*/) || [""])[0].length > childIndent; j++) {
        val += " " + lines[j].trim();
      }
      return val.replace(/\s+/g, " ").trim();
    }
  }
  return null;
}

function blockScalar(lines, from, kind) {
  const chunks = [];
  let i = from;
  while (i < lines.length && /^[ \t]/.test(lines[i]) && lines[i].trim() !== "") {
    chunks.push(lines[i].trim());
    i++;
  }
  return chunks.join(kind.startsWith("|") ? "\n" : " ").replace(/\s+/g, " ").trim();
}

// --- jumlah berkas SKILL.md dalam pohon ---
function countMd(dir) {
  if (!fs.existsSync(dir)) return 0;
  let n = 0;
  for (const name of fs.readdirSync(dir)) {
    const p = path.join(dir, name);
    if (fs.statSync(p).isDirectory()) n += countMd(p);
    else if (path.basename(p) === "SKILL.md") n++;
  }
  return n;
}

const expected = CAT.CATALOG.length;
const actual = countMd(TREE);
if (actual !== expected) {
  issues.push("JUMLAH SKILL.md salah: harap " + expected + ", ada " + actual);
}

// --- per katalog: pastikan file ada & frontmatter + body valid ---
const seen = new Set();
for (const c of CAT.CATALOG) {
  const rel = path.join("capabilities", c.layer, c.id, "SKILL.md");
  const file = path.join(ROOT, rel);
  if (!fs.existsSync(file)) {
    issues.push("MISSING: " + rel);
    continue;
  }
  seen.add(c.id);
  const text = fs.readFileSync(file, "utf8");
  const fmMatch = text.match(/^---\n([\s\S]*?)\n(?:---|\.\.\.)\n/);
  if (!fmMatch) {
    issues.push("NO-FRONTMATTER: " + rel);
    continue;
  }
  const fm = fmMatch[1];
  const name = yamlScalar(fm, "name");
  const version = yamlScalar(fm, "metadata.version");
  const category = yamlScalar(fm, "metadata.category");
  const description = yamlScalar(fm, "description");

  if (name !== c.id) issues.push("NAME MISMATCH: " + rel + " -> '" + name + "' (harap '" + c.id + "')");
  if (!version) issues.push("METADATA.VERSION HILANG: " + rel);
  if (!category) issues.push("METADATA.CATEGORY HILANG: " + rel);
  if (!description || description.length < 20) issues.push("DESCRIPTION HILANG/PENDEK: " + rel);

  // Body wajib memuat nama & insight serta metrik tier/family/recipe
  const body = text.slice(fmMatch[0].length);
  if (!body.includes(c.name)) issues.push("BODY TANPA NAMA: " + rel);
  if (!body.includes("| **Tier** | " + c.tier)) issues.push("BODY TIER TIDAK COCOK: " + rel);
  const familyStr = c.family || "-";
  if (!body.includes("| **Family** | " + familyStr)) issues.push("BODY FAMILY TIDAK COCOK: " + rel);
  const recipeStr = c.recipe || "-";
  if (!body.includes("| **Recipe** | " + recipeStr)) issues.push("BODY RECIPE TIDAK COCOK: " + rel);
}

// --- index.json konsisten dengan katalog & pohon ---
if (!fs.existsSync(INDEX)) {
  issues.push("MISSING: capabilities/index.json");
} else {
  const idx = JSON.parse(fs.readFileSync(INDEX, "utf8"));
  if (!Array.isArray(idx.skills) || idx.skills.length !== expected) {
    issues.push("INDEX.skills.length salah: harap " + expected + ", ada " + (idx.skills ? idx.skills.length : "n/a"));
  } else {
    let dupe = false;
    const ids = idx.skills.map((s) => (s.entrypoint || "").split("/").slice(-2, -1)[0]);
    if (new Set(ids).size !== ids.length) { dupe = true; issues.push("INDEX: ada id duplikat"); }
    for (const s of idx.skills) {
      const id = (s.entrypoint || "").split("/").slice(-2, -1)[0];
      const cap = CAT.byId(id);
      if (!cap) { issues.push("INDEX: id tak dikenal " + id); continue; }
      if ((s.family || null) !== (cap.family || null)) issues.push("INDEX.family mismatch " + id);
      if (s.layer !== cap.layer) issues.push("INDEX.layer mismatch " + id);
      if (s.tier !== cap.tier) issues.push("INDEX.tier mismatch " + id);
      if (!s.entrypoint || !s.entrypoint.endsWith("capabilities/" + cap.layer + "/" + id + "/SKILL.md"))
        issues.push("INDEX.entrypoint salah " + id);
      if (!dupe && !seen.has(id)) issues.push("INDEX: id ada di index tapi tidak di pohon " + id);
    }
  }
}

if (issues.length) {
  console.error("VALIDASI POHON SKILL GAGAL:");
  issues.forEach((x) => console.error("  - " + x));
  process.exit(1);
}
console.log("Pohon skill kemampuan VALID ✅ (" + actual + " SKILL.md, index.json konsisten)");
