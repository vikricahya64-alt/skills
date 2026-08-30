const express = require("express");
const multer = require("multer");
const { GoogleGenerativeAI } = require("@google/generative-ai");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { CAPS, pickCapabilities } = require("./capabilities.js");
const KB = require("./knowledge.js");
const CODEX = require("./codex.js");
const EVO = require("./capabilities2.js");
const FUSION = require("./fusion.js");

const app = express();
app.use(express.json({ limit: "12mb" }));
app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.sendStatus(204);
  next();
});

const KEYS = (process.env.GEMINI_API_KEY || "")
  .split(/[,\s]+/)
  .map(k => k.trim())
  .filter(Boolean);
const KEY = KEYS[0] || "";
const PORT = process.env.PORT || 3000;
const MAX_LEN = 8000;
const MAX_FILE = 20 * 1024 * 1024; // 20 MB
const MAX_HISTORY = 20;

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE, files: 5 },
});

// ---------- Lokasi skills ----------
function resolveSkillsDir() {
  const candidates = [
    path.resolve(__dirname, "..", "skills"),
    path.resolve(__dirname, "skills"),
    path.resolve(process.cwd(), "skills"),
    "/var/task/skills",
  ];
  for (const c of candidates) {
    try {
      if (fs.existsSync(path.join(c, "cloud"))) return c;
    } catch (_) { /* lanjut */ }
  }
  for (const c of candidates) {
    try {
      if (fs.existsSync(c)) return c;
    } catch (_) { /* lanjut */ }
  }
  return candidates[0];
}

const SKILLS_DIR = resolveSkillsDir();

function findSkills(dir, out = []) {
  let entries;
  try { entries = fs.readdirSync(dir); } catch (_) { return out; }
  for (const name of entries) {
    const p = path.join(dir, name);
    try {
      if (fs.statSync(p).isDirectory()) findSkills(p, out);
      else if (name === "SKILL.md") out.push(p);
    } catch (_) { /* lewati */ }
  }
  return out;
}

function parseFrontmatter(text) {
  const m = text.match(/^---\n([\s\S]*?)\n(?:---|\.\.\.)\n/);
  if (!m) return { name: "", description: "" };
  const fm = m[1];
  const name = (fm.match(/^name:\s*"?([^"\n]+)"?$/m) || [])[1] || "";
  let lines = fm.split(/\r?\n/);
  let desc = "";
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
  return { name: name.trim(), description: (desc || "").replace(/\s+/g, " ").trim() };
}

