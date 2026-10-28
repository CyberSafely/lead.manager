// App state. `S` is the saved data (same shape and localStorage key as the original app); `ui` is screen state.
// Logic mutates S directly, as before. save() persists and re-renders, and render() only re-renders: React components
// subscribe through useStore().
import { useSyncExternalStore } from "react";
import { DEFAULT_TEMPLATES } from "./lib/defaultTemplates";
import { KEY, TPL_VERSION, suggestTpl } from "./lib/pipeline";
import { isAff, isCamp, isCto, isDist, isOv, isPr, isPta, isUser, sameD, schoolOf } from "./lib/helpers";
import type { AppState, Lead, ListId, Template, VaultTemplates } from "./lib/types";

/* ---------- saved data ---------- */
export function blank(): AppState {
  return {
    leads: [], templates: DEFAULT_TEMPLATES.map(t => ({ ...t })), tplVersion: TPL_VERSION,
    settings: {
      sender: "Giancarlo Zaccardelli", caller: "Giancarlo", phone: "", onboardingPage: "", defaultLink: "", support: "", activeTarget: 10,
      title: "Onboarding & Activation", sender_email: "", mailingAddress: "",
      report: { focus: "", wins: "", blockers: "", next: "", log: [] },
    },
    savedAt: null,
  };
}

const OLD_IDS = ["t1", "t2", "t3", "t4", "t5", "vm", "e1", "e2", "f1", "fv", "f2", "f3", "r1", "r2", "a1", "a2", "b1", "b2", "p1", "n1", "n2", "l1", "l2"];

export function load(): AppState {
  let d: any = null;
  try { const raw = localStorage.getItem(KEY); if (raw) d = JSON.parse(raw); } catch (e) { /* storage unavailable */ }
  return migrate(d);
}

/** Bring saved data (from this browser or the cloud) up to the current shape. */
export function migrate(d: any): AppState {
  if (!d) { d = blank(); syncVault(d); return d; }
  const ver = d.tplVersion || 1;
  d = { ...blank(), ...d, settings: { ...blank().settings, ...(d.settings || {}) } };
  if (ver < 3) {
    // replace the earlier default emails, keep any you wrote yourself
    const own = (d.templates || []).filter((t: Template) => !OLD_IDS.includes(t.id) && !DEFAULT_TEMPLATES.some(x => x.id === t.id));
    d.templates = [...DEFAULT_TEMPLATES.map(t => ({ ...t })), ...own]; d.tplVersion = TPL_VERSION;
    // map the earlier 11-stage pipeline onto the 5 stages
    const map: Record<string, string> = { e1: "contacted", e2: "contacted", call: "contacted", decided: "engaged", setup: "engaged", launched: "engaged", activating: "live" };
    const seq: Record<string, number> = { e1: 1, e2: 1, call: 2 };
    d.leads.forEach((l: any) => {
      if (seq[l.stage]) l.seq = Math.max(l.seq || 0, seq[l.stage]); if (l.stage === "launched") l.shared = true;
      if (l.path === "you") l.path = ""; if (map[l.stage]) l.stage = map[l.stage]; l.sent = l.sent || [];
    });
  }
  if (ver < 4) {
    // v4 adds the call script and after-call emails; your edits to existing emails are kept
    DEFAULT_TEMPLATES.forEach(t => { if (!d.templates.some((x: Template) => x.id === t.id)) d.templates.push({ ...t }); });
    d.tplVersion = TPL_VERSION;
  }
  if (ver < 5) {
    // v5: refined copy from the vault's Emails/ notes (Oct 8, 2026). Replaces a template only if you
    // haven't edited it in the app; edited ones are kept and listed in the console.
    const V4: Record<string, string> = { "e1": "6x9rux", "e2": "1tr8qh4", "e3": "1c0qke2", "r1": "jc4o7r", "r2": "4l2vml", "r3": "11algzg", "g1": "1ggp0y0", "g2": "15si425", "g3": "nsity5", "p1": "1jq0ptf", "n1": "134dqes", "n2": "16ww5wj", "vm": "785fdy", "c1": "10dbrwx", "f1": "1ckczjg", "f2": "cr3hok", "f3": "1ake5km" };
    const hash = (s: string) => { let x = 5381; for (const c of s) x = ((x * 33) ^ c.codePointAt(0)!) >>> 0; return x.toString(36); };
    const kept: string[] = [];
    DEFAULT_TEMPLATES.forEach(t => {
      const i = d.templates.findIndex((x: Template) => x.id === t.id);
      if (i < 0) d.templates.push({ ...t });
      else if (hash(d.templates[i].subject + "\n" + d.templates[i].body) === V4[t.id]) d.templates[i] = { ...t };
      else kept.push(t.id);
    });
    if (kept.length) console.warn("Kept your edited templates (not refreshed):", kept.join(", "));
    d.tplVersion = TPL_VERSION;
  }
  if (ver < 6) {
    // v6 adds D1 for district overseers
    DEFAULT_TEMPLATES.forEach(t => { if (!d.templates.some((x: Template) => x.id === t.id)) d.templates.push({ ...t }); });
    d.tplVersion = TPL_VERSION;
  }
  syncVault(d);
  return d as AppState;
}

