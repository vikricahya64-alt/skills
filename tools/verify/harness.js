// ============================================================================
// HARNESS — runner arsitektur verifikasi. Menjalankan kumpulan "check" modular,
// mengumpulkan hasil terstruktur, lalu mencetak laporan manusia + opsi JSON.
//
// Setiap check adalah fungsi async: () => { name, ok, detail?, checks? }
//   - checks[] : daftar sub-check { name, ok, detail }
//   - detail   : catatan bebas (string[]) untuk hasil gagal
// ============================================================================

async function runChecks(checks) {
  const summary = { total: 0, passed: 0, failed: 0 };
  const results = [];
  for (const fn of checks) {
    let res;
    try {
      res = await fn();
    } catch (e) {
      res = { name: fn.name || "check", ok: false, detail: ["EXCEPTION: " + e.message] };
    }
    if (!res || typeof res.ok !== "boolean") {
      res = { name: res && res.name ? res.name : "check", ok: false, detail: ["check tidak mengembalikan {ok}"] };
    }
    if (Array.isArray(res.checks)) {
      res.checks.forEach((c) => {
        summary.total++;
        if (c.ok) summary.passed++; else summary.failed++;
      });
    } else {
      summary.total++;
      if (res.ok) summary.passed++; else summary.failed++;
    }
    results.push(res);
  }
  return { summary, results };
}

function printReport({ summary, results }) {
  const lines = [];
  for (const r of results) {
    if (Array.isArray(r.checks)) {
      lines.push("• " + r.name + "  [" + r.checks.filter((c) => c.ok).length + "/" + r.checks.length + " ok]");
      for (const c of r.checks) {
        lines.push("  " + (c.ok ? "✅" : "❌") + " " + c.desc);
        if (!c.ok && c.detail) c.detail.forEach((d) => lines.push("      " + d));
      }
    } else {
      lines.push((r.ok ? "✅" : "❌") + " " + r.name);
      if (!r.ok && r.detail) r.detail.forEach((d) => lines.push("      " + d));
    }
  }
  lines.push("---------------------------------------------------");
  lines.push(
    (summary.failed ? "GAGAL: " : "SEMUA VERIFIKASI LULUS ✅ ") +
      "total=" + summary.total + " lulus=" + summary.passed + " gagal=" + summary.failed
  );
  return lines.join("\n");
}

module.exports = { runChecks, printReport };
