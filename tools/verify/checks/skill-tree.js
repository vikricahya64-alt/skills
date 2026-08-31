// ============================================================================
// CHECK: POHON SKILL KEMAMPUAN (WORK) — pengganti validate-skill-tree.js.
//
// Memvalidasi bahwa pohon capabilities/<layer>/<id>/SKILL.md:
//   1. Lengkap (jumlah == katalog).
//   2. Frontmatter baku developer internasional (name, metadata.version,
//      metadata.category, description) dapat di-parse untuk semua kemampuan.
//   3. Body memuat metrik kunci (tier/family/recipe) yang cocok dgn katalog.
//   4. capabilities/index.json konsisten dengan katalog (entrypoint, family,
//      layer, tier, tanpa duplikasi id).
// ============================================================================
const fs = require("fs");
const path = require("path");
const { parseSkill } = require("../yaml.js");

const ROOT = path.resolve(__dirname, "..", "..", "..");
const TREE = path.join(ROOT, "capabilities");
const INDEX = path.join(ROOT, "capabilities", "index.json");
const CAT = require(path.join(ROOT, "agen", "capability-catalog.js"));

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

module.exports = async function skillTreeCheck() {
  const checks = [];

  // 1. kelengkapan jumlah
  const expected = CAT.CATALOG.length;
  const actual = countMd(TREE);
  checks.push({
    desc: "jumlah SKILL.md sesuai katalog (" + expected + " kemampuan)",
    ok: actual === expected,
    detail: actual === expected ? null : ["harap " + expected + ", ada " + actual],
  });

  // 2 & 3. per katalog: frontmatter + body
  {
    const bad = [];
    for (const c of CAT.CATALOG) {
      const rel = path.join("capabilities", c.layer, c.id, "SKILL.md");
      const file = path.join(ROOT, rel);
      if (!fs.existsSync(file)) { bad.push("MISSING " + rel); continue; }
      const { text, frontmatter } = parseSkill(file);
      if (!frontmatter) { bad.push("tanpa frontmatter " + rel); continue; }
      if (frontmatter.name !== c.id) bad.push("name mismatch " + rel + " (harap " + c.id + ")");
      if (!frontmatter.version) bad.push("metadata.version hilang " + rel);
      if (!frontmatter.category) bad.push("metadata.category hilang " + rel);
      if (!frontmatter.description || frontmatter.description.trim().length < 20)
        bad.push("description hilang/pendek " + rel);
      const bodyText = (text.match(/^---\n[\s\S]*?\n(?:---|\.\.\.)\n([\s\S]*)$/) || [])[1] || text;
      if (!bodyText.includes(c.name)) bad.push("body tanpa nama " + c.id + " (" + c.name + ")");
      if (!bodyText.includes("| **Tier** | " + c.tier)) bad.push("body tier tak cocok " + c.id);
      if (!bodyText.includes("| **Family** | " + (c.family || "-"))) bad.push("body family tak cocok " + c.id);
      if (!bodyText.includes("| **Recipe** | " + (c.recipe || "-"))) bad.push("body recipe tak cocok " + c.id);
    }
    checks.push({
      desc: "frontmatter baku & body kunci semua " + expected + " kemampuan",
      ok: bad.length === 0,
      detail: bad.slice(0, 20),
    });
  }

  // 4. index.json konsisten
  {
    const bad = [];
    if (!fs.existsSync(INDEX)) {
      bad.push("MISSING capabilities/index.json");
    } else {
      const idx = JSON.parse(fs.readFileSync(INDEX, "utf8"));
      if (!Array.isArray(idx.skills) || idx.skills.length !== expected) bad.push("panjang skills index=" + (idx.skills ? idx.skills.length : "n/a") + " harap " + expected);
      else {
        const seen = new Set();
        for (const s of idx.skills) {
          const id = (s.entrypoint || "").split("/").slice(-2, -1)[0];
          if (!id || seen.has(id)) { bad.push("id kosong/duplikat di index"); continue; }
          seen.add(id);
          const cap = CAT.byId(id);
          if (!cap) { bad.push("entrypoint id tak dikenal: " + id); continue; }
          if ((s.family || null) !== (cap.family || null)) bad.push("index.family mismatch " + id);
          if (s.layer !== cap.layer) bad.push("index.layer mismatch " + id);
          if (s.tier !== cap.tier) bad.push("index.tier mismatch " + id);
          if (!s.entrypoint.endsWith("capabilities/" + cap.layer + "/" + id + "/SKILL.md")) bad.push("entrypoint salah " + id);
        }
      }
    }
    checks.push({ desc: "capabilities/index.json konsisten dgn katalog", ok: bad.length === 0, detail: bad.slice(0, 15) });
  }

  return { name: "Pohon skill kemampuan (SKILL.md + index)", checks, ok: checks.every((c) => c.ok) };
};
