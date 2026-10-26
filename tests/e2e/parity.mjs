// Differential test: run the same clicks against the legacy HTML and the new React build, diff what's on screen
// and the saved data. Fixed clock, separate browser profiles, fake data only.
import { chromium } from "playwright";
import fs from "fs";
// Usage: npm run build && npm run test:parity   (fake data only: tests/e2e/fixtures/*.csv)
import path from "path";
import { pathToFileURL } from "url";
const ROOT = path.resolve(new URL(".", import.meta.url).pathname, "../..");
const DIR = path.join(ROOT, "tests/e2e/fixtures") + "/";
const LEGACY = pathToFileURL(path.join(ROOT, "legacy/Outreach Manager.html")).href;
const NEW = pathToFileURL(path.join(ROOT, "dist/index.html")).href;
// Both apps get the same vault templates and map data
for (const f of ["email-templates.js", "district-boundaries.js"]) fs.copyFileSync(path.join(ROOT, "public", f), path.join(ROOT, "legacy", f));

const browser = await chromium.launch();
async function app(url) {
  const ctx = await browser.newContext({ viewport: { width: 1400, height: 1000 }, acceptDownloads: true });
  await ctx.clock.setFixedTime(new Date("2026-10-15T10:30:00"));
  const page = await ctx.newPage(); page.setDefaultTimeout(4000);
  const errors = [];
  page.on("pageerror", e => errors.push(String(e)));
  page.on("console", m => { if (m.type() === "error") errors.push(m.text()); });
  page.on("dialog", d => d.accept());
  // New-only sections (data-parity-skip, e.g. the HubSpot test batch card) are hidden from the comparison.
  await page.addInitScript(() => document.addEventListener("DOMContentLoaded", () => document.head.append(Object.assign(document.createElement("style"), { textContent: "[data-parity-skip]{display:none!important}" }))));
  // Intentional: in the new app a district's overseer goes Live with the first sign-ups at any of its schools.
  // The legacy app gets the same rule here, so the rest of the run still compares like for like.
  if (url.includes("legacy")) await page.addInitScript(() => document.addEventListener("DOMContentLoaded", () => {
    const orig = window.setSignups;
    window.setSignups = (l, v) => {
      orig(l, v); const n = +v || 0, o = n > 0 && isPr(l) ? overseerOf(l) : undefined;
      if (o && MAIN.indexOf(o.stage) < MAIN.indexOf("live")) setStage(o, "live", `${schoolOf(l)}: ${n} sign-ups`);
    };
  }));
  await page.goto(url);
  return { page, errors, name: url.includes("legacy") ? "legacy" : "new" };
}
const A = await app(LEGACY), B = await app(NEW);
// Intentional differences in the new app (new script paths, the drawer's "Reset outreach" button) are normalized away.
// The Emails banner now points at the project's emails/ folder (moved there from the vault on purpose).
const norm = s => s.replace(/^Reset outreach\n?/gm, "").replace(/^Email(s are synced from the vault's|s come from the project's) .*?Edits made here are replaced at the next sync\.$/gm, "Emails banner")
  // Profile merge fields (new): the legacy app shows them as literal tokens; unset, the new app shows the placeholders
  // (and the new app flags an unset mailing address before sending)
  .replace(/ \{\{title\}\} \{\{sender_email\}\} \{\{mailing_address\}\}/g, "").replace(/\{\{mailing_address\}\}/g, "[CyberSafely.ai mailing address]").replace(/\{\{title\}\}/g, "Onboarding & Activation")
  .replace(/^(Fill before sending: .*?)\[CyberSafely\.ai mailing address\](, )?/gm, "$1").replace(/^(Fill before sending: .*?), $/gm, "$1").replace(/Set them in Emails → Settings or per school\./g, "Set them in Profile or per school.").replace(/python3 \.claude\/scripts\/sync-emails\.py/g, "npm run sync-emails").replace(/\.claude\/scripts\/clean-users\.py/g, "scripts/clean-users.py")
  .replace(/[ \t]+/g, " ").replace(/\n\s*\n/g, "\n").trim();
