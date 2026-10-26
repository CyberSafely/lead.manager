// @vitest-environment node
// End-to-end test of the cloud sync (src/sync.ts) with two teammates' browsers, against a real Postgres (PGlite)
// running supabase/migrations, through a small stand-in for the Supabase client (PostgREST queries, RPC, auth,
// realtime events). Fake data only (rule 6).
import fs from "node:fs";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { PGlite } from "@electric-sql/pglite";

vi.mock("@supabase/supabase-js", () => ({ createClient: () => (globalThis as any).__fakeSb }));

// The few browser pieces the app uses, installed after PGlite has loaded (it would think it's in a browser)
const mem = new Map<string, string>();
const installBrowser = () => Object.assign(globalThis, {
  window: globalThis, addEventListener() {}, confirm: () => true,
  document: { visibilityState: "visible", addEventListener() {} },
  localStorage: { getItem: (k: string) => mem.get(k) ?? null, setItem: (k: string, v: string) => void mem.set(k, String(v)),
    removeItem: (k: string) => void mem.delete(k), key: (i: number) => [...mem.keys()][i] ?? null, get length() { return mem.size; } },
});

const ME = "00000000-0000-4000-8000-0000000000a1", MATE = "00000000-0000-4000-8000-0000000000b2";
let db: PGlite;

/* ---------- a minimal Supabase client over PGlite ---------- */
let queue: Promise<unknown> = Promise.resolve();
const serial = <T,>(f: () => Promise<T>) => { const p = queue.then(f, f); queue = p.catch(() => {}); return p; };
type Handler = (p: any) => void;
const channels = new Set<{ handlers: { table: string; fn: Handler }[] }>();
function emit(table: string, payload: any) {
  setTimeout(() => channels.forEach(c => c.handlers.filter(h => h.table === table).forEach(h => h.fn(payload))), 20);
}

async function run(uid: string, sql: string, params: unknown[]) {
  return serial(async () => {
    await db.exec("begin");
    try {
      await db.query("select set_config('request.jwt.claim.sub', $1, true)", [uid]);
      await db.exec("set local role authenticated");
      const r = await db.query<any>(sql, params);
      await db.exec("commit");
      return { rows: r.rows, error: null };
    } catch (e: any) { await db.exec("rollback"); return { rows: [], error: { message: e.message, code: e.code || "XX000" } }; }
  });
}

