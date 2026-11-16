// Find useful contacts on one school's public staff directory (Finalsite sites), for Data → Import school contacts.
//
//   node scripts/scrape-staff.mjs --url <school staff page> --school "<School>" --district-id <DESE id> \
//        [--district "<District>"] [--leads <backup.json>] [--out data/scraper/contacts-<school>.csv]
//
// It searches the directory by role (counselor, assistant principal, librarian, front office, technology…) in a
// real browser (Playwright), the way a visitor would, so published emails show normally. It honours robots.txt
// (Disallow and Crawl-delay, at least 5 s between pages), reads public pages only and never logs in.
// Output goes to the git-ignored data/scraper/ folder for a person to review before importing. Prints counts only.
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { chromium } from "playwright";

const ROOT = path.dirname(path.dirname(new URL(import.meta.url).pathname));
const arg = n => { const i = process.argv.indexOf("--" + n); return i < 0 ? "" : process.argv[i + 1] || ""; };
const url = arg("url"), school = arg("school"), districtId = arg("district-id").replace(/^0+/, ""), district = arg("district");
if (!url || !school || !districtId) { console.error("usage: node scripts/scrape-staff.mjs --url <staff page> --school <name> --district-id <id> [--district <name>] [--leads backup.json] [--out file.csv]"); process.exit(2); }
const slug = school.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const out = arg("out") || path.join(ROOT, "data/scraper", `contacts-${slug}.csv`);

// Searches to run, and how a website title maps to a contact role in the app (first match wins; no match = skipped)
const KEYWORDS = ["counselor", "principal", "library", "media", "technology", "digital", "social worker", "secretary", "registrar", "dean"];
const ROLES = [
  [/assistant principal|assoc\w* principal|vice principal/i, "Assistant principal"],
  [/counsel/i, "Guidance counselor"],
  [/librar|media specialist/i, "Librarian"],
  [/technolog|digital|\bIT\b|instructional coach/i, "Technology / IT"],
  [/social work/i, "Social worker"],
  [/dean/i, "Dean of students"],
  [/secretary|registrar|reception|front office|office manager|administrative assistant/i, "Front office / secretary"],
  [/principal/i, "Principal"],
];
const ORDER = ["Guidance counselor", "Technology / IT", "Librarian", "Assistant principal", "Dean of students", "Social worker", "Front office / secretary", "Principal"];

// ---------- robots.txt (the "*" group) ----------
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
  const hit = (list) => list.filter(r => toRe(r).test(p)).sort((a, b) => b.length - a.length)[0] || "";
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

await page.goto(url, { waitUntil: "networkidle", timeout: 60000 });
const form = await page.$eval(".fsConstituentSearchForm", f => ({ action: f.getAttribute("action") || location.pathname,
  hidden: Object.fromEntries([...f.querySelectorAll("input[type=hidden]")].filter(i => i.value).map(i => [i.name, i.value])) })).catch(() => null);
if (!form) { console.error("No Finalsite staff directory search on that page (different platform?). Nothing written."); await browser.close(); process.exit(1); }

const people = new Map(); let searches = 0;
for (const kw of KEYWORDS) {
  const q = new URL(form.action, url); Object.entries(form.hidden).forEach(([k, v]) => q.searchParams.set(k, v)); q.searchParams.set("const_search_keyword", kw);
  if (!allowed(q.href)) continue;
  await wait(); await page.goto(q.href, { waitUntil: "networkidle", timeout: 60000 }); searches++;
  const items = await page.$$eval(".fsConstituentItem", els => els.map(e => ({
    id: e.getAttribute("data-constituent-id"),
    name: e.querySelector(".fsFullName")?.textContent.trim().replace(/\s+/g, " ") || "",
    title: (e.querySelector(".fsTitles")?.textContent || "").replace(/^\s*Titles?:\s*/i, "").trim().replace(/\s+/g, " "),
    email: (e.querySelector(".fsEmail a[href^='mailto:']")?.getAttribute("href") || "").replace(/^mailto:/, "").trim().toLowerCase(),
    phone: e.querySelector(".fsPhones a[href^='tel:']")?.textContent.trim() || "",
  })));
  for (const i of items) if (!people.has(i.id)) people.set(i.id, { ...i, source: q.href });
}
await browser.close();

// ---------- the school's lead (to fill Lead ID and skip the principal who's already the lead) ----------
let lead = null;
if (arg("leads")) {
  const normS = s => String(s || "").toLowerCase().replace(/\b(school|schools|the)\b/g, "").replace(/[^a-z0-9]/g, "");
  const L = JSON.parse(fs.readFileSync(arg("leads"), "utf8")).leads.filter(l => !l.type || l.type === "principal");
  const m = L.filter(l => String(l.districtId || "").replace(/^0+/, "") === districtId && String(l.school || "").split(" / ").some(s => normS(s) === normS(school)));
  lead = m.length === 1 ? m[0] : null;
  if (!lead) console.log(`note: no single "${school}" lead in that backup (${m.length} matches). Lead ID left blank; the import matches on School + District ID.`);
}

const rows = []; let skippedRole = 0, isLead = 0;
for (const p of people.values()) {
  const role = ROLES.find(([re]) => re.test(p.title))?.[1];
  if (!role) { skippedRole++; continue; }
  if (lead && p.email && p.email === String(lead.email || "").toLowerCase()) { isLead++; continue; }
  const parts = p.name.split(" "), first = parts.shift() || "", last = parts.join(" ");
  rows.push({ "Lead ID": lead?.id || "", School: lead?.school || school, District: lead?.district || district, "District ID": districtId,
    "First Name": first, "Last Name": last, Role: role, Email: p.email, Phone: p.phone,
    Notes: `Website title: ${p.title}. Found ${new Date().toISOString().slice(0, 10)} on ${p.source}` + (role === "Principal" ? " (website lists a different principal than the lead)" : "") });
}
rows.sort((a, b) => ORDER.indexOf(a.Role) - ORDER.indexOf(b.Role));
const cell = v => /[",\n]/.test(String(v)) ? `"${String(v).replace(/"/g, '""')}"` : String(v);
const head = ["Lead ID", "School", "District", "District ID", "First Name", "Last Name", "Role", "Email", "Phone", "Notes"];
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, [head, ...rows.map(r => head.map(h => r[h]))].map(r => r.map(cell).join(",")).join("\n") + "\n");

const by = {}; rows.forEach(r => by[r.Role] = (by[r.Role] || 0) + 1);
console.log(`searches: ${searches} (${rules.delay}s apart, robots.txt honoured) · people found: ${people.size}`);
console.log(`useful contacts: ${rows.length}  (${Object.entries(by).map(([k, v]) => `${v} ${k}`).join(", ") || "none"})`);
console.log(`skipped: ${skippedRole} other roles (teachers, nurse, custodial…)` + (lead ? `, ${isLead} already the lead (principal)` : ""));
console.log(`with email: ${rows.filter(r => r.Email).length} of ${rows.length}`);
console.log(`wrote ${path.relative(ROOT, out)}${lead ? " (matched to the school's lead)" : ""}`);
