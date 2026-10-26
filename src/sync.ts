// Cloud sync with the team's Supabase database. Only active when the build sets VITE_SUPABASE_URL and
// VITE_SUPABASE_PUBLISHABLE_KEY (npm run build:cloud); the default build stays local-only, exactly as before.
//
// The app keeps its pattern (mutate S, call save()). In the cloud build save() writes this browser's copy under its own
// key (never over the local-only app's data) together with a sync journal, then uploads what changed since the last
// sync: changed leads to put_leads(), removed ones to delete_leads(), changed templates to put_templates(), changed team
// settings to put_app_state(), and your profile (sender, caller, phone, title, sender_email) to your own member row. The JSON ⇄ table mapping lives
// in the database (supabase/migrations/0001_lead_manager.sql). Edits that haven't reached the database (offline, tab
// closed) are kept in the journal and uploaded on the next load. Teammates' changes arrive over realtime and are merged.
// If two people change the same lead at once, the last save wins; the database keeps every earlier version.
import { createClient, type RealtimeChannel } from "@supabase/supabase-js";
import { S, migrate, onSave, render, replaceState, ui } from "./store";
import { KEY, TPL_VERSION } from "./lib/pipeline";
import { tick } from "./lib/logic";
import { name, schoolOf } from "./lib/helpers";
import { canon, leadKey, tplKey, valueKey } from "./lib/cloudShape";
import type { AppState, Lead, Settings, Template } from "./lib/types";

const URL = import.meta.env.VITE_SUPABASE_URL;
const PUBLIC_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || import.meta.env.VITE_SUPABASE_ANON_KEY;
export const cloudOn = !!(URL && PUBLIC_KEY);
const sb = cloudOn ? createClient(URL!, PUBLIC_KEY!) : null;
/** The signed-in client, for the Social tab's own tables and file storage (src/social/data.ts). */
export const supabase = sb;
const REF = (URL || "").replace(/^https:\/\/([^.]+).*$/, "$1");

// Settings that belong to the person, not the team (email signature, who's calling)
const PERSONAL = ["sender", "caller", "phone", "title", "sender_email"] as const;
type Personal = Partial<Record<(typeof PERSONAL)[number], string>>;
const KNOWN_STATE = new Set(["leads", "templates", "tplVersion", "vaultVersion", "vaultIds", "settings", "savedAt"]);
const CHUNK = 100;

type StateRow = { settings: Record<string, unknown>; tpl_version: number | null; vault_version: string | null; vault_ids: string[] | null; vault_generated: string | null; extra: Record<string, unknown> | null };
type MemberRow = { user_id: string; email: string; sender: string | null; caller: string | null; phone: string | null; title: string | null; sender_email: string | null };
type RpcResult = { error: { message: string; code?: string } | null; status: number };

/** Non-empty personal values only. */
const pick = (o: Record<string, unknown> | undefined | null): Personal => {
  const r: Personal = {}; PERSONAL.forEach(k => { const v = o?.[k]; if (typeof v === "string" && v) r[k] = v; }); return r;
};
const teamSettings = (s: Record<string, unknown>) => { const r = { ...s }; PERSONAL.forEach(k => delete r[k]); return r; };
const settingKeys = (s: Record<string, unknown>) => new Map(Object.entries(teamSettings(s)).filter(([, v]) => v !== undefined).map(([k, v]) => [k, valueKey(v)]));
const settingsOf = () => S.settings as unknown as Record<string, unknown>;

function bundle() { const v = window.VAULT_TEMPLATES; return v && Array.isArray(v.templates) && v.templates.length ? v : null; }
let dbVaultGenerated: string | null = null;
/** The other saved-state columns (everything but leads, templates and settings). */
function stateCols(d: AppState) {
  const extra: Record<string, unknown> = {};
  Object.keys(d).forEach(k => { if (!KNOWN_STATE.has(k)) extra[k] = (d as any)[k]; });
  const b = bundle();
  return { tpl_version: d.tplVersion ?? null, vault_version: d.vaultVersion ?? null, vault_ids: d.vaultIds ?? null,
    vault_generated: b && d.vaultVersion === b.version ? b.generated : dbVaultGenerated, extra: Object.keys(extra).length ? extra : null };
}
const rowCols = (st: StateRow) => ({ tpl_version: st.tpl_version, vault_version: st.vault_version, vault_ids: st.vault_ids, vault_generated: st.vault_generated, extra: st.extra });

