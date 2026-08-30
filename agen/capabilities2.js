// EVOLUSI TINGKAT 2: restrukturisasi dari 449+ skill menjadi:
//   PRIME  (4 domain evolusi tertinggi)
//   COMBOS (16 kemampuan kombinasi nyata lintas-ekosistem)
// Setiap entri adalah "kemampuan nyata" — bukan daftar statis, melainkan
// kompetensi gabungan yang mengarahkan agen memakai tool + knowledge base.

const PRIMES = [
  {
    id: "prime-cloud-platform",
    name: "Cloud & Infrastructure Evolution",
    emoji: "☁️",
    keywords: ["cloud", "infrastructure", "deploy", "container", "kubernetes", "serverless", "terraform", "gcp", "aws", "azure", "infra", "scalability"],
    domains: ["cloud-platform-full-stack", "database-ops-engineering", "cloud-data-security-fusion"],
    insight: "Arsitek cloud end-to-end: infrastruktur sebagai kode, platform yang dapat diskalakan, database terkelola, dan keamanan data menyatu sejak desain — bukan lapisan terpisah.",
  },
  {
    id: "prime-data-ai",
    name: "Data & AI Evolution",
    emoji: "🤖",
    keywords: ["data", "ai", "ml", "pipeline", "bigquery", "rag", "model", "training", "inference", "analytics", "vector", "llm"],
    domains: ["data-engineering-pipeline", "ml-ai-engineer", "cloud-data-security-fusion"],
    insight: "Evolusi data menjadi intelijen: pipeline berkualitas melahirkan model yang dapat di-deploy, dimonitor, dan diamankan — siklus data→AI→keputusan yang berkelanjutan.",
  },
  {
    id: "prime-software-product",
    name: "Software & Product Evolution",
    emoji: "🧩",
    keywords: ["app", "frontend", "backend", "product", "web", "mobile", "api", "design", "fullstack", "react", "ui", "ux"],
    domains: ["fullstack-app-builder", "mobile-app-engineering", "dev-excellence-workflow", "web3-blockchain-dev"],
    insight: "Produk digital yang utuh: dari desain & UX, rekayasa frontend/backend/API, kualitas pengembangan, hingga teknologi baru (web3/mobile) — satu alur produk, bukan silo.",
  },
  {
    id: "prime-secobs-agentics",
    name: "Security, Observability & Agentic Evolution",
    emoji: "🛡️",
    keywords: ["security", "threat", "observability", "sre", "monitoring", "agent", "automation", "reliability", "audit", "compliance"],
    domains: ["security-threat-hunting", "site-reliability-observability", "agentic-ai-orchestration"],
    insight: "Operasi yang aman, terukur, dan otonom: ancaman dimitigasi proaktif, sistem diobservasi berbasis SLO, dan agen/otomasi menjalankan remediasi — keandalan sebagai produk.",
  },
];

