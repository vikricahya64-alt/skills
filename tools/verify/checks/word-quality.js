// ============================================================================
// CHECK: KUALITAS KATA (WORD) — pengujian kualitas deskripsi SKILL.md.
//
// Mengevaluasi deskripsi setiap kemampuan (frontmatter `description:` ala Google)
// terhadap tolok ukur penulisan developer internasional yang TERUKUR & dapat
// diliarapkan pada struktur nyata repo:
//   1. Panjang deskripsi — informatify utk pemetaan skill.
//   2. Bebas kata/isi pengisi (deteksi token berbasis word-boundary, bukan substring
//      — supaya kata umum seperti "metodologi" tak jadi false positive).
//   3. Konsistensi bahasa (tanpa campuran script Latin+CJK).
//   4. Kategori metadata selalu terisi.
//   5. Bingkai tier (framing) — deskripsi menutup dgn penanda arsitektur v3
//      (deteksi deskripsi terpotong/malformed).
//   6. Pemicu penggunaan (trigger) utk kemampuan operasional (combo) — memuat
//      penanda runnable "dapat dijalankan" agar pengguna tahu kapan memakai.
// ============================================================================
const fs = require("fs");
const path = require("path");
const { parseSkill } = require("../yaml.js");

const ROOT = path.resolve(__dirname, "..", "..", "..");
const TREE = path.join(ROOT, "capabilities");

const BANNED_WORD_RE = /\b(TODO|TBD|FIXME|XXX|placeholder|dummy|contoh isi|isi di sini)\b/i;
const FRAMING_RE = /dari arsitektur kemampuan v3/;
const RUNNABLE_TRIGGER_RE = /dapat dijalankan/;

function collectSkills(dir) {
  const out = [];
  for (const name of fs.readdirSync(dir)) {
    const p = path.join(dir, name);
    if (fs.statSync(p).isDirectory()) out.push(...collectSkills(p));
    else if (path.basename(p) === "SKILL.md") out.push(p);
  }
  return out;
}

function isCombo(file) {
  return file.includes(path.sep + "combo" + path.sep);
}

module.exports = async function wordQualityCheck() {
  const checks = [];
  const files = collectSkills(TREE);
  const combos = files.filter(isCombo);

  // 1. panjang deskripsi minimal
  {
    const tooShort = [];
    for (const f of files) {
      const { frontmatter } = parseSkill(f);
      if (frontmatter && frontmatter.description && frontmatter.description.trim().length < 60)
        tooShort.push(path.relative(ROOT, f) + " (" + frontmatter.description.trim().length + " kar)");
    }
    checks.push({ desc: "panjang deskripsi mencukupi (≥60 karakter) utk " + files.length + " skill", ok: tooShort.length === 0, detail: tooShort.slice(0, 15) });
  }

  // 2. bebas kata/isi pengisi (word-boundary)
  {
    const bad = [];
    for (const f of files) {
      const { frontmatter } = parseSkill(f);
      if (!frontmatter || !frontmatter.description) continue;
      const m = frontmatter.description.match(BANNED_WORD_RE);
      if (m) bad.push(path.relative(ROOT, f) + " → '" + m[0] + "'");
    }
    checks.push({ desc: "bebas kata/isi pengisi (filler/banned)", ok: bad.length === 0, detail: bad.slice(0, 15) });
  }

  // 3. konsistensi bahasa — tanpa campuran script Latin+CJK dalam deskripsi
  {
    const mixed = [];
    for (const f of files) {
      const { frontmatter } = parseSkill(f);
      if (!frontmatter || !frontmatter.description) continue;
      const hasCJK = /[\u4e00-\u9fff\u3040-\u30ff\uac00-\ud7af]/.test(frontmatter.description);
      const hasLatin = /[a-zA-Z]{3}/.test(frontmatter.description);
      if (hasCJK && hasLatin) mixed.push(path.relative(ROOT, f));
    }
    checks.push({ desc: "konsistensi bahasa (tanpa campuran Latin+CJK)", ok: mixed.length === 0, detail: mixed.slice(0, 15) });
  }

  // 4. kategori metadata selalu terisi
  {
    const bad = [];
    for (const f of files) {
      const { frontmatter } = parseSkill(f);
      if (frontmatter && (!frontmatter.category || frontmatter.category.trim() === ""))
        bad.push(path.relative(ROOT, f));
    }
    checks.push({ desc: "semua deskripsi punya metadata.category tak kosong", ok: bad.length === 0, detail: bad.slice(0, 15) });
  }

  // 5. bingkai tier (framing) — deskripsi utuh, tak terpotong
  {
    const bad = [];
    for (const f of files) {
      const { frontmatter } = parseSkill(f);
      if (!frontmatter || !frontmatter.description) continue;
      if (!FRAMING_RE.test(frontmatter.description))
        bad.push(path.relative(ROOT, f));
    }
    checks.push({ desc: "deskripsi utuh — memuat bingkai 'dari arsitektur kemampuan v3'", ok: bad.length === 0, detail: bad.slice(0, 15) });
  }

  // 6. pemicu penggunaan utk kemampuan operasional (combo)
  {
    const bad = [];
    for (const f of combos) {
      const { frontmatter } = parseSkill(f);
      if (!frontmatter || !frontmatter.description) continue;
      if (!RUNNABLE_TRIGGER_RE.test(frontmatter.description))
        bad.push(path.relative(ROOT, f));
    }
    checks.push({ desc: combos.length + " combo memuat pemicu 'dapat dijalankan' (kapan memakai)", ok: bad.length === 0, detail: bad.slice(0, 15) });
  }

  return {
    name: "Kualitas kata (word quality) deskripsi SKILL.md",
    checks,
    ok: checks.every((c) => c.ok),
  };
};
