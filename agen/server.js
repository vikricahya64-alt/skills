const express = require("express");
const multer = require("multer");
const { GoogleGenerativeAI } = require("@google/generative-ai");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const app = express();
app.use(express.json({ limit: "256kb" }));

const KEY = process.env.GEMINI_API_KEY;
const PORT = process.env.PORT || 3000;
const MAX_LEN = 2000;
const MAX_FILE = 5 * 1024 * 1024; // 5 MB
const MAX_HISTORY = 20;

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE, files: 3 },
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
  const name = (fm.match(/^name:\s*(.+)$/m) || [])[1] || "";
  const desc = (fm.match(/^description:\s*(.+)$/m) || [])[1] || "";
  return { name: name.trim(), description: desc.trim().replace(/\s+/g, " ") };
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
function extractText(buffer, originalName, mime) {
  const name = (originalName || "file").toLowerCase();
  const text = buffer.toString("utf8");
  if (name.endsWith(".csv") || mime === "text/csv") {
    return { text, kind: "CSV" };
  }
  if (name.endsWith(".json") || mime === "application/json") {
    try {
      const parsed = JSON.parse(text);
      return { text: JSON.stringify(parsed, null, 2).slice(0, 200000), kind: "JSON" };
    } catch (_) { return { text, kind: "JSON (raw)" }; }
  }
  if (name.endsWith(".md")) return { text, kind: "Markdown" };
  if (name.endsWith(".log")) return { text, kind: "Log" };
  if (/\.(py|js|ts|java|kt|go|rs|c|cpp|h|sh|sql|html|css|xml|yml|yaml|tf)$/.test(name)) {
    return { text, kind: "Kode" };
  }
  // Default: teks biasa
  const cleaned = text.replace(/\u0000/g, "").trim();
  return { text: cleaned || "(file biner / tidak bisa dibaca sebagai teks)", kind: "File" };
}

