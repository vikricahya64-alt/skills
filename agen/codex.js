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
  const shell = fs.existsSync("/bin/bash") ? "/bin/bash" : "/bin/sh";
  return new Promise((resolve) => {
    exec(cmd, { cwd: dir, timeout: MAX_CMD_MS, maxBuffer: MAX_OUT * 4, shell }, (err, stdout, stderr) => {
      const out = String(stdout || "") + (stderr ? "\n[stderr]\n" + stderr : "");
      resolve({
        exitCode: err ? (err.code === null ? 1 : err.code) : 0,
        output: out.slice(0, MAX_OUT),
        error: err ? String(err.message).slice(0, 300) : "",
      });
    });
  });
}

function sqlDb(dir) {
  // node:sqlite built-in (Node 22+).
  try {
    const { DatabaseSync } = require("node:sqlite");
    const db = new DatabaseSync(dir + "/work.sqlite");
    return db;
  } catch (e) {
    return null;
  }
}

// Mini SQL engine murni-JS sebagai fallback agar SQL TETAP tereksekusi nyata
// di runtime mana pun (tanpa node:sqlite). State dipersist ke sql-data.json.
function miniSql(dir, init, sql) {
  const file = path.join(dir, "sql-data.json");
  let tables = {};
  try { tables = JSON.parse(fs.readFileSync(file, "utf8")); } catch (_) { tables = {}; }
  const exec = (q) => {
    const stmt = String(q || "").trim().replace(/;+$/, "");
    const low = stmt.toLowerCase();
    let m;
    // CREATE TABLE
    m = low.match(/^create table (?:if not exists )?([a-z0-9_-]+)\s*\(([\s\S]*)\)$/);
    if (m) {
      const name = m[1];
      const cols = m[2].split(",").map((c) => c.trim().split(/\s+/)[0].replace(/["'`]/g, ""));
      if (!tables[name]) tables[name] = { cols, rows: [] };
      return { ok: true, result: "table " + name + " siap (" + cols.join(",") + ")" };
    }
    // INSERT INTO t (c1,c2) VALUES (v1,v2)
    m = low.match(/^insert (?:into )?([a-z0-9_-]+)\s*(?:\(([^)]*)\))?\s*values\s*\(([\s\S]*)\)$/);
    if (m) {
      const name = m[1];
      const t = tables[name];
      if (!t) return { ok: false, error: "table " + name + " belum ada" };
      const cols = m[2] ? m[2].split(",").map((c) => c.trim().replace(/["'`]/g, "")) : t.cols;
      const vals = m[3].split(",").map((v) => {
        const x = v.trim();
        if (/^'[^']*'$/i.test(x) || /^"[^"]*"$/i.test(x)) return x.slice(1, -1);
        const n = Number(x);
        return Number.isFinite(n) ? n : x;
      });
      const row = {};
      cols.forEach((c, i) => { row[c] = vals[i]; });
      t.rows.push(row);
      return { ok: true, result: "1 baris masuk ke " + name };
    }
    // SELECT cols FROM t [WHERE ...]
    m = low.match(/^select ([\s\S]+?) from ([a-z0-9_-]+)(?: where ([\s\S]+))?$/);
    if (m) {
      const t = tables[m[2]];
      if (!t) return { ok: false, error: "table " + m[2] + " belum ada" };
      let rows = t.rows;
      if (m[3]) {
        const cond = String(m[3]).trim();
        rows = rows.filter((r) => {
          const cm = cond.match(/^([a-z0-9_]+)\s*(=|<>|!=|>|<|>=|<=)\s*(.+)$/);
          if (!cm) return true;
          const v = r[cm[1]];
          let cmp = cm[3].trim();
          if (/^'[^']*'$/.test(cmp) || /^"[^"]*"$/.test(cmp)) cmp = cmp.slice(1, -1);
          const n = Number(cmp);
          cmp = Number.isFinite(n) ? n : cmp;
          switch (cm[2]) {
            case "=": return String(v) === String(cmp);
            case "!=": case "<>": return String(v) !== String(cmp);
            case ">": return Number(v) > Number(cmp);
            case "<": return Number(v) < Number(cmp);
            case ">=": return Number(v) >= Number(cmp);
            case "<=": return Number(v) <= Number(cmp);
            default: return true;
          }
        });
      }
      const sel = String(m[1]).trim();
      const agg = sel.match(/^(count|sum|avg)\s*\(([^)]*)\)$/i);
      if (agg) {
        const fn = agg[1].toLowerCase();
        const col = agg[2].trim() === "*" ? null : agg[2].trim();
        if (fn === "count") return { ok: true, result: JSON.stringify([{ count: rows.length }]) };
        const vals = rows.map((r) => (col && r[col] != null ? Number(r[col]) : 0)).filter((n) => Number.isFinite(n));
        if (fn === "sum") return { ok: true, result: JSON.stringify([{ sum: vals.reduce((a, b) => a + b, 0) }]) };
        if (fn === "avg") { const x = vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : 0; return { ok: true, result: JSON.stringify([{ avg: x }]) }; }
      }
      const cols = sel === "*" ? t.cols : sel.split(",").map((c) => c.trim());
      const out = rows.map((r) => Object.fromEntries(cols.map((c) => [c, r[c]])));
      return { ok: true, result: JSON.stringify(out).slice(0, 18000) || "[]" };
    }
    return { ok: false, error: "query tidak didukung mini-sql: " + stmt.slice(0, 120) };
  };
  const initOut = [];
  for (const q of String(init || "").split(";")) {
    if (q.trim()) { const r = exec(q); if (!r.ok) return r; initOut.push(r.result); }
  }
  const sqlOut = exec(sql);
  fs.writeFileSync(file, JSON.stringify(tables));
  if (!sqlOut.ok && !initOut.length) return sqlOut;
  return sqlOut.ok ? sqlOut : { ok: false, error: sqlOut.error || "sql gagal" };
}

function escHtml(s){return String(s==null?"":s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");}

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
      case "json": {
        const p = safeJoin(dir, args.path);
        if (!fs.existsSync(p)) return { ok: false, error: "File tidak ada: " + args.path };
        const raw = fs.readFileSync(p, "utf8");
        try {
          const parsed = JSON.parse(raw);
          const expr = args.expr || "data";
          const fn = new Function("data", "return (" + expr + ");");
          const result = fn(parsed);
          return { ok: true, result: JSON.stringify(result).slice(0, 18000) };
        } catch (e) {
          return { ok: false, error: String((e && e.message) || e).slice(0, 400) };
        }
      }
      case "csv": {
        const p = safeJoin(dir, args.path);
        if (!fs.existsSync(p)) return { ok: false, error: "File tidak ada: " + args.path };
        const raw = fs.readFileSync(p, "utf8");
        const lines = raw.split(/\r?\n/).filter((l) => l.trim() !== "");
        const headers = (lines[0] || "").split(/[,;\t]/);
        const rows = lines.slice(1).map((l) => l.split(/[,;\t]/));
        return { ok: true, result: JSON.stringify({ headers, rows: rows.slice(0, 200) }).slice(0, 18000) };
      }
      case "chart": {
        const data = args.data; // array of {name, value}
        if (!Array.isArray(data) || (args.data && data.length === 0)) {
          return { ok: false, error: "data harus berupa array {label,value} atau objek" };
        }
        const type = args.type || "bar";
        const title = args.title || "Grafik";
        const items = data.slice(0, 30);
        const labels = items.map((d) => JSON.stringify(String(d.label ?? d.name ?? "")));
        const values = items.map((d) => Number(d.value ?? d.val ?? 0));
        const max = Math.max.apply(null, values.concat([1]));
        const h = items.length ? Math.max(220, items.length * 34 + 60) : 240;
        const bars = items.map((d, i) =>
          "\n      <div class=bar-row><span class=lb>" + escHtml(String(d.label ?? d.name)) + "</span>" +
          "<div class=track><div class=fill style='height:" + Math.max(4, (Number(d.value ?? 0) / max) * 100) + "%'></div></div>" +
          "<span class=vl>" + escHtml(String(d.value)) + "</span></div>").join("");
        const css = "body{font-family:system-ui;background:#0b1220;color:#e5edf7;margin:20px} h2{color:#38bdf8}" +
          ".bar-row{display:flex;align-items:center;gap:10px;margin:6px 0;height:32px}" +
          ".lb{width:140px;font-size:12px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}" +
          ".track{flex:1;height:26px;background:#16233c;border-radius:6px;position:relative}" +
          ".fill{position:absolute;left:0;bottom:0;background:linear-gradient(90deg,#38bdf8,#818cf8);border-radius:6px;min-width:4px}" +
          ".vl{width:60px;text-align:right;font-size:12px}";
        const html = "<!DOCTYPE html><html><head><meta charset=utf-8><title>" + escHtml(title) + "</title><style>" + css +
          "</style></head><body><h2>" + escHtml(title) + "</h2>(tampilan grafik batang - render dari data nyata)<div style=margin-top:14px>" +
          bars + "</div></body></html>";
        fs.writeFileSync(path.join(dir, (args.file || "chart.html")), html);
        return { ok: true, result: "Tersimpan " + (args.file || "chart.html") + " — grafik " + type + " dengan " + items.length + " baris data" };
      }
      case "sql": {
        const db = sqlDb(dir);
        try {
          const init = String(args.init || "");
          if (db) {
            if (init.trim()) db.exec(init);
            if (args.mode === "table") return { ok: true, result: "SQL executed (mode table)" };
            const sql = String(args.sql || "");
            if (!sql.trim()) return { ok: false, error: "SQL kosong" };
            const stmt = db.prepare(sql);
            if (/^\s*(select|pragma|with|explain)/i.test(sql.trim())) {
              const rows = stmt.all();
              return { ok: true, result: JSON.stringify(rows).slice(0, 18000) || "[]" };
            }
            const info = stmt.run();
            return { ok: true, result: JSON.stringify(info) };
          }
          // Fallback murni-JS agar SQL tetap tereksekusi nyata di runtime mana pun
          return miniSql(dir, init, String(args.sql || ""));
        } catch (e) {
          return { ok: false, error: String((e && e.message) || e).slice(0, 500) };
        }
      }
      case "run": {
        // Jalankan kode/file JS nyata via Node di workspace
        let cmd;
        if (args.file) { cmd = "node " + JSON.stringify(String(args.file)); }
        else {
          const code = String(args.code || args.script || "");
          if (!code.trim()) return { ok: false, error: "tidak ada code/file untuk dijalankan" };
          cmd = "node -e " + JSON.stringify(code);
        }
        const out = await runShell(cmd, sessionId);
        return out.exitCode === 0
          ? { ok: true, result: out.output || "(selesai tanpa output)" }
          : { ok: false, result: out.output, error: out.error };
      }
      case "npm": {
        // Instal package nyata di workspace lalu lapor versi
        if (args.install) {
          const pkgs = Array.isArray(args.install) ? args.install.join(" ") : String(args.install);
          const pkgFile = path.join(dir, "package.json");
          if (!fs.existsSync(pkgFile)) fs.writeFileSync(pkgFile, JSON.stringify({ name: "gcp-ws", private: true, version: "1.0.0" }, null, 2));
          const out = await runShell("npm install " + pkgs + " --no-audit --no-fund --loglevel=error", sessionId);
          if (out.exitCode !== 0) return { ok: false, result: out.output, error: out.error || "npm install gagal" };
          return { ok: true, result: "npm install selesai: " + pkgs };
        }
        if (args.script) {
          const out = await runShell("npm run " + String(args.script), sessionId);
          return out.exitCode === 0 ? { ok: true, result: out.output || "(script selesai)" }
                                    : { ok: false, result: out.output, error: out.error };
        }
        return { ok: false, error: "pakai arg install (daftar paket) atau script (nama script)" };
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
  { name: "bash", desc: "Jalankan perintah shell/Node REAL di workspace. Wajib untuk eksekusi aktual, bukan sekedar langkah (args: command)" },
  { name: "run", desc: "Jalankan kode/file JS nyata via Node di workspace (args: code ATAU file)" },
  { name: "npm", desc: "Install package nyata di workspace lalu jalankan script (args: install [pkg...] ATAU script nama)" },
  { name: "fetch", desc: "Ambil konten URL publik (args: url)" },
  { name: "kb", desc: "Cari knowledge base 1042 skill (args: query, max)" },
  { name: "sql", desc: "Jalankan SQL nyata (SQLite atau mini-engine) di workspace (args: sql, init utk buat tabel, mode:'table' utk skip hasil)" },
  { name: "json", desc: "Parse & kueri file JSON di workspace memakai expr JS (args: path, expr)" },
  { name: "csv", desc: "Baca file CSV/TSV di workspace jadi {headers, rows} (args: path)" },
  { name: "chart", desc: "Render grafik HTML nyata dari data (args: data array {label,value}, type bar/pie, title, file)" },
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
