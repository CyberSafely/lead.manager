// Fill in missing emails for people already in the team database, using each district's address format.
//
//   npx vite-node scripts/infer-emails.ts --district-id 48071[,96091,...]          dry run: fill, verify, roll back
//   npx vite-node scripts/infer-emails.ts --district-id 48071 --commit             keep it, only if every check passes
//   npx vite-node scripts/infer-emails.ts --all [--commit]                         every district with a clear format
//
// For each district it learns the format (e.g. first.last@lsr7.net) from the emails already on its leads and school
// contacts (scripts/lib/emailPattern.mjs), then gives every named lead or school contact without an email its likely
// address. Each one is marked emailInferred (shown as "inferred" in the app) with a note saying where it came from,
// and the lead's history gets a Note (not an outreach touch). Nothing is sent. HubSpot matches people by email, so
// this is what lets phone-only people link to their district there. Prints counts and district names only.
import { connect, safeError } from "./lib/env";
import { desePattern, districtPeople, inferEmail, inferNote, learnPattern } from "./lib/emailPattern.mjs";
import { loadDistrictStats } from "./lib/districtStats.mjs";
const { leadKey } = await import("../src/lib/cloudShape");

const args = process.argv.slice(2).filter(a => a !== "--");
const COMMIT = args.includes("--commit"), ALL = args.includes("--all");
const ids = (args[args.indexOf("--district-id") + 1] || "").split(",").map(s => s.trim().replace(/^0+/, "")).filter(Boolean);
if (!ALL && (args.indexOf("--district-id") < 0 || !ids.length)) { console.error("usage: npx vite-node scripts/infer-emails.ts (--district-id <id>[,<id>…] | --all) [--commit]"); process.exit(2); }

// The "likely email" sentence earlier imports put in notes; the email field now holds it, so drop the sentence
const OLD_HINT = /\s*Likely email \(unverified[^)]*\):\s*\S+@\S+?\.\s*Confirm on the call before moving it to Email\./g;
const now = () => new Date().toISOString();

const c = await connect();
let ok = false;
try {
  await c.query("begin");
  const leads: any[] = (await c.query("select data from public.leads_json")).rows.map(r => r.data);
  const did = (l: any) => String(l.districtId || "").replace(/^0+/, "");
  const stats = loadDistrictStats();
  const districts = ALL ? [...new Set(leads.map(did).filter(Boolean))] : ids;
  const before = new Map(leads.map(l => [l.id, leadKey(l)]));
  let leadN = 0, contactN = 0;
  for (const id of districts) {
    const inDist = leads.filter(l => did(l) === id);
    const pat = learnPattern(districtPeople(leads, id)) || desePattern(stats, id);   // DESE directory as the fallback
    const name = inDist[0]?.district || id;
    if (!pat) { if (!ALL) console.log(`  ${name}: no clear email format in its ${districtPeople(leads, id).length} known emails or DESE, nothing inferred`); continue; }
    let n = 0;
    for (const l of inDist) {
      const added: string[] = [];
      if (!l.email && (l.first || l.last)) {
        const e = inferEmail(pat, l.first, l.last);
        if (e) { l.email = e; l.emailInferred = true; l.notes = [String(l.notes || "").replace(OLD_HINT, ""), inferNote(pat)].filter(Boolean).join(" ").trim(); added.push("the lead"); leadN++; }
      }
      for (const p of l.contacts || []) {
        if (p.email || !(p.first || p.last)) continue;
        const e = inferEmail(pat, p.first, p.last);
        if (e) { p.email = e; p.emailInferred = true; p.notes = [p.notes, inferNote(pat)].filter(Boolean).join(" "); added.push([p.first, p.last].filter(Boolean).join(" ")); contactN++; }
      }
      if (added.length) { (l.activity = l.activity || []).push({ ts: now(), type: "Note", note: `Email inferred from the district's address format (${pat.pattern}@${pat.domain}) for ${added.join(", ")}. Confirm on the call.` }); n += added.length; }
    }
    if (n || !ALL) console.log(`  ${name}: ${pat.pattern}@${pat.domain} (${pat.matches}/${pat.total} known emails fit) → ${n} email${n === 1 ? "" : "s"} inferred`);
  }
  const changed = leads.filter(l => before.get(l.id) !== leadKey(l));
  console.log(`to write: ${changed.length} lead(s) · ${leadN} lead emails + ${contactN} school-contact emails inferred`);
  if (!changed.length) { ok = true; throw new Error("nothing to write"); }
  const r = (await c.query("select public.put_leads($1::jsonb) as r", [JSON.stringify(changed)])).rows[0].r;
  if (r.failed?.length) throw new Error(`${r.failed.length} lead(s) refused by the database`);
  const back = new Map((await c.query("select id, data from public.leads_json where id = any($1)", [changed.map(l => l.id)])).rows.map(x => [x.id, x.data]));
  const bad = changed.filter(l => !back.has(l.id) || leadKey(back.get(l.id)) !== leadKey(l)).length;
  if (bad) throw new Error(`${bad} lead(s) differ after the round trip, nothing saved`);
  const total = (await c.query("select count(*)::int as n from public.leads_json")).rows[0].n;
  if (total !== leads.length) throw new Error("lead count changed, nothing saved");
  console.log(`✓ verified: ${changed.length} lead(s) identical after the round trip; ${total} leads in total, unchanged`);
  ok = true;
} catch (e) {
  if (!ok) { console.log("✗ " + safeError(e)); process.exitCode = 1; } else console.log(safeError(e));
} finally {
  if (ok && COMMIT) { await c.query("commit"); console.log("committed"); }
  else { await c.query("rollback"); if (ok) console.log("dry run: rolled back. Re-run with --commit to keep it."); }
  await c.end();
}