// The project's emails/ folder is the source of truth: each subfolder is a category. When email-templates.js changes,
// templates are replaced with the vault's (added, removed, re-categorized). Emails made in the app with "+ New email" are kept.
export function vaultTemplates(): VaultTemplates | null {
  const v = window.VAULT_TEMPLATES; return v && Array.isArray(v.templates) && v.templates.length ? v : null;
}
export function syncVault(d: AppState, force?: boolean) {
  const v = vaultTemplates(); if (!v || (!force && d.vaultVersion === v.version)) return false;
  const vids = new Set(v.templates.map(t => t.id));
  const known = new Set([...DEFAULT_TEMPLATES.map(t => t.id), ...(d.vaultIds || []), ...OLD_IDS]);
  const own = (d.templates || []).filter(t => !vids.has(t.id) && !known.has(t.id)).map(t => ({ ...t, phase: "Other (made in the app)" }));
  d.templates = [...v.templates.map(t => ({ ...t })), ...own]; d.vaultIds = [...vids]; d.vaultVersion = v.version;
  return true;
}

export let S: AppState = load();
/** Replace all saved data (restore from backup, tests). */
export function replaceState(d: AppState) { S = d; }

/* ---------- screen state ---------- */
export type View = "today" | "calls" | "leads" | "board" | "map" | "templates" | "dash" | "stats" | "data" | "help" | "profile" | "social";
export interface Filters { q: string; stage: string; district: string; due: string; email: string; level: string; grades: string; region: string }
// Cold is selected by default: on start and whenever you switch lists
export const emptyFilt = (): Filters => ({ q: "", stage: "new", district: "", due: "", email: "", level: "", grades: "", region: "" });

function initialDs(): ListId {
  try { const v = localStorage.getItem(KEY + "-ds"); if (v === "overseer" || v === "cto" || v === "campaign" || v === "pta" || v === "user" || v === "affiliate") return v; } catch (e) { /* */ }
  return "principal";
}

export const ui = {
  view: "dash" as View,   // Home
  // Dataset switch: principals (one per school), district overseers, campaigns (newsletter contacts),
  // PTA contacts, app users, or social media affiliates. All live in S.leads with a type.
  ds: initialDs(),
  filt: emptyFilt(),
  openId: null as string | null,
  bulk: null as null | { arr: Lead[]; tid: string },
  callFilt: "",
  // Calls tab: which script is shown (remembered in this browser), who it's filled in for, and whether it's open
  callScript: (() => { try { return localStorage.getItem(KEY + "-call-script") || ""; } catch (e) { return ""; } })(),
  callLead: "",
  callScriptOpen: false,
  showAll: false,
  anaP: "today",
  anaFrom: "",
  savedMsg: S.savedAt ? "Last saved " + new Date(S.savedAt).toLocaleString() : "",
  // Cloud sync (src/sync.ts): "off" in the local-only build; otherwise sign-in → loading → ready (or error)
  cloud: "off" as "off" | "signin" | "loading" | "ready" | "error",
  cloudErr: "",
  user: "",
  // Social tab: which section, and which post / group is open in its side panel
  socTab: "overview",
  socOpen: null as string | null,
  // A set of records picked by clicking a number on the Analytics tab. Calls and Schools show only these
  // (on top of their own filters) until cleared. Map: the district to highlight and list.
  pick: null as Picked | null,
  mapFocus: "",
};
export interface Picked { ids: string[]; label: string }

/* ---------- subscriptions ---------- */
let version = 0;
const listeners = new Set<() => void>();
export function render() { version++; listeners.forEach(f => f()); }
export function useStore() {
  return useSyncExternalStore(f => { listeners.add(f); return () => listeners.delete(f); }, () => version);
}

