// Move a backup from the original app (Data → Back up) into the team database.
//
//   npm run migrate-backup -- <backup.json>                  dry run: load, verify, then roll back (default)
//   npm run migrate-backup -- <backup.json> --commit         keep it, only if every check passes
//       --replace          allowed to replace leads already in the database (they are kept in lead_history)
//       --owner <email>    also save the backup's sender / caller / phone on that member's row
//
// The backup goes through the app's own migrate() (the same upgrade steps Restore runs), is written with the
// database's put_leads / put_templates, then every lead is read back and compared field by field. Output is counts
// and field names only: no names, emails or phone numbers (vault rule 2, project rule 6).
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { ROOT_DIR, connect, safeError } from "./lib/env";

const args = process.argv.slice(2).filter(a => a !== "--");
const file = args.find(a => a.endsWith(".json"));
const COMMIT = args.includes("--commit"), REPLACE = args.includes("--replace");
const OWNER = (() => { const i = args.indexOf("--owner"); return i < 0 ? null : args[i + 1]?.toLowerCase(); })();
if (!file) { console.error("usage: npm run migrate-backup -- <backup.json> [--commit] [--replace] [--owner <email>]"); process.exit(2); }

// The app's code expects a browser: give it the vault templates and an empty localStorage
const win: any = {};
vm.runInNewContext(fs.readFileSync(path.join(ROOT_DIR, "public/email-templates.js"), "utf8"), { window: win });
const mem = new Map<string, string>();
Object.assign(globalThis, { window: globalThis, VAULT_TEMPLATES: win.VAULT_TEMPLATES,
  localStorage: { getItem: (k: string) => mem.get(k) ?? null, setItem: (k: string, v: string) => mem.set(k, v), removeItem: (k: string) => mem.delete(k) } });
const { migrate } = await import("../src/store");
const { canon, leadKey, normTpl } = await import("../src/lib/cloudShape");

const raw = JSON.parse(fs.readFileSync(file, "utf8"));
if (!Array.isArray(raw.leads)) throw new Error("Not a backup: no leads array");
const before = { leads: raw.leads.length, tplVersion: raw.tplVersion ?? 1, templates: (raw.templates || []).length };
const d = migrate(raw);

const ids = new Map<string, number>(); d.leads.forEach(l => ids.set(l.id, (ids.get(l.id) || 0) + 1));
const dups = [...ids].filter(([, n]) => n > 1).length;
if (dups) throw new Error(`${dups} lead id(s) appear more than once in the backup. Not migrating.`);

const count = <T,>(xs: T[], f: (x: T) => string) => xs.reduce((m, x) => (m[f(x)] = (m[f(x)] || 0) + 1, m), {} as Record<string, number>);
const byList = count(d.leads, l => l.type || "principal");
const byStage = count(d.leads, l => l.stage);
const activities = d.leads.reduce((a, l) => a + (l.activity?.length || 0), 0);
const extraKeys = new Set<string>(); const { LEAD_COLUMNS } = await import("../src/lib/cloudShape");
d.leads.forEach(l => Object.keys(l).forEach(k => { if (!LEAD_COLUMNS.has(k)) extraKeys.add(k); }));
console.log(`backup: ${before.leads} leads, ${before.templates} templates, saved by app version ${before.tplVersion} → upgraded to ${d.tplVersion}`);
console.log("by list:", byList); console.log("by stage:", byStage);
console.log(`history entries: ${activities}; templates after vault sync: ${d.templates.length}`);
if (extraKeys.size) console.log("fields without their own column (kept in `extra`):", [...extraKeys].join(", "));

const KNOWN_STATE = new Set(["leads", "templates", "tplVersion", "vaultVersion", "vaultIds", "settings", "savedAt"]);
const stateExtra: Record<string, unknown> = {}; Object.keys(d).forEach(k => { if (!KNOWN_STATE.has(k)) stateExtra[k] = (d as any)[k]; });

