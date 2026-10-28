// Progress report: a 1–2 page, counts-only report for Torino (Mon · Wed · Fri). Covers every list. The period runs
// from the last exported report to now. Opens in a new tab → Print → Save as PDF. No names, emails or phone numbers.
// rptBody() is shared markup: the exported page (rptHtml) and the Analytics tab render the same HTML string.
import { S, save, ui, type Go } from "../store";
import { CALLS, CALL_IDS, MAIN, STAGES, callPending, stagesFor } from "./pipeline";
import { addBiz, dl, esc, fmtFollowers, iso, todayISO } from "./helpers";
import type { Lead, ReportSettings, StageId } from "./types";
import { isAff, isPr } from "./helpers";

export const LISTS: [string, string][] = [["principal", "Principals"], ["overseer", "Overseers"], ["cto", "CTOs"], ["campaign", "Campaigns"], ["pta", "PTA"], ["user", "App users"], ["affiliate", "Affiliates"]];
const CALL_ACTS = ["Call", "Call: reached", "Voicemail", "Front office message"];
const TALK_ACTS = ["Call: reached", "Reply received", "Meeting / demo", "Says they shared it"];
const AFF_TALK = ["Replied", "Agreed to partner"];
const RPT_C: Record<StageId, string> = { new: "#9aa3ad", contacted: "#5b8def", rejected: "#b42318", engaged: "#8b6cf0", live: "#e0a03a", active: "#1f9d5c", nurture: "#c9ced6", lost: "#7d858f" };

export function rptSet(): ReportSettings { return S.settings.report = S.settings.report || { focus: "", wins: "", blockers: "", next: "", log: [] }; }
export function rptDefaultFrom() {
  // Last report older than 2 h (so a same-day re-export keeps the same period); else Monday of this week
  const cut = Date.now() - 2 * 3600e3, last = (rptSet().log || []).filter(t => new Date(t).getTime() < cut).pop();
  if (last) return new Date(last);
  const d = new Date(); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); return d;
}

/** Open the report in a new tab (or download it if pop-ups are blocked), then record the export. */
export function exportReport(from: Date, open: boolean) {
  const r = rptSet(), to = new Date();
  const html = rptHtml({ from, to, ...r, n: (r.log || []).length + 1 }), file = `progress-report-${todayISO()}.html`;
  if (open) {
    const url = URL.createObjectURL(new Blob([html], { type: "text/html" }));
    if (!window.open(url, "_blank")) dl(file, html, "text/html"); setTimeout(() => URL.revokeObjectURL(url), 120000);
  } else dl(file, html, "text/html");
  r.log = [...(r.log || []), to.toISOString()].slice(-60); save();
}

// Report styles, shared by the exported page and the Analytics tab. p = selector prefix (".rpt " in the app).
// Colors come from the app's tokens, so the Analytics tab follows light/dark; the exported page sets them light.
export function rptCss(p: string) {
  const R = [
    ".rh{display:flex;justify-content:space-between;align-items:flex-end;gap:12px;flex-wrap:wrap;border-bottom:2px solid var(--accent);padding-bottom:6px}",
    "h1{font-size:1.7em;margin:0;font-weight:700}",
    ".meta{color:var(--muted);text-align:right;font-size:.95em}",
    "h2{font-size:1.05em;text-transform:uppercase;letter-spacing:.06em;color:var(--accent);border-bottom:1px solid var(--line);padding-bottom:2px;margin:1.2em 0 .6em}",
    "section{break-inside:avoid}",
    ".sum{background:var(--chip);border-left:3px solid var(--accent);padding:6px 10px;margin-top:10px;font-size:1.05em}",
    ".kp{display:grid;grid-template-columns:repeat(4,1fr);gap:6px}",
    ".k{border:1px solid var(--line);border-radius:6px;padding:5px 8px;background:var(--panel)}",
    ".k .l{font-size:.85em;color:var(--muted);text-transform:uppercase;letter-spacing:.03em}",
    ".k .v{font-size:1.8em;font-weight:700;line-height:1.2}",
    ".k .s{font-size:.85em;color:var(--muted)}",
    ".two{display:grid;grid-template-columns:1fr 1fr;gap:16px}",
    "table{width:100%;border-collapse:collapse;font-size:.95em;background:none}",
    "th,td{padding:.25em .5em;border-bottom:1px solid var(--line);text-align:left;vertical-align:top}",
    "th{color:var(--muted);font-weight:600;font-size:.85em;text-transform:uppercase;position:static;background:none}",
    ".n{text-align:right;white-space:nowrap}",
    "tr.tot td{font-weight:700;border-top:1px solid var(--muted)}",
    ".dot{display:inline-block;width:8px;height:8px;border-radius:50%;margin-right:5px;vertical-align:middle}",
    ".stack{display:flex;height:12px;border-radius:3px;overflow:hidden;background:var(--chip);margin:2px 0 6px;min-width:0}",
    ".stack span{display:block;height:100%}",
    ".leg{display:flex;flex-wrap:wrap;gap:4px 10px;font-size:.85em;color:var(--muted);margin-bottom:4px}",
    ".br{display:grid;grid-template-columns:6.5em 1fr 3.4em;gap:6px;align-items:center;font-size:.9em;margin:1.5px 0}",
    ".br .t{display:flex;height:9px;background:var(--chip);border-radius:2px;overflow:hidden}",
    ".br .t span{display:block;height:100%}",
    ".m{color:var(--muted)}",
    ".star{color:var(--warn);font-weight:700}",
    ".bad{color:var(--bad)}",
    ".nt{margin:0 0 6px}",
    ".nt b{display:block;font-size:.85em;text-transform:uppercase;color:var(--muted);letter-spacing:.04em}",
    "footer{margin-top:12px;padding-top:5px;border-top:1px solid var(--line);color:var(--muted);font-size:.85em}"];
  return R.map(r => p + r).join("\n") + `\n@media (max-width:640px){${p}.kp{grid-template-columns:1fr 1fr}${p}.two{grid-template-columns:1fr}}`;
}

