// Single-Command Capability Engine (seperti Codex):
// 1 perintah pendek -> deteksi kemampuan -> mission plan otomatis -> loop tool.
const EVO = require("./capabilities2.js");
const FUSION = require("./fusion.js");
const KB = require("./knowledge.js");

// Contoh perintah 1-liner yang memicu tiap kemampuan khusus.
const COMBO_COMMANDS = {
  "combo-multi-agent-research": ["Riset pasar kompetitor untuk produk SaaS billing", "Deep dive: tren AI 2026 dengan sumber"],
  "combo-token-efficiency": ["Efisienkan pipeline RAG agar hemat token", "Optimasi latency dan cost API saya"],
  "combo-ai-native-app": ["Buat app AI kalkulator dengan chat", "Bikin chatbot AI-Native sederhana"],
  "combo-rag-knowledge": ["Rancang RAG untuk doc internal", "Buat knowledge graph dari codebase"],
  "combo-mcp-tool-builder": ["Buat server MCP untuk fetch data", "Integrasikan tool agen lewat MCP"],
  "combo-e2e-quality": ["Susun strategi pengujian E2E untuk app", "Benchmark kualitas model saya"],
  "combo-growth-content": ["Buat konten SEO untuk landing page", "Kembangkan brand voice startup"],
  "combo-agent-systems": ["Rancang sistem multi-agen untuk riset", "Orkestrasi subagent paralel"],
  "combo-runtime-performance": ["Optimasi performa runtime Next.js", "Percepat bundle dan startup app"],
  "combo-research-ai-pipeline": ["Susun MLE pipeline riset ke produksi", "Rancang eksperimen dan benchmark model"],
  "combo-install-download": ["Instal uv dan setup project Python modern", "Download & pasang dependensi proyek sesuai best practice"],
  "combo-network-edge": ["Rancang reverse proxy nginx dengan load balancer", "Konfigurasi service mesh Istio untuk edge GKE"],
  "combo-os-environment": ["Buat lingkungan dev reproduksibel dengan flox", "Susun bash script defensif + shellcheck untuk production"],

  "combo-devtools-dx": ["Tingkatkan DX repo: dokumentasi hidup + tooling CLI", "Rancang developer experience dan standar koding"],
  "combo-media-generation": ["Buat presentasi visual untuk pitch deck", "Generasi infografis untuk konten media"],
  "combo-agentic-devops": ["Buat pipeline CI/CD agentik yang self-healing", "Otomasi deploy dengan debugging sistematis"],
  "combo-mobile-cloud": ["Rancang APK android ringan dengan backend cloud", "Buat aplikasi mobile dengan proses berat di cloud"],
  "combo-web3-secure": ["Audit keamanan smart contract Solidity", "Rancang dApp web3 yang aman"],
  "combo-sql-data-workflow": ["Buat workflow SQL dari CSV ke laporan", "Analisis agregasi data dengan SQL nyata"],
  "combo-live-web-exec": ["Ambil data dari API publik dan olah jadi hasil", "Eksekusi langsung ke halaman web publik"],
  "combo-local-db-app": ["Buat app CRUD SQLite dengan API Express", "Bangun backend REST dengan database lokal"],
  "combo-automation-workflow": ["Otomasi tugas berulang dengan skrip cron", "Buat pipeline otomatis yang tereksekusi nyata"],
  "combo-translation-lang": ["Terjemahkan dokumen ke bahasa Inggris", "Lokalisasi konten multi-bahasa"],
  "combo-rendering-everything": ["Render markdown menjadi PDF/HTML", "Ubah data menjadi laporan visual"],
  "combo-finops-cost": ["Analisis biaya cloud dan beri rekomendasi penghematan", "Buat budget dan alerting FinOps"],
  "combo-dataviz-reporting": ["Buat dashboard chart dari data CSV", "Generate laporan otomatis dengan visualisasi"],
  "combo-email-notifications": ["Susun template email profesional", "Buat notifikasi multi-kanal telegram/slack"],
  "combo-backup-disaster-recovery": ["Susun strategi backup dan disaster recovery", "Rancang runbook migrasi database"],
  "combo-web-scraping-intel": ["Scrape data dari halaman web jadi CSV", "Ekstraksi dataset terstruktur dari URL"],
  "combo-payment-fintech": ["Rancang integrasi pembayaran Stripe", "Buat sistem invoice dan billing otomatis"],
  "combo-hr-recruitment": ["Saring CV kandidat untuk posisi backend", "Susun pertanyaan wawancara dan alur onboarding"],
  "combo-game-xr": ["Buat prototype game Godot sederhana", "Rancang skrip gameplay dan shader 3D"],
  "combo-academic-research": ["Susun laporan penelitian ilmiah berstandar", "Riset akademik dengan metodologi dan sitasi"],
  "combo-healthcare-ai": ["Rancang CDSS yang patuh HIPAA", "Desain EMR dengan kontrol akses PHI"],
  "combo-project-delivery": ["Buat roadmap proyek sprint 2 minggu", "Susun rencana delivery dan pemetaan GIS"],
  "combo-generalist-master": ["Kerjakan tugas umum sesuai kebutuhan", "Eksekusi operasional lintas-domain"],
  "combo-secure-data-pipeline": ["Rancang pipeline data aman dengan enkripsi", "Desain data governance dan audit trail"],
};

