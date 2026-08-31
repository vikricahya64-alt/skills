// ============================================================================
// KATALOG KEMAMPUAN — SARU SUMBER KEBENARAN (single source of truth).
//
// Ini adalah SATU tempat semua metadata kemampuan didefinisikan, mengikuti
// arsitektur developer internasional: "definisi terpusat -> codegen -> verify".
//
// Katalog menghimpun SEMUA 55 kemampuan (12 meta-CAPS + 4 PRIME + 39 COMBOS)
// dan metadata internasional lengkapnya:
//   layer      : meta | prime | combo
//   id/name/emoji/insight : identitas kanonik
//   group      : kategori tampilan (Android & web)
//   tier       : EVOLUTION (PRIME) | ADVANCED-CAP (combo siap eksekusi) | CORE-CAP
//   family     : id PRIME payung (berlaku utk combo)
//   recipe     : nama fungsi eksekutor nyata (outputs.js RECIPES)
//   commands[] : frasa contoh perintah (run.js COMBO_COMMANDS)
//   version    : skema semver — naikkan bila definisi berubah material
//   category   : kategori sebaran (meniru metadata.category pada SKILL.md resmi)
//   tags[]     : tag pencarian/filter
//
// Data berat (keywords/skills/domains/insight yang sudah matang & teruji) diambil
// dari modul runtime (capabilities.js / capabilities2.js) supaya tak melenceng;
// struktur keluarga & metadata antarmuka hidup DI SINI dan di-generate ke semua
// artefak turunan oleh tools/generate-capabilities.js.
// ============================================================================

const META = require("./capabilities.js").CAPS;
const EVO = require("./capabilities2.js");
const RUN = require("./run.js");
const OUTPUTS = require("./outputs.js");

// ---------------------- Aturan antarmuka (kanonik) -------------------------

// Family: peta 39 combo -> PRIME payung (hierarki kemampuan). Single source —
// di-generate ke capabilities3.js & tabel README.
const FAMILY = {
  // prime-cloud-platform: infrastruktur, network, env, distribusi, keandalan
  "combo-install-download": "prime-cloud-platform",
  "combo-network-edge": "prime-cloud-platform",
  "combo-os-environment": "prime-cloud-platform",
  "combo-backup-disaster-recovery": "prime-cloud-platform",
  "combo-finops-cost": "prime-cloud-platform",

  // prime-data-ai: data, ML, riset, pipeline, lokalisasi
  "combo-sql-data-workflow": "prime-data-ai",
  "combo-web-scraping-intel": "prime-data-ai",
  "combo-live-web-exec": "prime-data-ai",
  "combo-local-db-app": "prime-data-ai",
  "combo-secure-data-pipeline": "prime-data-ai",
  "combo-dataviz-reporting": "prime-data-ai",
  "combo-research-ai-pipeline": "prime-data-ai",
  "combo-rag-knowledge": "prime-data-ai",
  "combo-academic-research": "prime-data-ai",
  "combo-healthcare-ai": "prime-data-ai",
  "combo-translation-lang": "prime-data-ai",
  "combo-multi-agent-research": "prime-data-ai",

  // prime-software-product: aplikasi, web/mobile, kualitas, produk
  "combo-build-apk": "prime-software-product",
  "combo-build-shipping": "prime-software-product",
  "combo-ai-native-app": "prime-software-product",
  "combo-mobile-cloud": "prime-software-product",
  "combo-devtools-dx": "prime-software-product",
  "combo-e2e-quality": "prime-software-product",
  "combo-runtime-performance": "prime-software-product",
  "combo-token-efficiency": "prime-software-product",
  "combo-game-xr": "prime-software-product",
  "combo-media-generation": "prime-software-product",
  "combo-rendering-everything": "prime-software-product",
  "combo-web3-secure": "prime-software-product",
  "combo-payment-fintech": "prime-software-product",
  "combo-growth-content": "prime-software-product",
  "combo-hr-recruitment": "prime-software-product",
  "combo-project-delivery": "prime-software-product",
  "combo-generalist-master": "prime-software-product",

  // prime-secobs-agentics: agent, keamanan, otomasi, observability
  "combo-agent-systems": "prime-secobs-agentics",
  "combo-agentic-devops": "prime-secobs-agentics",
  "combo-automation-workflow": "prime-secobs-agentics",
  "combo-mcp-tool-builder": "prime-secobs-agentics",
  "combo-email-notifications": "prime-secobs-agentics",
};

