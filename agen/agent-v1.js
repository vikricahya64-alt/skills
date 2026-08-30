const { GoogleGenerativeAI } = require("@google/generative-ai");
const fs = require("fs");
const path = require("path");
const readline = require("readline");

const KEY = process.env.GEMINI_API_KEY;
if (!KEY) {
  console.log('API key belum ada. Jalankan: GEMINI_API_KEY="kunci-anda" node agent.js');
  process.exit(1);
}

const REPO = path.resolve(__dirname, "..");
const SKILLS_DIR = path.join(REPO, "skills");

const genAI = new GoogleGenerativeAI(KEY);
const model = genAI.getGenerativeModel({ model: process.env.GEMINI_MODEL || "gemini-2.5-flash" });

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
  preview: fs.readFileSync(f, "utf-8").slice(0, 500)
}));
console.log("Skill dimuat: " + index.length);

function pick(q) {
  const words = q.toLowerCase().split(/\s+/).filter(w => w.length > 2);
  return index
    .map(it => {
      const hay = (it.f + " " + it.preview).toLowerCase();
      return { ...it, s: words.filter(w => hay.includes(w)).length };
    })
    .sort((a, b) => b.s - a.s);
}

async function ask(q) {
  const top = pick(q).filter(x => x.s > 0).slice(0, 2);
  const context = top.length
    ? top.map(x => "=== SKILL: " + x.f + " ===\n" + fs.readFileSync(x.f, "utf-8")).join("\n")
    : "Daftar skill tersedia: " + index.map(x => x.f).join(", ");
  const r = await model.generateContent(
    "Kamu adalah agen AI ahli Google Cloud. Jawab dalam bahasa Indonesia.\n\nKonteks:\n" +
      context + "\n\nPertanyaan: " + q
  );
  return r.response.text();
}

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
console.log("Agen siap! Ketik 'exit' untuk keluar.");
(function loop() {
  rl.question("Anda: ", async (q) => {
    q = q.trim();
    if (!q || q === "exit") return rl.close();
    try { console.log("\nAgen: " + (await ask(q)) + "\n"); }
    catch (e) { console.log("Error: " + e.message); }
    loop();
  });
})();