// ---------- Amankan identitas kemampuan dari perintah ----------
function matchSkill(q) {
  const w = q.toLowerCase();
  const pool = EVO.PRIMES.concat(EVO.COMBOS);

  // 1) Perintah instal/unduh yang jelas -> langsung ke kemampuan Install & Artifact
  const installHit = /(install|instal|unduh|download|pasang|instalasi|package|dependensi|dependency|helm install|docker pull|\bpip\b|\bnpm\b|\bcargo\b|\bbrew\b|\bgo get\b|\bapt\b|\bwinget\b)/i.test(w);
  if (installHit) {
    const installCap = pool.find((it) => it.id === "combo-install-download");
    if (installCap) return installCap;
  }

  // 2) Cluster perintah ringkas: kunci paling spesifik (terpanjang) yang cocok menang,
  //    sehingga satu perintah pendek langsung memicu kemampuan yang tepat.
  const spec = [
    { starts: ["riset", "research", "deep dive", "investigate", "lakukan riset", "teliti"], combo: "combo-multi-agent-research" },
    { starts: ["efisien", "efisiensi", "optimasi token", "hemat token", "hemat biaya", "optimize", "kinerja", "benchmark"], combo: "combo-token-efficiency" },
    { starts: ["buat app", "bikin app", "buat aplikasi", "ai app", "chatbot", "buat apk", "bikin apk"], combo: "combo-ai-native-app" },
    { starts: ["rag", "knowledge graph", "basis pengetahuan", "retrieval"], combo: "combo-rag-knowledge" },
    { starts: ["mcp", "buat tool", "integrasi mcp", "plugin", "tool agen"], combo: "combo-mcp-tool-builder" },
    { starts: ["test", "uji", "e2e", "quality", "benchmark"], combo: "combo-e2e-quality" },
    { starts: ["content", "konten", "marketing", "brand", "seo", "copywrite"], combo: "combo-growth-content" },
    { starts: ["multi-agen", "multi agen", "sistem agen", "subagent", "orkestrasi", "orchestration"], combo: "combo-agent-systems" },
    { starts: ["runtime", "bun", "nextjs", "next.js", "next js", "performansi"], combo: "combo-runtime-performance" },
    { starts: ["mle", "riset ke ai", "pipeline riset", "eksperimen model"], combo: "combo-research-ai-pipeline" },
    { starts: ["install", "instal", "unduh", "download", "package", "pasang", "setup", "dependensi", "dependency"], combo: "combo-install-download" },
    { starts: ["network", "jaringan", "proxy", "nginx", "load balancer", "dns", "vlan", "vpn", "waf", "istio", "linkerd", "service mesh", "firewall"], combo: "combo-network-edge" },
    { starts: ["flox", "nix", "environment reproduksibel", "reproducible env", "bash defensif", "shellcheck", "bats", "lingkungan os", "linux environment"], combo: "combo-os-environment" },

    { starts: ["developer experience", "devtools", "tooling", "standar koding"], combo: "combo-devtools-dx" },
    { starts: ["buat presentasi", "slides", "infografis", "konten visual", "media ai"], combo: "combo-media-generation" },
    { starts: ["ci/cd", "devops agentik", "agentic devops", "self-healing", "deploy otomatis"], combo: "combo-agentic-devops" },
    { starts: ["apk android", "apk ringan", "aplikasi android", "app mobile", "mobile cloud", "react native"], combo: "combo-mobile-cloud" },
    { starts: ["web3", "blockchain", "smart contract", "solidity", "dapp"], combo: "combo-web3-secure" },
    { starts: ["workflow sql", "sql workflow", "data workflow", "agregasi data"], combo: "combo-sql-data-workflow" },
    { starts: ["ambil data api", "url publik", "eksekusi web", "fetch halaman"], combo: "combo-live-web-exec" },
    { starts: ["crud", "database lokal", "sqlite", "api express", "rest api"], combo: "combo-local-db-app" },
    { starts: ["otomasi", "otomatiskan", "scheduler", "cron", "pipeline otomatis"], combo: "combo-automation-workflow" },
    { starts: ["terjemah", "translate", "lokalisasi", "multibahasa", "multi bahasa", "i18n"], combo: "combo-translation-lang" },
    { starts: ["render", "konversi format", "jadikan pdf", "jadikan html"], combo: "combo-rendering-everything" },
    { starts: ["finops", "biaya cloud", "penghematan", "budget", "alerting biaya"], combo: "combo-finops-cost" },
    { starts: ["dashboard", "chart", "grafik", "visualisasi data", "laporan otomatis"], combo: "combo-dataviz-reporting" },
    { starts: ["template email", "notifikasi", "kirim email", "telegram", "slack", "outreach"], combo: "combo-email-notifications" },
    { starts: ["strategi backup", "disaster recovery", "snapshot", "migrasi database"], combo: "combo-backup-disaster-recovery" },
    { starts: ["scrape", "scraping", "ekstraksi data web", "dataset dari url"], combo: "combo-web-scraping-intel" },
    { starts: ["pembayaran", "payment gateway", "payment", "stripe", "invoice", "tagihan", "fintech", "sistem pembayaran"], combo: "combo-payment-fintech" },
    { starts: ["rekrutmen", "recruit", "saring cv", "kandidat", "wawancara", "hiring", "sdm"], combo: "combo-hr-recruitment" },
    { starts: ["game", "godot", "unity", "unreal", "shader", "3d", "xr"], combo: "combo-game-xr" },
    { starts: ["penelitian ilmiah", "riset akademik", "jurnal", "laporan akademik"], combo: "combo-academic-research" },
    { starts: ["healthcare", "kesehatan", "medis", "hipaa", "emr", "cdss", "klinis"], combo: "combo-healthcare-ai" },
    { starts: ["roadmap proyek", "sprint", "manajemen proyek", "delivery", "gis", "pemetaan"], combo: "combo-project-delivery" },
    { starts: ["tugas umum", "tugas operasional", "tolong kerjakan", "bantu saya"], combo: "combo-generalist-master" },
    { starts: ["pipeline aman", "data security", "enkripsi", "data governance", "audit trail"], combo: "combo-secure-data-pipeline" },
  ];
  let bestSpec = null, bestSpecLen = 0;
  for (const s of spec) {
    for (const k of s.starts) {
      if (w.includes(k) && k.length > bestSpecLen) {
        bestSpecLen = k.length;
        bestSpec = s.combo;
      }
    }
  }
  if (bestSpec) {
    const it = pool.find((p) => p.id === bestSpec);
    if (it) return it;
  }

  // 3) Skor keyword: kemampuan dengan paling banyak kata kunci cocok menang (fallback natural)
  const scored = pool
    .map((it) => ({ it, score: (it.keywords || []).filter((k) => w.includes(k)).length }))
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score || ((b.it.id || "").startsWith("combo-") ? 1 : 0) - ((a.it.id || "").startsWith("combo-") ? 1 : 0));
  if (scored.length) return scored[0].it;

  return null;
}