/* ---------- what the database holds, as far as this browser knows ---------- */
const synced = { leads: new Map<string, string>(), templates: new Map<string, string>(), settings: new Map<string, string>(), state: "", personal: "" };
type Journal = { leads: Record<string, string>; templates: Record<string, string>; settings: Record<string, string>; state: string; personal: string };
const dump = (): Journal => ({ leads: Object.fromEntries(synced.leads), templates: Object.fromEntries(synced.templates),
  settings: Object.fromEntries(synced.settings), state: synced.state, personal: synced.personal });

// This browser's copy for the signed-in person: never the local-only app's KEY
let me: MemberRow | null = null, loadedUid: string | null = null;
const cacheKey = (uid: string) => `${KEY}-cloud:${REF}:${uid}`;
function writeCache() {
  if (!loadedUid) return;
  try { localStorage.setItem(cacheKey(loadedUid), JSON.stringify({ v: 1, S, synced: dump() })); }
  catch (e) { console.warn("Couldn't keep an offline copy in this browser", e); }
}
function readCache(uid: string): { S: AppState; synced: Journal } | null {
  try { const c = JSON.parse(localStorage.getItem(cacheKey(uid)) || "null"); return c && c.v === 1 && Array.isArray(c.S?.leads) ? c : null; }
  catch (e) { return null; }
}
const clearCache = (uid: string) => { try { localStorage.removeItem(cacheKey(uid)); } catch (e) { /* */ } };

/* ---------- push ---------- */
let timer: ReturnType<typeof setTimeout> | undefined, timerArmed = false, running = false, again = false, pending = false;
let backoff = 5000;
function schedule(ms = 400) { pending = true; timerArmed = true; clearTimeout(timer); timer = setTimeout(flush, ms); }

// Ids written by this browser, stamped with a generation, so a read that started before our write can't undo it
let gen = 0, tplGen = 0, stateGen = 0;
const touched = new Map<string, number>();
// Leads, templates or settings the database refused (e.g. text it can't store): skipped until edited again
const quarantine = new Map<string, { key: string; error: string }>();
let tplRefused = "", stateRefused = "";

class Denied extends Error { code = "42501"; }
/** retry later (offline, server busy, session refreshing) · refused (this payload can't be stored) · denied (no access). */
function classify(r: RpcResult): "ok" | "retry" | "refused" | "denied" {
  if (!r.error) return "ok";
  if (r.error.code === "42501") return "denied";
  if (!r.status || r.status >= 500 || r.status === 401 || r.status === 408 || r.status === 429 || !r.error.code) return "retry";
  return "refused";
}
function check(r: RpcResult) {
  const c = classify(r);
  if (c === "retry") throw r.error;
  if (c === "denied") throw new Denied(r.error!.message);
  return c;
}

async function flush() {
  timerArmed = false;
  if (ui.cloud !== "ready") return;   // stays pending; uploads after sign-in
  if (running) { again = true; return; }
  running = true;
  try {
    do { again = false; await pushOnce(); } while (again);
    backoff = 5000;
    pending = timerArmed;   // an edit made during the last upload has its own timer
    writeCache();
    ui.savedMsg = statusMsg();
  } catch (e: any) {
    console.error("Cloud sync failed", e);
    if (e instanceof Denied) { ui.cloud = "error"; ui.cloudErr = "Your account no longer has access to the team's data. Your unsynced changes are kept in this browser."; }
    else { ui.savedMsg = "⚠️ Not synced yet (offline?). Your changes are kept in this browser. Retrying…"; schedule(backoff); backoff = Math.min(backoff * 2, 60_000); }
  } finally { running = false; render(); }
}