function loadSkills() {
  let cards = [];
  try { cards = KB.loadCards(); } catch (_) { /* fallback di bawah */ }
  if (!cards.length) {
    const files = findSkills(SKILLS_DIR);
    cards = files.map((f) => {
      const text = fs.readFileSync(f, "utf8");
      const { name, description } = parseFrontmatter(text);
      return {
        name: name || f.replace(SKILLS_DIR + "/", "").replace("/SKILL.md", ""),
        description,
        core: [text.replace(/^---\n[\s\S]*?\n(?:---|\.\.\.)\n/, "").slice(0, 600)],
        keywords: [],
      };
    });
  }
  return cards
    .map((c) => ({ name: c.name, description: c.description || "", core: c.core || [], keywords: c.keywords || [] }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

let INDEX = [];
try { INDEX = loadSkills(); } catch (_) { INDEX = []; }
console.log("Skill dimuat: " + INDEX.length + " dari " + SKILLS_DIR);

// Pack fusion per kemampuan (kode+logika semua skill dalam cakupan)
let PACKS = null;
function loadPacks() {
  if (PACKS) return PACKS;
  try { PACKS = FUSION.getPacks(); } catch (_) {}
  if (!PACKS) { PACKS = {}; }
  return PACKS;
}
let _fusionCache = null;

function ensurePacks() {
  let packs = loadPacks();
  if (Object.keys(packs).length) return packs;
  try {
    const items = EVO.PRIMES.concat(EVO.COMBOS);
    const enrich = FUSION.attachSkills(FUSION.buildTaxonomy(INDEX), items);
    packs = FUSION.buildPacks(enrich, INDEX);
    FUSION.savePacks(packs);
    PACKS = packs;
  } catch (_) {}
  return packs;
}
try { ensurePacks(); } catch (_) {}

// ---------- Tokenizer & pemilihan skill ----------
const STOP = new Set(["apa","itu","ini","dan","atau","di","ke","dari","pada","yang","dengan","untuk","bagaimana","cara","buat","membuat","adalah","tolong","the","a","an","of","to","in","on","for","how","what","is","with","and","please","using","use"]);
function tokens(str) {
  return str.toLowerCase().split(/[^a-z0-9]+/).filter((w) => w.length > 2 && !STOP.has(w));
}

function pickSkills(q) {
  return KB.pickCards(q, INDEX, 3);
}

function pickCap(q) {
  return EVO.pickEvolution(q, INDEX.map((x) => x.name), { maxPrime: 1, maxCombo: 2 });
}

// ---------- Konteks session ----------
const sessions = new Map();

function getSession(id) {
  if (!sessions.has(id)) {
    sessions.set(id, { history: [], files: [] });
  }
  return sessions.get(id);
}

function pruneSession(sess) {
  if (sess.history.length > MAX_HISTORY) {
    sess.history = sess.history.slice(-MAX_HISTORY);
  }
  if (sess.files.length > 20) {
    sess.files = sess.files.slice(-20);
  }
}

// ---------- Ekstraksi teks file ----------
const IMG_RE = /^image\/(png|jpe?g|webp|gif|bmp|heic)/;
function extractText(buffer, originalName, mime) {
  const name = (originalName || "file").toLowerCase();
  if (IMG_RE.test(mime || "")) {
    return {
      text: "(gambar unggahan)",
      kind: "Gambar",
      image: { base64: buffer.toString("base64"), mime: mime || "image/png" },
    };
  }
  const text = buffer.toString("utf8");
  if (name.endsWith(".csv") || mime === "text/csv") return { text, kind: "CSV" };
  if (name.endsWith(".json") || mime === "application/json") {
    try { const parsed = JSON.parse(text); return { text: JSON.stringify(parsed, null, 2).slice(0, 300000), kind: "JSON" }; }
    catch (_) { return { text, kind: "JSON (raw)" }; }
  }
  if (name.endsWith(".md")) return { text, kind: "Markdown" };
  if (name.endsWith(".log")) return { text, kind: "Log" };
  if (name.endsWith(".pdf")) return { text: "(PDF terdeteksi - kirim sebagai teks jika diperlukan)", kind: "PDF" };
  if (/\.(py|js|ts|java|kt|go|rs|c|cpp|h|sh|sql|html|css|xml|yml|yaml|tf|json|ipynb)$/.test(name)) return { text, kind: "Kode" };
  const cleaned = text.replace(/\u0000/g, "").trim();
  return { text: cleaned || "(file biner / tidak bisa dibaca sebagai teks)", kind: "File" };
}

function fileSummary(file) {
  return {
    name: file.name,
    kind: file.kind,
    size: file.size,
    hasImage: !!file.image,
    excerpt: (file.text || "").slice(0, 300),
  };
}

// ---------- Prompt builder ----------
function buildPrompt(q, sess, top, evo) {
  const parts = [];
  parts.push(
    "Kamu Agen AI Google Cloud (gcp-agent) hasil EVOLUSI 1042 skill -> kemampuan nyata tingkat tinggi. " +
    "Jawab bahasa Indonesia, padat, akurat, beri langkah konkret. Jujur jika tidak yakin."
  );

  const evoBlock = [];
  if (evo && evo.primes && evo.primes.length) {
    for (const p of evo.primes) {
      evoBlock.push("PRIME [" + (p.emoji || "🌐") + "] " + p.name + " — " + p.insight);
    }
  }
  if (evo && evo.combos && evo.combos.length) {
    for (const c of evo.combos) {
      evoBlock.push("KEMAMPUAN FUSION [" + (c.emoji || "🧠") + "] " + c.name +
        " — cakupan: " + c.skills.join(", ") +
        (c.insight ? " — " + c.insight : ""));
    }
  }
  if (evoBlock.length) parts.push("Evolusi kemampuan yang relevan:\n" + evoBlock.join("\n"));
  // FUSI LOGIKA+KODE per kemampuan terpilih
  const packs = loadPacks();
  const packParts = [];
  for (const it of [].concat(evo && evo.primes ? evo.primes : [], evo && evo.combos ? evo.combos : [])) {
    const pk = packs[it.id];
    if (pk) { const f = FUSION.formatPack(pk, 1500); if (f) packParts.push("### " + pk.name + "\n" + f); }
  }
  if (packParts.length) parts.push("FUSI LOGIKA & KODE PER KEMAMPUAN (dari semua skill terkait):\n" + packParts.join("\n\n"));

  if (top.length) {
    const skillsBlock = top.map((s) => KB.formatCard(s, 1500)).join("\n\n");
    parts.push("Knowledge base skill relevan (kutip prosedur inti):\n" + skillsBlock);
    // FUSI KODE & LOGIKA: cuplikan kode asli + aturan dari skill terpilih
    const pack = KB.fusionPack(top, 5000);
    if (pack) parts.push("FUSI KODE & LOGIKA dari skill (gunakan persis, jangan mengarang):\n" + pack);
  } else {
    parts.push("(tidak ada skill spesifik dipilih; gunakan pengetahuan umum Google Cloud)");
  }

  if (sess.files.length) {
    const filesBlock = sess.files.map((f, i) =>
      `### FILE ${i + 1}: ${f.name} (${f.kind}, ${f.size} byte)\n${f.text.slice(0, 8000)}`
    ).join("\n\n");
    parts.push("Konteks file unggahan sesi ini:\n" + filesBlock);
  }

  if (sess.history.length) {
    const hist = sess.history.slice(-4).map((m) => "User: " + m.q + "\nAgen: " + m.a).join("\n\n");
    parts.push("Riwayat sesi (konteks):\n" + hist);
  }

  parts.push("Pertanyaan user: " + q);
  parts.push("Jawab langsung, tanpa pemanasan. Jika berkaitan file, analisis isinya teliti.");
  return parts.join("\n\n");
}

let _resolvedModel = null;

async function getModelName() {
  if (_resolvedModel) return _resolvedModel;
  const want = (process.env.GEMINI_MODEL || "").trim();
  if (want) { _resolvedModel = want; return _resolvedModel; }
  if (!KEY) { _resolvedModel = "gemini-3.1-flash-lite"; return _resolvedModel; }
  try {
    const resp = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/models?key=" + KEY + "&pageSize=200"
    );
    if (resp.ok) {
      const data = await resp.json();
      const all = (data.models || [])
        .filter(m => (m.supportedGenerationMethods || []).includes("generateContent"))
        .map(m => String(m.name || "").replace("models/", ""));
      const isFlash = n => /^gemini-[\d.]+-flash/i.test(n) && !/tts|audio|image|embedding|embed/i.test(n);
      const isLite = n => /^gemini-[\d.]+-flash-lite/i.test(n);
      // Urutkan: lite (kuota gratis jauh lebih besar) -> flash penuh
      const lite = all.filter(isLite).filter(n => !/preview/i.test(n));
      const full = all.filter(isFlash).filter(n => !isLite(n));
      const liteAll = all.filter(isLite);
      const preferLite = ["gemini-3.1-flash-lite", "gemini-2.5-flash-lite"];
      const preferFull = ["gemini-3.6-flash", "gemini-3-flash-preview", "gemini-2.5-flash", "gemini-2.0-flash"];
      for (const p of preferLite) { if (liteAll.includes(p)) { _resolvedModel = p; return _resolvedModel; } }
      if (lite.length) { _resolvedModel = lite[0]; return _resolvedModel; }
      for (const p of preferFull) { if (full.includes(p)) { _resolvedModel = p; return _resolvedModel; } }
      if (full.length) { _resolvedModel = full[0]; return _resolvedModel; }
    }
  } catch (_) {}
  _resolvedModel = "gemini-3.1-flash-lite";
  return _resolvedModel;
}

let _keyIdx = 0;

function currKey() {
  if (!KEYS.length) return "";
  if (_keyIdx >= KEYS.length) _keyIdx = 0;
  return KEYS[_keyIdx];
}

async function getModel() {
  const genAI = new GoogleGenerativeAI(currKey());
  const modelName = await getModelName();
  return genAI.getGenerativeModel({ model: modelName });
}

// ---------- Routes ----------
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", skills: INDEX.length, hasKey: !!KEY, keys: KEYS.length, uptime: process.uptime() });
});