// links: the Analytics tab passes an array; each clickable number or row gets data-go="<index>" into it.
// The exported report passes none, so it has no links.
export interface RptOpts extends Partial<ReportSettings> { from: Date; to: Date; n?: number; live?: boolean; links?: Go[] }

export function rptHtml(o: RptOpts) {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Missouri outreach progress report ${todayISO()}</title>
<style>
@page{size:letter;margin:.5in}
:root{--ink:#1c2a38;--muted:#5a6b7d;--line:#d9e1ea;--accent:#3076ce;--chip:#eef4fc;--panel:#fff;--warn:#a15c00;--bad:#b42318}
*{box-sizing:border-box;-webkit-print-color-adjust:exact;print-color-adjust:exact}
body{margin:0;background:#eef0f3;color:var(--ink);font:10px/1.42 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif}
.tb{position:sticky;top:0;display:flex;gap:8px;align-items:center;padding:10px 16px;background:#0b1e3a;color:#fff;font-size:13px;border-bottom:3px solid #3d8fe8}
.tb button{font:inherit;padding:6px 12px;border-radius:6px;border:0;background:#3d8fe8;color:#fff;font-weight:600;cursor:pointer}
.pg{max-width:7.5in;margin:16px auto;background:#fff;padding:.45in;box-shadow:0 2px 10px rgba(0,0,0,.08)}
@media print{body{background:#fff}.tb{display:none}.pg{margin:0;padding:0;box-shadow:none;max-width:none}}
@media (max-width:640px){.pg{padding:16px}}
${rptCss("")}
</style></head><body>
<div class="tb"><button id="pr">Print / Save as PDF</button><span>Letter size. In the print dialog choose "Save as PDF".</span></div>
<div class="pg">${rptBody(o)}</div>
<script>document.getElementById("pr").onclick=function(){window.print();};<\/script>
</body></html>`;
}

export function rptBody(o: RptOpts) {
  const { from, to } = o, t0 = todayISO();
  const span = (a: Date, b: Date) => (ts?: string) => { if (!ts) return false; const t = new Date(ts); return t >= a && t <= b; };
  const inP = span(from, to), ever = span(new Date(0), to);
  const of = (l: Lead, types: string[]) => (l.activity || []).filter(a => types.includes(a.type));
  const first = (arr: { ts: string }[]) => arr.map(a => a.ts).sort()[0];
  const affStages = stagesFor("affiliate");
  const stageTo = (a: { note: string }, aff = false) => { const x = /→ ([^:]+)/.exec(a.note || ""); const s = x && (aff ? affStages : STAGES).find(s => s.name === x[1].trim()); return s ? s.id : null; };
  // Per-list activity in a time window
  const per = (L: Lead[], win: (ts?: string) => boolean) => {
    const r = { n: L.length, emails: 0, emailed: 0, newEmailed: 0, calls: 0, called: 0, newCalled: 0, talks: 0, bounced: 0, added: 0, dms: 0, dmed: 0, newDmed: 0, posts: 0, enter: {} as Record<string, number> };
    // Who is behind each count (for the Analytics links)
    const who = { emailed: [] as string[], newEmailed: [] as string[], called: [] as string[], talked: [] as string[], dmed: [] as string[], newDmed: [] as string[], posted: [] as string[], added: [] as string[], enter: {} as Record<string, string[]> };
    L.forEach(l => {
      const em = of(l, ["Email sent"]), cl = of(l, CALL_ACTS), emP = em.filter(a => win(a.ts)), clP = cl.filter(a => win(a.ts));
      const dm = of(l, ["DM sent"]), dmP = dm.filter(a => win(a.ts));
      r.dms += dmP.length; if (dmP.length) { r.dmed++; who.dmed.push(l.id); if (win(first(dm))) { r.newDmed++; who.newDmed.push(l.id); } }
      const po = of(l, ["Posted / shared link"]).filter(a => win(a.ts)).length; r.posts += po; if (po) who.posted.push(l.id);
      r.emails += emP.length; if (emP.length) { r.emailed++; who.emailed.push(l.id); if (win(first(em))) { r.newEmailed++; who.newEmailed.push(l.id); } }
      r.calls += clP.length; if (clP.length) { r.called++; who.called.push(l.id); if (win(first(cl))) r.newCalled++; }
      let talked = false;
      (l.activity || []).filter(a => win(a.ts)).forEach(a => {
        if (TALK_ACTS.includes(a.type) || AFF_TALK.includes(a.type) || (a.type === "Call" && !String(a.note).startsWith(CALLS.unreach.name))) { r.talks++; talked = true; }
        if (a.type === "Email rejected") r.bounced++;
        if (a.type === "Stage") { const s = stageTo(a, isAff(l)); if (s) { r.enter[s] = (r.enter[s] || 0) + 1; (who.enter[s] = who.enter[s] || []).push(l.id); } }
      });
      if (talked) who.talked.push(l.id);
      if (win(l.createdAt)) { r.added++; who.added.push(l.id); }
    });
    return { ...r, who };
  };
  type Per = ReturnType<typeof per>;
  type NumKey = { [K in keyof Per]: Per[K] extends number ? K : never }[keyof Per];
  // Links (Analytics tab only): ln(go) returns the attributes that make an element open those records
  const ln = (g: Go) => o.links ? ` data-go="${o.links.push(g) - 1}" tabindex="0" role="link"` : "";
  const ids = (L: Lead[]) => L.map(l => l.id), uniq = (a: string[]) => [...new Set(a)];
  const prd = (t: string) => `${t} since ${fromLbl}`;
  const lists = LISTS.map(([id, label]) => { const L = S.leads.filter(l => (l.type || "principal") === id); return { id, label, L, p: per(L, inP) }; }).filter(x => x.L.length);
  const sum = (k: NumKey) => lists.reduce((a, x) => a + x.p[k], 0), ent = (s: string) => lists.reduce((a, x) => a + (x.p.enter[s] || 0), 0);
  const toDate = per(S.leads, ever);
  const pct = (a: number, b: number) => b ? Math.round(a / b * 100) + "%" : "not yet measurable";
  const N = (v: number) => Number(v).toLocaleString();

  // Principals: pipeline snapshot and onboarding
  const P = S.leads.filter(isPr), pp = per(P, inP);
  const cnt = (s: string) => P.filter(l => l.stage === s).length, reach = (s: StageId) => P.filter(l => MAIN.indexOf(l.stage) >= MAIN.indexOf(s)).length;
  const contacted = P.filter(l => l.stage !== "new").length;
  const eng = P.filter(l => l.stage === "engaged"), obTotal = eng.length + cnt("live") + cnt("active");
  const fam = (k: "signups" | "activated") => { const v = P.map(l => l.families?.[k]).filter(x => x !== undefined && x !== null && x !== ""); return v.length ? { sum: v.reduce((a: number, b) => a + +b!, 0), n: v.length } : null; };
  const sg = fam("signups"), ac = fam("activated");
  const pending = P.filter(l => l.stage !== "lost" && callPending(l)).length;

  // Districts in focus: the ones named in "focus", then the most-touched this period
  const focus = String(o.focus || "").toLowerCase().split(/[,;]/).map(s => s.trim()).filter(Boolean);
  const dRows = [...new Set(P.map(l => l.district || "(none)"))].map(d => {
    const L = P.filter(l => (l.district || "(none)") === d), r = per(L, inP);
    return {
      d, n: L.length, emails: r.emails, calls: r.calls, touch: r.emails + r.calls, cont: L.filter(l => l.stage !== "new").length,
      eng: L.filter(l => MAIN.indexOf(l.stage) >= 2).length, su: L.reduce((a, l) => a + (+(l.families?.signups ?? 0) || 0), 0), f: focus.some(f => d.toLowerCase().includes(f)),
    };
  });
  const topD = dRows.filter(x => x.f || x.touch).sort((a, b) => (+b.f - +a.f) || (b.touch - a.touch) || (b.eng - a.eng)).slice(0, 8);
  const regs = [...new Set(P.map(l => l.region).filter(Boolean) as string[])].sort((a, b) => String(a).localeCompare(String(b), undefined, { numeric: true }));
  const rRows = regs.map(g => {
    const L = P.filter(l => l.region === g), r = per(L, inP);
    return { g, n: L.length, cont: L.filter(l => l.stage !== "new").length, eng: L.filter(l => MAIN.indexOf(l.stage) >= 2).length, touch: r.emails + r.calls, f: focus.some(f => ("region " + g).toLowerCase() === f || String(g).toLowerCase() === f) };
  });

  // Calls by outcome (this period vs where every contact stands now)
  const callP = (k: keyof typeof CALLS) => S.leads.reduce((a, l) => a + of(l, ["Call"]).filter(x => inP(x.ts) && String(x.note).startsWith(CALLS[k].name)).length, 0);
  const callNow = (k: string) => S.leads.filter(l => l.call?.status === k).length;

  // Last 10 workdays: emails and calls per day (local dates)
  const days: string[] = []; { const d = new Date(); while (days.length < 10) { const w = d.getDay(); if (w && w < 6) days.unshift(iso(d)); d.setDate(d.getDate() - 1); } }
  const per10: Record<string, { e: number; c: number; m: number }> = Object.fromEntries(days.map(d => [d, { e: 0, c: 0, m: 0 }]));
  S.leads.forEach(l => (l.activity || []).forEach(a => { const d = iso(new Date(a.ts)); if (!per10[d]) return; if (a.type === "Email sent") per10[d].e++; else if (CALL_ACTS.includes(a.type)) per10[d].c++; else if (a.type === "DM sent") per10[d].m++; }));
  const mx = Math.max(1, ...days.map(d => per10[d].e + per10[d].c + per10[d].m)), anyDm = days.some(d => per10[d].m);

  // Coming up before the next report (next 3 workdays) and overdue
  const end = addBiz(3), open = S.leads.filter(l => l.nextDue && l.stage !== "lost");
  const over = open.filter(l => l.nextDue! < t0).length, soonL = open.filter(l => l.nextDue! >= t0 && l.nextDue! <= end);
  const soon = Object.entries(soonL.reduce((a: Record<string, number>, l) => { const k = l.nextAction || "(no next step)"; a[k] = (a[k] || 0) + 1; return a; }, {})).sort((a, b) => b[1] - a[1]).slice(0, 8);

  // Data health (principals still in play)
  const Pin = P.filter(l => l.stage !== "lost");
  const hl = (k: string, L: Lead[]): [string, number, Lead[]] => [k, L.length, L];
  const health = [hl("No email", Pin.filter(l => !l.email)), hl("No phone", Pin.filter(l => !l.phone)), hl("No sign-up link", Pin.filter(l => !l.regLink)), hl("No school name (district only)", Pin.filter(l => !l.school)), hl("Bounced / rejected email", P.filter(l => l.stage === "rejected"))];

  const fmtD = (d: Date) => d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
  const fmtDT = (d: Date) => d.toLocaleString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit", timeZone: "America/New_York" }) + " ET";
  const wd = (() => { let n = 0; const d = new Date(from), e = new Date(to); d.setHours(12, 0, 0, 0); e.setHours(12, 0, 0, 0); while (d <= e) { const w = d.getDay(); if (w && w < 6) n++; d.setDate(d.getDate() + 1); } return n; })();
  const fromLbl = fmtD(from) + (from.getHours() || from.getMinutes() ? " " + from.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }) : "");
  const kpi = (l: string, v: string, s: string, g?: Go | null) => `<div class="k"${g ? ln(g) : ""}><div class="l">${l}</div><div class="v">${v}</div><div class="s">${s}</div></div>`;
  const all = (k: "emailed" | "newEmailed" | "called" | "talked") => uniq(lists.flatMap(x => x.p.who[k]));
  const entered = (...st: string[]) => uniq(lists.flatMap(x => st.flatMap(s => x.p.who.enter[s] || [])));
  const pick = (view: Go["view"], label: string, L: string[]): Go | null => L.length ? { view, label, ids: L } : null;
  const nl = (s: string) => esc(s).replace(/\n/g, "<br>");
  const sumLine = `Since ${fromLbl}: ${N(sum("emails"))} emails to ${N(sum("emailed"))} contacts (${N(sum("newEmailed"))} first touches), ${N(sum("calls"))} calls logged to ${N(sum("called"))} contacts (${N(sum("newCalled"))} called for the first time), ${N(sum("talks"))} conversations.${sum("dms") ? ` ${N(sum("dms"))} DM${sum("dms") === 1 ? "" : "s"} to ${N(sum("dmed"))} affiliate${sum("dmed") === 1 ? "" : "s"}.` : ""} ${N(ent("engaged"))} moved to Engaged, ${N(ent("live") + ent("active"))} to Live or Active. ${N(obTotal)} schools are in onboarding now. Family sign-ups: ${sg ? N(sg.sum) + " from " + sg.n + " schools reporting" : "not yet measurable"}.`;
  // Affiliates (social media): DMs, replies, posts and sign-ups on their own links. Shown only when the list has records.
  const A = S.leads.filter(isAff), ap = per(A, inP), apAll = per(A, ever);
  const acnt = (s: string) => A.filter(l => l.stage === s).length, areach = (s: StageId) => A.filter(l => MAIN.indexOf(l.stage) >= MAIN.indexOf(s)).length;
  const aContacted = A.filter(l => l.stage !== "new").length, aSharing = acnt("live") + acnt("active");
  const asu = (L: Lead[]) => { const v = L.map(l => l.families?.signups).filter(x => x !== undefined && x !== null && x !== ""); return v.length ? v.reduce((a: number, b) => a + +b!, 0) : null; };
  const aSg = asu(A), aSgN = A.filter(l => l.families?.signups !== undefined && l.families.signups !== "").length;
  const plats = [...new Set(A.map(l => l.platform || "(not set)"))].sort().map(pl => {
    const L = A.filter(l => (l.platform || "(not set)") === pl);
    return { pl, n: L.length, fol: L.reduce((a, l) => a + (+(l.followers || 0) || 0), 0), dmed: L.filter(l => l.stage !== "new").length,
      conv: L.filter(l => MAIN.indexOf(l.stage) >= 2).length, sharing: L.filter(l => ["live", "active"].includes(l.stage)).length, su: asu(L) };
  });
  // Accounts that are sharing or have results, best first (public account handles, no personal details)
  const topA = A.filter(l => ["live", "active"].includes(l.stage) || +(l.families?.signups || 0) > 0)
    .sort((a, b) => (+(b.families?.signups || 0) - +(a.families?.signups || 0)) || (+(b.followers || 0) - +(a.followers || 0))).slice(0, 10);
  const affSection = A.length ? `<section><h2>Affiliates (social media)</h2><div class="kp">
 ${kpi("DMs sent", N(ap.dms), `to ${N(ap.dmed)} accounts · ${N(apAll.dms)} to date`, pick("leads", prd("Affiliates DM'd"), ap.who.dmed))}
 ${kpi("New accounts DM'd", N(ap.newDmed), `first DM · ${N(aContacted)} of ${N(A.length)} reached to date`, pick("leads", prd("Affiliates DM'd for the first time"), ap.who.newDmed))}
 ${kpi("Replies / conversations", N(ap.talks), `${N(ap.enter.engaged || 0)} moved to In conversation · reply rate ${pct(areach("engaged") + A.filter(l => l.stage === "lost" && of(l, AFF_TALK).length).length, aContacted)}`, pick("leads", prd("Affiliate replies / conversations"), ap.who.talked))}
 ${kpi("Sharing our link", N(aSharing), `${N(ap.posts)} post${ap.posts === 1 ? "" : "s"} logged this period`, pick("leads", "Affiliates sharing our link", ids(A.filter(l => ["live", "active"].includes(l.stage)))))}
 ${kpi("Sign-ups from affiliate links", aSg !== null ? N(aSg) : "—", aSg !== null ? `from ${aSgN} account${aSgN === 1 ? "" : "s"} reporting` : "not yet measurable", pick("leads", "Affiliates reporting sign-ups", ids(A.filter(l => l.families?.signups !== undefined && l.families.signups !== ""))))}
 ${kpi("Link clicks", "—", "not yet measurable (click tracking not connected)")}
 ${kpi("Driving sign-ups", N(acnt("active")), `${esc(S.settings.activeTarget)}+ sign-ups from their link`, acnt("active") ? { view: "leads", label: "Affiliates · driving sign-ups", ds: "affiliate", stage: "active" } : null)}
 ${kpi("Audience reached", N(A.filter(l => MAIN.indexOf(l.stage) >= 3).reduce((a, l) => a + (+(l.followers || 0) || 0), 0)), "followers of accounts sharing our link", pick("leads", "Affiliates sharing our link", ids(A.filter(l => MAIN.indexOf(l.stage) >= 3))))}
</div>
<div class="two" style="margin-top:8px"><div>
 <div class="stack">${affStages.map(s => { const c = acnt(s.id); return c ? `<span style="width:${c / A.length * 100}%;background:${RPT_C[s.id]}"></span>` : ""; }).join("")}</div>
 <table><thead><tr><th>Stage</th><th class="n">Accounts</th><th class="n">Entered this period</th></tr></thead><tbody>
 ${affStages.map(s => `<tr${acnt(s.id) ? ln({ view: "leads", label: `Affiliates · ${s.name}`, ds: "affiliate", stage: s.id }) : ""}><td><span class="dot" style="background:${RPT_C[s.id]}"></span>${esc(s.name)}</td><td class="n">${N(acnt(s.id))}</td><td class="n">${s.id === "new" ? (ap.added ? "+" + N(ap.added) + " added" : "") : ap.enter[s.id] ? "+" + N(ap.enter[s.id]) : ""}</td></tr>`).join("")}
 <tr class="tot"><td>Total</td><td class="n">${N(A.length)}</td><td class="n"></td></tr></tbody></table>
</div><div>
 <table><thead><tr><th>Platform</th><th class="n">Accounts</th><th class="n">Followers</th><th class="n">DM'd</th><th class="n">Talking+</th><th class="n">Sharing</th><th class="n">Sign-ups</th></tr></thead><tbody>
 ${plats.map(x => `<tr${ln({ view: "leads", label: "Affiliates on " + x.pl, ids: ids(A.filter(l => (l.platform || "(not set)") === x.pl)) })}><td>${esc(x.pl)}</td><td class="n">${N(x.n)}</td><td class="n">${esc(fmtFollowers(String(x.fol)))}</td><td class="n">${N(x.dmed)}</td><td class="n">${N(x.conv)}</td><td class="n">${N(x.sharing)}</td><td class="n">${x.su !== null ? N(x.su) : "—"}</td></tr>`).join("")}</tbody></table>
 ${topA.length ? `<table style="margin-top:6px"><thead><tr><th>Top affiliates</th><th class="n">Followers</th><th class="n">Posts</th><th class="n">Clicks</th><th class="n">Sign-ups</th></tr></thead><tbody>
 ${topA.map(l => `<tr${ln({ view: "leads", label: "@" + (l.handle || ""), ids: [l.id] })}><td>@${esc(l.handle || "")} <span class="m">${esc(l.platform || "")}</span></td><td class="n">${esc(fmtFollowers(l.followers))}</td><td class="n">${N(of(l, ["Posted / shared link"]).length)}</td><td class="n m">—</td><td class="n">${l.families?.signups ? N(+l.families.signups) : "—"}</td></tr>`).join("")}</tbody></table>` : `<p class="m" style="margin:6px 0 0">No affiliate is sharing our link yet.</p>`}
</div></div>
 <p class="m" style="margin:4px 0 0">Talking+ = In conversation or further. Clicks show "—" until click tracking is connected; sign-ups are entered per affiliate in the Lead Manager.</p>
</section>` : "";

  const notes = ([["Highlights", o.wins], ["Blockers / help needed", o.blockers], ["Next focus", o.next]] as [string, string | undefined][]).filter(x => x[1]);

  return `<div class="rh"><div><h1>Missouri Outreach · ${o.live ? "Analytics" : "Progress Report"}</h1><div class="m">CyberSafely.ai · Onboarding &amp; Activation · ${o.live ? "Live view, updates as you work" : "Lead Manager report #" + o.n}</div></div>
 <div class="meta"><b>Period:</b> ${esc(fromLbl)} → ${esc(fmtD(to))} (${wd} workday${wd === 1 ? "" : "s"})<br>${o.live ? "As of" : "Prepared by " + esc(S.settings.sender) + " ·"} ${esc(fmtDT(to))}</div></div>
<div class="sum">${esc(sumLine)}</div>

<section><h2>This period</h2><div class="kp">
 ${kpi("Emails sent", N(sum("emails")), `to ${N(sum("emailed"))} contacts · ${N(toDate.emails)} to date`, pick("leads", prd("Emailed"), all("emailed")))}
 ${kpi("New contacts emailed", N(sum("newEmailed")), `first touch · ${N(toDate.emailed)} reached to date`, pick("leads", prd("First emailed"), all("newEmailed")))}
 ${kpi("Calls logged", N(sum("calls")), `${N(sum("called"))} contacts · ${N(sum("newCalled"))} first calls`, pick("calls", `${N(sum("calls"))} calls logged since ${fromLbl}`, all("called")))}
 ${kpi("Conversations", N(sum("talks")), "calls reached, replies, meetings, shared", pick("leads", prd("Conversations"), all("talked")))}
 ${kpi("Moved to Engaged", N(ent("engaged")), `${N(reach("engaged"))} schools Engaged or further now`, pick("leads", prd("Moved to Engaged"), entered("engaged")))}
 ${kpi("Moved to Live / Active", N(ent("live") + ent("active")), `${N(reach("live"))} schools with sign-ups now`, pick("leads", prd("Moved to Live / Active"), entered("live", "active")))}
 ${kpi("Schools in onboarding", N(obTotal), "Engaged + Live + Active, right now", pick("leads", "Schools in onboarding (Engaged, Live, Active)", ids(P.filter(l => ["engaged", "live", "active"].includes(l.stage)))))}
 ${kpi("Family sign-ups", sg ? N(sg.sum) : "—", sg ? `from ${sg.n} schools reporting${ac ? " · " + N(ac.sum) + " activated" : ""}` : "not yet measurable", pick("leads", "Schools reporting family sign-ups", ids(P.filter(l => l.families?.signups !== undefined && l.families?.signups !== null && l.families?.signups !== ""))))}
</div></section>

<div class="two">
<section><h2>School pipeline (principals, now)</h2>
 <div class="stack">${STAGES.map(s => { const c = cnt(s.id); return c ? `<span style="width:${c / P.length * 100}%;background:${RPT_C[s.id]}"></span>` : ""; }).join("")}</div>
 <table><thead><tr><th>Stage</th><th class="n">Schools</th><th class="n">Share</th><th class="n">Entered this period</th></tr></thead><tbody>
 ${STAGES.map(s => `<tr${cnt(s.id) ? ln({ view: "leads", label: `Principals · ${s.name}`, ds: "principal", stage: s.id }) : ""}><td><span class="dot" style="background:${RPT_C[s.id]}"></span>${esc(s.name)}</td><td class="n">${N(cnt(s.id))}</td><td class="n">${P.length ? Math.round(cnt(s.id) / P.length * 100) + "%" : "—"}</td><td class="n">${s.id === "new" ? (pp.added ? "+" + N(pp.added) + " added" : "") : pp.enter[s.id] ? "+" + N(pp.enter[s.id]) : ""}</td></tr>`).join("")}
 <tr class="tot"><td>Total</td><td class="n">${N(P.length)}</td><td class="n"></td><td class="n"></td></tr></tbody></table>
 <p class="m" style="margin:5px 0 0">Contacted ${N(contacted)} of ${N(P.length)} (${pct(contacted, P.length)}). Engaged or further: ${pct(reach("engaged"), contacted)} of contacted. Live: ${pct(reach("live"), contacted)} of contacted.</p>
</section>
<section><h2>Onboarding (schools past first contact)</h2>
 <table><thead><tr><th>Where they are</th><th class="n">Schools</th></tr></thead><tbody>
 <tr${ln({ view: "leads", label: "Engaged · waiting for the principal to forward", ids: ids(eng.filter(l => !l.shared && l.path !== "we")) })}><td>Engaged · waiting for the principal to forward</td><td class="n">${N(eng.filter(l => !l.shared && l.path !== "we").length)}</td></tr>
 <tr${ln({ view: "leads", label: "Engaged · shared with families, waiting for sign-ups", ids: ids(eng.filter(l => l.shared && l.path !== "we")) })}><td>Engaged · shared with families, waiting for sign-ups</td><td class="n">${N(eng.filter(l => l.shared && l.path !== "we").length)}</td></tr>
 <tr${ln({ view: "leads", label: "Engaged · we send the family message", ids: ids(eng.filter(l => l.path === "we")) })}><td>Engaged · we send the family message</td><td class="n">${N(eng.filter(l => l.path === "we").length)}</td></tr>
 <tr${ln({ view: "leads", label: "Principals · Live", ds: "principal", stage: "live" })}><td>Live · first family sign-ups</td><td class="n">${N(cnt("live"))}</td></tr>
 <tr${ln({ view: "leads", label: "Principals · Active", ds: "principal", stage: "active" })}><td>Active · ${esc(S.settings.activeTarget)}+ sign-ups (target to be agreed)</td><td class="n">${N(cnt("active"))}</td></tr>
 <tr class="tot"${ln({ view: "leads", label: "Schools in onboarding (Engaged, Live, Active)", ids: ids(P.filter(l => ["engaged", "live", "active"].includes(l.stage))) })}><td>In onboarding</td><td class="n">${N(obTotal)}</td></tr></tbody></table>
 <table style="margin-top:6px"><tbody>
 <tr><td>Parent sign-ups (school codes)</td><td class="n">${sg ? N(sg.sum) : "not yet measurable"}</td></tr>
 <tr><td>Activated (setup verified)</td><td class="n">${ac ? N(ac.sum) + (sg ? " · " + pct(ac.sum, sg.sum) + " of sign-ups" : "") : "not yet measurable"}</td></tr>
 <tr${ln({ view: "calls", label: "Call follow-up emails still to send", ids: ids(P.filter(l => l.stage !== "lost" && callPending(l))) })}><td>Call follow-up emails still to send</td><td class="n">${N(pending)}</td></tr>
 <tr${ln({ view: "leads", label: "Nurture and Declined", ids: ids(P.filter(l => l.stage === "nurture" || l.stage === "lost")) })}><td>Nurture (no reply after 3 touches) · Declined</td><td class="n">${N(cnt("nurture"))} · ${N(cnt("lost"))}</td></tr></tbody></table>
</section></div>

<section><h2>Districts in focus</h2>
 ${focus.length ? `<p class="m" style="margin:0 0 4px"><span class="star">★</span> Focus this period: ${esc(o.focus)}</p>` : ""}
 ${topD.length ? `<table><thead><tr><th>District</th><th class="n">Schools</th><th class="n">Emails</th><th class="n">Calls</th><th class="n">Contacted</th><th class="n">Engaged+</th><th class="n">Sign-ups</th></tr></thead><tbody>
 ${topD.map(x => `<tr${x.d !== "(none)" ? ln({ view: "map", label: x.d, ds: "principal", district: x.d }) : ""}><td>${x.f ? '<span class="star">★</span> ' : ""}${esc(x.d)}</td><td class="n">${N(x.n)}</td><td class="n">${N(x.emails)}</td><td class="n">${N(x.calls)}</td><td class="n">${N(x.cont)}</td><td class="n">${N(x.eng)}</td><td class="n">${x.su ? N(x.su) : "—"}</td></tr>`).join("")}</tbody></table>` : `<p class="m">No district activity in this period.</p>`}
 <p class="m" style="margin:4px 0 0">Emails and calls are this period; the other columns are now. Coverage: ${N(dRows.filter(x => x.touch).length)} districts worked this period · ${N(dRows.filter(x => x.cont).length)} of ${N(dRows.length)} districts contacted to date.</p>
 ${rRows.length ? `<table style="margin-top:6px"><thead><tr><th>Region</th><th class="n">Schools</th><th class="n">Contacted</th><th class="n">Engaged+</th><th class="n">Touches this period</th></tr></thead><tbody>
 ${rRows.map(x => `<tr${ln({ view: "leads", label: "Region " + x.g, ds: "principal", stage: "", region: x.g })}><td>${x.f ? '<span class="star">★</span> ' : ""}Region ${esc(x.g)}</td><td class="n">${N(x.n)}</td><td class="n">${N(x.cont)}</td><td class="n">${N(x.eng)}</td><td class="n">${N(x.touch)}</td></tr>`).join("")}</tbody></table>` : ""}
</section>

${affSection}
<div class="two">
<section><h2>Call outcomes</h2>
 <table><thead><tr><th>Outcome</th><th class="n">This period</th><th class="n">Now</th></tr></thead><tbody>
 ${CALL_IDS.map(k => `<tr${callNow(k) || callP(k) ? ln({ view: "calls", label: "Calls · " + CALLS[k].name, ids: ids(S.leads.filter(l => l.call?.status === k || of(l, ["Call"]).some(x => inP(x.ts) && String(x.note).startsWith(CALLS[k].name)))), call: "" }) : ""}><td>${esc(CALLS[k].name)}</td><td class="n">${N(callP(k))}</td><td class="n">${N(callNow(k))}</td></tr>`).join("")}
 <tr${ln({ view: "calls", label: "Want fundraising info", ids: ids(S.leads.filter(l => l.call?.fundraising)) })}><td>Want fundraising info</td><td class="n"></td><td class="n">${N(S.leads.filter(l => l.call?.fundraising).length)}</td></tr></tbody></table>
</section>
<section><h2>Coming up (next 3 workdays)</h2>
 ${soon.length ? `<table><thead><tr><th>Next step</th><th class="n">Contacts</th></tr></thead><tbody>${soon.map(([k, v]) => `<tr${ln({ view: "leads", label: "Next 3 workdays · " + k, ids: ids(soonL.filter(l => (l.nextAction || "(no next step)") === k)) })}><td>${esc(k)}</td><td class="n">${N(v)}</td></tr>`).join("")}</tbody></table>` : `<p class="m">Nothing scheduled.</p>`}
 <p class="m" style="margin:4px 0 0">${over ? `<b class="bad"${ln({ view: "leads", label: "Overdue", ids: ids(open.filter(l => l.nextDue! < t0).sort((a, b) => a.nextDue!.localeCompare(b.nextDue!))) })}>${N(over)} overdue</b> today.` : "Nothing overdue."}</p>
</section></div>

<div class="two">
<section><h2>Activity, last 10 workdays</h2>
 <div class="leg"><span><span class="dot" style="background:#2457d6"></span>Emails</span><span><span class="dot" style="background:#8b6cf0"></span>Calls</span>${anyDm ? '<span><span class="dot" style="background:#e0a03a"></span>DMs</span>' : ""}</div>
 ${days.map(d => { const v = per10[d]; return `<div class="br"${v.e + v.c + v.m ? ln({ view: "leads", label: "Worked on " + fmtD(new Date(d + "T12:00")), ids: ids(S.leads.filter(l => (l.activity || []).some(a => iso(new Date(a.ts)) === d && (a.type === "Email sent" || a.type === "DM sent" || CALL_ACTS.includes(a.type))))) }) : ""}><span>${esc(fmtD(new Date(d + "T12:00")))}</span><div class="t"><span style="width:${v.e / mx * 100}%;background:#2457d6"></span><span style="width:${v.c / mx * 100}%;background:#8b6cf0"></span>${v.m ? `<span style="width:${v.m / mx * 100}%;background:#e0a03a"></span>` : ""}</div><span class="n">${v.e + v.c + v.m}</span></div>`; }).join("")}
</section>
<section><h2>System overview (all lists)</h2>
 <table><thead><tr><th>List</th><th class="n">Records</th><th class="n">Cold</th><th class="n">In outreach</th><th class="n">Engaged+</th><th class="n">Closed</th><th class="n">Emails*</th><th class="n">Calls*</th></tr></thead><tbody>
 ${lists.map(x => { const c = (s: string[]) => x.L.filter(l => s.includes(l.stage)).length; return `<tr${ln({ view: "leads", label: x.label, ds: x.id as Go["ds"], stage: "" })}><td>${esc(x.label)}</td><td class="n">${N(x.L.length)}</td><td class="n">${N(c(["new"]))}</td><td class="n">${N(c(["contacted", "rejected"]))}</td><td class="n">${N(c(["engaged", "live", "active"]))}</td><td class="n">${N(c(["nurture", "lost"]))}</td><td class="n">${N(x.p.emails)}</td><td class="n">${N(x.p.calls)}</td></tr>`; }).join("")}
 <tr class="tot"><td>Total</td><td class="n">${N(S.leads.length)}</td><td colspan="4"></td><td class="n">${N(sum("emails"))}</td><td class="n">${N(sum("calls"))}</td></tr></tbody></table>
 <p class="m" style="margin:2px 0 6px">* this period</p>
 <table><thead><tr><th>Data health (principals in play)</th><th class="n">Schools</th></tr></thead><tbody>${health.map(([k, v, L]) => `<tr${v ? ln({ view: "leads", label: k, ids: ids(L) }) : ""}><td>${k}</td><td class="n">${N(v)}</td></tr>`).join("")}</tbody></table>
</section></div>

${notes.length ? `<section><h2>Notes</h2>${notes.map(([k, v]) => `<p class="nt"><b>${k}</b>${nl(v!)}</p>`).join("")}</section>` : ""}

<footer>Counts only: no names, emails or phone numbers${topA.length ? " (affiliates are listed by their public account handle)" : ""}. Source: CyberSafely Lead Manager (browser data on the sender's computer); HubSpot remains the system of record. "Not yet measurable" means no data has been entered yet, not zero. A call that is also logged as a voicemail counts twice under "calls logged".</footer>`;
}

/* ---------- Analytics period ---------- */
export function anaRange() {
  const d0 = new Date(); d0.setHours(0, 0, 0, 0);
  const p = ui.anaP;
  if (p === "today") return d0;
  if (p === "report") return rptDefaultFrom();
  if (p === "week") { d0.setDate(d0.getDate() - ((d0.getDay() + 6) % 7)); return d0; }
  if (p === "7") return new Date(d0.getTime() - 6 * 864e5);
  if (p === "30") return new Date(d0.getTime() - 29 * 864e5);
  if (p === "all") return new Date(S.leads.flatMap(l => [l.createdAt, ...(l.activity || []).map(a => a.ts)]).filter(Boolean).reduce((a, t) => Math.min(a, new Date(t!).getTime()), d0.getTime()));
  return ui.anaFrom ? new Date(ui.anaFrom) : d0;
}
