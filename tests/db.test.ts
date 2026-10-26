// @vitest-environment node
// Runs the real migration SQL in an in-process Postgres (PGlite) with a stand-in for Supabase's auth schema, and checks
// that every kind of lead the app can store comes back unchanged (in the normal form of src/lib/cloudShape.ts).
// Fake data only (rule 6).
import fs from "node:fs";
import path from "node:path";
import { beforeAll, describe, expect, it } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { canon, normLead, normTpl } from "../src/lib/cloudShape";
import { DEFAULT_TEMPLATES } from "../src/lib/defaultTemplates";
import type { Lead, Template } from "../src/lib/types";

const SUPABASE_SHIM = `
  create schema auth;
  create table auth.users (id uuid primary key, email text);
  create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
  create role anon; create role authenticated;
  grant usage on schema auth to anon, authenticated;
  grant execute on function auth.uid() to anon, authenticated;
`;   // no default privileges on purpose: the migration must grant everything it needs itself
const ME = "00000000-0000-4000-8000-000000000001", OUTSIDER = "00000000-0000-4000-8000-000000000002";
const MIGRATIONS = path.join(import.meta.dirname, "../supabase/migrations");

let db: PGlite;
const q = async <T = any>(sql: string, params?: unknown[]) => (await db.query<T>(sql, params)).rows;
const put = async (leads: unknown[]) => {
  const r = (await q<{ r: { saved: number; failed: { id: string; error: string }[] } }>("select public.put_leads($1::jsonb) as r", [JSON.stringify(leads)]))[0].r;
  return r;
};
const putOk = async (leads: unknown[]) => { const r = await put(leads); expect(r.failed).toEqual([]); return r; };
const get = async (id: string) => (await q<{ data: Lead }>("select data from public.leads_json where id = $1", [id]))[0]?.data;
const same = (a: Lead, b: Lead) => expect(canon(normLead(b))).toBe(canon(normLead(a)));
async function as<T>(uid: string, fn: () => Promise<T>) {
  await q(`select set_config('request.jwt.claim.sub', $1, false)`, [uid]); await db.exec("set role authenticated");
  try { return await fn(); } finally { await db.exec("reset role"); await q(`select set_config('request.jwt.claim.sub', '', false)`); }
}

const iso = (d: string) => new Date(d).toISOString();
// Every variant the legacy app produces (see docs/database.md): imported (all keys, many ""), hand-added (few keys),
// call with/without prev, cleared call {}, families {} / filled / "" counts, unknown keys, null fields, old activity rows.
const LEADS: Lead[] = [
  { id: "imp1", hubspotId: "", first: "Pat", last: "Example", email: "pat@example.org", phone: "(555) 010-0000", jobtitle: "Principal",
    school: "Example Middle", district: "Example R-1", owner: "", notes: "", districtId: "001-001", state: "", code: "EX1",
    regLink: "https://example.org/su", level: "Middle", grades: "06-08", city: "Exampleton", region: "3", assigned: "",
    stage: "contacted", seq: 1, sent: ["e1"], path: "", activity: [
      { ts: iso("2026-10-05T14:00:00Z"), type: "Email sent", note: "E1 · First email" },
      { ts: iso("2026-10-05T14:00:01Z"), type: "Stage", note: "Cold → Contacted: E1 · First email" },
    ], families: {}, createdAt: iso("2026-10-01T12:00:00Z"), nextAction: "Call (day 4)", nextDue: "2026-10-09" },
  { id: "add1", type: "overseer", stage: "new", seq: 0, sent: [], activity: [], families: {}, path: "",
    createdAt: iso("2026-10-02T12:00:00Z"), nextAction: "Send D1", nextDue: "" },
  { id: "call1", stage: "lost", seq: 2, sent: ["e1", "e2"], first: "Sam", email: "sam@example.org",
    call: { status: "not", ts: iso("2026-10-06T15:00:00Z"), by: "Pat", prev: { stage: "contacted", seq: 2 }, note: "", fundraising: false },
    activity: [{ ts: iso("2026-10-06T15:00:00Z"), type: "Call", note: "Not interested: busy term" },
      { ts: iso("2026-10-06T15:00:01Z"), type: "Stage", note: "Contacted → Declined: Not interested" }],
    families: { signups: "", activated: "", asOf: "" }, nextAction: "", nextDue: "", updatedAt: iso("2026-10-06T15:00:02Z") },
  { id: "call2", stage: "live", call: {}, families: { signups: "12", asOf: "2026-10-10" }, shared: true, path: "we",
    title_salutation: "Dr.", campaign: "Sept newsletter, Oct newsletter", activity: [{ ts: iso("2026-10-07T00:00:00Z"), type: "Note" } as any] },
  { id: "call3", type: "pta", stage: "engaged", call: { note: "call back Tue", fundraising: true }, activity: [] },
  { id: "aff1", type: "affiliate", stage: "new", first: "Pat", last: "Example", handle: "pat.example", platform: "Instagram",
    followers: "12300", profileUrl: "https://www.instagram.com/pat.example/", activity: [] },
  { id: "odd1", stage: "nurture", seq: 3, email: null as any, futureField: { a: 1 }, other: "kept" } as any,   // null + unknown keys, no activity
  { id: "prin", type: "principal", stage: "active", call: { status: "unreach", prev: {} as any }, activity: [
    { ts: iso("2026-10-08T10:00:00Z"), type: "Call", note: "Unable to reach (voicemail)", extraKey: 1 } as any] },
];