function statusMsg() {
  const bad = S.leads.filter(l => quarantine.get(l.id)?.key === leadKey(l));
  const parts = [];
  if (bad.length) parts.push(`${bad.length} ${bad.length === 1 ? "lead" : "leads"} couldn't be saved to the team database (${bad.slice(0, 3).map(l => schoolOf(l) || name(l)).join(", ")}${bad.length > 3 ? "…" : ""}). Edit to retry; details in the browser console`);
  if (tplRefused) parts.push("an email template couldn't be saved");
  if (stateRefused) parts.push("team settings couldn't be saved");
  return parts.length ? "⚠️ " + parts.join("; ") + "." : "Synced " + new Date().toLocaleTimeString();
}

async function putLeads(items: Lead[], keys: string[]) {
  items.forEach(l => touched.set(l.id, ++gen));
  const r = await sb!.rpc("put_leads", { items }) as RpcResult & { data: { failed: { id: string; error: string }[] } | null };
  if (check(r) === "refused") {
    // The whole request was refused (e.g. a character the database can't store): try one at a time
    if (items.length > 1) { for (let i = 0; i < items.length; i++) await putLeads([items[i]], [keys[i]]); return; }
    console.error("Lead not saved to the team database:", items[0].id, r.error!.message);
    quarantine.set(items[0].id, { key: keys[0], error: r.error!.message }); return;
  }
  const failed = new Map((r.data?.failed || []).map(f => [f.id, f.error]));
  items.forEach((l, i) => {
    const err = failed.get(l.id);
    if (err) { console.error("Lead not saved to the team database:", l.id, err); quarantine.set(l.id, { key: keys[i], error: err }); }
    else { synced.leads.set(l.id, keys[i]); quarantine.delete(l.id); }
  });
}

async function pushOnce() {
  // leads: send the ones that changed, as JSON (the database maps them to rows)
  const seen = new Set<string>(), up: Lead[] = [], upKeys: string[] = [];
  for (const l of S.leads) {
    if (seen.has(l.id)) { console.warn("Duplicate lead id, only the first copy is synced:", l.id); continue; }
    seen.add(l.id);
    const k = leadKey(l);
    if (synced.leads.get(l.id) === k || quarantine.get(l.id)?.key === k) continue;
    up.push(JSON.parse(JSON.stringify(l))); upKeys.push(k);
  }
  for (let i = 0; i < up.length; i += CHUNK) await putLeads(up.slice(i, i + CHUNK), upKeys.slice(i, i + CHUNK));
  const gone = [...synced.leads.keys()].filter(id => !seen.has(id));
  for (let i = 0; i < gone.length; i += CHUNK) {
    const part = gone.slice(i, i + CHUNK);
    part.forEach(id => touched.set(id, ++gen));
    check(await sb!.rpc("delete_leads", { ids: part }) as RpcResult);
    part.forEach(id => synced.leads.delete(id));
  }

  // templates: only the ones that changed or moved, plus removals
  const tSeen = new Set<string>(), tUp: (Template & { _pos: number })[] = [], tKeys: [string, string][] = [];
  S.templates.forEach((t, i) => {
    if (tSeen.has(t.id)) return; tSeen.add(t.id);
    const k = tplKey(t, i); if (synced.templates.get(t.id) !== k) { tUp.push({ ...t, _pos: i }); tKeys.push([t.id, k]); }
  });
  const tGone = [...synced.templates.keys()].filter(id => !tSeen.has(id));
  const tSig = canon([tKeys, tGone]);
  if ((tUp.length || tGone.length) && tSig !== tplRefused) {
    tplGen++;
    const r = await sb!.rpc("put_templates", { items: tUp, remove: tGone }) as RpcResult;
    if (check(r) === "refused") { console.error("Templates not saved:", r.error!.message); tplRefused = tSig; }
    else { tKeys.forEach(([id, k]) => synced.templates.set(id, k)); tGone.forEach(id => synced.templates.delete(id)); tplRefused = ""; }
  }

  // team settings: only the keys that changed, plus the other state columns
  const now = settingKeys(settingsOf()), set: Record<string, unknown> = {}, unset: string[] = [];
  now.forEach((k, key) => { if (synced.settings.get(key) !== k) set[key] = settingsOf()[key]; });
  synced.settings.forEach((_, key) => { if (!now.has(key)) unset.push(key); });
  const cols = stateCols(S), colsKey = valueKey(cols), sSig = canon([set, unset, colsKey]);
  if ((Object.keys(set).length || unset.length || colsKey !== synced.state) && sSig !== stateRefused) {
    stateGen++;
    const r = await sb!.rpc("put_app_state", { p_set: set, p_unset: unset, p_tpl_version: cols.tpl_version, p_vault_version: cols.vault_version,
      p_vault_ids: cols.vault_ids, p_vault_generated: cols.vault_generated, p_extra: cols.extra }) as RpcResult;
    if (check(r) === "refused") { console.error("Team settings not saved:", r.error!.message); stateRefused = sSig; }
    else { synced.settings = now; synced.state = colsKey; dbVaultGenerated = cols.vault_generated; stateRefused = ""; }
  }

  // my profile: sender / caller / phone / title / sender_email
  const mine = pick(settingsOf()), pk = valueKey(mine);
  if (pk !== synced.personal && me) {
    const r = await sb!.from("members").update(Object.fromEntries(PERSONAL.map(k => [k, mine[k] ?? null]))).eq("user_id", me.user_id) as RpcResult;
    if (check(r) === "ok") synced.personal = pk;
  }
}

