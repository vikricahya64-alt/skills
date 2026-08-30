const express = require("express");
const multer = require("multer");
const { GoogleGenerativeAI } = require("@google/generative-ai");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const app = express();
app.use(express.json({ limit: "12mb" }));
app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.sendStatus(204);
  next();
});

const KEY = process.env.GEMINI_API_KEY;
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
  const files = findSkills(SKILLS_DIR);
  return files.map((f) => {
    const text = fs.readFileSync(f, "utf8");
    const { name, description } = parseFrontmatter(text);
    return {
      f,
      name: name || f.replace(SKILLS_DIR + "/", "").replace("/SKILL.md", ""),
      description,
      preview: text.slice(0, 1200),
    };
  }).sort((a, b) => a.name.localeCompare(b.name));
}

let INDEX = [];
try { INDEX = loadSkills(); } catch (_) { INDEX = []; }
console.log("Skill dimuat: " + INDEX.length + " dari " + SKILLS_DIR);

// ---------- Tokenizer & pemilihan skill ----------
const STOP = new Set(["apa","itu","ini","dan","atau","di","ke","dari","pada","yang","dengan","untuk","bagaimana","cara","buat","membuat","adalah","tolong","the","a","an","of","to","in","on","for","how","what","is","with","and","please","using","use"]);
function tokens(str) {
  return str.toLowerCase().split(/[^a-z0-9]+/).filter((w) => w.length > 2 && !STOP.has(w));
}

function scoreSkill(skill, words) {
  const nameHay = skill.name.toLowerCase().replace(/[^a-z0-9]+/g, " ");
  const descHay = (skill.description + " " + skill.preview).toLowerCase();
  let s = 0;
  for (const w of words) {
    if (nameHay.includes(w)) s += 4;
    if (descHay.includes(w)) s += 2;
    if (skill.preview.toLowerCase().split(/\s+/).slice(0, 60).join(" ").includes(w)) s += 1;
  }
  return s;
}

function pickSkills(q) {
  const words = tokens(q);
  return INDEX
    .map((skill) => ({ skill, s: scoreSkill(skill, words) }))
    .filter((x) => x.s > 0)
    .sort((a, b) => b.s - a.s)
    .slice(0, 4)
    .map((x) => x.skill);
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
function buildPrompt(q, sess, top) {
  const parts = [];
  parts.push(
    "Kamu adalah Agen AI Google Cloud (gcp-agent). Jawab dalam bahasa Indonesia, " +
    "ringkas namun lengkap, dan akurat. Jika tidak yakin, katakan dengan jujur."
  );

  if (sess.files.length) {
    const filesBlock = sess.files.map((f, i) => {
      return `### FILE ${i + 1}: ${f.name} (${f.kind}, ${f.size} byte)\n${f.text.slice(0, 12000)}`;
    }).join("\n\n");
    parts.push("Konteks file yang diunggah user ke sesi ini:\n" + filesBlock);
  }

  if (top.length) {
    const skillsBlock = top.map((s) => "=== SKILL: " + s.name + " ===\n" + s.description + "\n\n" + fs.readFileSync(s.f, "utf8").slice(0, 6000)).join("\n\n");
    parts.push("Skill yang relevan untuk pertanyaan ini:\n" + skillsBlock);
  } else {
    parts.push("(tidak ada skill spesifik yang cocok; gunakan pengetahuan Google Cloud umum)");
  }

  if (sess.history.length) {
    const hist = sess.history.slice(-8).map((m) => "User: " + m.q + "\nAgen: " + m.a).join("\n\n");
    parts.push("Riwayat percakapan sesi ini (untuk konteks):\n" + hist);
  }

  parts.push("Pertanyaan terakhir user: " + q);
  parts.push(
    "Jawab langsung tanpa pemanasan. Jika perlu langkah konkret, berikan langkah. " +
    "Jika pertanyaan berkaitan dengan file upload, analisis isi file dengan teliti."
  );
  return parts.join("\n\n");
}

let _resolvedModel = null;

async function getModelName() {
  if (_resolvedModel) return _resolvedModel;
  const want = (process.env.GEMINI_MODEL || "").trim();
  if (want) { _resolvedModel = want; return _resolvedModel; }
  if (!KEY) { _resolvedModel = "gemini-3.6-flash"; return _resolvedModel; }
  try {
    const resp = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/models?key=" + KEY + "&pageSize=200"
    );
    if (resp.ok) {
      const data = await resp.json();
      const models = (data.models || [])
        .filter(m => (m.supportedGenerationMethods || []).includes("generateContent"))
        .map(m => String(m.name || "").replace("models/", ""))
        .filter(n => /^gemini-[\d.]+-flash(-[a-z0-9]+)?$/i.test(n) && !/preview|tts|audio|vision|image|embedding/i.test(n));
      models.sort((a, b) => {
        const va = parseFloat((a.match(/[\d.]+/) || [])[0] || 0);
        const vb = parseFloat((b.match(/[\d.]+/) || [])[0] || 0);
        return vb - va || a.localeCompare(b);
      });
      const prefer = ["gemini-3.6-flash", "gemini-2.5-flash", "gemini-2.0-flash"];
      for (const p of prefer) { if (models.includes(p)) { _resolvedModel = p; return _resolvedModel; } }
      if (models.length) { _resolvedModel = models[0]; return _resolvedModel; }
    }
  } catch (_) {}
  _resolvedModel = "gemini-3.6-flash";
  return _resolvedModel;
}

