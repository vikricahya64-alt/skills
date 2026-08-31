#!/usr/bin/env node
// ============================================================================
// GENERATOR KEMAMPUAN — SATU arsitektur generator untuk SEMUA kemampuan.
//
// Mengikuti pola developer internasional: definisi terpusat -> codegen -> verify.
// Membaca SATU sumber kebenaran (agen/capability-catalog.js) dan meng-generate
// semua artefak turunan secara DETERMINISTIK:
//   1. agen/capabilities3.js        — lapisan v3 (enrichment + FAMILY)
//   2. android/.../Capabilities.kt  — daftar kemampuan app Android
//   3. agen/catalog.json            — manifest machine-readable (55 kemampuan)
//   4. blok "# Fusion Kemampuan" di README.md — tabel keluarga & ringkasan
//
// Pemakaian:
//   node tools/generate-capabilities.js              # tulis semua artefak
//   node tools/generate-capabilities.js --check      # verifikasi sinkron (tanpa tulis)
// Keluar kode 0 jika deterministik/sinkron, selain itu kode 1.
// ============================================================================
const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const CAT_PATH = path.join(ROOT, "agen", "capability-catalog.js");
const CAP3_PATH = path.join(ROOT, "agen", "capabilities3.js");
const KT_PATH = path.join(ROOT, "android", "app", "src", "main", "java", "com", "vikri", "gcpagent", "Capabilities.kt");
const MANIFEST_PATH = path.join(ROOT, "agen", "catalog.json");
const README_PATH = path.join(ROOT, "README.md");

const CHECK = process.argv.includes("--check");
const CAT = require(CAT_PATH);

const issues = [];

function cmp(a, b) {
  return a.replace(/\r\n/g, "\n") === b.replace(/\r\n/g, "\n");
}

// ---------------------------------------------------------------------------
// 1. generate capabilities3.js (lapisan v3) dari katalog
// ---------------------------------------------------------------------------
function genCapabilities3() {
  const famLines = Object.entries(CAT.FAMILY).map(([id, fam]) =>
    "  \"" + id + "\": \"" + fam + "\","
  );
  const body = `// GENERATED FILE — jangan edit manual. Produk dari tools/generate-capabilities.js
// (sumber kebenaran: agen/capability-catalog.js).
// ARSITEKTUR KEMAMPUAN v3 — "Evolusi Terpadu": 4 PRIME + 39 COMBOS dalam satu
// model terpadu yang kaya & dapat dieksekusi nyata. Metadata (family/tier/
// recipe/commands/outcomes) digenerate konsisten dari katalog.

const EVO = require("./capabilities2.js");
const RUN = require("./run.js");
const OUTPUTS = require("./outputs.js");

// Peta 39 combo -> PRIME payung (dari katalog; tunggal & terverifikasi).
const FAMILY = {
${famLines.join("\n")}
};

function enrichCombo(c) {
  const recipeName = OUTPUTS.RECIPES[c.id]?.name || null;
  return {
    ...c,
    tier: recipeName ? "ADVANCED-CAP" : "CORE-CAP",
    family: FAMILY[c.id] || null,
    commands: RUN.COMBO_COMMANDS[c.id] || [],
    runnable: !!recipeName,
    recipe: recipeName,
    outcomes: [
      c.insight,
      recipeName
        ? "Terbukti dapat dieksekusi nyata: membangun artefak konkret via alur \`" + recipeName + "\` di agen."
        : "Belum ada jalur eksekusi nyata — gunakan sebagai acuan pengetahuan.",
    ],
  };
}

function enrichPrime(p) {
  return {
    ...p,
    tier: "EVOLUTION",
    family: null,
    commands: [],
    runnable: false,
    recipe: null,
    outcomes: [
      p.insight,
      "Payung evolusi untuk " + (p.domains || []).length + " domain meta-kemampuan: " + (p.domains || []).join(", ") + ".",
    ],
  };
}

const PRIMES3 = EVO.PRIMES.map(enrichPrime);
const COMBOS3 = EVO.COMBOS.map(enrichCombo);
const CAPS3 = PRIMES3.concat(COMBOS3);

function byId(id) {
  return CAPS3.find((x) => x.id === id) || null;
}

module.exports = { FAMILY, PRIMES3, COMBOS3, CAPS3, byId };
`;
  return body;
}