const JSONB = new Set(["items", "p_set", "p_extra"]), TEXTS = new Set(["ids", "remove", "p_unset", "p_vault_ids"]);
function fakeClient(uid: string, email: string) {
  const net = { offline: false };
  const down = { data: null, error: { message: "TypeError: Failed to fetch", code: "" }, status: 0 };
  const result = (r: { rows: any[]; error: any }, data: unknown) => r.error
    ? { data: null, error: r.error, status: r.error.code === "42501" ? 403 : 400 } : { data, error: null, status: 200 };

  class Query {
    cols = "*"; where: string[] = []; params: unknown[] = []; ord = ""; lim = 0; upd: Record<string, unknown> | null = null;
    constructor(private table: string) {}
    select(c: string) { this.cols = c; return this; }
    gt(c: string, v: unknown) { this.params.push(v); this.where.push(`${c} > $${this.params.length}`); return this; }
    eq(c: string, v: unknown) { this.params.push(v); this.where.push(`${c} = $${this.params.length}`); return this; }
    in(c: string, v: unknown[]) { this.params.push(v); this.where.push(`${c} = any($${this.params.length})`); return this; }
    order(c: string) { this.ord = c; return this; }
    limit(n: number) { this.lim = n; return this; }
    update(o: Record<string, unknown>) { this.upd = o; return this; }
    maybeSingle() { return this.exec(true); }
    then(res: any, rej: any) { return this.exec(false).then(res, rej); }
    async exec(single: boolean) {
      if (net.offline) return down;
      const w = this.where.length ? " where " + this.where.join(" and ") : "";
      if (this.upd) {
        const keys = Object.keys(this.upd), off = this.params.length;
        const sql = `update public.${this.table} set ${keys.map((k, i) => `${k} = $${off + i + 1}`).join(", ")}${w}`;
        return result(await run(uid, sql, [...this.params, ...keys.map(k => this.upd![k])]), null);
      }
      const sql = `select ${this.cols} from public.${this.table}${w}${this.ord ? " order by " + this.ord : ""}${this.lim ? " limit " + this.lim : ""}`;
      const r = await run(uid, sql, this.params);
      return result(r, single ? r.rows[0] ?? null : r.rows);
    }
  }

  const listeners: ((ev: string, s: any) => void)[] = [];
  const session = { user: { id: uid, email } };
  return {
    net,
    from: (t: string) => new Query(t),
    async rpc(fn: string, args: Record<string, unknown>) {
      if (net.offline) return down;
      const names = Object.keys(args);
      const sql = `select public.${fn}(${names.map((n, i) => `${n} => $${i + 1}${JSONB.has(n) ? "::jsonb" : TEXTS.has(n) ? "::text[]" : ""}`).join(", ")}) as r`;
      const r = await run(uid, sql, names.map(n => JSONB.has(n) ? JSON.stringify(args[n]) : args[n]));
      if (!r.error) {
        if (fn === "put_leads") (args.items as { id: string }[]).forEach(l => emit("leads", { eventType: "UPDATE", new: { id: l.id } }));
        if (fn === "delete_leads") (args.ids as string[]).forEach(id => emit("leads", { eventType: "DELETE", old: { id } }));
        if (fn === "put_templates") emit("templates", {});
        if (fn === "put_app_state") emit("app_state", {});
      }
      return result(r, r.rows[0]?.r ?? null);
    },
    auth: {
      getUser: async () => ({ data: { user: session.user } }),
      getSession: async () => ({ data: { session } }),
      onAuthStateChange(cb: (ev: string, s: any) => void) { listeners.push(cb); setTimeout(() => cb("INITIAL_SESSION", session), 0); return { data: { subscription: { unsubscribe() {} } } }; },
      signInWithPassword: async () => ({ error: null }),
      signOut: async () => ({ error: null }),
    },
    channel() {
      const ch = { handlers: [] as { table: string; fn: Handler }[],
        on(_t: string, f: { table: string }, fn: Handler) { ch.handlers.push({ table: f.table, fn }); return ch; },
        subscribe(cb: (s: string) => void) { channels.add(ch); setTimeout(() => cb("SUBSCRIBED"), 0); return ch; } };
      return ch;
    },
    removeChannel: async (ch: any) => { channels.delete(ch); },
  };
}

/* ---------- a teammate's browser = a fresh copy of the app's modules ---------- */
type Browser = { store: typeof import("../src/store"); sync: typeof import("../src/sync"); sb: ReturnType<typeof fakeClient> };
async function openBrowser(uid: string, email: string): Promise<Browser> {
  vi.resetModules();
  const sb = fakeClient(uid, email); (globalThis as any).__fakeSb = sb;
  const store = await import("../src/store"), sync = await import("../src/sync");
  store.ui.cloud = "signin"; sync.startCloud();
  await until(() => store.ui.cloud === "ready", () => `cloud=${store.ui.cloud} ${store.ui.cloudErr}`);
  return { store, sync, sb };
}
async function until(ok: () => boolean, why = () => "", ms = 5000) {
  const t0 = Date.now();
  while (!ok()) { if (Date.now() - t0 > ms) throw new Error("timed out: " + why()); await new Promise(r => setTimeout(r, 25)); }
}
/** Wait until this browser has nothing left to upload and incoming events have been applied. */
async function settle(...bs: Browser[]) {
  await new Promise(r => setTimeout(r, 60));
  for (const b of bs) await until(() => { const s = b.sync.__test.state(); return !s.pending && !s.running && !s.timerArmed; }, () => JSON.stringify(b.sync.__test.state()));
  await new Promise(r => setTimeout(r, 450));   // realtime → fetchChanged (300 ms debounce)
}
const dbLead = async (id: string) => (await db.query<any>("select data from public.leads_json where id = $1", [id])).rows[0]?.data;
const L = (b: Browser, id: string) => b.store.S.leads.find(l => l.id === id)!;

