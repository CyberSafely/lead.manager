// Load public/district-stats.js (window.MO_DISTRICT_STATS, built by scripts/district-stats.py) in Node, for the
// scripts: the DESE facts per district (enrollment, schools, main lines) and its staff email format.
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";

const FILE = path.join(path.dirname(path.dirname(path.dirname(new URL(import.meta.url).pathname))), "public/district-stats.js");

/** The stats object keyed by 6-digit DESE code, or {} when the file hasn't been generated. */
export function loadDistrictStats(file = FILE) {
  if (!fs.existsSync(file)) return {};
  const ctx = { window: {} };
  vm.runInNewContext(fs.readFileSync(file, "utf8"), ctx);
  return ctx.window.MO_DISTRICT_STATS || {};
}

/** One line about the district for a script's output (organisation facts only). */
export function districtLine(stats, districtId) {
  const d = stats[String(districtId || "").trim().padStart(6, "0")];
  if (!d) return "DESE: district not in public/district-stats.js";
  const n = v => v == null ? "?" : v.toLocaleString("en-US");
  return `DESE: ${d.name} · ${n(d.students)} students · ${n(d.schools)} schools`;
}
