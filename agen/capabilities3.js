// GENERATED FILE — jangan edit manual. Produk dari tools/generate-capabilities.js
// (sumber kebenaran: agen/capability-catalog.js).
// ARSITEKTUR KEMAMPUAN v3 — "Evolusi Terpadu": 4 PRIME + 39 COMBOS dalam satu
// model terpadu yang kaya & dapat dieksekusi nyata. Metadata (family/tier/
// recipe/commands/outcomes) digenerate konsisten dari katalog.

const EVO = require("./capabilities2.js");
const RUN = require("./run.js");
const OUTPUTS = require("./outputs.js");

// Peta 39 combo -> PRIME payung (dari katalog; tunggal & terverifikasi).
const FAMILY = {
  "combo-install-download": "prime-cloud-platform",
  "combo-network-edge": "prime-cloud-platform",
  "combo-os-environment": "prime-cloud-platform",
  "combo-backup-disaster-recovery": "prime-cloud-platform",
  "combo-finops-cost": "prime-cloud-platform",
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
  "combo-agent-systems": "prime-secobs-agentics",
  "combo-agentic-devops": "prime-secobs-agentics",
  "combo-automation-workflow": "prime-secobs-agentics",
  "combo-mcp-tool-builder": "prime-secobs-agentics",
  "combo-email-notifications": "prime-secobs-agentics",
};

function enrichCombo(c) {
  const recipeName = OUTPUTS.RECIPES[c.id]?.name || null;
  return {
    ...c,
    tier: recipeName ? "ADVANCED-CAP" : "CORE-CAP",
    family: FAMILY[c.id] || null,
    commands: RUN.COMBO_COMMANDS[c.id] || [],
    runnable: !!recipeName,
    recipe: recipeName,
    outcomes: [
      c.insight,
      recipeName
        ? "Terbukti dapat dieksekusi nyata: membangun artefak konkret via alur `" + recipeName + "` di agen."
        : "Belum ada jalur eksekusi nyata — gunakan sebagai acuan pengetahuan.",
    ],
  };
}

function enrichPrime(p) {
  return {
    ...p,
    tier: "EVOLUTION",
    family: null,
    commands: [],
    runnable: false,
    recipe: null,
    outcomes: [
      p.insight,
      "Payung evolusi untuk " + (p.domains || []).length + " domain meta-kemampuan: " + (p.domains || []).join(", ") + ".",
    ],
  };
}

const PRIMES3 = EVO.PRIMES.map(enrichPrime);
const COMBOS3 = EVO.COMBOS.map(enrichCombo);
const CAPS3 = PRIMES3.concat(COMBOS3);

function byId(id) {
  return CAPS3.find((x) => x.id === id) || null;
}

module.exports = { FAMILY, PRIMES3, COMBOS3, CAPS3, byId };