const COMBOS = [
  {
    id: "combo-multi-agent-research",
    name: "Multi-Agent Deep Research",
    emoji: "🔬",
    keywords: ["research", "riset", "deep dive", "investigate", "competitive", "market", "analisis pasar", "citations", "laporan"],
    skills: ["deep-research", "market-research", "competitive-platform-analysis", "competitive-report-structure", "exa-search", "documentation-lookup"],
    insight: "Riset mendalam multi-sumber yang diorkestrasi banyak agen: cari → baca → sintesis → laporan dengan sumber, dalam bahasa yang jelas.",
  },
  {
    id: "combo-token-efficiency",
    name: "Token-Efficient Engineering",
    emoji: "⚡",
    keywords: ["token", "efisiensi", "efisien", "ringkas", "konteks", "compression", "lazy", "yagni", "minimal", "hemat"],
    skills: ["caveman", "caveman-compress", "caveman-discover", "caveman-evidence-review", "ponytail", "ponytail-audit", "ponytail-debt", "ponytail-review"],
    insight: "Rekayasa dengan biaya token terendah: jawab padat, potong over-engineering, hapus kode mati & abstraksi tak perlu, buktikan tiap baris — kualitas naik, token turun drastis.",
  },
  {
    id: "combo-mcp-tool-builder",
    name: "MCP Servers & Agent Tooling",
    emoji: "🔌",
    keywords: ["mcp", "tool", "server", "plugin", "integration", "function calling", "konektor", "api tool"],
    skills: ["mcp-server-patterns", "everything-claude-code", "dmux-workflows", "api-design", "coding-standards"],
    insight: "Bangun dan integrasikan alat agen: pola server MCP yang aman, workflow berulang yang terotomasi, dan API yang dirancang untuk dipakai agen, bukan hanya manusia.",
  },
  {
    id: "combo-ai-native-app",
    name: "AI-Native App Builder",
    emoji: "🧠",
    keywords: ["ai app", "llm app", "chatbot", "genai", "ai native", "apk", "aplikasi ai", "generative ui"],
    skills: ["frontend-patterns", "backend-patterns", "api-design", "nextjs-turbopack", "ui-ux-pro-max", "fal-ai-media"],
    insight: "Aplikasi yang lahir dengan AI sebagai inti: UI yang manusiawi, backend/API yang siap generatif, media AI (gambar/video), dan pengalaman pengguna yang mulus.",
  },
  {
    id: "combo-e2e-quality",
    name: "E2E Quality & Benchmark",
    emoji: "🧪",
    keywords: ["test", "testing", "e2e", "quality", "benchmark", "regression", "qa", "verifikasi", "evaluasi"],
    skills: ["e2e-testing", "benchmark-methodology", "coding-standards", "agent-introspection-debugging", "test-driven-development"],
    insight: "Kualitas terukur: benchmark & evaluasi metodis, E2E otomatis, standar koding tegas, dan agen meng-inspeksi perilaku sendiri sebelum menyerahkan hasil.",
  },
  {
    id: "combo-growth-content",
    name: "Growth, Brand & Content Engine",
    emoji: "📈",
    keywords: ["marketing", "brand", "content", "seo", "copywriting", "konten", "growth", "social", "outreach", "publikasi"],
    skills: ["article-writing", "brand-discovery", "brand-voice", "content-engine", "crosspost", "investor-materials", "investor-outreach"],
    insight: "Mesin pertumbuhan: temukan identitas brand, produksi konten berkarakter di banyak platform, dan bangun materi yang menarik investor & pasar secara konsisten.",
  },
  {
    id: "combo-runtime-performance",
    name: "Modern Runtime & Performance",
    emoji: "🚀",
    keywords: ["runtime", "bun", "nextjs", "performansi", "kecepatan", "bundle", "turbopack", "optimasi", "startup"],
    skills: ["bun-runtime", "nextjs-turbopack", "backend-patterns", "frontend-patterns", "application-performance"],
    insight: "Kinerja maksimal di runtime modern: pilih runtime tepat, optimasi bundle/build, dan pola backend/frontend yang lahir cepat — latensi rendah, skala tinggi.",
  },
  {
    id: "combo-agent-systems",
    name: "Agent Systems & Orchestration",
    emoji: "🤖",
    keywords: ["agent", "subagent", "orchestration", "delegate", "task decomposition", "parallel", "workflow agen", "crew"],
    skills: ["agent-sort", "agent-introspection-debugging", "cavecrew", "everything-claude-code", "agent-orchestration", "subagent-driven-development"],
    insight: "Sistem multi-agen produksi: pecah tugas, delegasikan ke subagen yang tepat, koordinasikan hasil paralel, dan jaga konteks tetap ramping sepanjang eksekusi.",
  },
  {
    id: "combo-research-ai-pipeline",
    name: "Research-to-AI Pipeline",
    emoji: "🧭",
    keywords: ["mle", "research pipeline", "ml workflow", "eksperimen", "evaluation", "benchmark model", "data science workflow"],
    skills: ["mle-workflow", "benchmark-methodology", "deep-research", "frontend-slides", "gcp-data-pipelines"],
    insight: "Dari riset ke model produksi: alur MLE yang terstruktur, benchmark ketat, eksperimen terdokumentasi, dan hasil disajikan sebagai laporan/presentasi yang meyakinkan.",
  },
  {
    id: "combo-rag-knowledge",
    name: "RAG & Knowledge Graph",
    emoji: "📚",
    keywords: ["rag", "knowledge graph", "retrieval", "vector", "semantic", "dokumentasi", "codebase", "embedding", "pencarian"],
    skills: ["graphify", "documentation-lookup", "exa-search", "rag-implementation", "vector-index-tuning", "everything-claude-code"],
    insight: "Pengetahuan yang selalu terjangkau: indeks kodebase & dokumen jadi grafik semantik, retrieval RAG yang presisi, dan jawaban selalu berdasar sumber nyata.",
  },
  {
    id: "combo-devtools-dx",
    name: "DevTools & Developer Experience",
    emoji: "🛠️",
    keywords: ["developer experience", "devtools", "cli", "documentation", "code standards", "dx", "tooling", "workflow dev"],
    skills: ["everything-claude-code", "coding-standards", "api-design", "documentation-lookup", "e2e-testing"],
    insight: "Pengalaman pengembang kelas dunia: dokumentasi hidup, CLI & alat yang nyaman, standar koding konsisten, dan umpan balik cepat dari pengujian otomatis.",
  },
  {
    id: "combo-media-generation",
    name: "AI Media & Presentation",
    emoji: "🎬",
    keywords: ["media", "image", "video", "presentasi", "slides", "design visual", "ai art", "konten visual", "multimedia"],
    skills: ["fal-ai-media", "frontend-slides", "content-engine", "ui-ux-pro-max", "article-writing"],
    insight: "Produksi media berbantuan AI: gambar/video generatif, slide yang dirancang baik, dan konten visual yang konsisten dengan brand — cepat dan profesional.",
  },
  {
    id: "combo-agentic-devops",
    name: "Agentic DevOps",
    emoji: "🤖",
    keywords: ["devops agent", "ci/cd otomatis", "agentic pipeline", "release", "deploy otomatis", "self-healing", "ops agen"],
    skills: ["cicd-automation", "code-review", "systematic-debugging", "e2e-testing", "coding-standards"],
    insight: "DevOps yang dijalankan agen: pipeline CI/CD, review otomatis, debugging sistematis, dan remediasi mandiri — manusia mengawasi, agen mengeksekusi.",
  },
  {
    id: "combo-mobile-cloud",
    name: "Mobile × Cloud Backend",
    emoji: "📱",
    keywords: ["mobile", "android", "ios", "react native", "backend cloud", "apk", "aplikasi mobile", "push", "webview"],
    skills: ["react-native-architecture", "android", "mobile", "backend-development", "api-design-principles", "cloud-run-basics"],
    insight: "Aplikasi mobile ringan dengan mesin cloud: UI WebView/native yang minim, backend serveless, API aman, dan semua proses berat terjadi di cloud — APK tetap kecil.",
  },
  {
    id: "combo-web3-secure",
    name: "Web3 Secure Engineering",
    emoji: "⛓️",
    keywords: ["web3", "blockchain", "smart contract", "solidity", "wallet", "keamanan kontrak", "defi", "audit"],
    skills: ["web3-testing", "solidity-security", "blockchain-web3", "security-requirement-extraction", "threat-mitigation-mapping"],
    insight: "Kontrak pintar & dApps yang aman sejak desain: pahami attack vectors, uji menyeluruh, dan terapkan threat modeling sebelum jaringan utama.",
  },
  {
    id: "combo-secure-data-pipeline",
    name: "Secure Data Pipeline",
    emoji: "🗃️",
    keywords: ["data security", "pipeline aman", "encryption", "pii", "data governance", "audit data", "bigquery aman"],
    skills: ["gcs-security-assessment", "accidental-data-loss-prevention", "signed-audit-trails-recipe", "bigquery-basics", "threat-mitigation-mapping", "data-engineering"],
    insight: "Pipeline data yang aman end-to-end: enkripsi, kontrol akses, audit trail, dan deteksi anomali — data mengalir cepat tanpa mengorbankan kepatuhan.",
  },
];

function pickEvolution(q, allSkillNames, opts = {}) {
  const words = q.toLowerCase();
  const maxPrime = opts.maxPrime || 1;
  const maxCombo = opts.maxCombo || 2;
  const pool = new Set(allSkillNames);

  const scoreBy = (list, weightKW = 2, weightSkill = 0.5) =>
    list.map((item) => {
      let s = 0;
      for (const kw of item.keywords || []) if (words.includes(kw)) s += weightKW;
      for (const sk of item.skills || []) if (pool.has(sk)) s += weightSkill;
      return { item, s };
    }).filter((x) => x.s > 0).sort((a, b) => b.s - a.s);

  const primes = scoreBy(PRIMES).slice(0, maxPrime).map((x) => x.item);
  const combos = scoreBy(COMBOS).filter((x) => !primes.some((p) => p.domains && p.domains.includes(x.item.id))).slice(0, maxCombo).map((x) => x.item);
  return { primes, combos };
}

module.exports = { PRIMES, COMBOS, pickEvolution };