let diffs = 0, checks = 0;
async function both(fn) {
  for (const X of [A, B]) { try { await fn(X.page); } catch (e) { diffs++; console.log(`! step failed in ${X.name}: ${String(e).split("\n")[0]}`); } }
}
// Campaigns tables were rearranged on purpose (Name first, organization under Contact): compare each row's content
// regardless of order, with the legacy "Organization" header read as "Name" and "(organization not set)" dropped.
async function screenText(p, sel) {
  return p.evaluate(sel => {
    const root = document.querySelector(sel);
    const camp = document.querySelector("header .ds button.on")?.textContent?.trim() === "Campaigns";
    const tables = camp ? [...root.querySelectorAll("table")] : [];
    if (!tables.length) return root.innerText;
    const rows = tables.flatMap(t => [...t.rows].map(tr => tr.innerText.split(/[\n\t]+/).map(x => x.trim())
      .filter(x => x && x !== "(organization not set)").map(x => x === "Organization" ? "Name" : x).sort().join(" | ")));
    tables.forEach(t => t.style.display = "none");
    const rest = root.innerText;
    tables.forEach(t => t.style.display = "");
    return rest + "\n" + rows.join("\n");
  }, sel);
}
async function cmp(label, sel = "main") {
  checks++;
  const [a, b] = [await screenText(A.page, sel), await screenText(B.page, sel)].map(norm);
  if (a === b) return;
  diffs++;
  const la = a.split("\n"), lb = b.split("\n");
  const out = [];
  for (let i = 0; i < Math.max(la.length, lb.length) && out.length < 4; i++) if (la[i] !== lb[i]) out.push(`   L${i}\n    legacy: ${la[i]}\n    new:    ${lb[i]}`);
  console.log(`✗ ${label}\n${out.join("\n")}`);
}
// The new app's Dashboard is "Home" (the day at a glance on top, then the same dashboard; the new part is data-parity-skip)
// The new app's tabs are a hover-to-expand sidebar: move the mouse off it after clicking, as a person would.
const nav = t => both(async p => { await p.locator("nav button", { hasText: new RegExp("^" + (p === B.page && t === "Dashboard" ? "Home" : t)) }).first().click(); await p.mouse.move(1390, 990); });
// The new app selects Cold by default (on start and on every list switch); the legacy app shows all stages.
// Put the new app on "All stages" so the screens compare like for like.
const allStages = async () => { await B.page.locator("nav button", { hasText: /^Schools/ }).first().click(); const sel = B.page.locator("main select").first(); if (await sel.count()) await sel.selectOption(""); };
const list = async t => { await both(p => p.locator("header .ds button", { hasText: t }).click()); await allStages(); };
const VIEWS = ["Today", "Calls", "Schools", "Board", "Map", "Emails", "Dashboard", "Analytics", "Data", "Process"];
// The Board was redesigned on purpose (collapsible columns, new card layout), so its text isn't compared with the
// legacy app. The drag still runs in both, and its effect is checked in Schools and in the saved data.
// Emails is now an explorer of the emails/ folder (read-only, rendered markdown), so it isn't compared either.
const SAME = VIEWS.filter(v => v !== "Board" && v !== "Emails");
async function allViews(tag) { for (const v of VIEWS) { await nav(v); if (SAME.includes(v)) await cmp(`${tag} · ${v}`); } }
async function importFile(file, camp) {
  await nav("Data");
  if (camp) await both(p => p.locator("main input[placeholder^='e.g. Sept']").fill(camp));
  await both(p => p.locator("main input[type=file]").first().setInputFiles(DIR + file));
  await both(p => p.waitForTimeout(150));
}

// 1. Empty state, every list
for (const l of ["Principals", "Overseers", "Campaigns", "PTA", "Users"]) { await list(l); await nav("Today"); await cmp(`empty ${l}`); }
await list("Principals");
// 2. Imports
await importFile("principals.csv");
await allViews("principals imported");
await list("Overseers"); await importFile("overseers.csv"); await allViews("overseers");
await list("Campaigns"); await importFile("campaign.csv", "Sept 2026 newsletter (opened)"); await allViews("campaigns");
await list("PTA"); await importFile("pta.csv"); await nav("Schools"); await cmp("pta schools");
await list("Principals");