const c = await connect();
let ok = false;
try {
  await c.query("begin");
  const existing = (await c.query("select count(*)::int n from public.leads")).rows[0].n;
  if (existing && !REPLACE) throw new Error(`The database already has ${existing} leads. Re-run with --replace to replace them (old versions go to lead_history).`);
  if (existing) await c.query("select public.delete_leads(array(select id from public.leads))");

  const refused: string[] = [];
  for (let i = 0; i < d.leads.length; i += 200) {
    const r = (await c.query("select public.put_leads($1::jsonb) as r", [JSON.stringify(d.leads.slice(i, i + 200))])).rows[0].r;
    for (const f of r.failed) refused.push(`id ${f.id}: ${safeError({ message: f.error })}`);
  }
  if (refused.length) throw new Error(`${refused.length} lead(s) refused by the database:\n  ` + refused.slice(0, 20).join("\n  "));
  const old = (await c.query("select id from public.templates")).rows.map(r => r.id).filter(id => !d.templates.some(t => t.id === id));
  await c.query("select public.put_templates($1::jsonb, $2)", [JSON.stringify(d.templates.map((t, i) => ({ ...t, _pos: i }))), old]);
  const prevKeys = (await c.query("select coalesce(array(select jsonb_object_keys(settings)), '{}') k from public.app_state")).rows[0]?.k ?? [];
  const b = (globalThis as any).VAULT_TEMPLATES;
  await c.query("select public.put_app_state($1, $2, $3, $4, $5, $6, $7)",
    [JSON.stringify(d.settings), prevKeys.filter((k: string) => !(k in d.settings)), d.tplVersion, d.vaultVersion ?? null, d.vaultIds ?? null,
      b && d.vaultVersion === b.version ? b.generated : null, Object.keys(stateExtra).length ? JSON.stringify(stateExtra) : null]);
  if (OWNER) {
    const r = await c.query(`update public.members set sender = $2, caller = $3, phone = $4 where lower(email) = $1`,
      [OWNER, d.settings.sender ?? null, d.settings.caller ?? null, d.settings.phone ?? null]);
    console.log(r.rowCount ? "personal settings saved on the owner's member row" : "! --owner: no member with that email yet (npm run db -- add-member)");
  }
  await c.query("select public.log_import('backup', null, $1, $2, 0, 0, $3)",
    [path.basename(file), d.leads.length, JSON.stringify({ byList, byStage, activities, templates: d.templates.length, replaced: existing })]);

  // ---- verify: read everything back and compare
  const problems: string[] = [];
  const back = new Map((await c.query("select id, data from public.leads_json")).rows.map(r => [r.id, r.data]));
  if (back.size !== d.leads.length) problems.push(`lead count ${back.size} ≠ ${d.leads.length}`);
  const diffFields = new Map<string, number>();
  for (const l of d.leads) {
    const b = back.get(l.id);
    if (!b) { problems.push(`missing lead (id ${l.id})`); continue; }
    if (leadKey(b) === leadKey(l)) continue;
    const a: any = JSON.parse(canon(l)), z: any = JSON.parse(canon(b));
    new Set([...Object.keys(a), ...Object.keys(z)]).forEach(k => { if (canon(a[k]) !== canon(z[k])) diffFields.set(k, (diffFields.get(k) || 0) + 1); });
  }
  if (diffFields.size) problems.push("leads differ in fields: " + [...diffFields].map(([k, n]) => `${k} (${n})`).join(", "));
  const nAct = (await c.query("select count(*)::int n from public.lead_activities")).rows[0].n;
  if (nAct !== activities) problems.push(`history entries ${nAct} ≠ ${activities}`);
  const tb = (await c.query("select data from public.templates_json order by pos")).rows.map(r => r.data);
  if (canon(tb.map(normTpl)) !== canon(d.templates.map(normTpl))) problems.push("templates differ");
  const st = (await c.query("select settings from public.app_state")).rows[0];
  if (canon(st.settings) !== canon(d.settings)) problems.push("settings differ");

  if (problems.length) { console.log("\n✗ verification failed:\n  " + problems.join("\n  ")); throw new Error("verification failed, nothing saved"); }
  console.log(`\n✓ verified: ${back.size} leads identical after the round trip, ${nAct} history entries, ${tb.length} templates, settings`);
  ok = true;
} catch (e) {
  console.log("\n✗ " + safeError(e));
  process.exitCode = 1;
} finally {
  if (ok && COMMIT) { await c.query("commit"); console.log("committed: the team database now holds this backup"); }
  else { await c.query("rollback"); if (ok) console.log("dry run: rolled back. Re-run with --commit to keep it."); }
  await c.end();
}