// Group kategori TAMPILAN (Android & web), per kemampuan yang tampil.
const GROUP = {
  // PRIME
  "prime-cloud-platform": "Evolusi",
  "prime-data-ai": "Evolusi",
  "prime-software-product": "Evolusi",
  "prime-secobs-agentics": "Evolusi",
  // COMBOS
  "combo-multi-agent-research": "Riset & AI",
  "combo-token-efficiency": "Sistem & Performa",
  "combo-mcp-tool-builder": "DevTools & Agent",
  "combo-ai-native-app": "Build App",
  "combo-e2e-quality": "Kualitas",
  "combo-growth-content": "Growth & Konten",
  "combo-runtime-performance": "Sistem & Performa",
  "combo-agent-systems": "DevTools & Agent",
  "combo-research-ai-pipeline": "Riset & AI",
  "combo-rag-knowledge": "Riset & AI",
  "combo-devtools-dx": "DevTools & Agent",
  "combo-media-generation": "Konten & Media",
  "combo-agentic-devops": "DevOps & Delivery",
  "combo-mobile-cloud": "Build App",
  "combo-web3-secure": "Keamanan",
  "combo-sql-data-workflow": "Data",
  "combo-live-web-exec": "Web & Live",
  "combo-local-db-app": "Data",
  "combo-automation-workflow": "Otomasi",
  "combo-translation-lang": "Konten & Media",
  "combo-rendering-everything": "Konten & Media",
  "combo-finops-cost": "Keuangan & Cloud",
  "combo-dataviz-reporting": "Data",
  "combo-email-notifications": "Notifikasi",
  "combo-backup-disaster-recovery": "Ops & Recovery",
  "combo-web-scraping-intel": "Data",
  "combo-payment-fintech": "Keuangan & Cloud",
  "combo-hr-recruitment": "Operasional",
  "combo-game-xr": "Kreatif & Game",
  "combo-academic-research": "Riset & AI",
  "combo-healthcare-ai": "Riset & AI",
  "combo-project-delivery": "Operasional",
  "combo-generalist-master": "Operasional",
  "combo-secure-data-pipeline": "Data",
  "combo-install-download": "DevOps & Delivery",
  "combo-network-edge": "Jaringan",
  "combo-os-environment": "Sistem & Performa",
  "combo-build-shipping": "DevOps & Delivery",
  "combo-build-apk": "DevOps & Delivery",
};

// Urutan group (untuk tampilan Android & README) — kanonik.
const GROUP_ORDER = [
  "Evolusi", "Riset & AI", "Build App", "DevTools & Agent", "DevOps & Delivery",
  "Data", "Konten & Media", "Sistem & Performa", "Keamanan",
  "Keuangan & Cloud", "Otomasi", "Operasional", "Jaringan",
  "Kualitas", "Growth & Konten", "Web & Live", "Notifikasi",
  "Ops & Recovery", "Kreatif & Game",
];