beforeAll(async () => {
  db = new PGlite();
  await db.exec(SUPABASE_SHIM);
  for (const f of fs.readdirSync(MIGRATIONS).filter((f: string) => f.endsWith(".sql")).sort()) await db.exec(fs.readFileSync(path.join(MIGRATIONS, f), "utf8"));
  await q("insert into auth.users values ($1, 'pat@example.org'), ($2, 'out@example.org')", [ME, OUTSIDER]);
  await q("insert into public.members (user_id, email) values ($1, 'pat@example.org')", [ME]);
}, 60_000);

describe("lead mapping (put_leads ⇄ leads_json)", () => {
  it("round-trips every lead variant", async () => {
    expect((await putOk(LEADS)).saved).toBe(LEADS.length);
    for (const l of LEADS) same(l, await get(l.id));
  });
  it("keeps unknown fields in extra and absent ≠ empty", async () => {
    const odd = await get("odd1") as any;
    expect(odd.futureField).toEqual({ a: 1 }); expect(odd.other).toBe("kept"); expect("email" in odd).toBe(false);
    const imp = await get("imp1") as any;
    expect(imp.owner).toBe(""); expect("title_salutation" in imp).toBe(false);
    expect((await get("call2") as any).call).toEqual({});
  });
  it("derives report columns from activity text", async () => {
    const rows = await q("select lead_id, ord, to_stage, call_outcome, is_touch from public.lead_activities order by lead_id, ord");
    const r = (id: string, ord: number) => rows.find(x => x.lead_id === id && x.ord === ord);
    expect(r("imp1", 1).to_stage).toBe("contacted");
    expect(r("call1", 1).to_stage).toBe("lost");
    expect(r("call1", 0).call_outcome).toBe("not");
    expect(r("prin", 0).call_outcome).toBe("unreach");
    expect(r("imp1", 0).is_touch).toBe(true); expect(r("call2", 0).is_touch).toBe(false);
  });
  it("generated query columns", async () => {
    const [l] = await q("select list, campaigns, signups_n, counts_as_of_date::text d, email_norm, phone_digits, district_norm, next_due_date::text nd from public.leads where id = 'call2'");
    expect(l).toMatchObject({ list: "principal", campaigns: ["Sept newsletter", "Oct newsletter"], d: "2026-10-10" });
    expect(Number(l.signups_n)).toBe(12);
    const [i] = await q("select phone_digits, district_norm, nd from (select phone_digits, district_norm, next_due_date::text nd from public.leads where id = 'imp1') s");
    expect(i).toMatchObject({ phone_digits: "5550100000", district_norm: "exampler1", nd: "2026-10-09" });
    const [m] = await q("select signups_n from public.leads where id = 'call1'");
    expect(m.signups_n).toBeNull();   // "" = not yet measured, not 0
  });
  it("updates in place, shrinks history on reset, and keeps the previous version", async () => {
    const l = structuredClone(LEADS[0]); l.stage = "new"; l.seq = 0; l.sent = []; l.activity = [{ ts: iso("2026-10-09T09:00:00Z"), type: "Note", note: "Reset to Cold (fresh start)" }];
    await putOk([l]);
    same(l, await get(l.id));
    expect((await q("select count(*)::int n from public.lead_activities where lead_id = 'imp1'"))[0].n).toBe(1);
    const h = await q<{ data: Lead }>("select data from public.lead_history where id = 'imp1' and op = 'UPDATE'");
    expect(h.length).toBe(1); same(LEADS[0], h[0].data);
    await putOk([l]);   // unchanged: no new history row
    expect((await q("select count(*)::int n from public.lead_history where id = 'imp1'"))[0].n).toBe(1);
  });
  it("delete keeps a copy", async () => {
    await q("select public.delete_leads($1)", [["add1"]]);
    expect(await get("add1")).toBeUndefined();
    const h = await q<{ data: Lead }>("select data from public.lead_history where id = 'add1' and op = 'DELETE'");
    same(LEADS[1], h[0].data);
  });
  it("refuses shapes it can't store, reports them, and still saves the rest", async () => {
    const r = await put([{ id: "bad1", stage: "new", call: { status: "info", mystery: 1 } }, { id: "good1", stage: "new" },
      { id: "bad2", stage: "e1" }, { id: "bad3", stage: "new", seq: 1.5 }, { id: "bad4", stage: "new", activity: ["x"] }]);
    expect(r.saved).toBe(1);
    expect(r.failed.map(f => f.id)).toEqual(["bad1", "bad2", "bad3", "bad4"]);
    expect(r.failed[0].error).toMatch(/unknown key in call/);
    expect(await get("good1")).toBeDefined(); expect(await get("bad1")).toBeUndefined();
  });
});

