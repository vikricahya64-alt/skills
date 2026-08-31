#!/usr/bin/env node
/*
 * Periksa sinkronisasi SELURUH sumber data kemampuan (arsitektur v3) agar tidak
 * melenceng (drift):
 *   1. Jumlah file SKILL.md di folder skills  <-> index.json          (jumlah skill)
 *   2. agen/capabilities3.js (4 PRIME + 39 COMBOS berevolusi)  <-> agen/packs.json (id)
 *   3. agen/packs.json  <-> Capabilities.kt di app Android (id)
 *   4. Metadata v3 (tier/family/runnable/recipe/outcomes) lengkap di packs.json
 *   5. Semua combo punya jalur eksekusi nyata (outputs.js RECIPES)
 *
 * Pemakaian:
 *   node tools/check-consistency.js
 * Keluar dengan kode 0 jika semua sumber konsisten, selain itu kode 1.
 */
const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const SKILLS_DIR = path.join(ROOT, "skills");
const INDEX_JSON = path.join(ROOT, "index.json");
const CAPABILITIES3_JS = path.join(ROOT, "agen", "capabilities3.js");
const PACKS_JSON = path.join(ROOT, "agen", "packs.json");
const OUTPUTS_JS = path.join(ROOT, "agen", "outputs.js");
const CAPABILITIES_KT = path.join(ROOT, "android", "app", "src", "main", "java", "com", "vikri", "gcpagent", "Capabilities.kt");

const errors = [];
const info = [];

function walkSkills(dir, acc = 0) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) acc = walkSkills(full, acc);
    else if (entry.name === "SKILL.md") acc += 1;
  }
  return acc;
}

function idsFromJs(src) {
  const ids = new Set();
  for (const m of src.matchAll(/id:\s*"([^"]+)"/g)) ids.add(m[1]);
  return ids;
}

function idsFromKotlin(src) {
  const ids = new Set();
  for (const m of src.matchAll(/Capability\(\s*"([^"]+)"/g)) ids.add(m[1]);
  return ids;
}

function compareSets(label, left, right) {
  const onlyLeft = [...left].filter((x) => !right.has(x)).sort();
  const onlyRight = [...right].filter((x) => !left.has(x)).sort();
  if (onlyLeft.length || onlyRight.length) {
    errors.push(`[${label}] himpunan id tidak sama.`,
      `  Hanya di kiri : ${onlyLeft.join(", ") || "(tidak ada)"}`,
      `  Hanya di kanan: ${onlyRight.join(", ") || "(tidak ada)"}`);
    return false;
  }
  info.push(`[${label}] ${left.size} id konsisten ✅`);
  return true;
}

// ---- 1. skills → index.json ----
const skillFiles = walkSkills(SKILLS_DIR);
const indexCount = JSON.parse(fs.readFileSync(INDEX_JSON, "utf8")).skills.length;

info.push(`[skills → index.json] Skills repo: ${skillFiles}, index.json: ${indexCount}`);
if (skillFiles !== indexCount) {
  errors.push(`[skills → index.json] Jumlah tidak sama: ${skillFiles} vs ${indexCount}`);
} else {
  info.push(`[skills → index.json] ${skillFiles} skill konsisten ✅`);
}

// ---- 2. packs.json: schema v3 + id + metadata ----
const packsData = JSON.parse(fs.readFileSync(PACKS_JSON, "utf8"));
const packs = Object.fromEntries(Object.entries(packsData).filter(([k]) => k !== "__schema"));
const packIds = new Set(Object.keys(packs));

if (packsData.__schema !== "v3") {
  errors.push(`[packs.json] skema bukan v3: ${packsData.__schema || "(tidak ada __schema)"} — regenarasi lewat boot server (REBUILD schema)`);
} else {
  info.push(`[packs.json] skema v3 ✅ (${packIds.size} kemampuan + __schema)`);
}

// ---- 3. capabilities3.js (otoritas v3) vs packs.json ----
const V3 = require(CAPABILITIES3_JS);
const caps3Ids = new Set(V3.CAPS3.map((c) => c.id));
compareSets("capabilities3.js → packs.json", caps3Ids, packIds);

// Validasi family merujuk PRIME yang ada & metadata lengkap di keduanya.
const primeIds = new Set(V3.PRIMES3.map((p) => p.id));
const metadataFields = ["tier", "family", "runnable", "recipe", "outcomes"];
const capById = new Map(V3.CAPS3.map((c) => [c.id, c]));
let metaBad = 0;
for (const [id, cap] of capById) {
  if (cap.family && !primeIds.has(cap.family)) {
    errors.push(`[capabilities3.js] family ${cap.family} (untuk ${id}) tidak merujuk PRIME yang ada`);
    metaBad += 1;
  }
  const pk = packs[id];
  if (!pk) continue;
  for (const f of metadataFields) {
    if (!(f in pk)) {
      errors.push(`[packs.json] ${id} kehilangan field v3: ${f}`);
      metaBad += 1;
    }
  }
  if ((cap.family || null) !== (pk.family || null) || cap.tier !== pk.tier || !!cap.runnable !== !!pk.runnable) {
    errors.push(`[packs.json vs capabilities3.js] metadata ${id} tidak sinkron (tier/family/runnable)`);
    metaBad += 1;
  }
  if ((pk.outcomes || []).length < 1) {
    errors.push(`[packs.json] ${id} outcomes kosong`);
    metaBad += 1;
  }
}
if (!metaBad) info.push("[v3] metadata tier/family/runnable/recipe/outcomes lengkap & konsisten ✅");

// ---- 4. jalur eksekusi nyata (outputs.js RECIPES) mencakup semua combo ----
const outputsSrc = fs.readFileSync(OUTPUTS_JS, "utf8");
const recipeIds = new Set([...outputsSrc.matchAll(/"combo-[^"]+":\s*(\w+)/g)].map((m) => m[0].split('"')[1]));
const combosWoRecipe = V3.COMBOS3.filter((c) => !recipeIds.has(c.id)).map((c) => c.id);
if (combosWoRecipe.length) {
  errors.push(`[outputs.js] combo tanpa recipe eksekusi nyata: ${combosWoRecipe.join(", ")}`);
} else {
  info.push(`[outputs.js] ${recipeIds.size} combo punya jalur eksekusi nyata (RECIPES) ✅`);
}

// ---- 5. packs.json (id) → Capabilities.kt (Android) ----
const ktSrc = fs.readFileSync(CAPABILITIES_KT, "utf8");
compareSets("packs.json → Capabilities.kt", packIds, idsFromKotlin(ktSrc));

console.log([...info, ...errors, errors.length ? `TOTAL GAGAL: ${errors.length} ketidaksesuaian` : "SEMUA SUMBER KONSISTEN ✅"].join("\n"));
process.exit(errors.length ? 1 : 0);