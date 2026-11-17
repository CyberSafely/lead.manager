// Find useful contacts on public staff directories (Finalsite sites), for Data → Import school contacts.
//
//   One school's staff page:
//     node scripts/scrape-staff.mjs --url <school staff page> --school "<School>" --district-id <DESE id> --leads <leads.json>
//   A district-wide directory with a location filter (every school of that district that's on the Principal list):
//     node scripts/scrape-staff.mjs --url <district staff directory> --district-id <DESE id> --leads <leads.json>
//   The district office (CTO / technology and safety leaders), as a CTO-list import (Data → Import CTOs, or import-list cto):
//     node scripts/scrape-staff.mjs --url <district staff directory> --district-id <DESE id> --office "Central Office" --district "<name>"
//     (--office all searches every location: some districts list their CIO or safety director elsewhere)
//   A district leadership page (the chiefs who oversee all schools), as a CTO-list import. Best for big districts:
//     node scripts/scrape-staff.mjs --url <district leadership page> --district-id <DESE id> --leaders --district "<name>"
//   Options: [--district "<name>"] [--out data/scraper/contacts-<name>.csv]
//
// <leads.json> is a backup (Data → Back up) or a plain array of leads; it supplies each school's Lead ID, so the
// import attaches people to exactly that school. When a school has two leads, the older one (with the history) wins.
//
// It searches the directory for counselors, technology leaders and safety specialists in a
// real browser (Playwright), the way a visitor would, so published emails show normally. It honours robots.txt
// (Disallow and Crawl-delay, at least 5 s between pages), never pages through results, reads public pages only and
// never logs in. Output goes to the git-ignored data/scraper/ folder for review before importing. Prints counts only.
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { chromium } from "playwright";

const ROOT = path.dirname(path.dirname(new URL(import.meta.url).pathname));
const arg = n => { const i = process.argv.indexOf("--" + n); return i < 0 ? "" : process.argv[i + 1] || ""; };
const url = arg("url"), oneSchool = arg("school"), districtId = arg("district-id").replace(/^0+/, ""), districtArg = arg("district");
if (!url || !districtId) { console.error("usage: node scripts/scrape-staff.mjs --url <staff directory> --district-id <id> [--school <name>] [--leads leads.json] [--district <name>] [--out file.csv]"); process.exit(2); }
const slug = (oneSchool || districtArg || "district-" + districtId).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const out = arg("out") || path.join(ROOT, "data/scraper", `${arg("office") || process.argv.includes("--leaders") ? "cto" : "contacts"}-${slug}.csv`);
const normS = s => String(s || "").toLowerCase().replace(/\b(school|schools|the)\b/g, "").replace(/[^a-z0-9]/g, "");

// Only people likely to take a call about a parent online-safety app: school counselors, technology leaders and
// safety specialists. Searches to run, then how a website title maps to a contact role (no match = skipped).
const KEYWORDS = ["counselor", "counseling", "technology", "digital", "safety", "security", "prevention"];
const NOT_A_LEAD = /paraprofessional|\bpara\b|substitute|secretary|clerk|administrative assistant|\baide\b|custod|food service|bus |driver|guard|monitor|security officer|resource officer|police|teacher - (?!counsel)/i;
const ROLES = [
  [/counsel/i, "Guidance counselor"],
  [/safety|security|prevention/i, "Safety / security", /director|coordinator|specialist|manager|chief|supervisor|lead/i],
  [/chief (technology|information)|\bCTO\b|\bCIO\b|technolog|digital|\bIT\b/i, "Technology / IT", /director|chief|coordinator|specialist|coach|integration|manager|\bCTO\b|\bCIO\b|executive/i],
];
const roleOf = title => {
  if (/counsel/i.test(title) ? /paraprofessional|substitute|secretary|clerk|administrative assistant|\baide\b/i.test(title) : NOT_A_LEAD.test(title)) return undefined;
  return ROLES.find(([re, , need]) => re.test(title) && (!need || need.test(title)))?.[1];
};
const ORDER = ["Guidance counselor", "Safety / security", "Technology / IT"];

