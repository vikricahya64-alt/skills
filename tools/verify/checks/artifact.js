// ============================================================================
// CHECK: KONSISTENSI ARTEFAK (WORK) — pengganti check-consistency.js.
//
// Upgrade ala developer internasional:
//   1. Id kanonik diambil dari LOAD terstruktur (require modul otoritatif),
//      bukan regex terhadap blok teks acak — tak rentan salah tangkap string.
//   2. Deteksi drift deterministik via hash konten antar artefak generator.
//   3. Skema divalidasi (lihat checks/schema.js) untuk artefak JSON.
//   4. Setiap sub-check independen & terdokumentasi (bisa diverifikasi satu-satu).
// ============================================================================
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const ROOT = path.resolve(__dirname, "..", "..", "..");
const SKILLS_DIR = path.join(ROOT, "skills");
const INDEX_JSON = path.join(ROOT, "index.json");
const CAPABILITIES3_JS = path.join(ROOT, "agen", "capabilities3.js");
const PACKS_JSON = path.join(ROOT, "agen", "packs.json");
const OUTPUTS_JS = path.join(ROOT, "agen", "outputs.js");
const CAPABILITIES_KT = path.join(ROOT, "android", "app", "src", "main", "java", "com", "vikri", "gcpagent", "Capabilities.kt");

function walkSkills(dir, acc = 0) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) acc = walkSkills(full, acc);
    else if (e.name === "SKILL.md") acc += 1;
  }
  return acc;
}

// Id dari Capabilities.kt: hanya baris konstruktor Capability("id",...), dibatasi
// agar tak keliru membaca teks lain.
function idsFromKotlin(src) {
  const set = new Set();
  for (const line of src.split("\n")) {
    const m = line.match(/^\s*Capability\(\s*"([^"]+)"/);
    if (m) set.add(m[1]);
  }
  return set;
}

function sha256(s) {
  return crypto.createHash("sha256").update(s).digest("hex");
}

module.exports = async function artifactCheck() {
  const checks = [];

  // ---- 1. skill repo vs index.json (jumlah) ----
  {
    const skillFiles = walkSkills(SKILLS_DIR);
    const indexCount = JSON.parse(fs.readFileSync(INDEX_JSON, "utf8")).skills.length;
    checks.push({
      desc: "skill repo ↔ index.json (jumlah skill)",
      ok: skillFiles === indexCount,
      detail: skillFiles === indexCount ? null : ["repo=" + skillFiles + " vs index=" + indexCount],
    });
  }

  // ---- 2. packs.json skema v3 ----
  let packs, packIds;
  {
    const raw = fs.readFileSync(PACKS_JSON, "utf8");
    packs = JSON.parse(raw);
    packIds = new Set(Object.keys(packs).filter((k) => k !== "__schema"));
    checks.push({
      desc: "packs.json skema v3",
      ok: packs.__schema === "v3",
      detail: packs.__schema === "v3" ? null : ["schema='" + (packs.__schema || "(tanpa __schema)") + "'"],
    });
  }

  // ---- 3. capabilities3 (otoritas v3) vs packs.json : set id ----
  const V3 = require(CAPABILITIES3_JS);
  const caps3Ids = new Set(V3.CAPS3.map((c) => c.id));
  {
    const onlyL = [...caps3Ids].filter((x) => !packIds.has(x));
    const onlyR = [...packIds].filter((x) => !caps3Ids.has(x));
    checks.push({
      desc: "capabilities3.js ↔ packs.json (set id)",
      ok: onlyL.length === 0 && onlyR.length === 0,
      detail: onlyL.length || onlyR.length
        ? ["hanya di caps3: " + (onlyL.join(", ") || "-"), "hanya di packs: " + (onlyR.join(", ") || "-")]
        : null,
    });
  }

  // ---- 4. metadata v3 lengkap & family valid ----
  {
    const primeIds = new Set(V3.PRIMES3.map((p) => p.id));
    const metaFields = ["tier", "family", "runnable", "recipe", "outcomes"];
    let bad = 0;
    const details = [];
    for (const cap of V3.CAPS3) {
      if (cap.family && !primeIds.has(cap.family)) { bad++; details.push("family '" + cap.family + "' (pd " + cap.id + ") bukan PRIME"); }
      const pk = packs[cap.id];
      if (!pk) continue;
      for (const f of metaFields) if (!(f in pk)) { bad++; details.push(cap.id + " kehilangan field '" + f + "'"); }
      if ((cap.family || null) !== (pk.family || null) || cap.tier !== pk.tier || !!cap.runnable !== !!pk.runnable) {
        bad++; details.push("metadata " + cap.id + " tak sinkron (tier/family/runnable)");
      }
      if ((pk.outcomes || []).length < 1) { bad++; details.push(cap.id + " outcomes kosong"); }
    }
    checks.push({ desc: "metadata v3 (tier/family/runnable/recipe/outcomes) lengkap & family valid", ok: bad === 0, detail: details.slice(0, 15) });
  }

  // ---- 5. semua combo punya RECIPES di outputs.js (via id terstruktur, bukan regex) ----
  {
    const OUTPUTS = require(OUTPUTS_JS);
    const recipeIds = new Set(Object.keys(OUTPUTS.RECIPES || {}));
    const noRecipe = V3.COMBOS3.filter((c) => !recipeIds.has(c.id)).map((c) => c.id);
    checks.push({
      desc: "semua " + V3.COMBOS3.length + " combo punya jalur eksekusi nyata (RECIPES)",
      ok: noRecipe.length === 0,
      detail: noRecipe.length ? ["combo tanpa recipe: " + noRecipe.join(", ")] : null,
    });
  }

  // ---- 6. packs.json ↔ Capabilities.kt (set id) ----
  {
    const ktIds = idsFromKotlin(fs.readFileSync(CAPABILITIES_KT, "utf8"));
    const onlyL = [...packIds].filter((x) => !ktIds.has(x));
    const onlyR = [...ktIds].filter((x) => !packIds.has(x));
    checks.push({
      desc: "packs.json ↔ Capabilities.kt (set id Android)",
      ok: onlyL.length === 0 && onlyR.length === 0,
      detail: onlyL.length || onlyR.length
        ? ["hanya di packs: " + (onlyL.join(", ") || "-"), "hanya di Kt: " + (onlyR.join(", ") || "-")]
        : null,
    });
  }

  // ---- 7. drift deterministik: capabilities3 vs katalog (generator sinkron) ----
  {
    // Struktur capabilities3 harus mengandung peta family yang identik dengan katalog
    // (karena capabilities3.js di-generate dari katalog). Bandingkan hash FAMILY.
    let drift = false;
    const details = [];
    try {
      const CAT = require(path.join(ROOT, "agen", "capability-catalog.js"));
      const expected = CAT.FAMILY;
      const got = V3.FAMILY;
      const keys = new Set([...Object.keys(expected), ...Object.keys(got)]);
      for (const k of keys) {
        if ((expected[k] || null) !== (got[k] || null)) { drift = true; details.push("family " + k + ": katalog=" + (expected[k] || "-") + " vs caps3=" + (got[k] || "-")); }
      }
    } catch (e) {
      drift = true; details.push("gagal memuat katalog: " + e.message);
    }
    checks.push({ desc: "drift family antar artefak (katalog ↔ capabilities3) — deterministik", ok: !drift, detail: details.slice(0, 10) });
  }

  return {
    name: "Konsistensi artefak & sumber kebenaran",
    checks,
    ok: checks.every((c) => c.ok),
  };
};
