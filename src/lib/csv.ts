// CSV import (HubSpot / cleaned lists), activity-log import, and exports. Everything stays in the browser.
import { DL, S, W, save, tpl, ui } from "../store";
import { CALLS, STAGE, STAGES, callDef } from "./pipeline";
import { campsOf, csvCell, digits, fmtPhone, lastTouch, name, parseFollowers, profileUrlOf, setBase, touches, uid } from "./helpers";
import { logSent, setCall, setNext } from "./logic";
import type { Lead } from "./types";

export function parseCsv(t: string) {
  const rows: string[][] = []; let r: string[] = [], f = "", q = false;
  for (let i = 0; i < t.length; i++) {
    const c = t[i];
    if (q) { if (c === '"') { if (t[i + 1] === '"') { f += '"'; i++; } else q = false; } else f += c; }
    else if (c === '"') q = true; else if (c === ",") { r.push(f); f = ""; } else if (c === "\n") { r.push(f); rows.push(r); r = []; f = ""; } else if (c !== "\r") f += c;
  }
  if (f || r.length) { r.push(f); rows.push(r); }
  return rows.filter(x => x.some(v => v.trim()));
}

export function lev(a: string, b: string) {
  const m = a.length, n = b.length, d = [...Array(n + 1).keys()];
  for (let i = 1; i <= m; i++) { let p = d[0]; d[0] = i; for (let j = 1; j <= n; j++) { const t = d[j]; d[j] = Math.min(d[j] + 1, d[j - 1] + 1, p + (a[i - 1] === b[j - 1] ? 0 : 1)); p = t; } }
  return d[n];
}

export interface LogResult { msg: string; missing: string[]; bad: string[] }

export function applyActivityLog(text: string): LogResult {
  const none = (msg: string): LogResult => ({ msg, missing: [], bad: [] });
  const rows = parseCsv(text.replace(/^﻿/, "")); if (rows.length < 2) return none("No rows found.");
  const H = rows[0].map(h => h.trim().toLowerCase()), ix = (k: string) => H.indexOf(k);
  if (ix("action") < 0 || (ix("name") < 0 && ix("email") < 0)) return none("Need an Action column and a Name or Email column.");
  const pool = DL(), nn = (s?: string) => String(s || "").toLowerCase().replace(/[^a-z]/g, "");
  const find = (nm: string, em: string): Lead | null => {
    if (em) { const e = pool.find(l => (l.email || "").toLowerCase() === em.toLowerCase()); if (e) return e; }
    if (!nm) return null; const k = nn(nm);
    const exact = pool.filter(l => nn(name(l)) === k); if (exact.length === 1) return exact[0];
    const near = pool.map(l => [l, lev(nn(name(l)), k)] as [Lead, number]).filter(x => x[1] <= 2).sort((a, b) => a[1] - b[1]);
    return near.length && (near.length === 1 || near[0][1] < near[1][1]) ? near[0][0] : null;
  };
  const recs = rows.slice(1).map(r => {
    const g = (k: string) => ix(k) >= 0 ? (r[ix(k)] || "").trim() : "";
    return { nm: g("name"), em: g("email"), act: g("action").toLowerCase(), date: g("date"), note: g("note"), l: null as Lead | null };
  }).filter(x => x.act);
  const named = new Set<string>(), missing: string[] = [];
  recs.forEach(x => { if (x.nm === "*") return; x.l = find(x.nm, x.em); if (x.l) named.add(x.l.id); else missing.push(x.nm || x.em); });
  let done = 0, skipped = 0; const bad = new Set<string>(), touched = new Set<string>();
  const apply = (l: Lead, x: typeof recs[number]) => {
    const t = x.act === "voicemail" ? null : tpl(x.act); if (x.act !== "voicemail" && !t) { bad.add(x.act); return; }
    const type = t ? "Email sent" : "Call", nm = t ? t.name : CALLS.unreach.name;
    if ((l.activity || []).some(a => a.type === type && (t ? a.note === nm : a.note.startsWith(nm)) && a.ts.slice(0, 10) === x.date)) { skipped++; return; }
    setBase(/^\d{4}-\d{2}-\d{2}$/.test(x.date) ? x.date : null);
    try { if (t) logSent(l, t.id); else setCall(l, "unreach", x.note); } finally { setBase(null); }
    done++; touched.add(l.id);
  };
  recs.forEach(x => { if (x.nm === "*") pool.filter(l => !named.has(l.id)).forEach(l => apply(l, x)); else if (x.l) apply(x.l, x); });
  save();
  return {
    msg: `Logged ${done} actions for ${touched.size} ${W().many}.` + (skipped ? ` Skipped ${skipped} already logged.` : ""),
    missing: [...new Set(missing)], bad: [...bad],
  };
}

