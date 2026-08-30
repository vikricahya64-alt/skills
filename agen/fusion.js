// MESIN RESTRUKTURISASI + FUSION penuh:
// Memetakan SEMUA skill (tanpa terkecuali) ke hierarki kemampuan nyata.
// Setiap skill diberi domain taksonomi + grouped ke capability relevan.
// Skill yang tak cocok domain apa pun tetap tercakup lewat auto-cluster.

const KB = require("./knowledge.js");

const DOMAINS = [
  { d: "cloud", kw: ["cloud", "deploy", "kubernetes", "gke", "container", "serverless", "cloud run", "terraform", "infra", "gcp", "cloud build", "gcloud", "vpc", "compute", "iam"] },
  { d: "data", kw: ["bigquery", "dataflow", "pipeline", "etl", "database", "data", "sql", "bigtable", "spanner", "spark", "dbt", "warehouse", "dataproc", "looker", "data studio", "analytics"] },
  { d: "ai", kw: ["machine learning", "ml ", "gemini", "llm", "ai ", "model", "vertex ai", "tensorflow", "pytorch", "rag", "vector", "genai", "embedding", "inference", "training", "agent"] },
  { d: "security", kw: ["security", "threat", "firewall", "vulnerability", "attack", "audit", "compliance", "secrets", "encryption", "iam", "sast", "crypto", "zero trust", "privacy"] },
  { d: "app", kw: ["frontend", "backend", "web", "react", "javascript", "typescript", "api", "fullstack", "mobile", "android", "ios", "ux", "ui", "design", "android", "app"] },
  { d: "devops", kw: ["ci/cd", "cicd", "observability", "monitoring", "logging", "sre", "reliability", "alerting", "metrics", "trace", "grafana", "prometheus", "testing", "test"] },
  { d: "dev", kw: ["code", "refactor", "debug", "review", "test", "refactoring", "coding", "software", "programming", "architecture", "clean code", "git"] },
  { d: "content", kw: ["content", "marketing", "brand", "seo", "writing", "blog", "social", "copywriting", "research", "email", "outreach", "sales", "product", "design docs"] },
  { d: "web3", kw: ["web3", "blockchain", "solidity", "ethereum", "smart contract", "wallet", "defi", "nft", "crypto"] },
  { d: "ops-tools", kw: ["mcp", "tool", "plugin", "integration", "cli", "command", "workflow", "automation", "documentation"] },
];

// Kata kunci luas => domain utama untuk setiap skill.
function scoreDomain(text, domain) {
  const t = " " + text.toLowerCase() + " ";
  let s = 0;
  for (const kw of domain.kw) {
    if (t.includes(kw.toLowerCase())) s += 1;
  }
  return s;
}

function classifySkill(skill) {
  const hay = skill.name + " " + (skill.description || "") + " " + (skill.keywords || []).join(" ") +
    " " + (skill.core || []).join(" ");
  const scored = DOMAINS.map((dm) => ({ dm, s: scoreDomain(hay, dm) }))
    .sort((a, b) => b.s - a.s);
  return { domain: scored[0].s > 0 ? scored[0].dm.d : "misc", score: scored[0].s };
}

// Bangun taksonomi: domain -> daftar skill tercakup.
function buildTaxonomy(cards) {
  const tax = {};
  for (const dm of DOMAINS) tax[dm.d] = [];
  tax["misc"] = [];
  const mapped = new Map();
  for (const c of cards) {
    const { domain } = classifySkill(c);
    tax[domain].push(c);
    mapped.set(c.name, domain);
  }
  return tax;
}

// Hitung coverage: berapa skill masuk minimal satu capability beserta nama capability-nya.
function coverageStats(tax, caps) {
  let covered = 0;
  const cover = [];
  for (const [domain, list] of Object.entries(tax)) {
    let dd = "misc";
    for (const cap of caps) {
      const hay = (cap.name + " " + (cap.skills || []).join(" ") + " " + (cap.domains || []).join(" ")).toLowerCase();
      if (hay.includes(domain)) { dd = cap.name; break; }
    }
    cover.push({ domain, count: list.length, capability: dd, skills: list.map((c) => c.name) });
    covered += list.length;
  }
  return { totalSkills: covered, cover };
}

// Gabungkan taksonomi dengan PRIME+COMBOS untuk menilai cakupan, dan
// kembalikan daftar skill per kemampuan sebagai "materi canjaran" fusion.
function attachSkills(tax, items) {
  const byName = {};
  const byDomain = {};
  for (const [domain, list] of Object.entries(tax)) {
    byDomain[domain] = list;
    for (const c of list) byName[c.name] = { domain, ...c };
  }
  // Semua nama skill agak: cocokan fraksional agar daftar skill eksplisit
  // yang berupa prefix (mis. "bigquery-basics") tetap ketemu.
  const names = Object.keys(byName);
  const enriched = [];
  for (const it of items) {
    let pool = [];
    const look = (it.skills || []).concat(it.domains || []);
    for (const ref of look) {
      if (byName[ref]) { if (!pool.includes(ref)) pool.push(ref); continue; }
      // cocokan prefix/parsial
      const m = names.find((n) => n.startsWith(ref) || ref.startsWith(n) || n.includes(ref) || ref.includes(n));
      if (m && !pool.includes(m)) pool.push(m);
    }
    // tambah otomatis dari domain (10 taksonomi) yang relevan dgn teks kemampuan
    const hay = (it.name + " " + it.insight + " " + (it.domains || []).join(" ") + " " + (it.skills || []).join(" ")).toLowerCase();
    for (const domain of Object.keys(byDomain)) {
      const dkw = (domain === "ops-tools" ? "tool" : domain);
      const hit = hay.includes(domain) || hay.includes(dkw);
      // combo mewarisi juga domain dari PRIME yang menyusunnya via keywords/insight
      if (hit || !it.domains) {
        for (const c of byDomain[domain]) if (!pool.includes(c.name)) pool.push(c.name);
      }
    }
    enriched.push({ ...it, allSkills: pool.slice(0, 300) });
  }
  // JAMINAN 100%: tiap domain taksonomi harus tercakup di minimal satu kemampuan.
  const DOMAIN_CAP = {
    cloud: "prime-cloud-platform",
    data: "prime-data-ai",
    ai: "prime-data-ai",
    security: "prime-secobs-agentics",
    app: "prime-software-product",
    devops: "prime-secobs-agentics",
    dev: "prime-software-product",
    content: "combo-growth-content",
    web3: "combo-web3-secure",
    "ops-tools": "combo-mcp-tool-builder",
    misc: "combo-generalist-master",
  };
  for (const [domain, capId] of Object.entries(DOMAIN_CAP)) {
    const target = enriched.find((e) => e.id === capId);
    if (!target) continue;
    const pool = new Set(target.allSkills || []);
    for (const c of byDomain[domain] || []) pool.add(c.name);
    target.allSkills = Array.from(pool); // tanpa batas agar jaminan 100% terjaga
  }
  return enriched;
}

module.exports = { DOMAINS, classifySkill, buildTaxonomy, coverageStats, attachSkills };
