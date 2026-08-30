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
    id: "combo-sql-data-workflow",
    name: "SQL & Data Workflow (Multi-Step)",
    emoji: "🗃️",
    keywords: ["sql", "database", "sqlite", "query", "skema", "tabel", "rata-rata", "agregasi", "csv", "join", "data workflow"],
    skills: ["bigquery-sql", "sql-optimization-patterns", "database-design", "data-engineering", "graphify", "signed-audit-trails-recipe"],
    insight: "Workflow data menyeluruh yang benar-benar berjalan: buat skema SQL → isi data (dari file/Csv) → query agregasi → verifikasi hasil → laporan. Semua langkah dieksekusi nyata, bukan sekadar dijelaskan.",
  },
  {
    id: "combo-live-web-exec",
    name: "Live Web Execution",
    emoji: "🌐",
    keywords: ["web", "fetch", "url", "scrape", "http", "api publik", "download", "halaman", "live", "online"],
    skills: ["exa-search", "documentation-lookup", "deep-research", "fetch", "everything-claude-code", "mcp-server-patterns"],
    insight: "Eksekusi langsung terhadap web: ambil halaman/API publik, ekstrak data, olah bersama file lokal, lalu sajikan hasil — semua terpasang pada loop agen nyata.",
  },
  {
    id: "combo-local-db-app",
    name: "Local DB & API App",
    emoji: "🗄️",
    keywords: ["sqlite", "database lokal", "api", "rest", "endpoint", "node", "express", "crud", "persist", "tabel"],
    skills: ["backend-development", "api-design-principles", "database-design", "bun-runtime", "cloud-sql-postgres-admin", "sql-optimization-patterns"],
    insight: "Bangun aplikasi data lokal-lengkap: database SQLite nyata, API CRUD, dan skrip Node yang berjalan — fondasi aplikasi web/mobile dengan backend data sungguhan.",
  },
  {
    id: "combo-automation-workflow",
    name: "Automation & Workflow Fusion",
    emoji: "⚙️",
    keywords: ["automation", "otomasi", "workflow", "script", "cron", "scheduler", "jadwal", "rpa", "batch", "pipeline otomatis", "otomatis", "run", "jalankan", "repetitif", "file otomatis"],
    skills: ["dmux-workflows", "workflow-orchestration-patterns", "task-coordination-strategies", "agent-sort", "e2e-testing", "everything-claude-code", "mcp-server-patterns", "bun-runtime", "agent-platform-alert-configuration"],
    insight: "Otomasi menyeluruh yang benar-benar berjalan: skrip & scheduler, workflow berulang, pipeline CI/CD, orkestrasi agen/task, dan verifikasi otomatis — dieksekusi nyata di cloud, bukan sekadar dijelaskan.",
  },
  {
    id: "combo-translation-lang",
    name: "Translation & Multilingual Fusion",
    emoji: "🌍",
    keywords: ["translate", "terjemahan", "translation", "bahasa", "language", "multilingual", "i18n", "lokalisa", "localization", "indo", "english", "dubbing", "subtitle", "lintas bahasa"],
    skills: ["article-writing", "brand-voice", "content-engine", "crosspost", "deep-research", "market-research", "exa-search", "documentation-lookup", "google-cloud-solution-agentic-ai-bidirectional-streaming"],
    insight: "Terjemahan & lokalisasi berkualitas tinggi: pertahankan nada, konteks, dan istilah teknis; ubah konten lintas bahasa dengan akurasi budaya; hasilkan versi id/EN lengkap dari knowledge base.",
  },
  {
    id: "combo-rendering-everything",
    name: "Rendering All Formats",
    emoji: "🎨",
    keywords: ["render", "rendering", "markdown", "html", "pdf", "dokumen", "document", "presentasi", "slides", "visual", "gambar", "video", "konversi format", "format", "template", "layout", "poster", "laporan", "infografis", "export"],
    skills: ["frontend-slides", "fal-ai-media", "ui-ux-pro-max", "graphify", "documentation-lookup", "file-conversion", "article-writing", "content-engine", "frontend-design", "web-component-design", "brand-voice", "investor-materials", "competitive-report-structure", "deep-research", "exa-search", "nextjs-turbopack"],
    insight: "Render semua format jadi hasil nyata: markdown/dokumen jadi HTML/PDF, kode jadi visual/UI, data jadi laporan, presentasi & media AI (gambar/video) — semua dihasilkan dari logika & kode asli skill.",
  },
  {
    id: "combo-finops-cost",
    name: "FinOps & Cloud Cost Optimization",
    emoji: "💰",
    keywords: ["finops", "biaya", "cost", "budget", "billing", "optimasi biaya", "pricing", "spend", "kuota", "price", "hemat", "anggaran"],
    skills: ["billing-automation", "cost-optimization", "cost-tracking", "gke-cost-analysis", "gke-cost-optimization", "google-cloud-waf-cost-optimization", "cost-aware-llm-pipeline", "finops-engineer"],
    insight: "Kontrol & tekan biaya cloud nyata: analisis data billing/cost (pakai CSV/SQL), buat budget & alerting, optimasi resource & model AI, dan beri rekomendasi penghematan yang terukur.",
  },
  {
    id: "combo-dataviz-reporting",
    name: "Data Visualization & Automated Reporting",
    emoji: "📈",
    keywords: ["visualisasi", "chart", "grafik", "dashboard", "laporan", "report", "grafana", "plot", "bigquery graph", "monitoring chart", "data viz"],
    skills: ["dashboard-builder", "grafana-dashboards", "bigquery-graph", "cloud-monitoring-chart-generation", "data-visualization-engineer", "analytics-reporter", "competitive-report-structure", "frontend-slides"],
    insight: "Ubah data jadi visual nyata: generate chart HTML dari data (bar/line/pie), rancang dashboard, dan susun laporan otomatis yang bisa diunduh — dieksekusi sungguhan, bukan mockup.",
  },
  {
    id: "combo-email-notifications",
    name: "Email & Unified Notifications",
    emoji: "📧",
    keywords: ["email", "notifikasi", "notif", "telegram", "slack", "pesan", "outreach", "mail", "komunikasi", "draft", "template email"],
    skills: ["email-ops", "unified-notifications-ops", "mailtrap-email-integration", "email-marketing-strategist", "investor-outreach", "messages-ops", "sales-outreach", "brand-voice", "article-writing"],
    insight: "Kirim & kelola komunikasi: compose email/notifikasi multi-kanal (email, slack, telegram) dengan template profesional, integrasi mailtrap/ops nyata, dan konsistensi nada brand.",
  },
  {
    id: "combo-backup-disaster-recovery",
    name: "Backup, Migrasi & Disaster Recovery",
    emoji: "🛟",
    keywords: ["backup", "cadangan", "restore", "snapshot", "disaster recovery", "dr", "migrasi", "migration", "failover", "pemulihan"],
    skills: ["gke-backup-dr", "database-migration", "database-migrations", "firestore-data", "gcp-managed-airflow-migrations", "migration", "snapshot", "accidental-data-loss-prevention"],
    insight: "Lindungi data & sistem: strategi backup/restore & snapshot, migrasi database antar platform, dan rencana disaster recovery dengan urutan pemulihan yang teruji — bukan sekadar teori.",
  },
  {
    id: "combo-web-scraping-intel",
    name: "Web Scraping & Data Extraction",
    emoji: "🕷️",
    keywords: ["scrap", "scraping", "ekstraksi data", "crawl", "web", "halaman", "fetch", "extract", "ambil data", "parsing html", "url", "search results", "kolektor data"],
    skills: ["data-scraper-agent", "deep-research", "exa-search", "sales-data-extraction-agent", "search-query-analyst", "research", "market-research", "documentation-lookup", "hybrid-search-implementation"],
    insight: "Ekstraksi data web nyata: ambil halaman/API (tool fetch), parse HTML/JSON/CSV, bersihkan, lalu olah jadi dataset terstruktur yang siap dianalisis atau disimpan.",
  },
  {
    id: "combo-payment-fintech",
    name: "Payment, Billing & Fintech",
    emoji: "💳",
    keywords: ["payment", "pembayaran", "billing", "invoice", "stripe", "paypal", "transaksi", "refund", "wallet", "fintech", "tagihan", "payment gateway"],
    skills: ["paypal-integration", "stripe-integration", "billing-automation", "payments-billing-engineer", "customer-billing-ops", "finance-billing-ops", "accounts-payable-agent", "agent-payment-x402"],
    insight: "Integrasi & otomasi pembayaran: integrasi payment gateway (Stripe/PayPal), buat & tarik invoice, kelola transaksi/billing, dan otomasi penagihan — berjalan nyata dengan data contoh yang aman.",
  },
  {
    id: "combo-hr-recruitment",
    name: "HR & Recruitment Pipeline",
    emoji: "🧑‍💼",
    keywords: ["hr", "recruit", "rekrutmen", "hiring", "kandidat", "candidate", "interview", "wawancara", "onboard", "talent", "karyawan", "job", "resume", "cv"],
    skills: ["recruitment-specialist", "hr-onboarding", "codebase-onboarding", "investor-materials", "article-writing", "brand-voice", "email-ops", "brand-discovery"],
    insight: "Otomasi SDM & rekrutmen: susun deskripsi lowongan, saring kandidat (CV/resume), buat pertanyaan wawancara, email komunikasi kandidat, dan alur onboarding baru.",
  },
  {
    id: "combo-game-xr",
    name: "Game, 3D & XR Development",
    emoji: "🎮",
    keywords: ["game", "3d", "xr", "unity", "godot", "unreal", "shader", "gameplay", "level design", "scene", "spatial", "engine", "multiplayer", "world", "immersive", "technical artist", "rapid prototype"],
    skills: ["Game Designer", "Godot Gameplay Scripter", "Unity Architect", "Unity Multiplayer Engineer", "Unity Shader Graph Artist", "unity-ecs-patterns", "Unreal Multiplayer Architect", "Unreal Systems Engineer", "Rapid Prototyper", "3D & Scene Developer", "Game Audio Engineer", "Godot Multiplayer Engineer", "Godot Shader Developer", "Level Designer", "Narrative Designer", "Technical Artist", "Unity Editor Tool Developer", "Unreal Technical Artist", "Unreal World Builder", "XR Cockpit Interaction Specialist", "XR Immersive Developer", "XR Interface Architect", "godot-gdscript-patterns", "macOS Spatial/Metal Engineer", "Economy Designer", "Video Streaming Engineer"],
    insight: "Rekayasa game, 3D & XR nyata: desain level/narasi, skrip gameplay lintas engine (Godot/Unity/Unreal), shader & ECS, multiplayer, audio, hingga pengalaman XR imersif — pola kode asli dari setiap skill dipadukan jadi satu alur produksi.",
  },
  {
    id: "combo-academic-research",
    name: "Academic & Scientific Research",
    emoji: "🎓",
    keywords: ["akademik", "academic", "riset ilmiah", "jurnal", "ilmiah", "scientific", "historian", "psikologi", "statistik", "antropologi", "geografi", "narratologi", "teori", "hipotesis", "scholar"],
    skills: ["Historian", "Psychologist", "Statistician", "Anthropologist", "Narratologist", "Organizational Psychologist", "Geographer", "deep-research", "market-research", "exa-search", "competitive-report-structure", "documentation-lookup", "research", "market-sizing-analysis", "experiment-tracker", "article-writing", "startup-metrics-framework"],
    insight: "Kajian akademik & ilmiah berstandar: metodologi riset lintas disiplin (sejarah, psikologi, antropologi, geografi), analisis statistik, eksperimen terdokumentasi, sitasi benar, dan laporan ilmiah yang dapat dipertanggungjawabkan.",
  },
  {
    id: "combo-healthcare-ai",
    name: "Healthcare & Medical AI",
    emoji: "🏥",
    keywords: ["healthcare", "kesehatan", "medis", "rumah sakit", "emr", "cdss", "phi", "hipaa", "klinis", "clinical", "pasien", "patient", "farmasi", "pharma", "rekam medis", "dokter", "wellness", "medical"],
    skills: ["healthcare-emr-patterns", "healthcare-cdss-patterns", "healthcare-phi-compliance", "healthcare-eval-harness", "alloydb-omni-health", "Clinical Evidence Agent", "Medical Billing & Coding Specialist", "Healthcare Customer Service", "Healthcare Innovation Strategist", "Healthcare Marketing Compliance Specialist", "hipaa-compliance", "Sovereign Health Systems Agent", "cloud-sql-postgres-health", "signed-audit-trails-recipe", "threat-mitigation-mapping", "coding-standards"],
    insight: "Inteligensi kesehatan yang aman & patuh: pola EMR/CDSS, kepatuhan PHI/HIPAA, evaluasi klinis & evidence-based, billing medis, dan arsitektur data kesehatan yang aman sejak desain.",
  },
  {
    id: "combo-project-delivery",
    name: "Project Management & Geospatial Delivery",
    emoji: "📐",
    keywords: ["project", "proyek", "manajemen proyek", "project manager", "sprint", "delivery", "roadmap", "agile", "jira", "milestone", "stakeholder", "prioritas", "gis", "bim", "cartography", "pemetaan", "mapping", "drone", "geospasial", "spatial", "survey"],
    skills: ["Senior Project Manager", "Sprint Prioritizer", "delivery-gate", "Project Shepherd", "Jira Workflow Steward", "Operations Manager", "BIM/GIS Specialist", "Cartography Designer", "Drone/Reality Mapping Specialist", "GIS Analyst", "GIS QA Engineer", "Geoprocessing Specialist", "Web GIS Developer", "documentation-lookup", "coding-standards", "e2e-testing", "deep-research"],
    insight: "Kirim proyek tepat waktu & peta dunia nyata: perencanaan/sprint/roadmap dengan gate kualitas & manajemen stakeholder, lalu eksekusi geospasial (GIS/BIM, kartografi, pemetaan drone) yang teruji QA.",
  },
  {
    id: "combo-generalist-master",
    name: "Generalist & Operator Fusion",
    emoji: "🧰",
    keywords: ["umum", "tugas", "operasional", "workspace", "fleksibel", "multi-domain", "lintas", "general", "everything", "skill campuran"],
    skills: ["internal-comms", "template-skill", "implement", "wait-what", "council", "crosspost", "returns-reverse-logistics", "rules-distill"],
    insight: "Kemampuan serba-bisa: menangkap semua skill lintas-kategori yang tidak masuk satu domain sempit — operasional umum, template, workflow campuran, dan troubleshooting fleksibel — agar tak ada pengetahuan yang terbuang.",
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