/* ---------- pull ---------- */
// Keyset paging by id: safe while teammates add or delete rows, and whatever the server's row limit is
async function fetchAll<T extends { id: string }>(table: string, cols: string): Promise<T[]> {
  const out: T[] = [];
  for (let last = ""; ;) {
    const { data, error } = await sb!.from(table).select(cols).gt("id", last).order("id").limit(1000);
    if (error) throw error;
    if (!data.length) return out;
    out.push(...(data as unknown as T[])); last = (data[data.length - 1] as unknown as T).id;
  }
}
const fetchLeads = () => fetchAll<{ id: string; data: Lead }>("leads_json", "id,data");
const fetchTemplates = async () => (await fetchAll<{ id: string; pos: number; data: Template }>("templates_json", "id,pos,data"))
  .sort((a, b) => a.pos - b.pos || (a.id < b.id ? -1 : 1)).map(r => r.data);
async function fetchState() {
  const { data, error } = await sb!.from("app_state").select("settings,tpl_version,vault_version,vault_ids,vault_generated,extra").eq("id", "main").maybeSingle<StateRow>();
  if (error) throw error; return data;
}

async function firstLoad(uid: string) {
  ui.cloud = "loading"; ui.cloudErr = ""; render();
  // Row-level security hides everything from non-members (empty results, not errors), so check first
  const m = await sb!.from("members").select("user_id,email,sender,caller,phone,title,sender_email").eq("user_id", uid).maybeSingle<MemberRow>();
  if (m.error) throw m.error;
  if (!m.data) { clearCache(uid); throw new Denied("not a member"); }
  me = m.data;
  const cache = readCache(uid);
  const [leads, tpls, st] = await Promise.all([fetchLeads(), fetchTemplates(), fetchState()]);

  // Baseline = what the database holds now
  synced.leads = new Map(leads.map(r => [r.id, leadKey(r.data)]));
  synced.templates = new Map(tpls.map((t, i) => [t.id, tplKey(t, i)]));
  synced.settings = st ? settingKeys(st.settings) : new Map();
  synced.state = st ? valueKey(rowCols(st)) : "";
  synced.personal = valueKey(pick(me as unknown as Record<string, unknown>));
  dbVaultGenerated = st?.vault_generated ?? null;

  const empty = !leads.length && !tpls.length && !st;
  let base: any = empty ? null : {
    ...(st?.extra || {}),
    leads: leads.map(r => r.data), templates: tpls,
    tplVersion: st?.tpl_version ?? TPL_VERSION, vaultVersion: st?.vault_version ?? undefined, vaultIds: st?.vault_ids ?? undefined,
    settings: { ...(st?.settings || {}) }, savedAt: null,
  };
  // Bring back edits that never reached the database (made offline, or the tab closed mid-sync)
  let kept = 0;
  if (cache) {
    const target = base ?? { leads: [], templates: [], settings: {}, tplVersion: TPL_VERSION, savedAt: null };
    kept = reapply(target, cache);
    if (kept) base = target;
  }

  // A browser with older email templates than the team's must not replace them (newer `generated` wins)
  const b = bundle();
  let out: AppState;
  if (base && b && base.vaultVersion && base.vaultVersion !== b.version && dbVaultGenerated && b.generated <= dbVaultGenerated) {
    const v = base.vaultVersion; base.vaultVersion = b.version; out = migrate(base); out.vaultVersion = v;
  } else out = migrate(base);

  // Personal settings: my member row, else what I had in this browser; never the team owner's
  const cachedMine = pick(cache?.S.settings as unknown as Record<string, unknown>);
  // (your sign-in address is the default email in your signature)
  out.settings = { ...out.settings, sender: "", caller: "", phone: "", title: "", sender_email: me!.email, ...cachedMine, ...pick(me as unknown as Record<string, unknown>) } as Settings;
  replaceState(out);
  loadedUid = uid;
  ui.cloud = "ready";
  ui.savedMsg = kept ? `Uploading ${kept} change${kept === 1 ? "" : "s"} made while offline…` : "Synced " + new Date().toLocaleTimeString();
  writeCache();
  tick();          // contacted + 3 touches + overdue → Nurture (saves if anything moved)
  schedule(0);     // uploads offline edits and anything migrate() changed
  subscribe();
  render();
}