// 3. Drawer actions on the first school in Schools
const open = async (txt) => { await nav("Schools"); await both(p => p.locator("main tr.click", { hasText: txt }).first().click()); };
await open("Example Middle 1");
await cmp("drawer open", "#drawer");
await both(p => p.locator("#drawer button", { hasText: "Interested / Ready" }).click()); await cmp("drawer after Interested", "#drawer"); await cmp("main after Interested");
await both(p => p.locator("#drawer button", { hasText: /^Log as sent$/ }).click()); await cmp("drawer after Log as sent", "#drawer");
await both(p => p.locator("#drawer input[placeholder^='Optional note']").fill("tried front desk"));
await both(p => p.locator("#drawer button", { hasText: "Voicemail" }).click()); await cmp("drawer after Voicemail", "#drawer");
await both(async p => { const i = p.locator("#drawer input[type=number]").first(); await i.fill("4"); await i.press("Tab"); }); await cmp("drawer after 4 signups", "#drawer");
await both(async p => { const i = p.locator("#drawer input[type=number]").first(); await i.fill("12"); await i.press("Tab"); }); await cmp("drawer after 12 signups", "#drawer");
await both(async p => { const i = p.locator("#drawer textarea"); await i.fill("Prefers mornings"); await i.press("Tab"); }); await cmp("drawer after notes", "#drawer");
await both(p => p.locator("#drawer select").filter({ hasText: "Cold: Not contacted" }).selectOption("nurture")); await cmp("drawer after stage→nurture", "#drawer");
await both(p => p.locator("#drawer button", { hasText: "Clear ✕" }).click()); await cmp("drawer after clear call", "#drawer");
await both(p => p.locator("#drawer select").first().selectOption("vm")); await cmp("drawer pick vm", "#drawer");
await both(p => p.keyboard.press("Escape"));
await cmp("main after drawer");

// Overseer linkbox, jump to a school
await open("Example Middle 2"); await cmp("principal drawer w/ overseer", "#drawer");
await both(p => p.locator("#drawer .subl .it").first().click()); await cmp("jumped to overseer", "#drawer");
await both(p => p.locator("#drawer .subl .it").nth(1).click()); await cmp("jumped back to school", "#drawer");
await both(p => p.keyboard.press("Escape"));
await list("Principals");

// 4. Calls view: outcomes, note, fundraising, filter
await nav("Calls");
await both(p => p.locator("main select[style*='width']").nth(2).selectOption("not")); await cmp("calls after not interested");
await both(p => p.locator("main select[style*='width']").nth(3).selectOption("unreach")); await cmp("calls after unreach");
await both(async p => { const i = p.locator("main tbody input[placeholder^='No student']").nth(3); await i.fill("call back Tue"); await i.press("Tab"); });
await both(p => p.locator("main tbody input[type=checkbox]").nth(4).check()); await cmp("calls after note+fund");
await both(p => p.locator("main .strip.calls button").nth(5).click()); await cmp("calls filtered unreach");
await both(p => p.locator("main .strip.calls button").nth(5).click());

// 5. Schools filters, strip, paging, bulk stage move
await nav("Schools");
await both(p => p.locator("main input.grow").fill("tester")); await cmp("schools search");
await both(p => p.locator("main input.grow").fill(""));
await both(p => p.locator("main select").nth(1).selectOption({ label: "Columbia 93" })); await cmp("schools district filter");
await both(p => p.locator("main select").nth(3).selectOption("no")); await cmp("schools missing email");
await both(p => p.locator("main select").nth(3).selectOption(""));
await both(p => p.locator("main select").nth(1).selectOption(""));
await both(p => p.locator("main button", { hasText: /^Show all/ }).click()); await cmp("schools show all");
await both(p => p.locator(".strip button").first().click()); await cmp("strip Cold filter");
await both(p => p.locator("main .row.small select").selectOption("contacted")); await cmp("bulk move to contacted");

await both(p => p.locator(".strip button").first().click()); // clear the Cold filter
// 6. Six workdays later: follow-ups are overdue → batch send drawer, log
for (const X of [A, B]) await X.page.context().clock.setFixedTime(new Date("2026-10-23T09:00:00"));
await nav("Schools"); await nav("Today"); await cmp("today after moves (a week later)");
await both(p => p.locator("main button", { hasText: "Send as batch" }).first().click()); await cmp("bulk drawer", "#drawer");
await both(p => p.locator("#drawer select").first().selectOption("e3")); await cmp("bulk drawer e3", "#drawer");
await both(p => p.locator("#drawer button", { hasText: "Open next Gmail draft" }).click()); await cmp("bulk drawer gmail 1", "#drawer");
await both(p => p.locator("#drawer button", { hasText: /^Log as sent for/ }).click()); await cmp("today after bulk log");