async function getModel() {
  const genAI = new GoogleGenerativeAI(KEY);
  const modelName = await getModelName();
  return genAI.getGenerativeModel({ model: modelName });
}

// ---------- Routes ----------
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", skills: INDEX.length, hasKey: !!KEY, uptime: process.uptime() });
});

app.get("/api/skills", (req, res) => {
  const q = String(req.query.q || "").trim();
  let list = INDEX;
  if (q) list = pickSkills(q);
  res.json({
    total: INDEX.length,
    skills: list.map((s) => ({ name: s.name, description: s.description || s.preview.slice(0, 120) })),
  });
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
  let model;
  try { model = await getModel(); } catch (_) { return res.status(500).json({ error: "Gagal menyiapkan model." }); }

  const prompt = buildPrompt(q, sess, top);
  // Konten multimodal: teks diikuti gambar (vision)
  const contentParts = [{ text: prompt }];
  for (const f of sess.files) {
    if (f.image && f.image.base64) {
      contentParts.push({ inlineData: { mimeType: f.image.mime, data: f.image.base64 } });
    }
  }
  try {
    const r = contentParts.length > 1
      ? await model.generateContent(contentParts)
      : await model.generateContent(prompt);
    const answer = r.response.text();
    sess.history.push({ q, a: answer.slice(0, 3000) });
    pruneSession(sess);
    res.json({
      answer,
      skills: top.map((x) => x.name),
      files: sess.files.map(fileSummary),
      sessionId,
      model: _resolvedModel,
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get("/api/info", async (req, res) => {
  let modelName = _resolvedModel || null;
  if (!modelName) { try { await getModelName(); modelName = _resolvedModel; } catch (_) {} }
  res.json({
    name: "gcp-agent",
    skills: INDEX.length,
    hasKey: !!KEY,
    model: modelName || "menunggu resolusi",
    limitFiles: 5,
    limitFileMB: 20,
    maxQuestion: MAX_LEN,
    uptime: Math.round(process.uptime()),
    version: "2.1.0",
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

app.get("/", (req, res) => { res.send(HTML); });

let HTML = "<!DOCTYPE html><html><head><meta charset=\"utf-8\"><title>Memuat…</title></head><body style=\"font-family:sans-serif;background:#0b1220;color:#e5edf7\"><h2 style=\"padding:40px\">Memuat antarmuka agen…</h2></body></html>";
try { HTML = fs.readFileSync(path.join(__dirname, "www.html"), "utf8"); } catch (_) {}

if (require.main === module) {
  app.listen(PORT, () => console.log("Server jalan di port " + PORT + " (skill: " + INDEX.length + ")"));
}
module.exports = app;
