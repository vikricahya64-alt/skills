const express = require("express");
const { GoogleGenerativeAI } = require("@google/generative-ai");
const fs = require("fs");
const path = require("path");

const app = express();
app.use(express.json());

const KEY = process.env.GEMINI_API_KEY;
const REPO = path.resolve(__dirname, "..");
const SKILLS_DIR = path.join(REPO, "skills");
const PORT = process.env.PORT || 3000;

const genAI = new GoogleGenerativeAI(KEY);
const model = genAI.getGenerativeModel({ model: "gemini-3.6-flash" });

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

app.get("/api/skills", (req, res) => {
  res.json({ total: index.length, skills: index.map(({ name }) => name) });
});

const STOP = new Set(["apa","itu","ini","dan","atau","di","ke","dari","pada","yang","dengan","untuk","bagaimana","cara","buat","membuat","adalah","tolong","the","a","an","of","to","in","on","for","how","what","is","with","and"]);
function tokens(q){return q.toLowerCase().split(/[^a-z0-9]+/).filter(w=>w.length>2&&!STOP.has(w));}
function pick(q){
  const words=tokens(q);
  return index.map(it=>{
    const nameHay=it.name.toLowerCase().replace(/[^a-z0-9]+/g," ");
    const prevHay=it.preview.toLowerCase();
    let s=0;
    for(const w of words){ if(nameHay.includes(w))s+=3; if(prevHay.includes(w))s+=1; }
    return {...it,s};
  }).sort((a,b)=>b.s-a.s);
}

app.post("/ask", async (req,res)=>{
  const q=(req.body.question||"").trim();
  if(!q) return res.status(400).json({error:"Pertanyaan kosong"});
  try{
    const top=pick(q).filter(x=>x.s>0).slice(0,3);
    const context=top.length
      ? top.map(x=>"=== SKILL: "+x.name+" ===\n"+fs.readFileSync(x.f,"utf-8")).join("\n\n")
      : "(tidak ada skill spesifik; gunakan pengetahuan Google Cloud umum)";
    const r=await model.generateContent(
      "Kamu agen AI ahli Google Cloud. Jawab dalam bahasa Indonesia, ringkas namun lengkap.\n\nKonteks skill:\n"+context+"\n\nPertanyaan: "+q
    );
    res.json({answer:r.response.text(),skills:top.map(x=>x.name)});
  }catch(e){ res.status(500).json({error:e.message}); }
});

app.get("/", (req,res)=>{ res.send(HTML); });

const HTML = `<!DOCTYPE html>
<html lang="id">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Agen GCP</title>
<style>
body{margin:0;font-family:system-ui,sans-serif;background:#0f172a;color:#e2e8f0;display:flex;flex-direction:column;height:100vh}
header{padding:12px;background:#1e293b;text-align:center;font-weight:bold;color:#38bdf8}
#chat{flex:1;overflow-y:auto;padding:12px;display:flex;flex-direction:column;gap:10px}
.msg{max-width:85%;padding:10px 12px;border-radius:12px;line-height:1.5;white-space:pre-wrap;font-size:14px}
.user{align-self:flex-end;background:#0ea5e9;color:#fff}
.bot{align-self:flex-start;background:#1e293b;border:1px solid #334155}
.tag{display:block;margin-top:6px;font-size:11px;color:#38bdf8}
form{display:flex;gap:8px;padding:10px;background:#1e293b}
input{flex:1;padding:12px;border-radius:10px;border:1px solid #334155;background:#0f172a;color:#e2e8f0;font-size:15px}
button{padding:12px 16px;border-radius:10px;border:none;background:#38bdf8;color:#0f172a;font-weight:bold}
</style>
</head>
<body>
<header>🤖 Agen AI Google Cloud</header>
<div id="chat"></div>
<form onsubmit="return kirim(event)">
<input id="q" placeholder="Tanya soal Google Cloud..." autocomplete="off">
<button>Kirim</button>
</form>
<script>
function add(cls,text){
  var d=document.createElement('div');
  d.className='msg '+cls;
  d.textContent=text;
  document.getElementById('chat').appendChild(d);
  d.scrollIntoView(false);
  return d;
}
async function kirim(e){
  e.preventDefault();
  var q=document.getElementById('q').value.trim();
  if(!q) return false;
  add('user',q);
  document.getElementById('q').value='';
  var bot=add('bot','⏳ berpikir...');
  try{
    var r=await fetch('/ask',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({question:q})});
    var d=await r.json();
    bot.textContent=d.answer||d.error;
    if(d.skills&&d.skills.length){
      var t=document.createElement('span');
      t.className='tag';
      t.textContent='📚 '+d.skills.join(', ');
      bot.appendChild(t);
    }
  }catch(err){ bot.textContent='Error: '+err.message; }
  return false;
}
</script>
</body>
</html>`;

if (require.main === module) {
  app.listen(PORT, () => console.log("Server jalan di port " + PORT));
}
module.exports = app;