describe("templates", () => {
  it("round-trips the default templates in order, plus an app-made one", async () => {
    const list: Template[] = [...DEFAULT_TEMPLATES.map(t => ({ ...t })), { id: "own1", phase: "Other", name: "New email", to: null, subject: "", body: "" }];
    await q("select public.put_templates($1::jsonb)", [JSON.stringify(list.map((t, i) => ({ ...t, _pos: i })))]);
    const back = (await q<{ data: Template }>("select data from public.templates_json order by pos")).map(r => r.data);
    expect(back.map(t => canon(normTpl(t)))).toEqual(list.map(t => canon(normTpl(t))));
    // only what changed is sent: editing one template leaves the others alone; removing deletes and keeps a copy
    await q("select public.put_templates($1::jsonb, $2)", [JSON.stringify([{ ...list[1], subject: "Edited", _pos: 1 }]), [list[0].id]]);
    expect((await q("select count(*)::int n from public.templates"))[0].n).toBe(list.length - 1);
    expect((await q("select subject from public.templates where id = $1", [list[1].id]))[0].subject).toBe("Edited");
    const h = await q("select op, id from public.config_history where kind = 'template' order by hid");
    expect(h).toEqual([{ op: "DELETE", id: list[0].id }, { op: "UPDATE", id: list[1].id }]);
  });
  it("team settings merge per key", async () => {
    await q("select public.put_app_state($1, '{}', 6, 'v1', null, '2026-10-01', null)", [JSON.stringify({ support: "a", report: { focus: "x" } })]);
    await q("select public.put_app_state($1, '{}', 6, 'v1', null, '2026-10-01', null)", [JSON.stringify({ defaultLink: "b" })]);   // another teammate
    await q("select public.put_app_state('{}', array['support'], 6, 'v1', null, '2026-10-01', null)");
    expect((await q("select settings from public.app_state"))[0].settings).toEqual({ report: { focus: "x" }, defaultLink: "b" });
    expect((await q("select count(*)::int n from public.config_history where kind = 'app_state'"))[0].n).toBe(2);
  });
});