// District office mode: only the people who lead technology or safety for the whole district
const office = arg("office");
const OFFICE_KEYWORDS = ["technology", "information", "chief", "safety", "security", "prevention", "superintendent", "student services", "counseling"];
const officeRoleOf = title => {
  if (/secretary|clerk|administrative ass|assistant to|technician|\baide\b|para|safety officer|security officer|resource officer|police|guard|transport/i.test(title)) return undefined;
  if (/chief (technology|information)|\bCTO\b|\bCIO\b|technolog|information (systems|services|technology)/i.test(title) && /chief|director|executive|officer|\bCTO\b|\bCIO\b/i.test(title)) return "Technology";
  if (/safety|security|emergency|prevention/i.test(title) && /chief|director|executive|coordinator|manager|supervisor|\bsupv\b/i.test(title)) return "Safety";
  return undefined;
};
// Leadership page mode: the district heads over all schools whose work touches student online safety
const leadersMode = process.argv.includes("--leaders");
const leaderRoleOf = title => {
  // Heads only (Rockwood-style abbreviations too: "Supt Assist", "Supv", "Sup"); building-level officers are not heads
  if (!/chief|superintendent|\bsupt\b|director|executive|supervisor|\bsupv\b|\bsup\b|head/i.test(title) && !/chief .*officer/i.test(title)) return undefined;
  if (/assistant to|secretary|clerk|administrative ass|school safety officer|resource officer|^superintendent$|^supt\.?$/i.test(title)) return undefined;   // the superintendent is already on the Overseer list
  if (/human resources|\bHR\b|financ|budget|communications?\b|legal|counsel(?!ing|or)|chief of staff|procurement|nutrition|transport|facilit|special ed|behavior|psych|speech|occupational/i.test(title)) return undefined;
  if (/student support|student services|counseling|wellness|social[- ]emotional|mental|emotional health|substance|prevention|climate|safety|security/i.test(title)) return "Student support / safety";
  if (/technolog|information|\bCTO\b|\bCIO\b/i.test(title)) return "Technology";
  if (/chief of schools|superintendent|\bsupt\b|chief academic|school leadership|chief of school|secondary/i.test(title)) return "Schools";
  if (/operations/i.test(title)) return "Operations (safety)";
  return undefined;
};
// District counseling lead (coordinates counselors across all schools)
const counselLeadOf = title => /counsel/i.test(title) && /coordinator|director|supervisor|chief|executive|lead\b/i.test(title) && !/secretary|clerk|administrative assistant|teacher/i.test(title) ? "Counseling lead" : undefined;
const roleFor = leadersMode ? leaderRoleOf : office ? (title => officeRoleOf(title) || counselLeadOf(title) || leaderRoleOf(title)) : roleOf;
const ctoOut = office || leadersMode;

// ---------- the district's schools on the Principal list ----------
let leads = [];
if (arg("leads")) { const j = JSON.parse(fs.readFileSync(arg("leads"), "utf8")); leads = Array.isArray(j) ? j : j.leads; }
const pick = ls => ls.sort((a, b) => String(a.createdAt || "").localeCompare(String(b.createdAt || "")))[0];   // oldest = the one with history
const schoolsInDistrict = new Map();
for (const l of leads.filter(l => (!l.type || l.type === "principal") && String(l.districtId || "").replace(/^0+/, "") === districtId))
  for (const s of String(l.school || "").split(" / ")) if (s) schoolsInDistrict.set(normS(s), [...(schoolsInDistrict.get(normS(s)) || []), l]);
const leadFor = name => { const m = schoolsInDistrict.get(normS(name)); return m ? pick([...m]) : null; };

// ---------- robots.txt (the "*" groups) ----------
const origin = new URL(url).origin;
const robots = await fetch(origin + "/robots.txt").then(r => r.ok ? r.text() : "").catch(() => "");
const rules = { allow: [], disallow: [], delay: 5 };
{ let mine = false;
  for (const line of robots.split(/\r?\n/)) {
    const [k, ...v] = line.split(":"); const key = k.trim().toLowerCase(), val = v.join(":").trim();
    if (key === "user-agent") mine = val === "*";
    else if (mine && key === "disallow" && val) rules.disallow.push(val);
    else if (mine && key === "allow" && val) rules.allow.push(val);
    else if (mine && key === "crawl-delay") rules.delay = Math.max(5, Number(val) || 5);
  } }
const toRe = p => new RegExp("^" + p.replace(/[.+?^${}()|[\]\\]/g, "\\$&").replace(/\*/g, ".*").replace(/\\\$$/, "$"));
const allowed = u => { const p = new URL(u).pathname + new URL(u).search;
  const hit = list => list.filter(r => toRe(r).test(p)).sort((a, b) => b.length - a.length)[0] || "";
  const a = hit(rules.allow), d = hit(rules.disallow); return !d || a.length >= d.length; };
if (!allowed(url)) { console.error("robots.txt disallows that page, stopping."); process.exit(1); }

