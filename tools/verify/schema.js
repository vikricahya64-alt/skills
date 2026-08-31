// ============================================================================
// SCHEMA — validator JSON Schema ringan (tanpa dependensi eksternal).
//
// Mendukung subset yang cukup utk verifikasi artefak kemampuan:
//   type, required, properties, items, enum, minItems, pattern, additionalProperties.
// Dipakai oleh arsitektur verifikasi (tools/verify.js) agar artefak divalidasi
// terhadap skema kanonik — bukan sekadar mengecek "ada" per field.
// ============================================================================

function typeOf(v) {
  if (v === null) return "null";
  if (Array.isArray(v)) return "array";
  return typeof v; // string | number | boolean | object | undefined
}

/**
 * Validasi satu nilai terhadap skema (subset). Mengembalikan array pesan error.
 * @param {*} v       nilai yang divalidasi
 * @param {object} s  skema node
 * @param {string} p  jalur (path) untuk pesan error, mis. "capabilities[0].tier"
 */
function validate(v, s, p) {
  if (!s) return [];
  const out = [];

  if (s.type) {
    const t = typeOf(v);
    const types = Array.isArray(s.type) ? s.type : [s.type];
    // tangani "object" vs array (milik khusus)
    if (types.length === 1 && types[0] === "object" && t === "array") {
      out.push(p + ": seharusnya object, ternyata array");
      return out;
    }
    if (!types.includes(t)) {
      out.push(p + ": seharusnya " + types.join(",") + ", ternyata " + t);
      return out;
    }
  }

  if (s.enum && !s.enum.includes(v)) {
    out.push(p + ": nilai '" + v + "' bukan salah satu dari [" + s.enum.join(", ") + "]");
  }

  if (typeof v === "string" && s.pattern && !new RegExp(s.pattern).test(v)) {
    out.push(p + ": '" + v + "' tidak cocok pola " + s.pattern);
  }

  if (s.type === "array") {
    if (s.minItems != null && Array.isArray(v) && v.length < s.minItems) {
      out.push(p + ": minItems " + s.minItems + ", ada " + v.length);
    }
    if (Array.isArray(v) && s.items) {
      v.forEach((item, i) => {
        out.push(...validate(item, s.items, p + "[" + i + "]"));
      });
    }
  }

  if (s.type === "object" && v && typeOf(v) === "object") {
    if (s.required) {
      for (const k of s.required) {
        if (!(k in v)) out.push(p + ": field wajib '" + k + "' tidak ada");
      }
    }
    if (s.properties) {
      for (const [k, ks] of Object.entries(s.properties)) {
        if (k in v) out.push(...validate(v[k], ks, p ? p + "." + k : k));
      }
    }
    if (s.additionalProperties === false && s.properties) {
      for (const k of Object.keys(v)) {
        if (!(k in s.properties)) out.push(p + ": field tak dikenal '" + k + "'");
      }
    }
  }

  return out;
}

/** Validasi nilai terhadap skema, kembalikan { valid, errors } (errors dipotong). */
function check(v, s, label, limit = 30) {
  const errors = validate(v, s, label);
  return { valid: errors.length === 0, errors: errors.slice(0, limit), total: errors.length };
}

module.exports = { validate, check, typeOf };
