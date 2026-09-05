// Memory audit script — run while a large file upload is in progress.
// Polls GET /memory every second and logs heap usage to console + audit-results.json
// Usage: node audit.js

const http = require("http");
const fs = require("fs");

const POLL_INTERVAL_MS = 1000;
const MEMORY_ENDPOINT = "http://localhost:3000/memory";
const OUTPUT_FILE = "audit-results.json";
const HEAP_LIMIT_MB = 150;

const samples = [];

function poll() {
  http.get(MEMORY_ENDPOINT, (res) => {
    let raw = "";
    res.on("data", (c) => (raw += c));
    res.on("end", () => {
      try {
        const data = JSON.parse(raw);
        const sample = { ts: new Date().toISOString(), ...data };
        samples.push(sample);
        const over = parseFloat(data.heapUsedMB) > HEAP_LIMIT_MB;
        console.log(
          `[${sample.ts}] heapUsed: ${data.heapUsedMB} MB | rss: ${data.rssMB} MB${over ? "  ⚠️  OVER LIMIT" : ""}`
        );
      } catch {
        console.error("Failed to parse /memory response");
      }
    });
  }).on("error", (e) => console.error("Poll error:", e.message));
}

console.log(`Polling ${MEMORY_ENDPOINT} every ${POLL_INTERVAL_MS}ms — Ctrl+C to stop.\n`);
const interval = setInterval(poll, POLL_INTERVAL_MS);

process.on("SIGINT", () => {
  clearInterval(interval);
  if (samples.length === 0) { console.log("\nNo samples collected."); process.exit(0); }

  const heaps = samples.map((s) => parseFloat(s.heapUsedMB));
  const peak = Math.max(...heaps);
  const avg = (heaps.reduce((a, b) => a + b, 0) / heaps.length).toFixed(2);
  const passed = peak <= HEAP_LIMIT_MB;

  const report = { samples, peak: `${peak} MB`, avg: `${avg} MB`, limitMB: HEAP_LIMIT_MB, passed };
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(report, null, 2));

  console.log(`\n--- Audit Complete ---`);
  console.log(`Peak heap : ${peak} MB`);
  console.log(`Avg heap  : ${avg} MB`);
  console.log(`Limit     : ${HEAP_LIMIT_MB} MB`);
  console.log(`Result    : ${passed ? "✅ PASSED" : "❌ FAILED"}`);
  console.log(`Saved to  : ${OUTPUT_FILE}`);
  process.exit(0);
});
