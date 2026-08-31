#!/usr/bin/env node
// ============================================================================
// VERIFY — CLI arsitektur verifikasi terpadu (tanpa dependensi).
//
// Menggantikan check-consistency.js + validate-skill-tree.js dengan framework
// modular yang mencakup tiga dimensi verifikasi:
//   1. KONSISTENSI ARTEFAK (work/output)      -> checks/artifact.js
//   2. KUALITAS KATA (word quality)            -> checks/word-quality.js
//   3. STRUKTUR DOKUMEN WORD (.docx/.doc)      -> docx.js
// plus validasi skema (katalog/packs/index)    -> checks/schema-artifacts.js
// dan pohon skill kemampuan                    -> checks/skill-tree.js
//
// Penggunaan:
//   node tools/verify.js                      # jalankan seluruh suite
//   node tools/verify.js --report out.json    # + tulis laporan JSON terstruktur
//   node tools/verify.js --suite <nama>       # hanya suite tertentu
//   node tools/verify.js --docx <file>        # verifikasi satu dokumen Word
// ============================================================================
const path = require("path");
const fs = require("fs");
const { printReport } = require("./verify/harness.js");
const { checkWord } = require("./verify/docx.js");

const ROOT = path.resolve(__dirname, "..");
const SUITES = {
  artifact: () => require("./verify/checks/artifact.js")(),
  schema: () => require("./verify/checks/schema-artifacts.js")(),
  tree: () => require("./verify/checks/skill-tree.js")(),
  word: () => require("./verify/checks/word-quality.js")(),
};

function usage() {
  console.log(`Penggunaan: node tools/verify.js [opsi]

  (tanpa argumen)   menjalankan seluruh suite verifikasi
  --report <path>   tulis laporan JSON terstruktur ke <path>
  --suite <nama>    hanya jalankan suite: ${Object.keys(SUITES).join(" | ")}
  --docx <file>     verifikasi struktur satu dokumen Word (.docx/.doc)
  --docx-dir <dir>  pindai <dir> (bawaan: docs/) & verifikasi semua .docx/.doc;
                    lulus bila tidak ada dokumen (dir kosong/tiada)
  --help            tampilkan bantuan ini`);
}

function walk(dir, acc = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, acc);
    else acc.push(p);
  }
  return acc;
}

function docxDirCheck(dir) {
  const d = path.resolve(ROOT, dir);
  let files = [];
  if (fs.existsSync(d)) files = walk(d).filter((f) => /\.(docx|doc)$/i.test(f));
  const results = files.map((f) => {
    const r = checkWord(fs.readFileSync(f));
    return { file: path.relative(ROOT, f), ok: r.ok, summary: r.summary, problems: r.problems };
  });
  return { scanned: files.length, results };
}

function main() {
  const args = process.argv.slice(2);
  const arg = (k) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : null; };

  if (args.includes("--help") || args.includes("-h")) return usage();

  // Verifikasi dokumen Word tunggal (--docx <file>)
  const docxFile = arg("--docx");
  if (docxFile) {
    const buf = fs.readFileSync(docxFile);
    const r = checkWord(buf);
    const label = path.basename(docxFile);
    if (r.summary) console.log(`📄 ${label}: ${r.summary.kind} — paragraf=${r.summary.paragraphs ?? "-"} run=${r.summary.runs ?? "-"} teks=${r.summary.texts ?? "-"}`);
    if (r.problems.length) { r.problems.forEach((p) => console.log("   ❌ " + p)); }
    else console.log("   ✅ struktur dokumen valid");
    process.exit(r.ok ? 0 : 1);
  }

  // Pilih suite (dukung daftar terpisah koma, mis. --suite schema,tree,word)
  const suiteName = arg("--suite");
  const sel = suiteName ? suiteName.split(",").map((s) => s.trim()).filter(Boolean) : Object.keys(SUITES);
  const unknown = sel.filter((n) => !SUITES[n]);
  if (unknown.length) { console.error("Suite tak dikenal: " + unknown.join(", ")); usage(); process.exit(2); }

  const toRun = sel.map((n) => ({ name: n, fn: SUITES[n] }));
  const docxDir = arg("--docx-dir") || (args.includes("--docx-dir") ? "docs" : null);

  (async () => {
    const results = [];
    for (const s of toRun) {
      const suite = await s.fn();
      results.push(suite.checks);
    }

    // Dimensi DOCX — pindai & verifikasi dokumen Word bila disediakan (lulus bila kosong)
    if (docxDir) {
      const dd = docxDirCheck(docxDir);
      const detail = [];
      for (const r of dd.results) {
        const base = `${r.file}: ${r.summary ? r.summary.kind + " (p=" + (r.summary.paragraphs ?? "-") + ", t=" + (r.summary.texts ?? "-") + ")" : "format tak dikenal"}`;
        if (r.ok) detail.push("OK  " + base);
        else { detail.push("FAIL " + base); r.problems.forEach((p) => detail.push("     " + p)); }
      }
      const docChecks = dd.scanned === 0
        ? [{ desc: "Direktori " + docxDir + " tanpa dokumen Word (dilewati)", ok: true }]
        : [{ desc: "Verifikasi struktur dokumen Word di " + docxDir, ok: dd.results.every((r) => r.ok), detail: detail }];
      results.push(docChecks);
      toRun.push({ name: "docx" });
    }

    const flat = results.flat();
    const s = { total: flat.length, passed: flat.filter((c) => c.ok).length, failed: flat.filter((c) => !c.ok).length };
    const report = {
      tool: "tools/verify.js",
      version: 3,
      generatedAt: new Date().toISOString(),
      suite: suiteName || "semua",
      summary: s,
      suites: toRun.map((grp, i) => ({
        id: grp.name,
        ok: results[i].every((c) => c.ok),
        checks: results[i].map((c) => ({ desc: c.desc, ok: c.ok, detail: c.detail || [] })),
      })),
    };

    const reportPath = arg("--report");
    if (reportPath) {
      fs.writeFileSync(reportPath, JSON.stringify(report, null, 2), "utf8");
      console.log("Laporan ditulis ke " + reportPath);
    }

    console.log(printReport({ summary: s, results: toRun.map((grp, i) => ({ name: grp.name, checks: results[i] })) }));
    process.exit(s.failed ? 1 : 0);
  })().catch((e) => { console.error(e); process.exit(1); });
}

main();