// Metadata internasional per kemampuan (yang belum ada di modul runtime).
// format: { id: { version, category, tags } }
const META_INFO = {
  "prime-cloud-platform": { version: "3.0.0", category: "Cloud", tags: ["cloud", "infra", "iac", "database"] },
  "prime-data-ai": { version: "3.0.0", category: "Data & AI", tags: ["data", "ml", "ai", "pipeline"] },
  "prime-software-product": { version: "3.0.0", category: "Software", tags: ["software", "product", "mobile", "web"] },
  "prime-secobs-agentics": { version: "3.0.0", category: "Security & Ops", tags: ["security", "observability", "agentic"] },

  "combo-multi-agent-research": { version: "3.0.0", category: "Research", tags: ["research", "deep-dive", "multi-agent"] },
  "combo-token-efficiency": { version: "3.0.0", category: "Performance", tags: ["efficiency", "optimization", "token"] },
  "combo-mcp-tool-builder": { version: "3.0.0", category: "DevTools", tags: ["mcp", "tooling", "agent"] },
  "combo-ai-native-app": { version: "3.0.0", category: "AI App", tags: ["ai", "app", "generative-ui"] },
  "combo-e2e-quality": { version: "3.0.0", category: "Quality", tags: ["e2e", "testing", "benchmark"] },
  "combo-growth-content": { version: "3.0.0", category: "Growth", tags: ["growth", "brand", "content"] },
  "combo-runtime-performance": { version: "3.0.0", category: "Performance", tags: ["runtime", "performance", "bundle"] },
  "combo-agent-systems": { version: "3.0.0", category: "Agentic", tags: ["multi-agent", "orchestration"] },
  "combo-research-ai-pipeline": { version: "3.0.0", category: "ML", tags: ["research", "ml", "pipeline"] },
  "combo-rag-knowledge": { version: "3.0.0", category: "AI", tags: ["rag", "knowledge-graph", "retrieval"] },
  "combo-devtools-dx": { version: "3.0.0", category: "DevTools", tags: ["dx", "cli", "documentation"] },
  "combo-media-generation": { version: "3.0.0", category: "Media", tags: ["ai-media", "image", "video", "slides"] },
  "combo-agentic-devops": { version: "3.0.0", category: "DevOps", tags: ["devops", "agentic", "ci-cd"] },
  "combo-mobile-cloud": { version: "3.0.0", category: "Mobile", tags: ["mobile", "cloud", "webview"] },
  "combo-web3-secure": { version: "3.0.0", category: "Web3", tags: ["web3", "blockchain", "security"] },
  "combo-sql-data-workflow": { version: "3.0.0", category: "Data", tags: ["sql", "data", "workflow"] },
  "combo-live-web-exec": { version: "3.0.0", category: "Web", tags: ["web", "live", "fetch", "scrape"] },
  "combo-local-db-app": { version: "3.0.0", category: "Data", tags: ["sqlite", "api", "crud", "node"] },
  "combo-automation-workflow": { version: "3.0.0", category: "Automation", tags: ["automation", "scheduler", "workflow"] },
  "combo-translation-lang": { version: "3.0.0", category: "Language", tags: ["translation", "i18n", "multilingual"] },
  "combo-rendering-everything": { version: "3.0.0", category: "Rendering", tags: ["render", "html", "pdf", "report"] },
  "combo-finops-cost": { version: "3.0.0", category: "FinOps", tags: ["finops", "cost", "budget", "cloud"] },
  "combo-dataviz-reporting": { version: "3.0.0", category: "Data", tags: ["dataviz", "dashboard", "reporting"] },
  "combo-email-notifications": { version: "3.0.0", category: "Comms", tags: ["email", "notification", "slack", "telegram"] },
  "combo-backup-disaster-recovery": { version: "3.0.0", category: "Reliability", tags: ["backup", "restore", "migration", "dr"] },
  "combo-web-scraping-intel": { version: "3.0.0", category: "Data", tags: ["scraping", "extraction", "parse"] },
  "combo-payment-fintech": { version: "3.0.0", category: "Fintech", tags: ["payment", "billing", "invoice"] },
  "combo-hr-recruitment": { version: "3.0.0", category: "HR", tags: ["hr", "recruitment", "onboarding"] },
  "combo-game-xr": { version: "3.0.0", category: "Game", tags: ["game", "3d", "xr", "godot", "unity"] },
  "combo-academic-research": { version: "3.0.0", category: "Research", tags: ["academic", "scientific", "methodology"] },
  "combo-healthcare-ai": { version: "3.0.0", category: "Healthcare", tags: ["healthcare", "medical", "phi", "hipaa"] },
  "combo-project-delivery": { version: "3.0.0", category: "Delivery", tags: ["project", "sprint", "gis", "geospatial"] },
  "combo-generalist-master": { version: "3.0.0", category: "General", tags: ["generalist", "operator", "misc"] },
  "combo-secure-data-pipeline": { version: "3.0.0", category: "Data", tags: ["security", "data", "pipeline", "encryption"] },
  "combo-install-download": { version: "3.0.0", category: "DevOps", tags: ["install", "download", "package", "artifact"] },
  "combo-network-edge": { version: "3.0.0", category: "Network", tags: ["network", "edge", "proxy", "service-mesh"] },
  "combo-os-environment": { version: "3.0.0", category: "Environment", tags: ["os", "reproducible", "nix", "env"] },
  "combo-build-shipping": { version: "3.0.0", category: "Build", tags: ["build", "shipping", "gradle", "docker"] },
  "combo-build-apk": { version: "3.0.0", category: "Build", tags: ["apk", "android", "gradle", "signing"] },
};