// ---------- Mission plan per kemampuan ----------
const MISSIONS = {
  "combo-multi-agent-research": {
    goal: "Lakukan riset mendalam multi-sumber terhadap topik user, lalu hasilkan laporan terstruktur dengan sitasi.",
    steps: [
      "Tentukan pertanyaan riset & subtopik.",
      "Cari sumber via tool fetch (URL publik) atau kb untuk konteks.",
      "Sintesis temuan menjadi laporan: Ringkasan Eksekutif, Temuan, Analisis, Kesimpulan, Daftar Sumber.",
      "Tulis laporan ke file laporan.md di workspace.",
      "Tutup dengan [SELESAI] + ringkasan dalam Bahasa Indonesia.",
    ],
  },
  "combo-token-efficiency": {
    goal: "Audit & optimasi efisiensi (token, biaya, kinerja, resource) terhadap target user, lalu beri rencana optimasi berdampak tertinggi.",
    steps: [
      "Identifikasi bottleneck dari deskripsi user (token, latency, biaya, memory, bundle).",
      "Gunakan tool bash untuk benchmark/berhitung bila relevan.",
      "Susun rekomendasi prioritas berdampak (impact/cost).",
      "Tulis rencana ke file optimasi.md di workspace.",
      "Tutup dengan [SELESAI] + ringkasan.",
    ],
  },
  "combo-ai-native-app": {
    goal: "Rancang & implementasikan aplikasi AI-native (UI + backend/API + integrasi model) dari deskripsi user.",
    steps: [
      "Tentukan stack (frontend, backend/API, model/manajemen konteks).",
      "Tulis file app (HTML/JS atau file konfigurasi/API) di workspace.",
      "Jalankan/simulasikan via tool bash bila memungkinkan.",
      "Tutup dengan [SELESAI] + petunjuk menjalankan.",
    ],
  },
  "combo-rag-knowledge": {
    goal: "Rancang pipeline RAG / knowledge graph untuk kebutuhan user (retrieval, embedding, vector store).",
    steps: [
      "Tentukan dokumen & strategi chunking/embedding.",
      "Pilih vector store & alur retrieval-augmentasi.",
      "Tulis kerangka implementasi (file) di workspace.",
      "Tutup dengan [SELESAI] + langkah konkret.",
    ],
  },
  "combo-mcp-tool-builder": {
    goal: "Bangun server MCP / tool agen yang aman & dapat diintegrasikan, sesuai permintaan user.",
    steps: [
      "Tentukan protocol/tool yang dibuat.",
      "Tulis kode server/tool (file) di workspace sesuai pola MCP.",
      "Validasi struktur via tool bash bila bisa.",
      "Tutup dengan [SELESAI] + petunjuk integrasi.",
    ],
  },
  "combo-e2e-quality": {
    goal: "Susun & jalankan strategi pengujian kualitas/benchmark untuk target user.",
    steps: [
      "Tentukan apa yang diuji & metrik keberhasilan.",
      "Tulis rencana/uji (file) di workspace.",
      "Jalankan benchmark/uji via tool bash bila relevan.",
      "Tutup dengan [SELESAI] + hasil ringkas.",
    ],
  },
  "combo-growth-content": {
    goal: "Produksi aset growth/brand/content (copy, headline, SEO, materi) untuk kebutuhan user.",
    steps: [
      "Tentukan target audiens & platform.",
      "Tulis konsep konten (file) di workspace.",
      "Tutup dengan [SELESAI] + draf utama.",
    ],
  },
  "combo-agent-systems": {
    goal: "Rancang sistem multi-agen/orchestration untuk kebutuhan user (pecah tugas, delegasi, koordinasi).",
    steps: [
      "Identifikasi tugas & sub-agen yang dibutuhkan.",
      "Tulis diagram alur + kode/konfigurasi (file) di workspace.",
      "Validasi via tool bash bila bisa.",
      "Tutup dengan [SELESAI] + ringkasan arsitektur.",
    ],
  },
  "combo-runtime-performance": {
    goal: "Optimasi performa runtime (Bun/Next.js/bundle/build/startup) untuk target user.",
    steps: [
      "Tentukan bottleneck runtime.",
      "Tulis config/patch optimasi (file) di workspace.",
      "Jalankan benchmark via tool bash bila relevan.",
      "Tutup dengan [SELESAI] + hasil.",
    ],
  },
  "combo-research-ai-pipeline": {
    goal: "Susun alur riset-ke-AI (MLE workflow + benchmark + laporan/presentasi) untuk kebutuhan user.",
    steps: [
      "Tentukan eksperimen & metrik evaluasi.",
      "Tulis rencana pipeline (file) di workspace.",
      "Jalankan simulasi/benchmark via tool bash bila bisa.",
      "Tutup dengan [SELESAI] + ringkasan.",
    ],
  },
  "combo-install-download": {
    goal: "Instalasi, unduh & distribusi artefak yang benar dan aman (package manager, container, IaC, CI/CD) sesuai permintaan user.",
    steps: [
      "Tentukan target instalasi & lingkungan (python/node/container/GKE/artifact).",
      "Tulis file konfigurasi instalasi (requirements.txt, Dockerfile, helm chart, terraform, skrip) di workspace.",
      "Jalankan instalasi/unduh via tool bash bila lingkungan mendukung.",
      "Verifikasi hasil instalasi (version check, build, dry-run).",
      "Tutup dengan [SELESAI] + langkah konkret yang bisa dijalankan user.",
    ],
  },
  "combo-network-edge": {
    goal: "Rancang & kelola jaringan/edge (proxy, load balancer, DNS, VLAN/VPN, WAF, service mesh, mTLS) sesuai permintaan user.",
    steps: [
      "Identifikasi topologi & kebutuhan jaringan (publik/edge/internal, latency, keamanan).",
      "Tulis file konfigurasi (nginx.conf, istio/linkerd, network YAML, dll) di workspace.",
      "Jalankan verifikasi/validasi via tool bash bila memungkinkan (nginx -t, kubectl, dsb).",
      "Tutup dengan [SELESAI] + langkah konkret & checklist observability.",
    ],
  },
  "combo-os-environment": {
    goal: "Siapkan lingkungan OS/reproducible yang aman (Flox/Nix, bash defensif, shellcheck, BATS, secrets) untuk kebutuhan user.",
    steps: [
      "Tentukan lingkungan target (dev/prod, Python/Node/container).",
      "Tulis file env (flox/plan, .env, skrip bash, tests BATS) di workspace.",
      "Jalankan verifikasi via tool bash bila memungkinkan.",
      "Tutup dengan [SELESAI] + langkah reproduksi yang konsisten.",
    ],
  },

  "combo-devtools-dx": {
    goal: "Tingkatkan developer experience: dokumentasi hidup, tooling CLI, standar koding konsisten, dan umpan balik cepat.",
    steps: [
      "Identifikasi area DX (dokumentasi, CLI, lint/format, git hooks) dari permintaan user.",
      "Tulis/mutakhirkan dokumentasi & konfigurasi tooling di workspace.",
      "Jalankan validasi nyata (lint/test/CLI) via tool bash bila memungkinkan.",
      "Tutup dengan [SELESAI] + ringkasan.",
    ],
  },
  "combo-media-generation": {
    goal: "Produksi media visual & presentasi (slide, infografis, gambar/asset, video) yang profesional sesuai permintaan user.",
    steps: [
      "Tentukan format media (slides/infografis/asset) & gaya visual.",
      "Buat file HTML/asset visual di workspace.",
      "Jalankan render/preview via tool bash bila memungkinkan.",
      "Tutup dengan [SELESAI] + daftar file hasil.",
    ],
  },
  "combo-agentic-devops": {
    goal: "Jalankan DevOps secara agentik: pipeline CI/CD, deploy otomatis, debugging sistematis, dan remediasi mandiri sampai berhasil.",
    steps: [
      "Identifikasi target pipeline/deploy/issue dari permintaan user.",
      "Tulis konfigurasi/skrip (CI/CD, Dockerfile, skrip deploy) di workspace.",
      "Eksekusi nyata via tool bash/npm; bila gagal coba cara alternatif sampai tereksekusi.",
      "Tutup dengan [SELESAI] + status & langkah remediasi.",
    ],
  },
  "combo-mobile-cloud": {
    goal: "Rancang aplikasi mobile ringan dengan backend cloud (APK kecil, proses berat di cloud, API aman).",
    steps: [
      "Tentukan arsitektur (WebView/native minimal + backend cloud/API).",
      "Tulis kode aplikasi & API backend di workspace.",
      "Validasi eksekusi backend via tool bash bila memungkinkan.",
      "Tutup dengan [SELESAI] + petunjuk build APK.",
    ],
  },
  "combo-web3-secure": {
    goal: "Rancang kontrak pintar/dApp yang aman sejak desain: threat modeling, review, dan pengujian sebelum deploy.",
    steps: [
      "Identifikasi kontrak/dApp & attack vectors relevan.",
      "Tulis/audit kode (Solidity/konfigurasi Hardhat) di workspace.",
      "Jalankan test/analyzer via tool bash bila memungkinkan.",
      "Tutup dengan [SELESAI] + rekomendasi keamanan.",
    ],
  },
  "combo-sql-data-workflow": {
    goal: "Jalankan workflow data nyata: skema SQL → isi data (CSV) → query/agregasi → verifikasi → laporan.",
    steps: [
      "Tentukan sumber data & skema target.",
      "Tulis skema + seed data dan jalankan via tool sql/bash di workspace.",
      "Eksekusi query agregasi dan verifikasi hasilnya.",
      "Simpan laporan ke file lalu tutup [SELESAI] + ringkasan.",
    ],
  },
  "combo-live-web-exec": {
    goal: "Eksekusi langsung ke web: fetch halaman/API publik, ekstrak data, olah bersama file lokal, sajikan hasil.",
    steps: [
      "Tentukan URL/API target & data yang dibutuhkan.",
      "Fetch via tool fetch/bash lalu ekstrak & bersihkan data.",
      "Olah hasil menjadi file/dataset di workspace.",
      "Tutup dengan [SELESAI] + ringkasan.",
    ],
  },
  "combo-local-db-app": {
    goal: "Bangun aplikasi data lokal lengkap: database SQLite nyata + API CRUD + skrip Node yang berjalan.",
    steps: [
      "Tentukan skema data & endpoint API.",
      "Tulis database + API server (Node/Express) di workspace.",
      "Jalankan server/uji CRUD via tool bash.",
      "Tutup dengan [SELESAI] + petunjuk menjalankan.",
    ],
  },
  "combo-automation-workflow": {
    goal: "Otomasi menyeluruh yang benar-benar berjalan: skrip, scheduler/cron, pipeline, dan verifikasi otomatis.",
    steps: [
      "Identifikasi tugas berulang yang akan diotomasi.",
      "Tulis skrip & konfigurasi scheduler/cron di workspace.",
      "Eksekusi nyata via tool bash (test run) dan verifikasi output.",
      "Tutup dengan [SELESAI] + status eksekusi.",
    ],
  },
  "combo-translation-lang": {
    goal: "Terjemahkan/lokalisasi konten berkualitas tinggi lintas bahasa sambil menjaga nada, konteks, dan istilah teknis.",
    steps: [
      "Tentukan pasangan bahasa & jenis konten.",
      "Hasilkan terjemahan/lokalisasi ke file di workspace.",
      "Verifikasi konsistensi istilah via kb bila perlu.",
      "Tutup dengan [SELESAI] + ringkasan.",
    ],
  },
  "combo-rendering-everything": {
    goal: "Render semua format jadi hasil nyata: markdown/docs → HTML/PDF, data → visual/laporan, presentasi & media.",
    steps: [
      "Tentukan format input & output yang diminta.",
      "Tulis script render dan jalankan via tool bash di workspace.",
      "Simpan artefak hasil, verifikasi file benar-benar ada.",
      "Tutup dengan [SELESAI] + daftar file hasil.",
    ],
  },
  "combo-finops-cost": {
    goal: "Analisis & tekan biaya cloud nyata: data billing/cost → budget/alerting → rekomendasi penghematan terukur.",
    steps: [
      "Kumpulkan/strukturkan data biaya (CSV/SQL) dari user atau contoh.",
      "Analisis tren & temukan pemborosan via tool sql/bash.",
      "Tulis rekomendasi + konfigurasi budget/alert di workspace.",
      "Tutup dengan [SELESAI] + potensi penghematan.",
    ],
  },
  "combo-dataviz-reporting": {
    goal: "Ubah data jadi visual nyata: chart HTML (bar/line/pie), dashboard, dan laporan otomatis yang bisa diunduh.",
    steps: [
      "Tentukan data & tipe visualisasi yang dibutuhkan.",
      "Tulis script/generate chart HTML di workspace.",
      "Jalankan render via tool bash dan verifikasi output file.",
      "Tutup dengan [SELESAI] + ringkasan.",
    ],
  },
  "combo-email-notifications": {
    goal: "Susun & kirim komunikasi multi-kanal (email, slack, telegram) dengan template profesional dan nada brand konsisten.",
    steps: [
      "Tentukan kanal, audiens, dan pesan inti.",
      "Tulis template & draft di workspace.",
      "Gunakan tool/fetch untuk integrasi gratis bila memungkinkan, atau simpan draft siap kirim.",
      "Tutup dengan [SELESAI] + ringkasan.",
    ],
  },
  "combo-backup-disaster-recovery": {
    goal: "Susun strategi backup/restore, migrasi, dan disaster recovery yang teruji nyata sesuai kebutuhan user.",
    steps: [
      "Identifikasi sistem/data & target RPO/RTO.",
      "Tulis skrip backup/restore & runbook DR di workspace.",
      "Uji eksekusi skrip via tool bash bila memungkinkan.",
      "Tutup dengan [SELESAI] + ringkasan.",
    ],
  },
  "combo-web-scraping-intel": {
    goal: "Ekstraksi data web nyata: fetch halaman/API, parse HTML/JSON/CSV, bersihkan, jadikan dataset terstruktur.",
    steps: [
      "Tentukan sumber halaman/API & data sasaran.",
      "Fetch & parse via tool fetch/bash lalu bersihkan data.",
      "Simpan dataset (CSV/JSON) di workspace.",
      "Tutup dengan [SELESAI] + ringkasan.",
    ],
  },
  "combo-payment-fintech": {
    goal: "Rancang integrasi pembayaran/penagihan: gateway (Stripe/PayPal), invoice, transaksi, dan otomasi billing.",
    steps: [
      "Tentukan gateway & alur transaksi yang dibutuhkan.",
      "Tulis kode integrasi/invoice (file) di workspace memakai data contoh aman.",
      "Validasi via tool bash bila memungkinkan.",
      "Tutup dengan [SELESAI] + petunjuk integrasi.",
    ],
  },
  "combo-hr-recruitment": {
    goal: "Otomasi SDM & rekrutmen: deskripsi lowongan, saringan CV, pertanyaan wawancara, email kandidat, dan onboarding.",
    steps: [
      "Tentukan kebutuhan rekrutmen/posisi.",
      "Tulis JD, matriks saringan, pertanyaan wawancara, dan template email di workspace.",
      "Evaluasi CV/resume yang disediakan user secara terstruktur.",
      "Tutup dengan [SELESAI] + ringkasan.",
    ],
  },
  "combo-game-xr": {
    goal: "Rekayasa game/3D/XR nyata: desain level & narasi, skrip gameplay (Godot/Unity/Unreal), shader, hingga prototype XR.",
    steps: [
      "Tentukan engine (Godot/Unity/Unreal) & konsep game.",
      "Tulis skrip/konfigurasi proyek di workspace.",
      "Validasi struktur via tool bash bila memungkinkan.",
      "Tutup dengan [SELESAI] + petunjuk menjalankan.",
    ],
  },
  "combo-academic-research": {
    goal: "Susun kajian akademik/ilmiah berstandar: metodologi riset lintas disiplin, analisis, sitasi benar, dan laporan ilmiah.",
    steps: [
      "Tentukan pertanyaan riset & disiplin terkait.",
      "Kumpulkan sumber & bangun kerangka metodologi.",
      "Tulis laporan ilmiah (file) di workspace dengan sitasi benar.",
      "Tutup dengan [SELESAI] + ringkasan.",
    ],
  },
  "combo-healthcare-ai": {
    goal: "Rancang solusi kesehatan AI yang aman & patuh: EMR/CDSS, kontrol PHI/HIPAA, dan evaluasi klinis evidence-based.",
    steps: [
      "Tentukan use case klinis & kendala kepatuhan.",
      "Tulis arsitektur/pola (EMR/CDSS, kontrol akses PHI) di workspace.",
      "Periksa prinsip HIPAA & minimisasi data pada desain.",
      "Tutup dengan [SELESAI] + ringkasan & catatan disclaimer medis.",
    ],
  },
  "combo-project-delivery": {
    goal: "Kirim proyek tepat waktu: perencanaan/sprint/roadmap dengan gate kualitas + eksekusi geospasial (GIS/BIM/pemetaan).",
    steps: [
      "Tentukan scope proyek & deliverables.",
      "Tulis roadmap/sprint plan (file) di workspace.",
      "Untuk data geospasial: olah & petakan (file output) bila data tersedia.",
      "Tutup dengan [SELESAI] + ringkasan.",
    ],
  },
  "combo-generalist-master": {
    goal: "Kerjakan tugas lintas-domain secara fleksibel: operasional umum, template, workflow campuran, dan troubleshooting.",
    steps: [
      "Pahami permintaan dan pilih pendekatan terbaik.",
      "Eksekusi nyata via tool bash/write/read/fetch/kb sesuai kebutuhan.",
      "Simpan artefak di workspace bila relevan.",
      "Tutup dengan [SELESAI] + ringkasan.",
    ],
  },
  "combo-secure-data-pipeline": {
    goal: "Rancang pipeline data aman end-to-end: enkripsi, kontrol akses, audit trail, dan deteksi anomali — kepatuhan sejak desain.",
    steps: [
      "Tentukan jalur data & klasifikasinya (PII/sensitif).",
      "Tulis desain/konfigurasi (enkripsi, IAM, audit log) di workspace.",
      "Validasi via tool bash bila memungkinkan.",
      "Tutup dengan [SELESAI] + ringkasan.",
    ],
  },
};