beforeAll(async () => {
  vi.stubEnv("VITE_SUPABASE_URL", "https://testref.supabase.co");
  vi.stubEnv("VITE_SUPABASE_PUBLISHABLE_KEY", "sb_publishable_test");
  db = new PGlite();
  await db.exec(`create schema auth; create table auth.users (id uuid primary key, email text);
    create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
    create role anon; create role authenticated; grant usage on schema auth to anon, authenticated; grant execute on function auth.uid() to anon, authenticated;`);
  const dir = path.join(import.meta.dirname, "../supabase/migrations");
  for (const f of fs.readdirSync(dir).sort()) await db.exec(fs.readFileSync(path.join(dir, f), "utf8"));
  await db.query("insert into auth.users values ($1, 'pat@example.org'), ($2, 'sam@example.org')", [ME, MATE]);
  await db.query("insert into public.members (user_id, email, is_admin, sender, caller) values ($1, 'pat@example.org', true, 'Pat Example', 'Pat'), ($2, 'sam@example.org', false, null, null)", [ME, MATE]);
  const lead = (id: string, extra = {}) => ({ id, stage: "new", seq: 0, sent: [], path: "", activity: [], families: {}, school: "School " + id, email: id + "@example.org", nextAction: "Send E1", nextDue: "", createdAt: "2026-10-01T12:00:00.000Z", ...extra });
  await db.query("select public.put_leads($1::jsonb)", [JSON.stringify([lead("a"), lead("b"), lead("c"), lead("d", { type: "overseer" })])]);
  await db.query("select public.put_templates($1::jsonb)", [JSON.stringify([{ id: "t1", name: "T1", subject: "One", body: "x", to: "contacted", _pos: 0 }, { id: "t2", name: "T2", subject: "Two", body: "y", to: null, _pos: 1 }])]);
  installBrowser();
  await db.query("select public.put_app_state($1, '{}', 6, null, null, null, null)", [JSON.stringify({ sender: "Pat Example", caller: "Pat", phone: "", onboardingPage: "", defaultLink: "", support: "", activeTarget: 10, report: { focus: "", wins: "", blockers: "", next: "", log: [] } })]);
}, 60_000);
afterAll(() => { vi.unstubAllEnvs(); });