// 7. Board drag
await nav("Board");
// Real drag events: Playwright's simulated mouse drag doesn't start an HTML drag here, so it silently did nothing in both apps
await both(p => p.evaluate(() => {
  const dt = new DataTransfer(), src = document.querySelector(".tile"), dst = document.querySelector(".col[style*='--s4']");
  src.dispatchEvent(new DragEvent("dragstart", { bubbles: true, dataTransfer: dt }));
  dst.dispatchEvent(new DragEvent("dragover", { bubbles: true, cancelable: true, dataTransfer: dt }));
  dst.dispatchEvent(new DragEvent("drop", { bubbles: true, cancelable: true, dataTransfer: dt }));
}));
await both(async p => { if (!(await p.evaluate(() => JSON.parse(localStorage.getItem("cs-outreach-v1")).leads.some(l => l.stage === "active")))) throw new Error("board drag didn't move a card"); });
await nav("Schools"); await cmp("schools after board drag");

// 8. Activity log import
await nav("Data");
await both(p => p.locator("main input[type=file]").nth(1).setInputFiles(DIR + "activity.csv"));
await both(p => p.waitForTimeout(200));
await nav("Schools"); await cmp("after activity log");

// 9. Settings: change your phone (legacy: Emails → Settings; new: Profile). Emails are edited as files in emails/ now,
// so the legacy app's in-app subject edit and "+ New email" steps are gone.
await nav("Emails");
{ const i = A.page.locator("main .f input").nth(1); await i.fill("555-0100"); await i.press("Tab"); }
await B.page.locator("nav button", { hasText: /^Profile/ }).first().click(); await B.page.mouse.move(1390, 990);
{ const i = B.page.getByPlaceholder("(555) 010-0000", { exact: true }); await i.fill("555-0100"); await i.press("Tab"); }
await open("Example Middle 3"); await cmp("drawer uses new phone", "#drawer"); await both(p => p.keyboard.press("Escape"));

// 10. Map click, Analytics periods, Dashboard
await nav("Map"); await both(p => p.locator("#moMap path[data-n='10'], svg path[data-n='10']").first().click()); await cmp("map click → schools filter");
await both(p => p.locator(".strip button").first().click()); // clear nothing
await nav("Analytics");
for (const per of ["Since last report", "This week", "Last 7 days", "Last 30 days", "Contract to date"]) { await both(p => p.locator("main .ds button", { hasText: per }).click()); await cmp("analytics " + per); }
await nav("Dashboard"); await cmp("dashboard final");

// 11. Global search
await both(p => p.locator("header input[type=search]").fill("reader3")); await cmp("search results", ".gs-r");
await both(p => p.locator("header input[type=search]").press("Enter")); await cmp("search jump drawer", "#drawer"); await cmp("search jump main");
await both(p => p.keyboard.press("Escape"));

// 12. Saved data, normalized
const state = async p => JSON.parse(await p.evaluate(() => localStorage.getItem("cs-outreach-v1")));
const [sa, sb] = [await state(A.page), await state(B.page)];
const normS = s => { const leads = s.leads.map(({ id, updatedAt, ...l }) => l).sort((x, y) => JSON.stringify(x).localeCompare(JSON.stringify(y)));
  const templates = s.templates.map(t => ({ ...t, id: t.name === "New email" ? "x" : t.id })); const { title, sender_email, mailingAddress, ...settings } = s.settings || {};   // Profile fields exist only in the new app
  return JSON.stringify({ ...s, leads, templates, settings, savedAt: 0 }, null, 1); };
checks++;
if (normS(sa) !== normS(sb)) { diffs++; fs.writeFileSync("/tmp/state-legacy.json", normS(sa)); fs.writeFileSync("/tmp/state-new.json", normS(sb)); console.log("✗ saved state differs (see /tmp/state-*.json)"); }
else console.log("✓ saved localStorage state identical (" + sa.leads.length + " leads)");

// 13. Restore the legacy state into the new app (data hand-off) and compare
await B.page.evaluate(s => { localStorage.setItem("cs-outreach-v1", s); }, JSON.stringify(sa));
await B.page.reload(); await A.page.reload(); await allStages();
for (const v of SAME) { await nav(v); await cmp("after reload/handoff · " + v); }

process.exitCode = diffs ? 1 : 0;
console.log(`\n${checks - diffs}/${checks} checks identical. Console errors — legacy: ${A.errors.length}, new: ${B.errors.length}`);
[...A.errors.map(e => "legacy: " + e), ...B.errors.map(e => "new: " + e)].slice(0, 10).forEach(e => console.log("  " + e));
await browser.close();