function fileSummary(file) {
  return {
    name: file.name,
    kind: file.kind,
    size: file.size,
    excerpt: file.text.slice(0, 300),
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

function getModel() {
  const genAI = new GoogleGenerativeAI(KEY);
  return genAI.getGenerativeModel({
    model: process.env.GEMINI_MODEL || "gemini-3.6-flash",
  });
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
  const inlineFiles = Array.isArray(req.body && req.body.files) ? req.body.files.slice(0, 3) : [];
  for (const f of inlineFiles) {
    if (!f || typeof f.name !== "string" || typeof f.text !== "string") continue;
    const entry = {
      id: crypto.randomBytes(6).toString("hex"),
      name: f.name,
      kind: f.kind || "File",
      size: Buffer.byteLength(f.text, "utf8"),
      text: f.text.slice(0, 100000),
      mime: f.mime || "text/plain",
      inline: true,
    };
    sess.files.push(entry);
  }
  if (inlineFiles.length) pruneSession(sess);

  const top = pickSkills(q);
  let model;
  try { model = getModel(); } catch (_) { return res.status(500).json({ error: "Gagal menyiapkan model." }); }

  const prompt = buildPrompt(q, sess, top);
  try {
    const r = await model.generateContent(prompt);
    const answer = r.response.text();
    sess.history.push({ q, a: answer.slice(0, 2000) });
    pruneSession(sess);
    res.json({
      answer,
      skills: top.map((x) => x.name),
      files: sess.files.map(fileSummary),
      sessionId,
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post("/api/upload", upload.array("files", 3), (req, res) => {
  if (!req.files || !req.files.length) return res.status(400).json({ error: "Tidak ada file diunggah." });

  const sessionId = String((req.body && req.body.sessionId) || "default").slice(0, 64);
  const sess = getSession(sessionId);

  const added = [];
  for (const f of req.files) {
    const { text, kind } = extractText(f.buffer, f.originalname, f.mimetype);
    const entry = {
      id: crypto.randomBytes(6).toString("hex"),
      name: f.originalname,
      kind,
      size: f.size,
      text,
      mime: f.mimetype,
    };
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

const HTML = `<!DOCTYPE html>
<html lang="id">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Agen GCP</title>
<style>
:root{--bg:#0f172a;--panel:#1e293b;--accent:#38bdf8;--text:#e2e8f0;--muted:#94a3b8}
*{box-sizing:border-box}
body{margin:0;font-family:system-ui,-apple-system,sans-serif;background:var(--bg);color:var(--text);display:flex;flex-direction:column;height:100vh}
header{padding:12px 16px;background:var(--panel);display:flex;align-items:center;gap:10px;border-bottom:1px solid #334155}
header h1{font-size:16px;margin:0;color:var(--accent)}
#status{margin-left:auto;font-size:12px;color:var(--muted)}
#chat{flex:1;overflow-y:auto;padding:16px;display:flex;flex-direction:column;gap:12px}
.msg{max-width:88%;padding:10px 14px;border-radius:12px;line-height:1.55;white-space:pre-wrap;font-size:14px}
.user{align-self:flex-end;background:#0ea5e9;color:#fff;border-bottom-right-radius:4px}
.bot{align-self:flex-start;background:var(--panel);border:1px solid #334155;border-bottom-left-radius:4px}
.tag{display:block;margin-top:8px;font-size:11px;color:var(--accent)}
.filespan{display:inline-block;margin-top:6px;font-size:11px;background:#334155;border-radius:6px;padding:2px 8px;color:var(--muted)}
#toolbar{display:flex;gap:8px;padding:10px 16px;background:var(--panel);align-items:center}
#toolbar label#uploadLabel{display:inline-flex;align-items:center;gap:6px;font-size:13px;color:var(--accent);cursor:pointer;padding:8px 12px;border:1px dashed #475569;border-radius:10px}
#toolbar label#uploadLabel:hover{background:#334155}
#fileList{font-size:11px;color:var(--muted);max-width:220px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
#qbar{display:flex;gap:8px;padding:10px 16px;background:var(--panel);border-top:1px solid #334155}
input#q{flex:1;padding:12px;border-radius:10px;border:1px solid #334155;background:var(--bg);color:var(--text);font-size:15px}
button{padding:12px 18px;border-radius:10px;border:none;background:var(--accent);color:#0f172a;font-weight:bold;cursor:pointer}
button#clearBtn{background:transparent;color:var(--muted);border:1px solid #334155}
</style>
</head>
<body>
<header>
  <h1>🤖 Agen AI Google Cloud</h1>
  <span id="status">menghubungkan...</span>
</header>
<div id="chat">
  <div class="msg bot">Halo! Saya agen AI Google Cloud. Tanyakan apa saja soal GCP, atau unggah file (CSV/JSON/Markdown/log/kode) untuk dianalisis.</div>
</div>
<div id="toolbar">
  <label id="uploadLabel">📎 Upload file
    <input id="fileInput" type="file" multiple style="display:none">
  </label>
  <span id="fileList"></span>
</div>
<form id="qbar" onsubmit="return kirim(event)">
  <input id="q" placeholder="Tanya soal Google Cloud..." autocomplete="off">
  <button type="submit">Kirim</button>
  <button type="button" id="clearBtn">Reset</button>
</form>
<script>
const SID = 's-' + Math.random().toString(36).slice(2);
let fsState = []; // {name, kind, text}
function esc(s){const d=document.createElement('div');d.textContent=s;return d.innerHTML;}
function add(cls, text){
  const d=document.createElement('div');
  d.className='msg '+cls;
  d.innerHTML=esc(text);
  document.getElementById('chat').appendChild(d);
  d.scrollIntoView(false);
  return d;
}
function showStatus(t){document.getElementById('status').textContent=t;}
function renderFiles(){
  document.getElementById('fileList').textContent =
    fsState.length ? '📄 '+fsState.map(f=>f.name).join(', ') : '';
}
function kindOf(name){
  name=(name||'').toLowerCase();
  if(name.endsWith('.csv'))return 'CSV';
  if(name.endsWith('.json'))return 'JSON';
  if(name.endsWith('.md'))return 'Markdown';
  if(name.endsWith('.log'))return 'Log';
  if(/\.(py|js|ts|java|kt|go|rs|c|cpp|h|sh|sql|html|css|xml|yml|yaml|tf)$/.test(name))return 'Kode';
  return 'File';
}
async function uploadFiles(files){
  if(!files.length) return;
  showStatus('membaca file...');
  try{
    const parsed=[];
    for(const f of files){
      const text=await f.text();
      parsed.push({name:f.name, kind:kindOf(f.name), text});
    }
    fsState=parsed;
    renderFiles();
    add('bot','✅ File siap dianalisis: '+parsed.map(f=>f.name+' ('+f.kind+')').join(', ')+'. Sekarang tanyakan sesuatu tentang file itu.');
    showStatus('siap');
  }catch(e){ showStatus('gagal'); add('bot','⚠️ Gagal baca file: '+e.message); }
}
document.getElementById('fileInput').addEventListener('change', e=>uploadFiles(e.target.files));
document.getElementById('clearBtn').addEventListener('click', async ()=>{
  await fetch('/api/clear',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({sessionId:SID})});
  fsState=[]; renderFiles();
  showStatus('sesi direset');
});
async function kirim(e){
  e.preventDefault();
  const q=document.getElementById('q').value.trim();
  if(!q) return false;
  add('user', q);
  document.getElementById('q').value='';
  const bot=add('bot', '⏳ berpikir...');
  showStatus('memproses di cloud...');
  try{
    const body=JSON.stringify({question:q, sessionId:SID, files:fsState});
    const r=await fetch('/ask',{method:'POST',headers:{'Content-Type':'application/json'},body});
    const d=await r.json();
    if(d.error) throw new Error(d.error);
    bot.innerHTML=esc(d.answer);
    if(d.skills && d.skills.length){
      const t=document.createElement('span');
      t.className='tag';
      t.textContent='📚 Skill: '+d.skills.join(', ');
      bot.appendChild(t);
    }
    if(d.files && d.files.length){
      const f=document.createElement('span');
      f.className='filespan';
      f.textContent='📎 Terlampir: '+d.files.map(x=>x.name).join(', ');
      bot.appendChild(f);
    }
    showStatus('siap');
  }catch(err){ bot.innerHTML='⚠️ Error: '+esc(err.message); showStatus('error'); }
  return false;
}
(async()=>{
  try{
    const h=await fetch('/api/health');
    const d=await h.json();
    showStatus('✅ '+d.skills+' skill siap');
  }catch(_){ showStatus('offline'); }
})();
</script>
</body>
</html>`;

if (require.main === module) {
  app.listen(PORT, () => console.log("Server jalan di port " + PORT + " (skill: " + INDEX.length + ")"));
}
module.exports = app;