function missionFor(cap) {
  if (!cap) return null;
  const m = MISSIONS[cap.id];
  if (m) return m;
  return {
    goal: "Kerjakan permintaan user memakai kemampuan " + cap.name + " (" + cap.emoji + "), gunakan tool yang relevan untuk hasil nyata.",
    steps: [
      "Pahami permintaan user terkait " + cap.name + ".",
      "Gunakan tool (bash/write/read/kb/fetch) bila membantu hasil nyata.",
      "Simpan artefak ke file di workspace bila relevan.",
      "Tutup dengan [SELESAI] + ringkasan dalam Bahasa Indonesia.",
    ],
  };
}

// ---------- Bangun prompt misi + pack fusion ----------
function buildMission(task, cap, sessId) {
  const packs = FUSION.getPacks() || {};
  const miss = missionFor(cap);
  const pack = packs[cap.id];
  const packTxt = pack ? FUSION.formatPack(pack, 1800) : "";
  const top = KB.pickCards(task, KB.loadCards(), 4);
  const kb = top.map((c) => "- " + c.name + ": " + c.description).join("\n");

  const stepsTxt = miss.steps.map((s, i) => (i + 1) + ". " + s).join("\n");
  // Format eksplisit: kemampuan disebutkan dengan nama, emoji, insight, dan skills
  const capExplicit =
    cap.emoji + " " + cap.name + "\n" +
    (cap.insight ? "Insight: " + cap.insight + "\n" : "") +
    "Skill: " + (cap.skills || cap.domains || []).join(", ");

  return {
    skillKey: cap.id,
    skillName: cap.emoji + " " + cap.name,
    system: "Kamu agen eksekusi misi (seperti Codex). Pengguna memberikan SATU perintah, dan kamu menjalankan kemampuan khusus secara otomatis dari awal sampai selesai.\n\n" +
      "KEMAMPUAN EKSPLISIT YANG DIAKTIFKAN:\n" + capExplicit + "\n\n" +
      "TUJUAN MISI: " + miss.goal + "\n\n" +
      "RENCANA LANGKAH OTOMATIS:\n" + stepsTxt +
      (packTxt ? "\n\nPANDUAN DARI FUSI KODE & LOGIKA kemampuan ini:\n" + packTxt : "") +
      (kb ? "\n\nSKILL RELEVAN DI KNOWLEDGE BASE:\n" + kb : "") +
      "\n\nEKSEKUSI WAJIB NYATA: gunakan tool bash/run/npm/sql/write/read/fetch yang benar-benar menjalankan perintah di lingkungan gratis cloud. " +
      "Terapkan insight dan pengetahuan spesifik kemampuan ini saat mengeksekusi — bukan pendekatan generik. " +
      "Jangan hanya menulis langkah-langkah. Jika tool gagal, coba cara lain sampai perintah tereksekusi. Jangan mengarang hasil tool. " +
      "Simpan artefak penting ke file di workspace. Selesaikan dengan blok [SELESAI]<ringkasan dalam Bahasa Indonesia>.",
  };
}

// Default mission bila kemampuan tak terdeteksi (generic single-command)
function buildGeneric(task) {
  const top = KB.pickCards(task, KB.loadCards(), 4);
  const kb = top.map((c) => "- " + c.name + ": " + c.description).join("\n");
  return {
    skillKey: "generic",
    skillName: "⚡ Single-Command",
    system: "Kamu agen eksekusi misi (seperti Codex). Jalankan SATU perintah user secara otomatis sampai selesai — WAJIB eksekusi nyata via tool bash/run/npm/sql/write, coba cara lain bila gagal.\n\n" +
      "SKILL RELEVAN:\n" + kb +
      "\n\nLangkah: pahami tujuan -> pecah jadi tahapan -> kerjakan (tool bila perlu) -> tutup [SELESAI]<ringkasan dalam Bahasa Indonesia>.",
  };
}

module.exports = { matchSkill, missionFor, buildMission, buildGeneric, MISSIONS, COMBO_COMMANDS };