// ---------------------------------------------------------------------------
// 2. generate Capabilities.kt (Android) dari katalog
// ---------------------------------------------------------------------------
function esc(s) {
  return s.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}
function genCapabilitiesKt() {
  const cat = CAT.PRIMES.concat(CAT.COMBOS);
  const groups = CAT.GROUP_ORDER.filter((g) => CAT.groups()[g] && CAT.groups()[g].length);
  const groupList = groups.map((g) => '"' + esc(g) + '"').join(", ");
  const lines = cat.map((c) => {
    const tierArg = c.tier === "EVOLUTION" ? ", tier = \"EVOLUTION\"" : "";
    return "        Capability(\"" + esc(c.id) + "\", \"" + esc(c.name) + "\", \"" + esc(c.emoji) + "\", \"" + esc(c.insight) + "\", \"" + esc(c.group) + "\"" + tierArg + "),";
  });
  return `// GENERATED FILE — jangan edit manual. Produk dari tools/generate-capabilities.js
// (sumber kebenaran: agen/capability-catalog.js).` + `
package com.vikri.gcpagent

data class Capability(
    val id: String,
    val name: String,
    val emoji: String,
    val insight: String,
    val group: String,
    val tier: String = "CAP",
    val family: String? = null
)

object CapabilityCatalog {
    val groups = listOf(
        ${groupList}
    )

    val all = listOf(
${lines.join("\n")}
    )

    fun byGroup(g: String): List<Capability> = all.filter { it.group == g }
}
`;
}

// ---------------------------------------------------------------------------
// 3. generate catalog.json (manifest machine-readable)
// ---------------------------------------------------------------------------
function genManifest() {
  return JSON.stringify({
    generator: "tools/generate-capabilities.js",
    source: "agen/capability-catalog.js",
    schema: "capability-catalog-v1",
    generatedAt: new Date().toISOString(),
    counts: { meta: CAT.METAS.length, prime: CAT.PRIMES.length, combo: CAT.COMBOS.length, total: CAT.CATALOG.length },
    families: Object.entries(CAT.FAMILY).reduce((acc, [id, f]) => {
      acc[f] = (acc[f] || 0) + 1;
      return acc;
    }, {}),
    capabilities: CAT.CATALOG.map((c) => ({
      layer: c.layer, id: c.id, name: c.name, emoji: c.emoji,
      group: c.group, tier: c.tier, family: c.family || null,
      recipe: c.recipe, runnable: c.runnable,
      version: c.version, category: c.category, tags: c.tags,
      commands: (c.commands || []).length,
      skills: (c.skills || []).length,
    })),
  }, null, 2);
}