describe("cloud sync between two teammates", () => {
  let A: Browser, B: Browser;

  it("both load the team's data; personal settings are each person's own", async () => {
    A = await openBrowser(ME, "pat@example.org");
    B = await openBrowser(MATE, "sam@example.org");
    expect(A.store.S.leads.map(l => l.id).sort()).toEqual(["a", "b", "c", "d"]);
    expect(B.store.S.leads.length).toBe(4);
    expect(A.store.S.settings.sender).toBe("Pat Example");
    expect(B.store.S.settings.sender).toBe("");          // not the owner's name
    expect(B.store.S.templates.map(t => t.id)).toEqual(["t1", "t2"]);
    await settle(A, B);
  });

  it("an edit reaches the database and the teammate, keeping open references valid", async () => {
    const heldByB = L(B, "a");                            // e.g. an open drawer or bulk-send list
    L(A, "a").notes = "called Tue"; A.store.save();
    await settle(A, B);
    expect((await dbLead("a")).notes).toBe("called Tue");
    expect(L(B, "a").notes).toBe("called Tue");
    expect(L(B, "a")).toBe(heldByB);                      // updated in place
  });

  it("edits to different leads by both teammates both survive", async () => {
    L(A, "b").notes = "from A"; A.store.save();
    L(B, "c").notes = "from B"; B.store.save();
    await settle(A, B); await settle(A, B);
    expect((await dbLead("b")).notes).toBe("from A"); expect((await dbLead("c")).notes).toBe("from B");
    expect(L(A, "c").notes).toBe("from B"); expect(L(B, "b").notes).toBe("from A");
  });

  it("same lead at the same moment: last save wins, the other version is kept in history, both converge", async () => {
    L(A, "a").jobtitle = "Principal (A)"; A.store.save();
    L(B, "a").jobtitle = "Principal (B)"; B.store.save();
    await settle(A, B); await settle(A, B);
    const final = (await dbLead("a")).jobtitle;
    expect(["Principal (A)", "Principal (B)"]).toContain(final);
    expect(L(A, "a").jobtitle).toBe(final); expect(L(B, "a").jobtitle).toBe(final);
    const hist = (await db.query<any>("select data->>'jobtitle' j from public.lead_history where id = 'a'")).rows.map(r => r.j);
    expect(hist).toContain(final === "Principal (A)" ? "Principal (B)" : "Principal (A)");
  });

  it("a new lead and a deleted lead propagate, and the delete doesn't come back", async () => {
    A.store.S.leads.push({ id: "n1", stage: "new", school: "New School", activity: [] }); A.store.save();
    await settle(A, B);
    expect(L(B, "n1")?.school).toBe("New School");
    B.store.replaceState({ ...B.store.S, leads: B.store.S.leads.filter(l => l.id !== "c") }); B.store.save();
    await settle(A, B); await settle(A, B);
    expect(await dbLead("c")).toBeUndefined();
    expect(L(A, "c")).toBeUndefined();
    await A.sync.__test.refresh(); await settle(A, B);
    expect(L(A, "c")).toBeUndefined();
    expect((await db.query<any>("select count(*)::int n from public.lead_history where id = 'c' and op = 'DELETE'")).rows[0].n).toBe(1);
  });

  it("templates and team settings merge per item: teammates' edits don't overwrite each other", async () => {
    A.store.S.templates[0].subject = "One (edited by A)"; A.store.save();
    B.store.S.templates[1].subject = "Two (edited by B)"; B.store.save();
    A.store.S.settings.support = "help@example.org"; A.store.save();
    B.store.S.settings.defaultLink = "https://example.org/join"; B.store.save();
    await settle(A, B); await settle(A, B);
    const t = (await db.query<any>("select id, subject from public.templates order by pos")).rows;
    expect(t).toEqual([{ id: "t1", subject: "One (edited by A)" }, { id: "t2", subject: "Two (edited by B)" }]);
    const s = (await db.query<any>("select settings from public.app_state")).rows[0].settings;
    expect(s.support).toBe("help@example.org"); expect(s.defaultLink).toBe("https://example.org/join");
    expect(s.sender).toBe("Pat Example");                 // team default untouched by B's personal settings
    expect(B.store.S.templates[0].subject).toBe("One (edited by A)");
    expect(A.store.S.settings.defaultLink).toBe("https://example.org/join");
  });

  it("personal settings go to your own member row", async () => {
    B.store.S.settings.sender = "Sam Example"; B.store.S.settings.caller = "Sam"; B.store.save();
    await settle(A, B);
    const m = (await db.query<any>("select sender, caller from public.members where user_id = $1", [MATE])).rows[0];
    expect(m).toEqual({ sender: "Sam Example", caller: "Sam" });
    expect(A.store.S.settings.sender).toBe("Pat Example");
  });

  it("one lead the database refuses doesn't block the rest, and is reported", async () => {
    (L(A, "b") as any).seq = 1.5; L(A, "d").notes = "still syncs"; A.store.save();
    await settle(A);
    expect((await dbLead("d")).notes).toBe("still syncs");
    expect(A.sync.__test.state().quarantined).toBe(1);
    expect(A.store.ui.savedMsg).toMatch(/couldn't be saved/);
    L(A, "b").seq = 2; A.store.save();                     // fixing it retries
    await settle(A);
    expect((await dbLead("b")).seq).toBe(2); expect(A.sync.__test.state().quarantined).toBe(0);
  });

  it("offline edits survive closing the tab and upload on the next load", async () => {
    A.sb.net.offline = true;
    L(A, "a").notes = "written offline"; A.store.save();
    await new Promise(r => setTimeout(r, 600));
    expect(A.store.ui.savedMsg).toMatch(/Not synced/);
    expect((await dbLead("a")).notes).not.toBe("written offline");
    // close the tab and open the app again, online
    A = await openBrowser(ME, "pat@example.org");
    expect(L(A, "a").notes).toBe("written offline");
    await settle(A, B);
    expect((await dbLead("a")).notes).toBe("written offline");
    expect(L(B, "a").notes).toBe("written offline");
  });

  it("never touches the local-only app's saved data", () => {
    expect(localStorage.getItem("cs-outreach-v1")).toBeNull();
    expect([...mem.keys()].filter(k => k.startsWith("cs-outreach-v1-cloud:")).length).toBe(2);
  });
});
