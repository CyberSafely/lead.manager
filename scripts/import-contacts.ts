// Import school contacts into the team database, exactly as Data → Import school contacts does in the app.
//
//   npx vite-node scripts/import-contacts.ts <file.csv>            dry run: import, verify, then roll back
//   npx vite-node scripts/import-contacts.ts <file.csv> --commit   keep it, only if every check passes
//
// Runs the app's own importContacts() on the database's current leads (people already on a school are skipped),
// writes only the school leads that changed with put_leads, then reads them back and compares. Never creates or
// deletes leads. Output is counts and school names only: no people, emails or phone numbers (project rule 6).
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { ROOT_DIR, connect, safeError } from "./lib/env";

const args = process.argv.slice(2).filter(a => a !== "--");
const file = args.find(a => a.endsWith(".csv")), COMMIT = args.includes("--commit");
if (!file) { console.error("usage: npx vite-node scripts/import-contacts.ts <file.csv> [--commit]"); process.exit(2); }

const win: any = {};
vm.runInNewContext(fs.readFileSync(path.join(ROOT_DIR, "public/email-templates.js"), "utf8"), { window: win });
const mem = new Map<string, string>();
Object.assign(globalThis, { window: globalThis, VAULT_TEMPLATES: win.VAULT_TEMPLATES,
  localStorage: { getItem: (k: string) => mem.get(k) ?? null, setItem: (k: string, v: string) => mem.set(k, v), removeItem: (k: string) => mem.delete(k) } });
const store = await import("../src/store");
const { importContacts } = await import("../src/lib/csv");
const { leadKey } = await import("../src/lib/cloudShape");
store.onSave(() => { /* written to the database below */ });

const c = await connect();
let ok = false;
try {
  await c.query("begin");
  const leads = (await c.query("select data from public.leads_json")).rows.map(r => r.data);
  store.replaceState({ ...store.S, leads });
  const before = new Map(leads.map(l => [l.id, leadKey(l)]));
  store.ui.ds = "principal";
  const res = importContacts(fs.readFileSync(file, "utf8"));
  console.log("app import says: " + res.msg);
  if (res.unmatched.length) console.log(`no school on the Principal list for: ${res.unmatched.join(", ")}`);
  const changed = store.S.leads.filter(l => before.get(l.id) !== leadKey(l));
  if (changed.some(l => !before.has(l.id)) || store.S.leads.length !== leads.length) throw new Error("the import created or removed leads, nothing saved");
  for (const l of changed) console.log(`  ${l.school}: ${(l.contacts || []).length} contacts now`);
  if (!changed.length) { ok = true; throw new Error("nothing to write"); }

  const r = (await c.query("select public.put_leads($1::jsonb) as r", [JSON.stringify(changed)])).rows[0].r;
  if (r.failed?.length) throw new Error(`${r.failed.length} lead(s) refused by the database`);
  const added = Number(res.msg.match(/Added (\d+)/)?.[1] || 0), skipped = Number(res.msg.match(/Skipped (\d+) already/)?.[1] || 0);
  await c.query("select public.log_import('csv', $1, $2, $3, $4, $5, $6)",
    ["principal", "School contacts: " + path.basename(file), 0, changed.length, skipped, JSON.stringify({ file: path.basename(file), contactsAdded: added, unmatched: res.unmatched.length })]);

  const back = new Map((await c.query("select id, data from public.leads_json where id = any($1)", [changed.map(l => l.id)])).rows.map(x => [x.id, x.data]));
  const bad = changed.filter(l => !back.has(l.id) || leadKey(back.get(l.id)) !== leadKey(l)).length;
  if (bad) throw new Error(`${bad} lead(s) differ after the round trip, nothing saved`);
  const total = (await c.query("select count(*)::int as n from public.leads_json")).rows[0].n;
  if (total !== leads.length) throw new Error(`lead count changed (${leads.length} → ${total}), nothing saved`);
  console.log(`✓ verified: ${changed.length} school lead(s) identical after the round trip; ${total} leads in total, unchanged`);
  ok = true;
} catch (e) {
  if (!ok) { console.log("✗ " + safeError(e)); process.exitCode = 1; } else console.log(safeError(e));
} finally {
  if (ok && COMMIT) { await c.query("commit"); console.log("committed"); }
  else { await c.query("rollback"); if (ok) console.log("dry run: rolled back. Re-run with --commit to keep it."); }
  await c.end();
}