// ---------------------------------------------------------------------------
// 4. generate blok README "# Fusion Kemampuan"
// ---------------------------------------------------------------------------
function genReadmeSection() {
  const famNames = {
    "prime-cloud-platform": "Cloud & Infra",
    "prime-data-ai": "Data & AI",
    "prime-software-product": "Software & Product",
    "prime-secobs-agentics": "Security/Obs/Agentic",
  };
  const byFam = {};
  for (const c of CAT.COMBOS) (byFam[c.family] = byFam[c.family] || []).push(c);
  const famTable = Object.keys(byFam).map((f) => {
    const names = byFam[f].map((c) => c.name).join(", ");
    return "| `" + f + "` (" + (famNames[f] || f) + ") | " + names + " | " + byFam[f].length + " |";
  }).join("\n");

  const primeList = CAT.PRIMES.map((p) => "`" + p.id + "` **" + p.name + "** (" + CAT.COMBOS.filter((c) => c.family === p.id).length + " combo)").join("; ");

  return `## Fusion Kemampuan (Arsitektur v3 + Generator)

> Dihasilkan otomatis oleh \`tools/generate-capabilities.js\` dari satu sumber
> kebenaran \`agen/capability-catalog.js\`. Jangan edit blok ini manual — ubah
> katalog lalu jalankan generator (lihat "Generator Kemampuan" di bawah).

Seluruh **1.042 skill** di-*fusion* menjadi **12 kemampuan tingkat tinggi** (meta-skill) via \`agen/capabilities.js\`:
Cloud Full-Stack, Data Engineering, Database Ops, Security & Threat Hunting, Full-Stack App Builder,
ML/AI Engineering, SRE & Observability, Developer Excellence, Cloud Data+Security, Agentic AI Orchestration,
Web3, dan Mobile App. Saat bertanya, agen otomatis memilih kemampuan yang relevan dan menyatukannya dalam jawaban
(endpoint \`/api/capabilities\`).

Dari 12 meta-skill itu, **arsitektur v3** mensintesis **4 PRIME** (umbrella domain evolusi) dan **39 COMBOS**
(kemampuan kombinasi operasional nyata) — total **43 kemampuan**. Setiap kemampuan memakai *rich model* terpadu:
\`tier\` (EVOLUTION untuk PRIME, ADVANCED-CAP untuk COMBOS), \`family\` (prime umbrella), \`commands\`,
\`runnable\`, \`recipe\`, dan \`outcomes\`. Semua 39 COMBOS bersifat *runnable* (jalur eksekusi nyata di \`agen/outputs.js\`).
Inilah yang ditampilkan di app Android dan disajikan agen lewat \`/api/evolution\` / \`/api/fusion\`.

**PRIME (payung):** ${primeList}.

**Peta family (COMBOS → PRIME umbrella):**

| Family (PRIME) | Combo di dalamnya | Jumlah |
|---|---|---|
${famTable}

Total **1.042 skill** terindeks otomatis di \`index.json\` dan dimuat agen saat runtime. Sinkronisasi
empat sumber (skills ↔ index ↔ packs ↔ \`Capabilities.kt\`) dijaga otomatis lewat
\`tools/check-consistency.js\` di pipeline CI, dan seluruh artefak kemampuan ditopang satu generator:
\`tools/generate-capabilities.js\`.
`;
}

// ---------------------------------------------------------------------------
// write/compare
// ---------------------------------------------------------------------------
function writeIfChanged(p, content) {
  if (fs.existsSync(p) && cmp(fs.readFileSync(p, "utf8"), content)) return;
  if (CHECK) { issues.push("GENERATED-OF-DATE: " + path.relative(ROOT, p)); return; }
  fs.writeFileSync(p, content);
  console.log("  ditulis: " + path.relative(ROOT, p));
}

console.log(CHECK ? "[generate-capabilities] --check (verifikasi sinkron)" : "[generate-capabilities] generate semua artefak dari katalog");
const targets = [
  [CAP3_PATH, genCapabilities3()],
  [KT_PATH, genCapabilitiesKt()],
];
for (const [p, content] of targets) writeIfChanged(p, content);
if (!CHECK) {
  fs.writeFileSync(MANIFEST_PATH, genManifest());
  console.log("  ditulis: " + path.relative(ROOT, MANIFEST_PATH));
}

// README: ganti hanya blok "# Fusion Kemampuan" (sampai "# " berikut atau EOF)
{
  const rm = fs.existsSync(README_PATH) ? fs.readFileSync(README_PATH, "utf8") : "";
  const section = genReadmeSection();
  const start = rm.indexOf("## Fusion Kemampuan");
  const next = rm.indexOf("\n## ", start + 2);
  const end = next === -1 ? rm.length : next;
  const newRm = start === -1
    ? (rm.endsWith("\n") ? rm : rm + "\n") + section + "\n"
    : rm.slice(0, start) + section + rm.slice(end);
  writeIfChanged(README_PATH, newRm);
}

if (CHECK && issues.length) {
  console.error("GAGAL: artefak tidak sinkron dengan katalog. Jalankan 'node tools/generate-capabilities.js' lalu commit.\n  - " + issues.join("\n  - "));
  process.exit(1);
}
if (CHECK) console.log("SEMUA ARTEFAK SINKRON DENGAN KATALOG ✅");