export function importCsv(text: string, camp: string) {
  const ds = ui.ds;
  let rows = parseCsv(text.replace(/^﻿/, ""));
  // Skip a title line above the header (e.g. "PTA DATASET,")
  const hi = rows.slice(0, 5).findIndex(r => r.some(c => /^(e-?mail|name|full name|first ?name|record id|contact id)$/i.test(c.trim())));
  if (hi > 0) rows = rows.slice(hi);
  if (rows.length < 2) return "No rows found.";
  const H = rows[0].map(h => h.trim().toLowerCase());
  const col = (...names: string[]) => { for (const n of names) { const i = H.indexOf(n); if (i >= 0) return i; } for (const n of names) { const i = H.findIndex(h => h.includes(n)); if (i >= 0) return i; } return -1; };
  const ex = (...names: string[]) => { for (const n of names) { const i = H.indexOf(n); if (i >= 0) return i; } return -1; };
  const C: Record<string, number> = {
    hubspotId: col("record id", "contact id", "hs_object_id"), first: col("first name", "firstname"), last: col("last name", "lastname"), email: col("email"),
    phone: col("phone number", "phone"), jobtitle: col("job title", "jobtitle"), school: col("school"),
    // "Company" in HubSpot exports is MSBA (the list source), so the associated company wins
    districtId: col("district id", "districtid"),
    district: [(() => { const i = H.indexOf("district"); return i >= 0 ? i : H.findIndex(h => h.includes("district") && !h.includes("id")); })(), col("associated company"), col("primary company"), col("company name"), col("company")].find(i => i >= 0) ?? -1,
    owner: col("contact owner", "owner"), notes: col("notes"),
    full: (() => { const i = H.indexOf("name"); return i >= 0 ? i : H.indexOf("full name"); })(), state: col("state/region", "state"),
    // From the cleaned Notion school list (exact header match only, so HubSpot's "State/Region" isn't read as Region)
    code: ex("referral code", "promo code"), regLink: ex("sign-up link", "signup link", "registration link"),
    level: ex("level"), grades: ex("grades"), city: ex("city"), region: ex("region"), assigned: ex("assigned"),
    // Affiliates (social media)
    handle: ex("username", "handle", "social media handle", "account"), platform: ex("platform"),
    followers: ex("follower count", "followers"), profileUrl: ex("link", "link to account", "profile link", "profile url", "url"),
  };
  if (ds === "affiliate" && C.handle < 0) return "Couldn't find a Username (or Social Media Handle) column.";
  if (C.email < 0 && C.first < 0 && C.full < 0) return "Couldn't find Email or First Name columns. Check the export.";
  let add = 0, upd = 0, skip = 0;
  const low = (s?: string) => (s || "").toLowerCase();
  for (const r of rows.slice(1)) {
    const g = (k: string) => C[k] >= 0 ? (r[C[k]] || "").trim() : "";
    const rec: Record<string, string> = {
      hubspotId: g("hubspotId"), first: g("first"), last: g("last"), email: g("email").toLowerCase(), phone: g("phone"), jobtitle: g("jobtitle"), school: g("school"), district: g("district"), owner: g("owner"), notes: g("notes"), districtId: g("districtId"), state: g("state"),
      code: g("code"), regLink: g("regLink"), level: g("level"), grades: g("grades"), city: g("city"), region: g("region"), assigned: g("assigned"),
    };
    // PTA and Users: an organization name ("Woodbury PTO") goes in school; a name that's just the email is dropped
    if ((ds === "pta" || ds === "user") && !rec.first && !rec.last && g("full")) {
      const f = g("full");
      if (f.includes("@") || f.toLowerCase() === rec.email) { /* drop */ }
      else if (/\b(pta|pto|ptsa|ptc|ptg|ptso|association|council|school|office|board|parents?|foundation|booster)s?\b/i.test(f)) { if (!rec.school) rec.school = f; }
      else { const p = f.split(/\s+/); rec.first = p.shift()!; rec.last = p.join(" "); }
    }
    if (!rec.first && !rec.last && ds !== "pta" && ds !== "user" && ds !== "affiliate" && g("full")) { const p = g("full").split(/\s+/); rec.first = p.shift()!; rec.last = p.join(" "); }
    // Affiliates: "Pat & Sam" or a page name stays whole in first; "Dr. Pat N. Example" → Dr. + "Pat N." + "Example"
    if (ds === "affiliate") {
      rec.handle = g("handle").replace(/^@/, ""); rec.platform = g("platform"); rec.followers = parseFollowers(g("followers"));
      rec.profileUrl = g("profileUrl") || profileUrlOf(rec.handle, rec.platform);
      const f = g("full").replace(/^(dr\.?|doctor)\s+/i, () => { rec.title_salutation = "Dr."; return ""; });
      if (!rec.first && !rec.last && f) {
        const p = f.split(/\s+/);
        if (rec.title_salutation) { rec.last = p.pop()!; rec.first = p.join(" "); }
        else if (f.includes("&") || p.length > 2) rec.first = f;
        else { rec.first = p.shift()!; rec.last = p.join(" "); }
      }
    }
    if (/#VALUE!/.test(rec.first + rec.last)) { rec.first = ""; rec.last = ""; rec.notes = rec.notes || "⚠️ Name was #VALUE! in HubSpot. Fix the record there."; }
    if (!rec.email && !rec.first && !rec.last && !rec.handle) { skip++; continue; }
    const pool = DL();
    // Affiliates match on handle + platform: one person can run several accounts
    const exl = ds === "affiliate" ? (rec.handle ? pool.find(l => low(l.handle) === low(rec.handle) && low(l.platform) === low(rec.platform)) : undefined) : pool.find(l => (rec.hubspotId && l.hubspotId === rec.hubspotId) || (rec.email && l.email === rec.email))
      || (rec.first && pool.find(l => low(l.first) === low(rec.first) && low(l.last) === low(rec.last) && low(l.district) === low(rec.district)));
    if (camp) rec.campaign = exl ? [...new Set([...campsOf(exl), camp])].join(", ") : camp;
    if (exl) { const x = exl as unknown as Record<string, unknown>; for (const k of Object.keys(rec)) if (rec[k] && k !== "notes") x[k] = rec[k]; if (rec.notes && !exl.notes) exl.notes = rec.notes; upd++; }
    else {
      const l = { id: uid(), ...rec, ...(ds !== "principal" ? { type: ds } : {}), stage: "new", seq: 0, sent: [], path: "", activity: [], families: {}, createdAt: new Date().toISOString() } as Lead;
      setNext(l); S.leads.push(l); add++;
    }
  }
  save();
  const P = DL(), unowned = ds === "affiliate" ? 0 : P.filter(l => !l.owner).length, noEmail = P.filter(l => !l.email).length, noSchool = ds !== "principal" ? 0 : P.filter(l => !l.school).length;
  return `Added ${add}, updated ${upd}, skipped ${skip} empty rows.` + (unowned ? ` ${unowned} have no HubSpot owner.` : "") + (noEmail ? ` ${noEmail} have no email.` : "") +
    (noSchool ? ` ${noSchool} have no school name (only the district). Emails will say the district until you add it.` : "");
}

// `note` lets the HubSpot test batch hold back call notes; the default is the full export, unchanged.
export function toCsv(leads: Lead[] = DL(), note: (l: Lead) => string = l => l.call?.note || "") {
  const h = ["Record ID", "Email", "Phone Number", "First Name", "Last Name", "Job Title", "School", "District", "HubSpot Owner", "Stage", "Outreach Touches", "Shared With Families", "Who Sends", "Next Step", "Next Due", "Touches", "Last Touch", "Referral Code", "Sign-up Link", "Parent Signups", "Activated", "Counts As Of", "Call Outcome", "Call Date", "Caller", "Call Note", "Wants Fundraising Info", "Campaigns", "State", "District ID"];
  return [h, ...leads.map(l => [l.hubspotId, l.email, fmtPhone(l.phone), l.first, l.last, l.jobtitle, l.school, l.district, l.owner, STAGE[l.stage].name, l.seq || 0, l.shared ? "yes" : "", l.path === "we" ? "We send" : "School forwards", l.nextAction, l.nextDue, touches(l), lastTouch(l), l.code, l.regLink, l.families?.signups, l.families?.activated, l.families?.asOf, callDef(l.call?.status)?.name || "", l.call?.status && l.call.ts ? l.call.ts.slice(0, 10) : "", l.call?.by || "", note(l), l.call?.fundraising ? "yes" : "", l.campaign || "", l.state || "", l.districtId || ""])].map(r => r.map(csvCell).join(",")).join("\n");
}

// HubSpot test batch (N.'s rules, docs/database.md §4 phase 0): HubSpot matches on email, so only contacts
// with one, one row per email. Call notes that may hold student or family details are flagged for a person to check.
const FAMILY = /\b(students?|child(ren)?|kids?|sons?|daughters?|moms?|dads?|mothers?|fathers?|parents?|guardians?|famil(y|ies)|grand(sons?|daughters?|kids?|child(ren)?)|siblings?|brothers?|sisters?)\b|\S+@\S+\.\S+|\d{3}\D{0,2}\d{3}\D?\d{4}/i;
export const familyFlag = (t?: string) => !!t && FAMILY.test(t);
export function hubspotBatch(from: Lead[], n: number) {
  const rows: Lead[] = [], seen = new Set<string>(); let dup = 0;
  for (const l of from) {
    const e = (l.email || "").trim().toLowerCase();
    if (!e || rows.length >= n) continue;
    if (seen.has(e)) { dup++; continue; }
    seen.add(e); rows.push(l);
  }
  return { rows, dup, noEmail: from.filter(l => !(l.email || "").trim()).length };
}

export function aggCsv() {
  const districts = [...new Set(DL().map(l => l.district || "(none)"))].sort();
  const h = ["District", "Schools", ...STAGES.map(s => s.name), "Parent signups", "Activated"];
  const rows = districts.map(d => {
    const L = DL().filter(l => (l.district || "(none)") === d);
    const sum = (k: "signups" | "activated") => { const v = L.map(l => l.families?.[k]).filter(x => x !== undefined && x !== ""); return v.length ? v.reduce((a: number, b) => a + +b!, 0) : "not yet measurable"; };
    return [d, L.length, ...STAGES.map(s => L.filter(l => l.stage === s.id).length), sum("signups"), sum("activated")];
  });
  return [h, ...rows].map(r => r.map(csvCell).join(",")).join("\n");
}
export { digits };