// ---------- browser (the project's Playwright, or the newest Chrome already downloaded) ----------
async function launch() {
  try { return await chromium.launch(); } catch (e) {
    const cache = path.join(os.homedir(), "Library/Caches/ms-playwright");
    const dirs = fs.existsSync(cache) ? fs.readdirSync(cache).filter(d => /^chromium-\d+$/.test(d)).sort((a, b) => +b.split("-")[1] - +a.split("-")[1]) : [];
    for (const d of dirs) for (const exe of ["chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing", "chrome-mac/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing", "chrome-linux/chrome"]) {
      const p = path.join(cache, d, exe); if (fs.existsSync(p)) return chromium.launch({ executablePath: p });
    }
    throw e;
  }
}
const browser = await launch();
const page = await browser.newPage({ userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131 Safari/537.36 CyberSafely-outreach-research" });
const wait = () => page.waitForTimeout(rules.delay * 1000);
// Load a page and let its scripts fill in emails. Some sites never go network-idle, so wait for "load" plus a moment.
const go = async u => { try { await page.goto(u, { waitUntil: "load", timeout: 45000 }); await page.waitForTimeout(2000); return true; }
  catch (e) { console.log(`  (page timed out, skipped: ${new URL(u).search || u})`); return false; } };

await go(url);
const form = await page.$eval(".fsConstituentSearchForm", f => ({ action: f.getAttribute("action") || location.pathname,
  hidden: Object.fromEntries([...f.querySelectorAll("input[type=hidden]")].filter(i => i.value).map(i => [i.name, i.value])),
  locations: [...(f.querySelector("select[name=const_search_location]")?.options || [])].filter(o => o.value).map(o => ({ id: o.value, name: o.text.trim() })) })).catch(() => null);
if (!form && !leadersMode) { console.error("No Finalsite staff directory search on that page (different platform?). Nothing written."); await browser.close(); process.exit(1); }

// What to search: one school's page as a whole, or each matching school in the district directory's location list
let targets;
if (leadersMode) targets = [{ school: "leadership page", lead: null, params: {}, page: true }];
else if (office === "all") targets = [{ school: "whole directory", lead: null, params: {} }];   // district leaders listed at any location
else if (office) {
  const o = form.locations.find(o => normS(o.name) === normS(office)) || form.locations.find(o => normS(o.name).includes(normS(office)));
  if (!o) { console.error(`No "${office}" in this directory's locations: ${form.locations.map(o => o.name).join(", ")}`); await browser.close(); process.exit(2); }
  targets = [{ school: o.name, lead: null, params: { const_search_location: o.id } }];
} else if (oneSchool) targets = [{ school: oneSchool, lead: leadFor(oneSchool), params: {} }];
else {
  if (!form.locations.length) { console.error("This directory has no location filter: pass --school for a single school's page."); await browser.close(); process.exit(2); }
  targets = form.locations.filter(o => leadFor(o.name)).map(o => ({ school: o.name, lead: leadFor(o.name), params: { const_search_location: o.id } }));
  const listed = new Set(form.locations.map(o => normS(o.name)));
  const missing = [...schoolsInDistrict.keys()].filter(k => !listed.has(k));
  console.log(`directory locations: ${form.locations.length} · matched to your schools: ${targets.length}` + (missing.length ? ` · your schools not in the directory: ${missing.length}` : ""));
}

const rows = [], stats = { searches: 0, profiles: 0, people: 0, otherRoles: 0, isLead: 0, wrongPlace: 0 }, otherTitles = {};
for (const t of targets) {
  const seen = new Map();
  for (const kw of t.page ? [""] : office ? OFFICE_KEYWORDS : KEYWORDS) {
    const q = new URL(t.page ? url : form.action, url);
    if (!t.page) Object.entries({ ...form.hidden, ...t.params, const_search_keyword: kw }).forEach(([k, v]) => q.searchParams.set(k, v));
    if (!allowed(q.href)) continue;
    if (!t.page) { await wait(); if (!(await go(q.href))) continue; stats.searches++; }
    const items = await page.$$eval(".fsConstituentItem", els => els.map(e => ({
      id: e.getAttribute("data-constituent-id"),
      name: e.querySelector(".fsFullName")?.textContent.trim().replace(/\s+/g, " ") || "",
      title: (e.querySelector(".fsTitles")?.textContent || "").replace(/^\s*Titles?:\s*/i, "").trim().replace(/\s+/g, " "),
      loc: (e.querySelector(".fsLocations")?.textContent || "").replace(/^\s*Locations?:\s*/i, "").trim().replace(/\s+/g, " "),
      email: (e.querySelector(".fsEmail a[href^='mailto:']")?.getAttribute("href") || "").replace(/^mailto:/, "").trim().toLowerCase(),
      phone: e.querySelector(".fsPhones a[href^='tel:']")?.textContent.trim() || "",
    })));
    for (const i of items) {
      if (seen.has(i.id)) continue;
      seen.set(i.id, { ...i, source: q.href });
      // Some directories show email/phone only in the person's profile: open it (useful roles only, same delay)
      if ((!i.email || !i.phone) && roleFor(i.title)) {
        const link = page.locator(`.fsConstituentItem[data-constituent-id="${i.id}"] .fsConstituentProfileLink`).first();
        if (await link.count()) {
          await wait(); await link.click(); stats.profiles++;
          const d = await page.waitForSelector(`.fsConstituentProfile[data-constituent-id="${i.id}"]`, { timeout: 15000 }).catch(() => null);
          if (d) {
            const x = await d.evaluate(e => ({ email: (e.querySelector(".fsEmail a[href^='mailto:']")?.getAttribute("href") || "").replace(/^mailto:/, "").trim().toLowerCase(),
              phone: e.querySelector(".fsPhones a[href^='tel:']")?.textContent.replace(/\s+/g, " ").trim().replace(/^.*?(\(?\d{3}\)?[\s.-]*\d{3}[\s.-]*\d{4}.*)$/, "$1") || "" }));
            const p = seen.get(i.id); p.email = p.email || x.email; p.phone = p.phone || x.phone;
          }
          await page.keyboard.press("Escape").catch(() => {});
          await page.locator(".fsDialogCloseButton").first().click({ timeout: 2000 }).catch(() => {});
        }
      }
    }
  }
  let n = 0;
  for (const p of seen.values()) {
    stats.people++;
    const role = roleFor(p.title);
    if (!role) { stats.otherRoles++; otherTitles[p.title] = (otherTitles[p.title] || 0) + 1; continue; }
    // In a district directory the person must actually list this school (not only the central office)
    if (t.params.const_search_location && p.loc && !p.loc.split(/\s*[,;]\s*|\s{2,}/).some(x => normS(x) === normS(t.school)) && !normS(p.loc).includes(normS(t.school))) { stats.wrongPlace++; continue; }
    if (t.lead && p.email && p.email === String(t.lead.email || "").toLowerCase()) { stats.isLead++; continue; }
    const parts = p.name.split(" "), first = parts.shift() || "", last = parts.join(" ");
    rows.push({ "Lead ID": t.lead?.id || "", School: t.lead ? String(t.lead.school).split(" / ").find(s => normS(s) === normS(t.school)) || t.lead.school : t.school,
      District: t.lead?.district || districtArg, "District ID": districtId, "First Name": first, "Last Name": last, Role: role, Email: p.email, Phone: p.phone,
      Notes: `Website title: ${p.title}. Found ${new Date().toISOString().slice(0, 10)} on ${p.source}` });
    n++;
  }
  console.log(`  ${t.school}: ${n} useful contact${n === 1 ? "" : "s"}${t.lead || ctoOut ? "" : " (no school lead: won't import)"}`);
}
await browser.close();

rows.sort((a, b) => a.School.localeCompare(b.School) || ORDER.indexOf(a.Role) - ORDER.indexOf(b.Role));
const cell = v => /[",\n]/.test(String(v)) ? `"${String(v).replace(/"/g, '""')}"` : String(v);
const head = ctoOut ? ["District ID", "District", "First Name", "Last Name", "Email", "Phone Number", "Job Title", "Notes"]
  : ["Lead ID", "School", "District", "District ID", "First Name", "Last Name", "Role", "Email", "Phone", "Notes"];
if (ctoOut) {   // CTO-list rows: the website title is the job title
  const dName = districtArg || leads.find(l => String(l.districtId || "").replace(/^0+/, "") === districtId)?.district || "";
  rows.forEach(r => { r.District = dName; r["Phone Number"] = r.Phone; r["Job Title"] = (r.Notes.match(/^Website title: (.*?)\. Found/) || [])[1] || r.Role; });
}
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, [head, ...rows.map(r => head.map(h => r[h]))].map(r => r.map(cell).join(",")).join("\n") + "\n");

const by = {}; rows.forEach(r => by[r.Role] = (by[r.Role] || 0) + 1);
console.log(`searches: ${stats.searches}, profiles opened: ${stats.profiles} (${rules.delay}s apart, robots.txt honoured) · people found: ${stats.people}`);
console.log(`useful contacts: ${rows.length}  (${Object.entries(by).map(([k, v]) => `${v} ${k}`).join(", ") || "none"})`);
console.log(`skipped: ${stats.otherRoles} other roles, ${stats.isLead} already the school's lead, ${stats.wrongPlace} listed at another location`);
if (stats.otherRoles) console.log("  titles skipped: " + Object.entries(otherTitles).sort((a, b) => b[1] - a[1]).map(([t, n]) => `${n}× ${t}`).join("; "));
console.log(`with phone: ${rows.filter(r => r.Phone).length} of ${rows.length}`);
console.log(`with email: ${rows.filter(r => r.Email).length} of ${rows.length} · with a Lead ID: ${rows.filter(r => r["Lead ID"]).length}`);
console.log(`wrote ${path.relative(ROOT, out)}`);
