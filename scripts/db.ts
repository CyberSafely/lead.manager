// Database admin from this computer (uses .env.cloud). Prints counts only, never contact data.
//
//   npm run db -- status                 what's applied, row counts, team members
//   npm run db -- apply                  apply new files in supabase/migrations (each in a transaction)
//   npm run db -- add-member <email> [--admin] [--sender "Full Name"] [--caller "First"] [--phone "..."]
//        Gives an existing Supabase Auth user (Authentication → Users → Add user) access to the team's data.
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { ROOT_DIR, connect, safeError } from "./lib/env";

const MIG_DIR = path.join(ROOT_DIR, "supabase/migrations");
const [cmd, ...rest] = process.argv.slice(2).filter(a => a !== "--");
const flag = (name: string) => { const i = rest.indexOf("--" + name); return i < 0 ? undefined : rest[i + 1]; };

const c = await connect();
try {
  await c.query(`create table if not exists public._migrations (name text primary key, sha256 text not null, applied_at timestamptz not null default now());
    alter table public._migrations enable row level security;`);   // no policies: invisible to the app
  const applied = new Map((await c.query("select name, sha256 from public._migrations")).rows.map(r => [r.name, r.sha256]));
  const files = fs.readdirSync(MIG_DIR).filter(f => f.endsWith(".sql")).sort();
  const sha = (f: string) => crypto.createHash("sha256").update(fs.readFileSync(path.join(MIG_DIR, f))).digest("hex");

  if (cmd === "apply") {
    for (const f of files) {
      if (applied.has(f)) { if (applied.get(f) !== sha(f)) console.warn(`! ${f} changed after it was applied. Add a new migration instead of editing it.`); continue; }
      process.stdout.write(`applying ${f} … `);
      await c.query("begin");
      try {
        await c.query(fs.readFileSync(path.join(MIG_DIR, f), "utf8"));
        await c.query("insert into public._migrations (name, sha256) values ($1, $2)", [f, sha(f)]);
        await c.query("commit"); console.log("done");
      } catch (e) { await c.query("rollback"); console.log("FAILED, rolled back: " + safeError(e)); process.exitCode = 1; break; }
    }
  } else if (cmd === "add-member") {
    const email = rest.find(a => a.includes("@"))?.toLowerCase();
    if (!email) throw new Error("usage: npm run db -- add-member <email> [--admin] [--sender ...] [--caller ...] [--phone ...]");
    const u = (await c.query("select id from auth.users where lower(email) = $1", [email])).rows[0];
    if (!u) throw new Error("No Supabase Auth user with that email. Create it first: Authentication → Users → Add user.");
    await c.query(`insert into public.members (user_id, email, is_admin, sender, caller, phone) values ($1, $2, $3, $4, $5, $6)
      on conflict (user_id) do update set is_admin = excluded.is_admin or members.is_admin,
        sender = coalesce(excluded.sender, members.sender), caller = coalesce(excluded.caller, members.caller), phone = coalesce(excluded.phone, members.phone)`,
      [u.id, email, rest.includes("--admin"), flag("sender") ?? null, flag("caller") ?? null, flag("phone") ?? null]);
    console.log("member added");
    if (!flag("sender") || !flag("caller")) console.log("! no --sender / --caller given: they'll be asked to set their name in the app (Emails tab, Calls tab)");
  } else if (cmd !== "status") {
    throw new Error("usage: npm run db -- status | apply | add-member <email>");
  }

  // status (also printed after apply / add-member)
  const now = new Set((await c.query("select name from public._migrations")).rows.map(r => r.name));
  console.log("\nmigrations:"); files.forEach(f => console.log(`  ${now.has(f) ? "✓" : "·"} ${f}`));
  const has = (await c.query("select to_regclass('public.leads') is not null as ok")).rows[0].ok;
  if (has) {
    const n = async (sql: string) => (await c.query(sql)).rows[0].n;
    console.log(`rows: ${await n("select count(*)::int n from public.leads")} leads, ${await n("select count(*)::int n from public.lead_activities")} history entries, ` +
      `${await n("select count(*)::int n from public.templates")} templates, ${await n("select count(*)::int n from public.lead_history")} saved versions`);
    const m = (await c.query("select count(*)::int n, count(*) filter (where is_admin)::int a from public.members")).rows[0];
    console.log(`team: ${m.n} member(s), ${m.a} admin(s); auth users: ${(await c.query("select count(*)::int n from auth.users")).rows[0].n}`);
  }
} finally { await c.end(); }