/** Put this browser's unsynced edits (journal ≠ copy) on top of the database's data. Returns how many. */
function reapply(d: AppState, cache: { S: AppState; synced: Journal }) {
  let n = 0;
  const j = cache.synced, local = cache.S;
  const byId = new Map(d.leads.map((l, i) => [l.id, i]));
  const localIds = new Set<string>();
  for (const l of local.leads) {
    localIds.add(l.id);
    if (j.leads[l.id] === leadKey(l)) continue;   // unchanged since it last synced
    const i = byId.get(l.id); n++;
    if (i === undefined) { byId.set(l.id, d.leads.length); d.leads.push(l); } else d.leads[i] = l;
  }
  const del = Object.keys(j.leads).filter(id => !localIds.has(id) && byId.has(id));
  if (del.length) { n += del.length; const gone = new Set(del); d.leads = d.leads.filter(l => !gone.has(l.id)); }

  const tLocalIds = new Set(local.templates.map(t => t.id));
  local.templates.forEach((t, i) => {
    if (j.templates[t.id] === tplKey(t, i)) return;
    n++; const k = d.templates.findIndex(x => x.id === t.id);
    if (k >= 0) d.templates.splice(k, 1);
    d.templates.splice(Math.min(i, d.templates.length), 0, t);
  });
  const tDel = Object.keys(j.templates).filter(id => !tLocalIds.has(id));
  if (tDel.length) { n += tDel.length; d.templates = d.templates.filter(t => !tDel.includes(t.id)); }

  const ls = teamSettings(local.settings as unknown as Record<string, unknown>), ds = d.settings as unknown as Record<string, unknown>;
  Object.entries(ls).forEach(([k, v]) => { if (j.settings[k] !== valueKey(v)) { ds[k] = v; n++; } });
  Object.keys(j.settings).forEach(k => { if (!(k in ls) && k in ds) { delete ds[k]; n++; } });
  return n;
}