// ---------------------- Ekspansi KATALOG (unified) -------------------------
// Menggabungkan identitas (dari modul runtime, sumber utama insight/keywords)
// dengan metadata antarmuka (family/group/version/category/tags/recipe/commands).

function metaCap(c) {
  const info = META_INFO[c.id] || { version: "1.0.0", category: "Meta", tags: [] };
  return {
    layer: "meta", id: c.id, name: c.name, emoji: c.emoji, insight: c.insight,
    keywords: c.keywords || [], skills: c.skills || [],
    group: info.category, tier: "CORE-CAP", family: null,
    recipe: null, runnable: false, commands: [],
    version: info.version, category: info.category, tags: info.tags,
  };
}

function primeCap(p) {
  const info = META_INFO[p.id] || { version: "1.0.0", category: "Evolusi", tags: [] };
  return {
    layer: "prime", id: p.id, name: p.name, emoji: p.emoji, insight: p.insight,
    keywords: p.keywords || [], domains: p.domains || [],
    group: GROUP[p.id] || "Evolusi", tier: "EVOLUTION", family: null,
    recipe: null, runnable: false, commands: [],
    version: info.version, category: info.category, tags: info.tags,
  };
}

function comboCap(c) {
  const recipeName = OUTPUTS.RECIPES[c.id]?.name || null;
  const info = META_INFO[c.id] || { version: "1.0.0", category: (GROUP[c.id] || "Data"), tags: [] };
  const g = GROUP[c.id] || "Data";
  return {
    layer: "combo", id: c.id, name: c.name, emoji: c.emoji, insight: c.insight,
    keywords: c.keywords || [], skills: c.skills || [],
    group: g, tier: recipeName ? "ADVANCED-CAP" : "CORE-CAP",
    family: FAMILY[c.id] || null,
    commands: RUN.COMBO_COMMANDS[c.id] || [],
    recipe: recipeName, runnable: !!recipeName,
    outcomes: [
      c.insight,
      recipeName
        ? "Terbukti dapat dieksekusi nyata: membangun artefak konkret via alur `" + recipeName + "` di agen."
        : "Belum ada jalur eksekusi nyata — gunakan sebagai acuan pengetahuan.",
    ],
    version: info.version, category: info.category, tags: info.tags,
  };
}

const METAS = META.map(metaCap);
const PRIMES = EVO.PRIMES.map(primeCap);
const COMBOS = EVO.COMBOS.map(comboCap);
const CATALOG = METAS.concat(PRIMES, COMBOS);

function byId(id) {
  return CATALOG.find((c) => c.id === id) || null;
}

function byLayer(layer) {
  return CATALOG.filter((c) => c.layer === layer);
}

// Kelompok group -> daftar kemampuan tampil (PRIME+COMBOS, dipakai generator Kt).
function groups() {
  const map = {};
  const shown = PRIMES.concat(COMBOS);
  for (const g of GROUP_ORDER) map[g] = [];
  for (const c of shown) (map[c.group] = map[c.group] || []).push(c);
  // urutkan id di tiap group agar deterministik
  for (const g of Object.keys(map)) map[g].sort((a, b) => a.id.localeCompare(b.id));
  return map;
}

module.exports = { FAMILY, GROUP, GROUP_ORDER, META_INFO, METAS, PRIMES, COMBOS, CATALOG, byId, byLayer, groups };