app.get("/api/skills", (req, res) => {
  const q = String(req.query.q || "").trim();
  let list = INDEX;
  if (q) list = pickSkills(q);
  res.json({
    total: INDEX.length,
    skills: list.map((s) => ({ name: s.name, description: s.description || (s.core || []).join(" ").slice(0, 120) })),
  });
});

app.get("/api/capabilities", (req, res) => {
  res.json({
    total: CAPS.length,
    capabilities: CAPS.map((c) => ({
      id: c.id,
      name: c.name,
      emoji: c.emoji,
      skills: c.skills,
      note: c.note || "",
      insight: c.insight || "",
    })),
  });
});


app.get("/api/evolution", (req, res) => {
  res.json({
    primes: EVO.PRIMES.map((p) => ({ id: p.id, name: p.name, emoji: p.emoji, domains: p.domains, insight: p.insight })),
    combos: EVO.COMBOS.map((c) => ({ id: c.id, name: c.name, emoji: c.emoji, skills: c.skills, insight: c.insight })),
  });
});

app.get("/api/pack", (req, res) => {
  const id = String((req.query && req.query.id) || "");
  const packs = ensurePacks();
  if (id) {
    const pk = packs[id];
    if (!pk) return res.status(404).json({ error: "Paket tidak ditemukan: " + id, available: Object.keys(packs) });
    res.json({ id, ...pk, formatted: FUSION.formatPack(pk, 4000) });
    return;
  }
  res.json({
    total: Object.keys(packs).length,
    packs: Object.fromEntries(Object.entries(packs).map(([k, v]) => [k, { name: v.name, emoji: v.emoji, skillCount: v.skillCount, codes: v.codes.length, logic: v.logic.length }])),
  });
});