/* ---------- teammates' changes ---------- */
// A lead from the database replaces ours unless we have an unsynced edit (ours uploads next and wins), or the read
// started before our own latest write of it (then fetch it again). Updates in place, so open drawers keep working.
function applyLead(id: string, data: Lead | null, since: number) {
  if ((touched.get(id) ?? 0) > since) { changedIds.add(id); queueFetch(); return false; }
  const k = data ? leadKey(data) : undefined, known = synced.leads.get(id);
  if (k === known) return false;
  const i = S.leads.findIndex(l => l.id === id);
  if (i >= 0 ? leadKey(S.leads[i]) !== known : known !== undefined) return false;   // pending local edit or delete
  if (data) {
    synced.leads.set(id, k!);
    if (i >= 0) { const o = S.leads[i] as any; Object.keys(o).forEach(x => delete o[x]); Object.assign(o, data); }
    else S.leads.push(data);
  } else if (i >= 0) { synced.leads.delete(id); S.leads.splice(i, 1); }
  else { synced.leads.delete(id); return false; }
  return true;
}
const templatesPending = () => S.templates.length !== synced.templates.size || S.templates.some((t, i) => synced.templates.get(t.id) !== tplKey(t, i));
function applyTemplates(rows: Template[], since: number) {
  if (tplGen > since || templatesPending()) return false;
  const next = new Map(rows.map((t, i) => [t.id, tplKey(t, i)]));
  if (next.size === synced.templates.size && [...next].every(([id, k]) => synced.templates.get(id) === k)) return false;
  synced.templates = next; S.templates = rows; return true;
}
function applyState(st: StateRow | null, since: number) {
  if (!st || stateGen > since) return false;
  const now = settingKeys(settingsOf());
  const pendingLocal = now.size !== synced.settings.size || [...now].some(([k, v]) => synced.settings.get(k) !== v) || valueKey(stateCols(S)) !== synced.state;
  if (pendingLocal) return false;
  const next = settingKeys(st.settings), nextState = valueKey(rowCols(st));
  if (nextState === synced.state && next.size === synced.settings.size && [...next].every(([k, v]) => synced.settings.get(k) === v)) return false;
  synced.settings = next; synced.state = nextState; dbVaultGenerated = st.vault_generated;
  const mine: Record<string, unknown> = {}; PERSONAL.forEach(k => { mine[k] = settingsOf()[k]; });
  S.settings = { ...teamSettings(st.settings), ...mine } as unknown as Settings;
  S.tplVersion = st.tpl_version ?? S.tplVersion; S.vaultVersion = st.vault_version ?? undefined; S.vaultIds = st.vault_ids ?? undefined;
  return true;
}

let refreshing = false, lastRefresh = 0;
/** Re-read everything (after connecting or reconnecting, or the tab coming back) and merge. */
async function refresh() {
  if (ui.cloud !== "ready" || refreshing) return;
  refreshing = true; lastRefresh = Date.now();
  const g = gen, tg = tplGen, sg = stateGen;
  try {
    const [leads, tpls, st] = await Promise.all([fetchLeads(), fetchTemplates(), fetchState()]);
    let ch = false;
    const ids = new Set(leads.map(r => r.id));
    leads.forEach(r => { if (applyLead(r.id, r.data, g)) ch = true; });
    [...synced.leads.keys()].forEach(id => { if (!ids.has(id) && applyLead(id, null, g)) ch = true; });
    if (applyTemplates(tpls, tg)) ch = true;
    if (applyState(st, sg)) ch = true;
    if (ch) { writeCache(); render(); }
  } catch (e) { console.error("Cloud refresh failed", e); }
  finally { refreshing = false; }
}

// Lead events carry table rows; fetch the JSON for the changed ids in one go (one fetch at a time)
const changedIds = new Set<string>();
let leadTimer: ReturnType<typeof setTimeout> | undefined, otherTimer: ReturnType<typeof setTimeout> | undefined, fetching = false;
function queueFetch(ms = 300) { clearTimeout(leadTimer); leadTimer = setTimeout(fetchChanged, ms); }
async function fetchChanged() {
  if (fetching) { queueFetch(); return; }
  fetching = true;
  const ids = [...changedIds]; changedIds.clear();
  const g = gen;
  let ch = false;
  try {
    for (let i = 0; i < ids.length; i += CHUNK) {
      const part = ids.slice(i, i + CHUNK);
      const { data, error } = await sb!.from("leads_json").select("id,data").in("id", part);
      if (error) throw error;
      const got = new Map((data as { id: string; data: Lead }[]).map(r => [r.id, r.data]));
      part.forEach(id => { if (applyLead(id, got.get(id) ?? null, g)) ch = true; });
    }
  } catch (e) { console.error("Cloud fetch failed", e); ids.forEach(id => changedIds.add(id)); queueFetch(5000); }
  finally { fetching = false; }
  if (ch) { writeCache(); render(); }
}
async function refreshOthers() {
  const tg = tplGen, sg = stateGen;
  try {
    const [tpls, st] = await Promise.all([fetchTemplates(), fetchState()]);
    const a = applyTemplates(tpls, tg), b = applyState(st, sg);
    if (a || b) { writeCache(); render(); }
  } catch (e) { console.error("Cloud refresh failed", e); }
}

