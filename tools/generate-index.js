#!/usr/bin/env node
/*
 * Generate index.json (katalog semua skill) dari direktori skills/.
 * Setiap entri berisi name, description, dan entrypoint yang menunjuk
 * ke raw file SKILL.md di repo ini.
 *
 * Pemakaian:
 *   node tools/generate-index.js [repo] [branch] [out]
 *   contoh: node tools/generate-index.js vikricahya64-alt/skills main index.json
 */
const fs = require("fs");
const path = require("path");

const REPO = process.argv[2] || "vikricahya64-alt/skills";
const BRANCH = process.argv[3] || "main";
const OUT = process.argv[4] || "index.json";

const ROOT = path.resolve(__dirname, "..");
const SKILLS_DIR = path.join(ROOT, "skills");

function walk(dir, out = []) {
  for (const name of fs.readdirSync(dir)) {
    const p = path.join(dir, name);
    if (!fs.statSync(p).isDirectory()) continue;
    if (fs.existsSync(path.join(p, "SKILL.md"))) {
      out.push(p);
    } else {
      walk(p, out);
    }
  }
  return out;
}

// Baca nilai scalar YAML `key: value` (termasuk folded/literal block).
function yamlScalar(fm, key) {
  const lines = fm.split("\n");
  const si = lines.findIndex((l) => new RegExp("^" + key + ":").test(l));
  if (si === -1) return null;
  const first = lines[si].slice(key.length + 1).trim();

  // Literal/block scalar: `key: |` / `key: >-` / `key: >`
  if (first === "|" || first === ">" || first === ">-" || first === ">+") {
    const chunks = [];
    let i = si + 1;
    while (i < lines.length && /^[ \t]/.test(lines[i]) && lines[i].trim() !== "") {
      chunks.push(lines[i].trim());
      i++;
    }
    const join = first.startsWith("|") ? "\n" : " ";
    return chunks.join(join).replace(/\s+/g, " ").trim();
  }

  // Plain/one-line, mungkin lanjut ke baris berikutnya yang indent.
  let val = lines[si].slice(key.length + 1).trim();
  let i = si + 1;
  while (i < lines.length && /^[ \t]/.test(lines[i]) && lines[i].trim() !== "" &&
         !/^[a-zA-Z][a-zA-Z0-9_-]*:/.test(lines[i])) {
    val += " " + lines[i].trim();
    i++;
  }
  return val.replace(/\s+/g, " ").trim();
}

const skills = walk(SKILLS_DIR)
  .map((dir) => {
    const file = path.join(dir, "SKILL.md");
    const text = fs.readFileSync(file, "utf8");
    const fmMatch = text.match(/^---\n([\s\S]*?)\n(?:---|\.\.\.)\n/);
    if (!fmMatch) return null;
    const fm = fmMatch[1];
    const name = yamlScalar(fm, "name");
    const description = yamlScalar(fm, "description");
    if (!name || !description) return null;
    const rel = path.relative(ROOT, file).split(path.sep).join("/");
    return {
      name,
      description,
      entrypoint: `https://raw.githubusercontent.com/${REPO}/${BRANCH}/${rel}`,
    };
  })
  .filter(Boolean)
  .sort((a, b) => a.name.localeCompare(b.name));

const index = {
  generator: "This file is generated. Do not edit it by hand.",
  skills,
};

const outPath = path.join(ROOT, OUT);
fs.writeFileSync(outPath, JSON.stringify(index, null, 2) + "\n");
console.log(`Ditulis ${skills.length} skill -> ${outPath}`);
