const { GoogleGenerativeAI } = require("@google/generative-ai");
const fs = require("fs");
const path = require("path");
const readline = require("readline");

const KEY = process.env.GEMINI_API_KEY;
if (!KEY) { console.log('Set dulu: export GEMINI_API_KEY="kunci"'); process.exit(1); }

const REPO = path.resolve(__dirname, "..");
const SKILLS_DIR = path.join(REPO, "skills");
const MODEL = process.env.GEMINI_MODEL || "gemini-3.6-flash";

const model = new GoogleGenerativeAI(KEY).getGenerativeModel({ model: MODEL });

function findSkills(dir, out = []) {
  for (const name of fs.readdirSync(dir)) {
    const p = path.join(dir, name);
    if (fs.statSync(p).isDirectory()) findSkills(p, out);
    else if (name === "SKILL.md") out.push(p);
  }
  return out;
}

const index = findSkills(SKILLS_DIR).map(f => ({
  f,
  name: f.replace(SKILLS_DIR + "/", "").replace("/SKILL.md", ""),
  preview: fs.readFileSync(f, "utf-8").slice(0, 800)
}));
console.log("Skill dimuat: " + index.length);

const STOP = new Set(["apa","itu","ini","dan","atau","di","ke","dari","pada","yang","dengan","untuk","bagaimana","cara","buat","membuat","adalah","tolong","the","a","an","of","to","in","on","for","how","what","is","with","and"]);

function tokens(q) {
  return q.toLowerCase().split(/[^a-z0-9]+/).filter(w => w.length > 2 && !STOP.has(w));
}

function pick(q) {
  const words = tokens(q);
  return index.map(it => {
    const nameHay = it.name.toLowerCase().replace(/[^a-z0-9]+/g, " ");
    const prevHay = it.preview.toLowerCase();
    let s = 0;
    for (const w of words) {
      if (nameHay.includes(w)) s += 3;
      if (prevHay.includes(w)) s += 1;
    }
    return { ...it, s };
  }).sort((a, b) => b.s - a.s);
}

const memory = [];

async function ask(q) {
  const top = pick(q).filter(x => x.s > 0).slice(0, 3);
  const context = top.length
    ? top.map(x => "=== SKILL: " + x.name + " ===\n" + fs.readFileSync(x.f, "utf-8")).join("\n\n")
    : "(tidak ada skill spesifik; gunakan pengetahuan Google Cloud umum)";
  const riwayat = memory.slice(-4).map(m => "User: " + m.q + "\nAgen: " + m.a).join("\n");
  const r = await model.generateContent(
    "Kamu agen AI ahli Google Cloud. Jawab dalam bahasa Indonesia, ringkas namun lengkap.\n\nRiwayat percakapan:\n" +
    (riwayat || "(awal)") + "\n\nKonteks skill:\n" + context + "\n\nPertanyaan: " + q
  );
  const answer = r.response.text();
  memory.push({ q, a: answer.slice(0, 600) });
  if (top.length) console.log("[skill dipakai: " + top.map(x => x.name).join(" | ") + "]");
  return answer;
}

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
console.log("Agen v2 siap! (memori aktif) Ketik 'exit' untuk keluar.");
(function loop() {
  rl.question("Anda: ", async (q) => {
    q = q.trim();
    if (!q || q === "exit") return rl.close();
    try { console.log("\nAgen: " + (await ask(q)) + "\n"); }
    catch (e) { console.log("Error: " + e.message); }
    loop();
  });
})();
