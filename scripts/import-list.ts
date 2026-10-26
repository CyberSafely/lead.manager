// Import a CSV into one list of the team database, exactly as Data → Import does in the app.
//
//   npm run import-list -- <list> <file.csv> [--campaign "Name"]            dry run: import, verify, then roll back
//   npm run import-list -- <list> <file.csv> [--campaign "Name"] --commit   keep it, only if every check passes
//
// <list> is principal | overseer | campaign | pta | user | affiliate. Campaigns need --campaign (the name the app asks for).
// The database's current leads are loaded, the app's own importCsv() runs on them (same matching: someone already in
// the list is updated, not duplicated), and only the added or changed leads are written with put_leads, then read back
// and compared. Output is counts only: no names, emails or phone numbers (vault rule 2, project rule 6).
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { ROOT_DIR, connect, safeError } from "./lib/env";

const args = process.argv.slice(2).filter(a => a !== "--");
const flag = (n: string) => { const i = args.indexOf("--" + n); return i < 0 ? undefined : args[i + 1]; };
const LISTS = ["principal", "overseer", "campaign", "pta", "user", "affiliate"] as const;
const list = args[0] as typeof LISTS[number], file = args.find(a => a.endsWith(".csv")), camp = (flag("campaign") || "").trim();
const COMMIT = args.includes("--commit");
if (!LISTS.includes(list) || !file) { console.error(`usage: npm run import-list -- <${LISTS.join("|")}> <file.csv> [--campaign "Name"] [--commit]`); process.exit(2); }
if (list === "campaign" && !camp) { console.error('Campaigns need a name: --campaign "Oct 2026 MSBA newsletter (opened)"'); process.exit(2); }

// The app's code expects a browser: give it the vault templates and an empty localStorage
const win: any = {};
vm.runInNewContext(fs.readFileSync(path.join(ROOT_DIR, "public/email-templates.js"), "utf8"), { window: win });
const mem = new Map<string, string>();
Object.assign(globalThis, { window: globalThis, VAULT_TEMPLATES: win.VAULT_TEMPLATES,
  localStorage: { getItem: (k: string) => mem.get(k) ?? null, setItem: (k: string, v: string) => mem.set(k, v), removeItem: (k: string) => mem.delete(k) } });
const store = await import("../src/store");
const { importCsv } = await import("../src/lib/csv");
const { leadKey } = await import("../src/lib/cloudShape");
store.onSave(() => { /* written to the database below, not to localStorage */ });

const c = await connect();
let ok = false;
try {
  await c.query("begin");
  const leads = (await c.query("select data from public.leads_json")).rows.map(r => r.data);
  store.replaceState({ ...store.S, leads });
  const before = new Map(leads.map(l => [l.id, leadKey(l)]));
  store.ui.ds = list;
  const inList = store.DL().length;

  const msg = importCsv(fs.readFileSync(file, "utf8"), camp);
  console.log(`${list} list: ${inList} before, ${store.DL().length} after`);
  console.log("app import says: " + msg);
  const changed = store.S.leads.filter(l => before.get(l.id) !== leadKey(l));
  const added = changed.filter(l => !before.has(l.id)).length;
  console.log(`to write: ${added} new, ${changed.length - added} updated`);
  if (!changed.length) { ok = true; throw new Error("nothing to write"); }

  const r = (await c.query("select public.put_leads($1::jsonb) as r", [JSON.stringify(changed)])).rows[0].r;
  if (r.failed?.length) throw new Error(`${r.failed.length} lead(s) refused by the database: ` + r.failed.slice(0, 10).map((f: any) => safeError({ message: f.error })).join("; "));
  const stat = (k: string) => Number(msg.match(new RegExp(k + " (\\d+)"))?.[1] || 0);
  await c.query("select public.log_import('csv', $1, $2, $3, $4, $5, $6)",
    [list, camp || path.basename(file), stat("Added"), stat("updated"), stat("skipped"), JSON.stringify({ file: path.basename(file) })]);

  // verify: read the written leads back and compare
  const back = new Map((await c.query("select id, data from public.leads_json where id = any($1)", [changed.map(l => l.id)])).rows.map(x => [x.id, x.data]));
  const bad = changed.filter(l => !back.has(l.id) || leadKey(back.get(l.id)) !== leadKey(l)).length;
  if (bad) throw new Error(`${bad} lead(s) differ after the round trip, nothing saved`);
  console.log(`✓ verified: ${changed.length} leads identical after the round trip`);
  ok = true;
} catch (e) {
  if (!ok) { console.log("✗ " + safeError(e)); process.exitCode = 1; } else console.log(safeError(e));
} finally {
  if (ok && COMMIT) { await c.query("commit"); console.log("committed"); }
  else { await c.query("rollback"); if (ok) console.log("dry run: rolled back. Re-run with --commit to keep it."); }
  await c.end();
}
