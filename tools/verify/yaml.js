// ============================================================================
// YAML — parser scalar frontmatter minimal (tanpa dependensi).
// Mendukung: plain scalar, block scalar (|, >-, >), dan mapping bertingkat
// (mis. metadata.version). Cukup utk frontmatter SKILL.md ala Google/Claude.
// ============================================================================
const fs = require("fs");

function blockScalar(lines, from, kind) {
  const chunks = [];
  let i = from;
  while (i < lines.length && /^[ \t]/.test(lines[i]) && lines[i].trim() !== "") {
    chunks.push(lines[i].trim());
    i++;
  }
  return chunks.join(kind.startsWith("|") ? "\n" : " ").replace(/\s+/g, " ").trim();
}

/** Baca scalar dari frontmatter (pesan teks di antara --- dan ---). */
function yamlScalar(fm, pathKey) {
  const lines = fm.split("\n");
  const heads = pathKey.split(".");
  const topIdx = lines.findIndex((l) => new RegExp("^" + heads[0] + ":").test(l));
  if (topIdx === -1) return null;
  const from = topIdx + 1;

  if (heads.length === 1) {
    const first = lines[topIdx].slice(heads[0].length + 1).trim();
    if (first === "") return "";
    if (first === "|" || first === ">" || first === ">-" || first === ">+") return blockScalar(lines, from, first);
    let val = first;
    for (let i = from; i < lines.length && /^[ \t]/.test(lines[i]) && lines[i].trim() !== "" &&
           !/^[a-zA-Z][a-zA-Z0-9_-]*:/.test(lines[i]); i++) {
      val += " " + lines[i].trim();
    }
    return val.replace(/\s+/g, " ").trim();
  }

  const parentIndent = (lines[topIdx].match(/^[ \t]*/) || [""])[0].length;
  let childIndent = -1;
  for (let i = from; i < lines.length; i++) {
    const l = lines[i];
    if (l.trim() === "") continue;
    const cur = (l.match(/^[ \t]*/) || [""])[0].length;
    if (cur <= parentIndent) break;
    childIndent = cur;
    break;
  }
  if (childIndent === -1) return null;
  const childKey = heads[1];
  const re = new RegExp("^[ \\t]{" + childIndent + "}" + childKey + ":");
  for (let i = from; i < lines.length; i++) {
    const l = lines[i];
    if (l.trim() === "") continue;
    const cur = (l.match(/^[ \t]*/) || [""])[0].length;
    if (cur <= parentIndent) break;
    if (re.test(l)) {
      const first = l.slice((l.match(/^[ \t]*/) || [""])[0].length + childKey.length + 1).trim();
      if (first === "") return "";
      if (first === "|" || first === ">" || first === ">-" || first === ">+") return blockScalar(lines, i + 1, first);
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

/** Ekstrak frontmatter {raw, name, version, category, description} dari SKILL.md. */
function parseSkill(fullPath) {
  const text = fs.readFileSync(fullPath, "utf8");
  const m = text.match(/^---\n([\s\S]*?)\n(?:---|\.\.\.)\n/);
  if (!m) return { text, frontmatter: null };
  const fm = m[1];
  return {
    text,
    frontmatter: {
      raw: fm,
      name: yamlScalar(fm, "name"),
      version: yamlScalar(fm, "metadata.version"),
      category: yamlScalar(fm, "metadata.category"),
      description: yamlScalar(fm, "description"),
    },
  };
}

module.exports = { yamlScalar, parseSkill };
