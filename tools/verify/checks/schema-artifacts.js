// ============================================================================
// CHECK: VALIDASI SKEMA (WORK) — memvalidasi artefak JSON terhadap skema kanonik
// menggunakan validator skema bawaan (tools/verify/schema.js).
//
// Skema mengodekan KONTRAK nyata artefak generator. Membedakan tegas:
//   - field wajib vs opsional
//   - tipe (string/boolean/array)
//   - enum (layer, tier)
//   - properti diizinkan (additionalProperties:false → tangkap typo)
//   - keterkaitan silang (combo ⟹ punya family+recipe+runnable:true; meta ⟹ kosong)
// ============================================================================
const fs = require("fs");
const path = require("path");
const schema = require("../schema.js");

const ROOT = path.resolve(__dirname, "..", "..", "..");
const CATALOG = path.join(ROOT, "agen", "catalog.json");
const PACKS = path.join(ROOT, "agen", "packs.json");
const INDEX = path.join(ROOT, "capabilities", "index.json");

const capSchema = {
  type: "object",
  required: ["layer", "id", "name", "group", "tier", "version", "category", "runnable", "emoji"],
  properties: {
    layer: { type: "string", enum: ["meta", "prime", "combo"] },
    id: { type: "string", pattern: "^[a-z]" },
    name: { type: "string" },
    group: { type: "string" },
    tier: { type: "string", enum: ["CORE-CAP", "EVOLUTION", "ADVANCED-CAP"] },
    family: { type: ["string", "null"] },
    recipe: { type: ["string", "null"] },
    runnable: { type: "boolean" },
    version: { type: "string" },
    category: { type: "string" },
    emoji: { type: "string" },
    tags: { type: "array", items: { type: "string" } },
    commands: { type: ["array", "number", "null"] },
    skills: { type: ["number", "array", "null"] },
  },
  additionalProperties: false,
};

module.exports = async function schemaCheck() {
  const checks = [];

  function catCheck() {
    const errors = [];
    let cat;
    try { cat = JSON.parse(fs.readFileSync(CATALOG, "utf8")); }
    catch (e) { return { valid: false, errors: ["gagal memuat: " + e.message] }; }
    if (!cat.capabilities || !Array.isArray(cat.capabilities)) errors.push("'capabilities' harus array");
    else {
      cat.capabilities.forEach((c, i) => { errors.push(...schema.validate(c, capSchema, "capabilities[" + i + "]")); });
    }
    if (cat.counts && typeof cat.counts.total === "number" && cat.counts.total !== cat.capabilities.length)
      errors.push("counts.total != panjang capabilities");
    return { valid: errors.length === 0, errors };
  }

  function packCheck() {
    const errors = [];
    let packs;
    try { packs = JSON.parse(fs.readFileSync(PACKS, "utf8")); }
    catch (e) { return { valid: false, errors: ["gagal memuat: " + e.message] }; }
    if (packs.__schema !== "v3") errors.push("__schema != 'v3'");
    const packSchema = {
      type: "object",
      required: ["name", "tier", "runnable", "outcomes", "emoji", "insight", "family", "recipe"],
      properties: {
        name: { type: "string" }, emoji: { type: "string" }, insight: { type: "string" },
        tier: { type: "string", enum: ["CORE-CAP", "EVOLUTION", "ADVANCED-CAP"] },
        family: { type: ["string", "null"] }, recipe: { type: ["string", "null"] },
        runnable: { type: "boolean" },
        outcomes: { type: "array", items: { type: "string" }, minItems: 1 },
        skillCount: { type: "number" },
        codes: { type: "array" },
        logic: {
          type: "array",
          items: { type: "object", required: ["name", "text"], properties: { name: { type: "string" }, text: { type: "string" } } },
        },
      },
      additionalProperties: false,
    };
    for (const [k, v] of Object.entries(packs)) {
      if (k === "__schema") continue;
      errors.push(...schema.validate(v, packSchema, "packs." + k));
    }
    return { valid: errors.length === 0, errors };
  }

  function indexCheck() {
    const errors = [];
    let idx;
    try { idx = JSON.parse(fs.readFileSync(INDEX, "utf8")); }
    catch (e) { return { valid: false, errors: ["gagal memuat: " + e.message] }; }
    if (!Array.isArray(idx.skills)) return { valid: false, errors: ["'skills' harus array"] };
    const skillSchema = {
      type: "object",
      required: ["name", "description", "family", "layer", "tier", "version", "category", "runnable", "recipe"],
      properties: {
        name: { type: "string" }, description: { type: "string" },
        family: { type: ["string", "null"] }, layer: { type: "string", enum: ["meta", "prime", "combo"] },
        tier: { type: "string", enum: ["CORE-CAP", "EVOLUTION", "ADVANCED-CAP"] }, version: { type: "string" },
        category: { type: "string" }, tags: { type: "array", items: { type: "string" } },
        runnable: { type: "boolean" }, recipe: { type: ["string", "null"] },
        entrypoint: { type: "string", pattern: "^https://raw\\.githubusercontent\\.com/" },
      },
      additionalProperties: false,
    };
    idx.skills.forEach((s, i) => errors.push(...schema.validate(s, skillSchema, "skills[" + i + "]")));
    return { valid: errors.length === 0, errors };
  }

  function crossCheck() {
    // Aturan silang nyata: combo ⟹ family+recipe non-null & runnable true; meta ⟹ family null.
    const errors = [];
    const cat = JSON.parse(fs.readFileSync(CATALOG, "utf8"));
    for (const c of cat.capabilities) {
      if (c.layer === "combo") {
        if (!c.family) errors.push(c.id + " (combo) harus punya family");
        if (!c.recipe) errors.push(c.id + " (combo) harus punya recipe");
        if (c.runnable !== true) errors.push(c.id + " (combo) harus runnable:true");
      } else if (c.layer === "meta") {
        if (c.family != null) errors.push(c.id + " (meta) family harus null");
        if (c.recipe != null) errors.push(c.id + " (meta) recipe harus null");
        if (c.runnable !== false) errors.push(c.id + " (meta) harus runnable:false");
      }
    }
    return { valid: errors.length === 0, errors: errors.slice(0, 15) };
  }

  const cat = catCheck();
  checks.push({ desc: "catalog.json mematuhi skema kemampuan kanonik", ok: cat.valid, detail: cat.errors.slice(0, 15) });

  const pack = packCheck();
  checks.push({ desc: "packs.json pack valid (skema v3 + field v3)", ok: pack.valid, detail: pack.errors.slice(0, 15) });

  const idx = indexCheck();
  checks.push({ desc: "capabilities/index.json mematuhi kontrak index internasional", ok: idx.valid, detail: idx.errors.slice(0, 15) });

  const x = crossCheck();
  checks.push({ desc: "keterkaitan silang layer ↔ family/recipe/runnable", ok: x.valid, detail: x.errors });

  return { name: "Validasi skema artefak (katalog / packs / index)", checks, ok: checks.every((c) => c.ok) };
};
