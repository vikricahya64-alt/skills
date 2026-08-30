// Knowledge Base engine: mengubah tiap SKILL.md menjadi "kartu pengetahuan" yang padat,
// lalu memilih top-N kartu paling relevan per pertanyaan dengan efisiensi token maksimal.
const fs = require("fs");
const path = require("path");

// ---- Ekstraksi frontmatter (mirip server.js, direplikasi agar mandiri) ----
function parseFrontmatter(text) {
  const m = text.match(/^---\n([\s\S]*?)\n(?:---|\.\.\.)\n/);
  if (!m) return { name: "", description: "", keywords: [] };
  const fm = m[1];
  const name = (fm.match(/^name:\s*"?([^"\n]+)"?$/m) || [])[1] || "";
  let desc = "";
  const lines = fm.split(/\r?\n/);
  let inDesc = false;
  for (const ln of lines) {
    if (/^description:/i.test(ln)) {
      const inline = ln.replace(/^description:\s*/i, "").trim();
      if (inline && inline[0] !== ">") {
        if (inline[0] !== "-" && inline[0] !== "|") { desc = inline; inDesc = false; continue; }
      }
      inDesc = true;
      continue;
    }
    if (inDesc) {
      if (/^[a-z][a-z0-9_-]*:/i.test(ln)) { inDesc = false; continue; }
      const t = ln.replace(/^\s*[-|>]?\s*/, "").trim();
      if (t) desc += (desc ? " " : "") + t;
    }
  }
  const kwRaw = (fm.match(/^keywords?:\s*\[([^\]]*)\]/m) || [])[1] ||
                (fm.match(/^keywords?:\s*(.*)$/m) || [])[1] || "";
  const keywords = kwRaw.split(/[,\s]+/).map(s => s.replace(/^['"]|['"]$/g, "")).filter(s => s.length > 2);
  return { name: name.trim(), description: (desc || "").replace(/\s+/g, " ").trim(), keywords };
}

// ---- Kutip langkah-langkah / prosedur inti dari body skill ----
function extractCore(text) {
  const body = text.replace(/^---\n[\s\S]*?\n(?:---|\.\.\.)\n/, "");
  const lines = body.split(/\r?\n/);
  const core = [];
  let block = [];
  let inCode = false;

  const flush = () => {
    const joined = block.join("\n").trim();
    if (joined) core.push(joined);
    block = [];
  };

  for (const ln of lines) {
    const t = ln.trim();
    if (/^```/.test(t)) {
      if (!inCode) { flush(); inCode = true; continue; }
      inCode = false;
      continue;
    }
    if (inCode) {
      // Pertahankan baris kode (perintah/snippet) yang pendek dan informatif
      if (t.length > 2 && t.length < 400) block.push(ln);
      if (block.length > 6) flush();
      continue;
    }
    // Judul langkah (## / ### / ####), titik-titik bernomor "", atau mulai "Langkah"
    if (/^#{2,4}\s+/.test(t) || /^\d+[.)]\s/.test(t) || /^[-*]\s+/.test(t) || /^(langkah|step)\s*\d+/i.test(t)) {
      flush();
      block.push(ln.trim().replace(/^#{2,4}\s+/, "").replace(/^[-*]\s+/, ""));
      continue;
    }
    if (t && t.length < 220 && !/^(\s*[-_*]+\s*)$/.test(t)) {
      if (block.length) block.push(t);
    }
  }
  flush();
  // Gabungkan baris, potong transisi yang tidak bermakna
  const merged = core
    .map(c => c.replace(/[\r\n]+/g, " ").replace(/\s+/g, " ").trim())
    .filter(c => c.length > 3 && c.length < 900)
    .slice(0, 14);
  return merged;
}

// ---- Ekstraksi mendalam: blok kode asli + kalimat logika/aturan ----
function extractDeep(text) {
  const body = text.replace(/^---\n[\s\S]*?\n(?:---|\.\.\.)\n/, "");
  const lines = body.split(/\r?\n/);
  const codes = [];
  const logic = [];
  let inCode = false, codeLang = "", codeBuf = [];

  const flushCode = () => {
    const src = codeBuf.join("\n").trim();
    if (src.length > 3) codes.push({ lang: codeLang, src: src.slice(0, 1400) });
    codeBuf = [];
  };

  for (const ln of lines) {
    const t = ln.trim();
    if (/^```/.test(t)) {
      if (!inCode) { inCode = true; codeLang = (t.match(/^```([a-z0-9_-]+)/i) || [])[1] || ""; continue; }
      flushCode(); inCode = false;
      continue;
    }
    if (inCode) {
      codeBuf.push(ln);
      if (codeBuf.length >= 34) { flushCode(); inCode = false; }
      continue;
    }
    // Baris tuntunan: bullet/awalan instruksi penting
    if (/^[-*]\s+(always|never|don'?t|jangan|use when|use it when|when to use|best practice|pastikan|selalu|langkah|step|first|always use|never use|avoid)\b/i.test(t) ||
        /^(always|never|use when|jangan|selalu|avoid|pastikan)\b/i.test(t)) {
      if (t.length > 8 && t.length < 280) logic.push(t.replace(/^[-*]\s+/, ""));
    }
    if (logic.length > 16) break;
  }
  if (inCode) flushCode();
  return { codes: codes.slice(0, 8), logic: logic.slice(0, 12) };
}

// ---- Bangun kartu pengetahuan satu skill ----
function buildCard(f, relName) {
  const text = fs.readFileSync(f, "utf8");
  const fm = parseFrontmatter(text);
  const name = fm.name || relName;
  const core = extractCore(text);
  const deep = extractDeep(text);
  return {
    name,
    description: fm.description.slice(0, 900),
    keywords: fm.keywords.slice(0, 20),
    core: core.slice(0, 10),
    codes: deep.codes,
    logic: deep.logic,
  };
}

// ---- Resolusi direktori skills ----
function resolveSkillsDir() {
  const candidates = [
    path.resolve(__dirname, "..", "skills"),
    path.resolve(__dirname, "skills"),
    path.resolve(process.cwd(), "skills"),
    "/var/task/skills",
  ];
  for (const c of candidates) {
    try { if (fs.existsSync(path.join(c, "cloud"))) return c; } catch (_) {}
  }
  for (const c of candidates) {
    try { if (fs.existsSync(c)) return c; } catch (_) {}
  }
  return candidates[0];
}

function findSkills(dir, out = []) {
  let entries;
  try { entries = fs.readdirSync(dir); } catch (_) { return out; }
  for (const name of entries) {
    const p = path.join(dir, name);
    try {
      if (fs.statSync(p).isDirectory()) findSkills(p, out);
      else if (name === "SKILL.md") out.push(p);
    } catch (_) {}
  }
  return out;
}

// ---- Muat semua kartu (dengan cache ke kb.json) ----
const CACHE_PATH = path.join(__dirname, "kb.json");
let _cards = null;

function corpusId() {
  let t = 0;
  try {
    const dir = resolveSkillsDir();
    t = findSkills(dir).reduce((acc, f) => acc + fs.statSync(f).size, 0);
  } catch (_) { t = Date.now(); }
  return t;
}

function loadCards(force = false) {
  if (_cards && !force) return _cards;
  const dir = resolveSkillsDir();
  const files = findSkills(dir);
  // Cache byte-size untuk invalidasi
  let size = 0;
  try { size = files.reduce((acc, f) => acc + fs.statSync(f).size, 0); } catch (_) {}
  try {
    if (!force && fs.existsSync(CACHE_PATH)) {
      const cached = JSON.parse(fs.readFileSync(CACHE_PATH, "utf8"));
      if (cached && cached.size === size) { _cards = cached.cards; return _cards; }
    }
  } catch (_) {}
  const cards = files.map((f) => buildCard(f, f.replace(dir + "/", "").replace("/SKILL.md", "")));
  try { fs.writeFileSync(CACHE_PATH, JSON.stringify({ size, cards })); } catch (_) {}
  _cards = cards;
  return cards;
}

// ---- Tokenizer (ringan) ----
const STOP = new Set(["apa","itu","ini","dan","atau","di","ke","dari","pada","yang","dengan","untuk","bagaimana","cara","buat","membuat","adalah","tolong","the","a","an","of","to","in","on","for","how","what","is","with","and","please","using","use","cara","saya","kamu","anda","mohon"]);
function tokens(str) {
  return (str || "").toLowerCase().split(/[^a-z0-9]+/).filter((w) => w.length > 2 && !STOP.has(w));
}

// ---- Relevansi kartu terhadap query (skor word + keyword) ----
function cardScore(card, words) {
  let s = 0;
  const nameHay = card.name.toLowerCase().replace(/[^a-z0-9]+/g, " ");
  const descHay = card.description.toLowerCase();
  const coreHay = (card.core || []).join(" ").toLowerCase();
  const kwHay = (card.keywords || []).join(" ");
  for (const w of words) {
    if (nameHay.includes(w)) s += 5;
    else if (kwHay.includes(w)) s += 4;
    if (descHay.includes(w)) s += 2.5;
    if (coreHay.includes(w)) s += 1.5;
  }
  return s;
}

function pickCards(q, all, max = 3) {
  const words = tokens(q);
  if (!words.length) return [];
  return all
    .map((c) => ({ c, s: cardScore(c, words) }))
    .filter((x) => x.s > 0)
    .sort((a, b) => b.s - a.s)
    .slice(0, max)
    .map((x) => x.c);
}

// ---- Format kartu jadi teks ringkas utk prompt (token dibatasi) ----
function formatCard(card, maxChars = 2200) {
  const lines = [];
  lines.push("=== SKILL: " + card.name + " ===");
  if (card.description) lines.push("Deskripsi: " + card.description);
  if (card.core && card.core.length) {
    lines.push("Prosedur inti:");
    for (const c of card.core.slice(0, 6)) lines.push("• " + c);
  }
  if (card.logic && card.logic.length) {
    lines.push("Logika kunci:");
    for (const l of card.logic.slice(0, 5)) lines.push("◈ " + l);
  }
  if (card.codes && card.codes.length) {
    lines.push("Kode nyata:");
    for (const c of card.codes.slice(0, 3)) {
      lines.push(c.src.split("\n").slice(0, 12).join("\n"));
    }
  }
  return lines.join("\n").slice(0, maxChars);
}

// ---- FUSI KODE & LOGIKA: gabungkan isi beberapa kartu jadi knowledge pack ----
function fusionPack(cards, maxChars = 6000) {
  const parts = [];
  let budget = maxChars;
  const used = new Set();
  for (const card of cards) {
    if (!card || used.has(card.name)) continue;
    used.add(card.name);
    const cs = (card.codes || []).slice(0, 4);
    const lg = (card.logic || []).slice(0, 6);
    if (!cs.length && !lg.length) continue;
    const block = [];
    block.push("## " + card.name);
    if (lg.length) block.push("Logika: " + lg.join(" | "));
    for (const c of cs) {
      block.push("```" + (c.lang || "") + "\n" + c.src.slice(0, 900) + "\n```");
    }
    const joined = block.join("\n\n");
    if (joined.length > budget) break;
    budget -= joined.length;
    parts.push(joined);
  }
  return parts.join("\n\n");
}

module.exports = { loadCards, pickCards, formatCard, buildCard, extractCore, extractDeep, fusionPack };