app.get("/api/fusion", (req, res) => {
  if (_fusionCache) return res.json(_fusionCache);
  try {
    const cards = KB.loadCards();
    const tax = FUSION.buildTaxonomy(cards);
    const items = EVO.PRIMES.concat(EVO.COMBOS);
    const enrich = FUSION.attachSkills(tax, items);
    const covered = new Set();
    for (const e of enrich) for (const n of e.allSkills || []) covered.add(n);
    const payload = {
      totalSkills: cards.length,
      covered: covered.size,
      coveragePct: Math.round((100 * covered.size) / cards.length),
      taxonomy: Object.fromEntries(Object.entries(tax).map(([k, v]) => [k, v.length]).sort((a, b) => a[1] - b[1])),
      capabilities: enrich.map((e) => ({
        id: e.id,
        name: e.name,
        emoji: e.emoji,
        insight: e.insight,
        skillCount: (e.allSkills || []).length,
        skills: (e.allSkills || []).slice(0, 60),
      })),
    };
    _fusionCache = payload;
    res.json(payload);
  } catch (e) {
    res.status(500).json({ error: String((e && e.message) || e) });
  }
});

app.post("/ask", async (req, res) => {
  if (!KEY) return res.status(500).json({ error: "GEMINI_API_KEY belum diatur di server." });
  const q = String((req.body && req.body.question) || "").trim();
  const sessionId = String((req.body && req.body.sessionId) || "default").slice(0, 64);
  if (!q) return res.status(400).json({ error: "Pertanyaan kosong" });
  if (q.length > MAX_LEN) return res.status(400).json({ error: "Pertanyaan terlalu panjang (maks " + MAX_LEN + " karakter)." });

  const sess = getSession(sessionId);

  // Terima file inline (stateless) agar analisis file tetap jalan di serverless.
  const inlineFiles = Array.isArray(req.body && req.body.files) ? req.body.files.slice(0, 5) : [];
  for (const f of inlineFiles) {
    if (!f || typeof f.name !== "string") continue;
    const isImg = !!(f.base64 && /^image\//.test(f.mime || ""));
    const entry = {
      id: crypto.randomBytes(6).toString("hex"),
      name: f.name,
      kind: f.kind || (isImg ? "Gambar" : "File"),
      size: isImg ? Math.round((f.base64 || "").length * 0.75) : Buffer.byteLength(f.text || "", "utf8"),
      text: isImg ? "(gambar unggahan)" : String(f.text || "").slice(0, 300000),
      mime: f.mime || "text/plain",
      inline: true,
    };
    if (isImg) entry.image = { base64: String(f.base64).slice(0, 20 * 1024 * 1024), mime: entry.mime };
    sess.files.push(entry);
  }
  if (inlineFiles.length) pruneSession(sess);

  const top = pickSkills(q);
  const evo = pickCap(q);
  let model;
  try { model = await getModel(); } catch (_) { return res.status(500).json({ error: "Gagal menyiapkan model." }); }

  const prompt = buildPrompt(q, sess, top, evo);
  // Konten multimodal: teks diikuti gambar (vision)
  const contentParts = [{ text: prompt }];
  for (const f of sess.files) {
    if (f.image && f.image.base64) {
      contentParts.push({ inlineData: { mimeType: f.image.mime, data: f.image.base64 } });
    }
  }
  let answer = "";
  let attempts = 0;
  const maxAttempts = Math.max(1, KEYS.length);
  while (attempts < maxAttempts) {
    try {
      const r = contentParts.length > 1
        ? await model.generateContent(contentParts)
        : await model.generateContent(prompt);
      answer = r.response.text();
      break;
    } catch (e) {
      attempts++;
      const msg = String((e && e.message) || e);
      const quota = /429|quota|Too Many|rate.limit|RESOURCE_EXHAUSTED/i.test(msg);
      if (!quota || attempts >= maxAttempts) {
        return res.status(429).json({ error: msg, retry: true });
      }
      _keyIdx = (_keyIdx + 1) % KEYS.length;
      if (_resolvedModel && !/_?lite/.test(_resolvedModel) && attempts === 1) {
        // Turun ke model lite (kuota jauh lebih besar) setelah flash penuh 429
        const tryLite = ["gemini-3.1-flash-lite", "gemini-2.5-flash-lite"];
        for (const lm of tryLite) { if (lm !== _resolvedModel) { _resolvedModel = lm; break; } }
      }
      try { model = await getModel(); } catch (_) {}
    }
  }
  sess.history.push({ q, a: answer.slice(0, 3000) });
  pruneSession(sess);
  res.json({
    answer,
    skills: top.map((x) => x.name),
    capabilities: [].concat(evo.primes || [], evo.combos || []).map((x) => x.name),
    files: sess.files.map(fileSummary),
    sessionId,
    model: _resolvedModel,
  });
});

app.get("/api/info", async (req, res) => {
  let modelName = _resolvedModel || null;
  if (!modelName) { try { await getModelName(); modelName = _resolvedModel; } catch (_) {} }
  res.json({
    name: "gcp-agent",
    skills: INDEX.length,
    hasKey: !!KEY,
    keys: KEYS.length,
    model: modelName || "menunggu resolusi",
    limitFiles: 5,
    limitFileMB: 20,
    maxQuestion: MAX_LEN,
    uptime: Math.round(process.uptime()),
    version: "3.4.4",
    kb: true,
    kbCards: KB.loadCards().length,
    maxTopSkills: 3,
    evolution: { primes: EVO.PRIMES.length, combos: EVO.COMBOS.length },
    agentTools: CODEX.TOOL_LIST.map((t) => t.name),
  });
});

app.post("/api/upload", upload.array("files", 5), (req, res) => {
  if (!req.files || !req.files.length) return res.status(400).json({ error: "Tidak ada file diunggah." });

  const sessionId = String((req.body && req.body.sessionId) || "default").slice(0, 64);
  const sess = getSession(sessionId);

  const added = [];
  for (const f of req.files) {
    const { text, kind, image } = extractText(f.buffer, f.originalname, f.mimetype);
    const entry = {
      id: crypto.randomBytes(6).toString("hex"),
      name: f.originalname,
      kind,
      size: f.size,
      text,
      mime: f.mimetype,
    };
    if (image) entry.image = image;
    sess.files.push(entry);
    added.push(fileSummary(entry));
  }
  pruneSession(sess);
  res.json({ ok: true, added, totalFiles: sess.files.length, sessionId });
});

app.post("/api/clear", (req, res) => {
  const sessionId = String((req.body && req.body.sessionId) || "default").slice(0, 64);
  sessions.delete(sessionId);
  res.json({ ok: true });
});


app.post("/api/agent", async (req, res) => {
  if (!KEY) return res.status(500).json({ error: "GEMINI_API_KEY belum diatur." });
  const task = String((req.body && req.body.task) || "").trim();
  const sessionId = String((req.body && req.body.sessionId) || "default").slice(0, 64);
  if (!task) return res.status(400).json({ error: "Tugas kosong" });
  if (task.length > 4000) return res.status(400).json({ error: "Tugas terlalu panjang (maks 4000)." });

  let model;
  try { model = await getModel(); } catch (_) { return res.status(500).json({ error: "Gagal menyiapkan model." }); }

  // Konteks awal dari KB untuk mengarahkan pilihan tool
  const kbHints = CODEX.toolsPrompt();
  const evo = pickCap(task);
  const evoList = [].concat(evo.primes || [], evo.combos || []);
  const capTxt = evoList.length
    ? evoList.map((c) => "Evolusi terpilih: " + c.name + " (cakupan " + (c.skills || c.domains || []).join(", ") + ")" + (c.insight ? " — " + c.insight : "")).join("\n")
    : "";
  // FUSI KODE & LOGIKA dari skill teratas utk tugas ini (arahan eksekusi nyata)
  const kbTop = KB.pickCards(task, KB.loadCards(), 3);
  const kbPack = KB.fusionPack(kbTop, 3500);

  const SYSTEM = "Kamu agen eksekusi (seperti Codex) dengan akses penuh ke workspace. " +
    "Jawab/kerjakan tugas user. Gunakan tool bila perlu langkah nyata (jalankan kode, baca/tulis file, cek web, cari KB). " +
    "LINGKUNGAN: Linux serverless; Node.js tersedia (jalankan JS via node -e). Python TIDAK terpasang - jangan coba python3/python/pip. " +
    "Untuk kalkulasi atau skrip, tulis file .js lalu jalankan: node namafile.js. " +
    "Kerjakan sampai selesai lalu tutup dengan blok:\n[SELESAI]<jawaban atau hasil akhir dalam bahasa Indonesia>\n\n" +
    capTxt + (kbPack ? "\n\nFUSI KODE & LOGIKA dari knowledge base (gunakan persis):\n" + kbPack : "") +
    "\n\n" + kbHints;

  const messages = [{ role: "user", parts: [{ text: SYSTEM + "\n\nTUGAS USER:\n" + task }] }];
  let modelOut;
  try { const r = await model.generateContent(messages[0].parts); modelOut = r.response.text(); }
  catch (e) { return res.status(429).json({ error: String((e && e.message) || e), retry: true }); }

  let answer = "";
  const steps = [];
  const doneCalls = new Set();
  const MAX_IT = 8;
  let final = false;

  // Deteksi panggilan tool pada output model (beberapa baris JSON {tool,args})
  function extractCalls(text) {
    const calls = [];
    const re = /\{\s*"tool"\s*:\s*"([a-z]+)"\s*,\s*"args"\s*:\s*(\{(?:[^{}])*\})\s*\}/g;
    let m;
    while ((m = re.exec(text))) {
      try { calls.push({ tool: m[1], args: JSON.parse(m[2]) }); } catch (_) {}
    }
    return calls;
  }

  for (let i = 0; i < MAX_IT; i++) {
    const calls = extractCalls(modelOut);
    const sel = modelOut.indexOf("[SELESAI]");
    const hasFinish = sel !== -1;

    // Kerjakan tool dulu (jika ada), lalu appends hasil ke percakapan untuk langkah berikutnya
    let feed = modelOut;
    if (calls.length) {
      const results = [];
      for (const c of calls.slice(0, 6)) {
        const key = c.tool + ":" + JSON.stringify(c.args || {});
        if (doneCalls.has(key)) { results.push("(duplikat panggilan " + c.tool + " dilewati)"); continue; }
        doneCalls.add(key);
        const out = await CODEX.toolRunner(c.tool, c.args, sessionId);
        steps.push({ tool: c.tool, args: c.args, ok: out.ok, brief: (out.result || out.error || "").slice(0, 400) });
        results.push("(" + c.tool + ") " + (out.ok ? out.result : "GALAT: " + (out.error || out.result)).slice(0, 3000));
      }
      const toolText = "\n\nHasil tool langkah " + (i + 1) + ":\n" + results.join("\n---\n") +
        "\n\nLanjutkan: kerjakan tugas, lalu tutup dengan [SELESAI]...";
      messages.push({ role: "user", parts: [{ text: toolText }] });
      try { const r = await model.generateContent(messages.map((m2) => m2.parts[0].text).join("\n")); modelOut = r.response.text(); }
      catch (e) { steps.push({ tool: "_model", ok: false, brief: "gagal lanjut: " + (e.message||e) }); break; }
      continue;
    }

    if (hasFinish) {
      answer = modelOut.slice(sel + "[SELESAI]".length).trim();
      final = true;
      break;
    }
    // tidak ada tool & tidak finish -> jadikan ini langkah pemikiran, minta lanjut
    messages.push({ role: "user", parts: [{ text: "Lanjutkan menyelesaikan tugas lalu tutup dengan [SELESAI]..." }] });
    try { const r = await model.generateContent(messages.map((m2) => m2.parts[0].text).join("\n")); modelOut = r.response.text(); }
    catch (e) { steps.push({ tool: "_model", ok: false, brief: "gagal: " + (e.message||e) }); break; }
  }

  sessions.delete(sessionId); // workspace agen bersifat ephemeral per panggilan (stateless serverless)
  res.json({ answer: answer || modelOut || "(agen tidak menghasilkan jawaban akhir)", final, steps, sessionId });
});

app.get("/", (req, res) => { res.send(HTML); });

let HTML = "<!DOCTYPE html><html><head><meta charset=\"utf-8\"><title>Memuat…</title></head><body style=\"font-family:sans-serif;background:#0b1220;color:#e5edf7\"><h2 style=\"padding:40px\">Memuat antarmuka agen…</h2></body></html>";
try { HTML = fs.readFileSync(path.join(__dirname, "www.html"), "utf8"); } catch (_) {}

if (require.main === module) {
  app.listen(PORT, () => console.log("Server jalan di port " + PORT + " (skill: " + INDEX.length + ")"));
}
module.exports = app;
