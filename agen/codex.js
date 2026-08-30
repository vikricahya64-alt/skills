// Codex-like execution engine: memberi agen "tangan" — baca/tulis file, jalan kode, akses web.
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { exec } = require("child_process");

const WORKSPACES = new Map(); // sessionId -> { dir, created }
const MAX_OUT = 20000; // batas output tool (char)
const MAX_CMD_MS = 20000; // timeout perintah

function wsDir(sessionId) {
  const safe = String(sessionId || "default").replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 48) || "default";
  if (!WORKSPACES.has(safe)) {
    const dir = path.join("/tmp", "gcp-ws-" + safe + "-" + crypto.randomBytes(3).toString("hex"));
    fs.mkdirSync(dir, { recursive: true });
    WORKSPACES.set(safe, { dir, created: Date.now() });
  }
  return WORKSPACES.get(safe).dir;
}

function safeJoin(dir, rel) {
  const p = path.resolve(dir, String(rel || "").replace(/^\/+/, ""));
  if (p !== dir && !p.startsWith(dir + path.sep)) throw new Error("path di luar workspace");
  return p;
}

function listTree(dir, depth = 0) {
  if (depth > 3) return [];
  let out = [];
  let entries = [];
  try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch (_) { return out; }
  for (const e of entries) {
    if (e.name.startsWith(".") && e.name !== ".git") continue;
    if (e.name === "node_modules") continue;
    const full = path.join(dir, e.name);
    const rel = path.relative(dir, full);
    if (e.isDirectory()) {
      out.push(rel + "/");
      out = out.concat(listTree(full, depth + 1).map((x) => rel + "/" + x));
    } else {
      out.push(rel + " (" + fs.statSync(full).size + "B)");
    }
    if (out.length > 400) break;
  }
  return out;
}

async function runShell(cmd, sessionId) {
  const dir = wsDir(sessionId);
  return new Promise((resolve) => {
    exec(cmd, { cwd: dir, timeout: MAX_CMD_MS, maxBuffer: MAX_OUT * 4, shell: "/bin/bash" }, (err, stdout, stderr) => {
      const out = String(stdout || "") + (stderr ? "\n[stderr]\n" + stderr : "");
      resolve({
        exitCode: err ? (err.code === null ? 1 : err.code) : 0,
        output: out.slice(0, MAX_OUT),
        error: err ? String(err.message).slice(0, 300) : "",
      });
    });
  });
}

async function toolRunner(tool, args, sessionId) {
  const dir = wsDir(sessionId);
  try {
    switch (tool) {
      case "ls": {
        const sub = args.path ? safeJoin(dir, args.path) : dir;
        return { ok: true, result: listTree(sub).join("\n") || "(kosong)" };
      }
      case "read": {
        const p = safeJoin(dir, args.path);
        if (!fs.existsSync(p)) return { ok: false, error: "File tidak ada: " + args.path };
        const t = fs.readFileSync(p, "utf8");
        return { ok: true, result: t.slice(0, MAX_OUT) };
      }
      case "write": {
        const p = safeJoin(dir, args.path);
        fs.mkdirSync(path.dirname(p), { recursive: true });
        fs.writeFileSync(p, String(args.content ?? ""));
        return { ok: true, result: "Tersimpan " + p.replace(dir, ".") + " (" + String(args.content ?? "").length + " char)" };
      }
      case "bash": {
        const out = await runShell(args.command || "", sessionId);
        return out.exitCode === 0 ? { ok: true, result: out.output || "(selesai tanpa output)" }
                                  : { ok: false, result: out.output, error: out.error };
      }
      case "fetch": {
        const url = String(args.url || "");
        if (!/^https?:\/\//i.test(url)) return { ok: false, error: "URL harus http(s)" };
        const ctrl = new AbortController();
        const to = setTimeout(() => ctrl.abort(), 12000);
        try {
          const resp = await fetch(url, { signal: ctrl.signal, headers: { "User-Agent": "gcp-agent-coder/1.0" } });
          const text = await resp.text();
          return { ok: resp.ok, result: "HTTP " + resp.status + " " + resp.statusText + "\n" + text.slice(0, MAX_OUT), error: resp.ok ? "" : "status " + resp.status };
        } finally { clearTimeout(to); }
      }
      case "kb": {
        const KB = require("./knowledge.js");
        const cards = KB.loadCards();
        const picks = KB.pickCards(args.query || "", cards, args.max || 4);
        return {
          ok: true,
          result: picks.map((c) => KB.formatCard(c, 900)).join("\n\n") || "(tidak ada skill cocok)",
        };
      }
      default:
        return { ok: false, error: "Tool tidak dikenal: " + tool };
    }
  } catch (e) {
    return { ok: false, error: String((e && e.message) || e).slice(0, 300) };
  }
}

const TOOL_LIST = [
  { name: "ls", desc: "Daftar file dalam workspace sesi (args: path opsional)" },
  { name: "read", desc: "Baca isi file di workspace (args: path)" },
  { name: "write", desc: "Tulis/ubah file di workspace (args: path, content)" },
  { name: "bash", desc: "Jalankan perintah shell/Node/Python di workspace (args: command)" },
  { name: "fetch", desc: "Ambil konten URL publik (args: url)" },
  { name: "kb", desc: "Cari knowledge base 769 skill (args: query, max)" },
];

function toolsPrompt() {
  return "TOOL TERSEDIA (panggil dengan JSON persis satu baris, tanpa komentar):\n" +
    TOOL_LIST.map((t) => "- " + t.name + ": " + t.desc).join("\n") +
    "\n\nFormat panggilan tool: {\"tool\":\"nama\",\"args\":{...}}\n" +
    "Bila satu pesan butuh beberapa tool, keluarkan beberapa baris JSON.\n" +
    "Setelah tool selesai, lanjutkan menjawab atau panggil tool berikutnya.\n" +
    "Selesaikan dengan blok: [SELESAI]<jawaban akhir dalam bahasa Indonesia>";
}

module.exports = { wsDir, toolRunner, TOOL_LIST, toolsPrompt };
