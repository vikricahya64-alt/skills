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
};

// ---------- Amankan identitas kemampuan dari perintah ----------
function matchSkill(q) {
  const w = q.toLowerCase();
  const pool = EVO.PRIMES.concat(EVO.COMBOS);
  const isCombo = (it) => (it.id || "").startsWith("combo-");

  // 1) Perintah instal/unduh yang jelas -> langsung ke kemampuan Install & Artifact
  const installHit = /(install|instal|unduh|download|pasang|instalasi|package|dependensi|dependency|helm install|docker pull|\bpip\b|\bnpm\b|\bcargo\b|\bbrew\b|\bgo get\b|\bapt\b|\bwinget\b)/i.test(w);
  if (installHit) {
    const installCap = pool.find((it) => it.id === "combo-install-download");
    if (installCap) return installCap;
  }

  // 2) Skor keyword: kemampuan dengan paling banyak kata kunci cocok menang
  const scored = pool
    .map((it) => ({ it, score: (it.keywords || []).filter((k) => w.includes(k)).length }))
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score || ((isCombo(b.it) ? 1 : 0) - (isCombo(a.it) ? 1 : 0)));
  if (scored.length) return scored[0].it;

  // 3) cluster perintah singkat yang lazim
  const spec = [
    { starts: ["riset", "research", "deep dive", "investigate", "lakukan riset", "teliti"], combo: "combo-multi-agent-research" },
    { starts: ["efisien", "efisiensi", "optimasi", "optimize", "performa", "kinerja", "benchmark", "hemat"], combo: "combo-token-efficiency" },
    { starts: ["buat app", "bikin app", "buat aplikasi", "ai app", "chatbot", "apk"], combo: "combo-ai-native-app" },
    { starts: ["rag", "knowledge graph", "basis pengetahuan", "retrieval"], combo: "combo-rag-knowledge" },
    { starts: ["mcp", "buat tool", "integrasi", "plugin"], combo: "combo-mcp-tool-builder" },
    { starts: ["test", "uji", "e2e", "quality", "benchmark"], combo: "combo-e2e-quality" },
    { starts: ["content", "konten", "marketing", "brand", "seo", "copywrite"], combo: "combo-growth-content" },
    { starts: ["agent", "subagent", "orchestration", "orkestrasi"], combo: "combo-agent-systems" },
    { starts: ["runtime", "bun", "nextjs", "performansi"], combo: "combo-runtime-performance" },
    { starts: ["mle", "riset ke ai", "pipeline riset", "eksperimen model"], combo: "combo-research-ai-pipeline" },
    { starts: ["install", "instal", "unduh", "download", "package", "pasang", "setup", "dependensi", "dependency"], combo: "combo-install-download" },
    { starts: ["network", "jaringan", "proxy", "nginx", "load balancer", "dns", "vlan", "vpn", "waf", "istio", "linkerd", "service mesh", "firewall"], combo: "combo-network-edge" },
    { starts: ["flox", "nix", "environment reproduksibel", "reproducible env", "bash defensif", "shellcheck", "bats", "lingkungan os", "linux environment"], combo: "combo-os-environment" },
  ];
  for (const s of spec) {
    for (const k of s.starts) if (w.includes(k)) {
      const it = pool.find((p) => p.id === s.combo);
      if (it) return it;
    }
  }
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
  return {
    skillKey: cap.id,
    skillName: cap.emoji + " " + cap.name,
    system: "Kamu agen eksekusi misi (seperti Codex). Pengguna memberikan SATU perintah, dan kamu menjalankan kemampuan khusus secara otomatis dari awal sampai selesai.\n\n" +
      "KEMAMPUAN YANG DIAKTIFKAN: " + cap.emoji + " " + cap.name + "\n" +
      "TUJUAN MISI: " + miss.goal + "\n\n" +
      "RENCANA LANGKAH OTOMATIS:\n" + stepsTxt +
      (packTxt ? "\n\nPANDUAN DARI FUSI KODE & LOGIKA kemampuan ini:\n" + packTxt : "") +
      (kb ? "\n\nSKILL RELEVAN DI KNOWLEDGE BASE:\n" + kb : "") +
      "\n\nGunakan tool nyata bila membantu (bash, write, read, kb, fetch). Jangan mengarang hasil tool. " +
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
    system: "Kamu agen eksekusi misi (seperti Codex). Jalankan SATU perintah user secara otomatis sampai selesai, gunakan tool nyata bila membantu.\n\n" +
      "SKILL RELEVAN:\n" + kb +
      "\n\nLangkah: pahami tujuan -> pecah jadi tahapan -> kerjakan (tool bila perlu) -> tutup [SELESAI]<ringkasan dalam Bahasa Indonesia>.",
  };
}

module.exports = { matchSkill, missionFor, buildMission, buildGeneric, MISSIONS, COMBO_COMMANDS };