let channel: RealtimeChannel | null = null;
function subscribe() {
  if (channel) return;
  channel = sb!.channel("lead-manager")
    .on("postgres_changes", { event: "*", schema: "public", table: "leads" }, p => {
      if (p.eventType === "DELETE") { if (applyLead((p.old as { id: string }).id, null, gen)) { writeCache(); render(); } return; }
      changedIds.add((p.new as { id: string }).id); queueFetch();
    })
    // Templates and settings are small: re-read them in one go
    .on("postgres_changes", { event: "*", schema: "public", table: "templates" }, () => { clearTimeout(otherTimer); otherTimer = setTimeout(refreshOthers, 500); })
    .on("postgres_changes", { event: "*", schema: "public", table: "app_state" }, () => { clearTimeout(otherTimer); otherTimer = setTimeout(refreshOthers, 500); })
    // Changes made between the first load and (re)connecting would otherwise be missed
    .subscribe(status => { if (status === "SUBSCRIBED") refresh(); });
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible" && Date.now() - lastRefresh > 30_000) refresh();
  });
}

/* ---------- sign-in ---------- */
export async function signIn(email: string, password: string) {
  const { error } = await sb!.auth.signInWithPassword({ email, password });
  return error ? error.message : "";
}
export async function signOut() {
  clearTimeout(timer); timerArmed = false; await flush();
  const unsynced = pending || timerArmed || [...quarantine.values()].length > 0;
  if (unsynced && !confirm("Some changes haven't reached the team database yet. They stay saved in this browser and upload the next time you sign in here.\n\nSign out anyway?")) return;
  if (loadedUid && !unsynced) clearCache(loadedUid);   // no team data left behind in this browser
  if (channel) { await sb!.removeChannel(channel); channel = null; }
  await sb!.auth.signOut();
  location.reload();
}

let starting = false;
async function start(uid: string) {
  if (starting) return; starting = true;
  try { await firstLoad(uid); }
  catch (e: any) {
    console.error(e);
    ui.cloud = "error";
    ui.cloudErr = e instanceof Denied || e?.code === "42501"
      ? "Your account isn't on the team yet. Ask the admin to add you (npm run db -- add-member)."
      : "Couldn't reach the database: " + (e?.message || e);
    render();
  } finally { starting = false; }
}

export function startCloud() {
  if (!sb) return;
  onSave(() => { writeCache(); ui.savedMsg = "Syncing…"; schedule(); });
  // Warn before closing the tab with changes that haven't reached the database (they're kept in this browser anyway)
  window.addEventListener("beforeunload", e => { if (pending || running || timerArmed) e.preventDefault(); });
  sb.auth.onAuthStateChange((_ev, session) => {
    ui.user = session?.user.email || "";
    const uid = session?.user.id;
    if (!uid) { ui.cloud = "signin"; render(); return; }
    // Supabase calls this inside its own lock: do the work afterwards
    setTimeout(() => {
      if (loadedUid === uid) {   // signed back in (or the session was refreshed): carry on, upload what's waiting
        if (ui.cloud === "signin") { ui.cloud = "ready"; render(); schedule(0); refresh(); }
      } else if (loadedUid) location.reload();   // someone else signed in: start clean (each person's offline copy is kept separately)
      else if (ui.cloud !== "loading") start(uid);
    }, 0);
  });
}
/** Internals for tests/sync.e2e.test.ts. */
export const __test = { refresh, flush, state: () => ({ pending, running, timerArmed, quarantined: quarantine.size }) };

export const retryCloud = async () => {
  const uid = (await sb!.auth.getSession()).data.session?.user.id;
  if (uid) start(uid); else { ui.cloud = "signin"; render(); }
};