// The cloud build replaces how save() persists (its own storage key plus an upload of what changed),
// so it never writes over this browser's local-only data under KEY.
let persist: (() => void) | null = null;
export function onSave(f: () => void) { persist = f; }

export function save() {
  S.savedAt = new Date().toISOString();
  if (persist) persist();
  else {
    try { localStorage.setItem(KEY, JSON.stringify(S)); ui.savedMsg = "Saved " + new Date().toLocaleTimeString(); }
    catch (e) { ui.savedMsg = "⚠️ Not saved: browser storage unavailable. Use Data → Back up."; }
  }
  render();
}

/* ---------- lookups ---------- */
export const inDs = (l: Lead) => (l.type || "principal") === ui.ds;
export function DL() { return S.leads.filter(inDs); }
export function W() {
  const ds = ui.ds;
  return ds === "affiliate" ? { one: "affiliate", many: "affiliates", Unit: "Account", Who: "Name" }
    : ds === "user" ? { one: "user", many: "users", Unit: "Organization", Who: "User" }
    : ds === "pta" ? { one: "PTA contact", many: "PTA contacts", Unit: "PTA / organization", Who: "Contact" }
    : ds === "campaign" ? { one: "contact", many: "contacts", Unit: "Organization", Who: "Contact" }
    : ds === "overseer" ? { one: "overseer", many: "overseers", Unit: "District", Who: "Overseer" }
    : ds === "cto" ? { one: "CTO", many: "CTOs", Unit: "District", Who: "CTO" }
    : { one: "school", many: "schools", Unit: "School", Who: "Principal" };
}
export function lead(id: string) { return S.leads.find(l => l.id === id); }
export function tpl(id: string) { return S.templates.find(t => t.id === id); }
export function schoolsOf(o: Lead) { return S.leads.filter(l => isPr(l) && sameD(l, o)).sort((a, b) => schoolOf(a).localeCompare(schoolOf(b))); }
export function overseerOf(l: Lead) { return S.leads.find(o => isOv(o) && sameD(o, l)); }
export function ctoOf(l: Lead) { return S.leads.find(o => isCto(o) && sameD(o, l)); }
export { isAff, isCamp, isCto, isDist, isOv, isPr, isPta, isUser };

/* ---------- navigation ---------- */
export function setView(v: View) { ui.view = v; ui.pick = null; ui.mapFocus = ""; render(); }
export function setDs(v: ListId) {
  ui.ds = v; try { localStorage.setItem(KEY + "-ds", v); } catch (e) { /* */ }
  ui.filt = emptyFilt(); ui.callFilt = ""; ui.pick = null; closeDrawer();
}
/** The records a pick refers to (skips any deleted since). */
export function picked(): Lead[] { const p = ui.pick; return p ? p.ids.map(lead).filter(Boolean) as Lead[] : []; }

/** Where a click on the Analytics tab leads. ids: exact records; otherwise a list + filters. */
export interface Go { view: "calls" | "leads" | "map"; label: string; ids?: string[]; ds?: ListId; stage?: string; region?: string; district?: string; call?: string }
export function goTo(g: Go) {
  // Switch to the list the records belong to; records from several lists stay together in one view
  const lists = g.ids ? [...new Set(g.ids.map(id => lead(id)?.type || "principal"))] : [];
  const ds = g.ds || (lists.length === 1 ? lists[0] as ListId : null);
  if (ds && ds !== ui.ds) setDs(ds);
  ui.filt = { ...emptyFilt(), stage: g.stage || "", region: g.region || "", district: g.view === "leads" ? g.district || "" : "" };
  ui.callFilt = g.call || ""; ui.callLead = ""; ui.showAll = false;
  ui.pick = g.ids ? { ids: g.ids, label: g.label } : null;
  ui.mapFocus = g.view === "map" ? g.district || "" : "";
  ui.view = g.view; ui.openId = null; ui.bulk = null;
  if (g.ids?.length === 1 && g.view !== "map") ui.openId = g.ids[0];
  render(); window.scrollTo(0, 0);
}
export function openLead(id: string) { ui.openId = id; ui.bulk = null; render(); }
export function closeDrawer() { ui.openId = null; ui.bulk = null; render(); }
export function bulkOpen(arr: Lead[], tid?: string | null) {
  ui.openId = null;
  ui.bulk = { arr, tid: tid || suggestTpl(arr[0] || { stage: "new" }) || "e1" };
  render();
}
