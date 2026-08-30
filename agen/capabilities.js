// Fusion engine: mengubah 449 skill menjadi "kemampuan" tingkat tinggi (meta-skill).
// Tiap kemampuan menggabungkan banyak skill serupa + menambahkan perspektif lintas-domain.

const CAPS = [
  {
    id: "cloud-platform-full-stack",
    name: "Full-Stack Cloud Engineering",
    emoji: "☁️",
    keywords: ["deploy", "cloud run", "kubernetes", "gke", "infrastructure", "terraform", "container", "cloud build", "gcloud"],
    skills: ["cloud-run-basics", "cloud-build-basics", "gke-manifest-generation", "cloud-infrastructure", "terraform-module-library", "cicd-automation"],
  },
  {
    id: "data-engineering-pipeline",
    name: "End-to-End Data Engineering",
    emoji: "📊",
    keywords: ["bigquery", "dataflow", "pipeline", "etl", "spark", "data", "sql", "warehouse", "dbt"],
    skills: ["bigquery-basics", "bigquery-sql", "gcp-dataflow", "gcp-data-pipelines", "data-engineering", "dbt-bigquery", "dataform-bigquery", "spark-optimization"],
  },
  {
    id: "database-ops-engineering",
    name: "Database Ops & Performance",
    emoji: "🗄️",
    keywords: ["alloydb", "cloud sql", "database", "spanner", "postgres", "mysql", "sql server", "oracle", "query"],
    skills: ["alloydb-postgres-admin", "cloud-sql-postgres-admin", "cloud-sql-mysql-admin", "spanner-data", "from-firestore-spanner", "database-design", "sql-optimization-patterns", "database-cloud-optimization"],
  },
  {
    id: "security-threat-hunting",
    name: "Security & Threat Hunting",
    emoji: "🔐",
    keywords: ["security", "threat", "firewall", "vulnerability", "iam", "audit", "attack", "compliance", "secrets"],
    skills: ["gcloud-auth-verification", "security-requirement-extraction", "sast-configuration", "threat-mitigation-mapping", "secrets-management", "attack-tree-construction", "stride-analysis-patterns", "signed-audit-trails-recipe"],
  },
  {
    id: "fullstack-app-builder",
    name: "Full-Stack App Builder",
    emoji: "🧩",
    keywords: ["app", "frontend", "backend", "web", "react", "api", "fullstack", "build", "javascript"],
    skills: ["frontend-design", "backend-development", "api-design-principles", "react-state-management", "microservices-patterns", "web-component-design", "responsive-design", "typescript-advanced-types"],
  },
  {
    id: "ml-ai-engineer",
    name: "ML & AI Engineering",
    emoji: "🤖",
    keywords: ["machine learning", "ml", "ai", "model", "training", "rag", "genai", "llm", "tensorflow", "vector", "gemini"],
    skills: ["bigquery-ai-ml", "rag-implementation", "vector-index-tuning", "ml-best-practices", "notebook-guidance", "vision-sft", "claude-api", "retrieving-developer-knowledge"],
  },
  {
    id: "site-reliability-observability",
    name: "SRE & Observability",
    emoji: "🛰️",
    keywords: ["monitoring", "observability", "sre", "logging", "alerting", "latency", "reliability", "uptime", "metrics"],
    skills: ["cloud-monitoring-promql-query", "cloud-logging-query-generation", "slo-implementation", "pii-redaction-for-tracing", "service-mesh-observability", "api-testing-observability", "application-performance", "trace-to-training-data"],
  },
  {
    id: "dev-excellence-workflow",
    name: "Developer Excellence & Workflow",
    emoji: "⚙️",
    keywords: ["refactor", "refactoring", "code review", "test", "tdd", "debugging", "architecture", "clean", "quality", "plan"],
    skills: ["systematic-debugging", "code-review", "test-driven-development", "code-refactoring", "writing-plans", "codebase-design", "verification-before-completion", "domain-modeling"],
  },
  {
    id: "cloud-data-security-fusion",
    name: "Cloud Data + Security Fusion",
    emoji: "🧬",
    keywords: ["data security", "encryption", "dataloss", "gcs", "storage security", "compliance", "audit data"],
    skills: ["gcs-security-assessment", "accidental-data-loss-prevention", "signed-audit-trails-recipe", "firestore-data", "bigquery-basics", "threat-mitigation-mapping"],
    note: "Menggabungkan knowledge data-engineering dengan security untuk pengamanan pipeline data end-to-end.",
  },
  {
    id: "agentic-ai-orchestration",
    name: "Agentic AI Orchestration",
    emoji: "🧠",
    keywords: ["agent", "orchestration", "subagent", "workflow", "multi-agent", "automation", "parallel", "team"],
    skills: ["subagent-driven-development", "agent-orchestration", "task-coordination-strategies", "workflow-orchestration-patterns", "dispatching-parallel-agents", "team-composition-patterns", "agent-teams", "building-ai-agents"],
  },
  {
    id: "web3-blockchain-dev",
    name: "Web3 & Blockchain Dev",
    emoji: "⛓️",
    keywords: ["web3", "blockchain", "smart contract", "solidity", "ethereum", "wallet", "defi"],
    skills: ["web3-testing", "solidity-security", "blockchain-web3"],
  },
  {
    id: "mobile-app-engineering",
    name: "Mobile App Engineering",
    emoji: "📱",
    keywords: ["android", "mobile", "react native", "ios", "app development"],
    skills: ["react-native-architecture", "react-native-design", "google-mobile-ads-get-started", "android", "mobile"],
  },
];

// Map kemampuan -> daftar nama skill yang terindeks (untuk dipilih saat query)
const KEYWORD_INDEX = CAPS.map((c, i) => ({ ...c, idx: i }));

function pickCapabilities(q, allSkills, max = 2) {
  const words = q.toLowerCase();
  const scored = KEYWORD_INDEX.map((cap) => {
    let s = 0;
    for (const kw of cap.keywords) {
      if (words.includes(kw)) s += 2;
    }
    // bonus jika nama skill relevan muncul
    const inNames = cap.skills.filter((sk) => allSkills.some((x) => x.name.includes(sk)));
    s += inNames.length * 0.5;
    return { cap, s };
  }).filter((x) => x.s > 0).sort((a, b) => b.s - a.s);
  return scored.slice(0, max).map((x) => x.cap);
}

module.exports = { CAPS, pickCapabilities };