describe("access", () => {
  it("members read and write; others see nothing and can't write", async () => {
    expect((await as(ME, () => q("select count(*)::int n from public.leads_json")))[0].n).toBeGreaterThan(0);
    expect((await as(ME, () => put([{ id: "m1", stage: "new" }]))).failed).toEqual([]);
    expect((await q("select row_updated_by from public.leads where id = 'm1'"))[0].row_updated_by).toBe(ME);
    expect((await as(OUTSIDER, () => q("select count(*)::int n from public.leads_json")))[0].n).toBe(0);
    await expect(as(OUTSIDER, () => put([{ id: "x1", stage: "new" }]))).rejects.toThrow(/not a team member/);
    await expect(as(OUTSIDER, () => q("select public.delete_leads(array['m1'])"))).rejects.toThrow(/not a team member/);
  });
  it("nobody writes tables directly, so history can't be skipped or forged", async () => {
    await expect(as(ME, () => q("delete from public.leads"))).rejects.toThrow(/permission denied/);
    await expect(as(ME, () => q("update public.leads set stage = 'lost'"))).rejects.toThrow(/permission denied/);
    await expect(as(ME, () => q("insert into public.lead_history (id, op, data) values ('m1', 'DELETE', '{}')"))).rejects.toThrow(/permission denied/);
    await expect(as(ME, () => q("insert into public.templates (id, pos) values ('z', 0)"))).rejects.toThrow(/permission denied/);
    await expect(as(ME, () => q("update public.app_state set settings = '{}'"))).rejects.toThrow(/permission denied/);
  });
  it("signed-out visitors (anon) get nothing", async () => {
    await db.exec("set role anon");
    try {
      for (const t of ["leads", "leads_json", "members", "lead_history", "templates", "v_leads"])
        await expect(q(`select 1 from public.${t} limit 1`)).rejects.toThrow(/permission denied/);
      await expect(q("select public.put_leads('[]')")).rejects.toThrow(/permission denied/);
    } finally { await db.exec("reset role"); }
  });
  it("forgetting a contact is admin-only and removes its saved versions too", async () => {
    await expect(as(ME, () => q("select public.forget_leads(array['call1'])"))).rejects.toThrow(/admins only/);
    await q("update public.members set is_admin = true where user_id = $1", [ME]);
    await as(ME, () => q("select public.forget_leads(array['imp1'])"));
    expect(await get("imp1")).toBeUndefined();
    expect((await q("select count(*)::int n from public.lead_history where id = 'imp1'"))[0].n).toBe(0);
  });
  it("members can change only their own personal settings", async () => {
    await as(ME, () => q("update public.members set sender = 'Pat Example' where user_id = $1", [ME]));
    expect((await q("select sender from public.members where user_id = $1", [ME]))[0].sender).toBe("Pat Example");
    await as(ME, () => q("update public.members set title = 'Outreach', sender_email = 'pat@example.org' where user_id = $1", [ME]));
    expect((await q("select title, sender_email from public.members where user_id = $1", [ME]))[0]).toEqual({ title: "Outreach", sender_email: "pat@example.org" });
    await expect(as(ME, () => q("update public.members set is_admin = true where user_id = $1", [ME]))).rejects.toThrow(/permission denied/);
    // someone else's row: no error, but nothing changes (row-level security)
    await as(ME, () => q("update public.members set sender = 'X' where user_id = $1", [OUTSIDER]));
    expect((await q("select count(*)::int n from public.members where sender = 'X'"))[0].n).toBe(0);
  });
  it("views answer Explore-style questions", async () => {
    const s = await q("select list, stage, n::int from public.v_stage_counts order by 1, 2");
    expect(s.length).toBeGreaterThan(0);
    const v = await as(ME, () => q("select id, touches::int, stage_name, main_idx from public.v_leads where id = 'call1'"));
    expect(v[0]).toMatchObject({ touches: 1, stage_name: "Declined", main_idx: null });
    const d = await q("select sum(calls)::int c from public.v_activity_daily");
    expect(d[0].c).toBeGreaterThan(0);
  });
});

describe("social workspace (0004_social.sql)", () => {
  it("members read and write posts, groups and comments; who changed it is stamped by the database", async () => {
    await as(ME, () => q(`insert into public.social_items (id, kind, data, created_by) values ('p1', 'post', $1, $2)`,
      [JSON.stringify({ title: "Tips", status: "idea", platforms: ["Instagram"] }), OUTSIDER]));
    await as(ME, () => q(`update public.social_items set data = data || '{"status":"draft"}' where id = 'p1'`));
    const [r] = await q("select data->>'status' s, created_by::text c, updated_by::text u from public.social_items where id = 'p1'");
    expect(r).toEqual({ s: "draft", c: ME, u: ME });   // a client can't claim someone else wrote it
    await as(ME, () => q(`insert into public.social_comments (id, item_id, body, author) values ('c1', 'p1', 'Looks good', 'Pat')`));
    expect((await as(ME, () => q("select count(*)::int n from public.social_comments where item_id = 'p1'")))[0].n).toBe(1);
    await expect(as(ME, () => q(`insert into public.social_items (id, kind) values ('x', 'nonsense')`))).rejects.toThrow(/check/);
    await expect(as(ME, () => q(`update public.social_comments set body = 'edited' where id = 'c1'`))).rejects.toThrow(/permission denied/);
  });
  it("outsiders and signed-out visitors see and change nothing", async () => {
    expect((await as(OUTSIDER, () => q("select count(*)::int n from public.social_items")))[0].n).toBe(0);
    expect((await as(OUTSIDER, () => q("select count(*)::int n from public.social_comments")))[0].n).toBe(0);
    await expect(as(OUTSIDER, () => q(`insert into public.social_items (id, kind) values ('o1', 'post')`))).rejects.toThrow(/row-level security/);
    await as(OUTSIDER, () => q("delete from public.social_items"));
    expect((await q("select count(*)::int n from public.social_items"))[0].n).toBe(1);
    await db.exec("set role anon");
    try { await expect(q("select 1 from public.social_items")).rejects.toThrow(/permission denied/); }
    finally { await db.exec("reset role"); }
  });
});
