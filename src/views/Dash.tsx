// Dashboard: progress-report export, school and family funnels, calls, by-district rollup, touches per day.
import { useRef } from "react";
import { DL, S, save } from "../store";
import { CALLS, CALL_IDS, MAIN, STAGE, STAGES, callDef } from "../lib/pipeline";
import { dtLocal, fmtDate, iso, todayISO } from "../lib/helpers";
import { exportReport, rptDefaultFrom, rptSet } from "../lib/report";
import { Dot, FlashButton, Inp, Strip, Ta, copy, cv } from "../components/ui";
import type { ReportSettings, StageId } from "../lib/types";

export function ReportCard() {
  const r = rptSet(), last = (r.log || []).slice(-1)[0];
  const fromRef = useRef<HTMLInputElement>(null);
  const refs = useRef<Partial<Record<keyof ReportSettings, HTMLInputElement | HTMLTextAreaElement>>>({});
  type Txt = "focus" | "wins" | "blockers" | "next";
  const commit = (k: Txt) => (v: string) => { r[k] = v.trim(); save(); };
  const reg = (k: Txt) => (el: HTMLInputElement | HTMLTextAreaElement) => { refs.current[k] = el; };
  const ta = (k: Txt, lab: string, ph: string) => <><label>{lab}</label><Ta elRef={reg(k)} value={r[k]} onCommit={commit(k)} placeholder={ph} style={{ minHeight: 52 }} /></>;
  const go = (open: boolean) => {
    // Pick up any notes still being typed
    (Object.keys(refs.current) as Txt[]).forEach(k => { r[k] = refs.current[k]!.value.trim(); });
    const v = fromRef.current?.value, from = v ? new Date(v) : rptDefaultFrom();
    if (!(from < new Date())) { alert("The period start must be in the past."); return; }
    exportReport(from, open);
  };
  return <div className="card" id="rpt" style={{ marginBottom: 14 }}>
    <div className="row"><h2 style={{ margin: 0 }} className="grow">Progress report</h2>
      <span className="small muted">{last ? "Last exported " + new Date(last).toLocaleString(undefined, { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }) : "No report exported yet"}</span></div>
    <p className="small muted" style={{ margin: "4px 0 10px" }}>1–2 pages for Torino (Mon · Wed · Fri), covering every list. Counts only: no names, emails or phone numbers. Opens in a new tab → <b>Print → Save as PDF</b>.</p>
    <div className="f">
      <label>Period from</label><input type="datetime-local" ref={fromRef} key={last || "none"} defaultValue={dtLocal(rptDefaultFrom())} />
      <label>District / region in focus</label>
      <Inp elRef={reg("focus")} value={r.focus} onCommit={commit("focus")} placeholder="e.g. Springfield, Region 3 (comma-separated, matches district names)" />
    </div>
    <details style={{ marginTop: 8 }}><summary className="small"><b>Notes for this report</b> (optional, kept until you change them)</summary>
      <div className="f" style={{ marginTop: 8 }}>{ta("wins", "Highlights", "What went well since the last report")}{ta("blockers", "Blockers / help needed", "What's in the way, what you need from Torino")}{ta("next", "Next focus", "Plan until the next report")}</div></details>
    <div className="row" style={{ marginTop: 10 }}><button className="b p" onClick={() => go(true)}>Export progress report</button><button className="b" onClick={() => go(false)}>Download .html</button>
      <span className="small muted">No student, family or contact details in the notes.</span></div>
  </div>;
}
export function Dash() {
  const L = DL(), n = L.length;
  const reach = (id: StageId) => L.filter(l => MAIN.indexOf(l.stage) >= MAIN.indexOf(id)).length;
  const contacted = L.filter(l => l.stage !== "new").length;
  const pct = (a: number, b: number) => b ? Math.round(a / b * 100) + "%" : "not yet measurable";
  const fam = (k: "signups" | "activated") => { const v = L.map(l => l.families?.[k]).filter(x => x !== undefined && x !== ""); return v.length ? { sum: v.reduce((a: number, b) => a + +b!, 0), n: v.length } : null; };
  const sg = fam("signups"), ac = fam("activated");
  const districts = [...new Set(L.map(l => l.district || "(none)"))].sort();
  const days = [...Array(14)].map((_, i) => { const d = new Date(); d.setDate(d.getDate() - 13 + i); return iso(d); });
  const cnt: Record<string, number> = Object.fromEntries(days.map(d => [d, 0]));
  L.forEach(l => (l.activity || []).forEach(a => { const d = a.ts.slice(0, 10); if (d in cnt && a.type !== "Stage" && a.type !== "Note") cnt[d]++; }));
  const mx = Math.max(1, ...Object.values(cnt));
  const notCalled = L.filter(l => !callDef(l.call?.status)).length;
  const summary = `CyberSafely Lead Manager, as of ${fmtDate(todayISO())}: ${n} schools across ${districts.length} districts. Contacted ${contacted} (${pct(contacted, n)}). Engaged or further ${reach("engaged")}. Live ${reach("live")}. Active ${reach("active")}. Nurture ${L.filter(l => l.stage === "nurture").length}, declined ${L.filter(l => l.stage === "lost").length}. Calls: ${CALL_IDS.map(k => CALLS[k].short.toLowerCase() + " " + L.filter(l => l.call?.status === k).length).join(", ")}; not called ${notCalled}. Family sign-ups: ${sg ? sg.sum + " (from " + sg.n + " schools)" : "not yet measurable"}. Activated: ${ac ? ac.sum : "not yet measurable"}.`;
  return <>
    <ReportCard />
    <Strip />
    <div className="banner">Two funnels: <b>schools</b> (Cold → Active) and <b>families</b> (sign-ups → activated). A school replying is not a family activation.</div>
    <h2>School conversion</h2>
    <div className="grid kpis">
      <div className="card kpi"><div className="l">Contacted</div><div className="v">{contacted}</div><div className="s">{pct(contacted, n)} of {n} schools</div></div>
      <div className="card kpi"><div className="l">Engaged or further</div><div className="v">{reach("engaged")}</div><div className="s">{pct(reach("engaged"), contacted)} of contacted</div></div>
      <div className="card kpi"><div className="l">Live (sign-ups)</div><div className="v">{reach("live")}</div><div className="s">{pct(reach("live"), contacted)} of contacted</div></div>
      <div className="card kpi"><div className="l">Active</div><div className="v">{reach("active")}</div><div className="s">{S.settings.activeTarget}+ sign-ups each</div></div>
    </div>
    <h2>Calls to principals who opened the emails</h2>
    <div className="grid kpis">
      <div className="card kpi"><div className="l">Not called yet</div><div className="v">{notCalled}</div></div>
      {CALL_IDS.map(k => <div key={k} className="card kpi"><div className="l"><Dot c={`var(${CALLS[k].c})`} />{CALLS[k].name}</div><div className="v">{L.filter(l => l.call?.status === k).length}</div></div>)}
      <div className="card kpi"><div className="l">Want fundraising info</div><div className="v">{L.filter(l => l.call?.fundraising).length}</div></div>
    </div>
    <h2>Families</h2>
    <div className="grid kpis">
      <div className="card kpi"><div className="l">Parent sign-ups</div><div className="v">{sg ? sg.sum : "—"}</div><div className="s">{sg ? `from ${sg.n} schools reporting` : "not yet measurable"}</div></div>
      <div className="card kpi"><div className="l">Activated</div><div className="v">{ac ? ac.sum : "—"}</div><div className="s">{ac && sg ? pct(ac.sum, sg.sum) + " of sign-ups" : "not yet measurable"}</div></div>
    </div>
    <h2>By district</h2>
    <div className="tablewrap"><table><thead><tr><th>District</th><th>Schools</th><th>Pipeline</th>{MAIN.map(s => <th key={s}><Dot c={cv(s)} />{STAGE[s].name}</th>)}<th>Sign-ups</th></tr></thead>
      <tbody>{districts.map(d => {
        const ls = L.filter(l => (l.district || "(none)") === d);
        const su = ls.reduce((a, l) => a + (+(l.families?.signups ?? 0) || 0), 0);
        return <tr key={d}><td>{d}</td><td>{ls.length}</td>
          <td style={{ minWidth: 180 }}><div className="stack">{STAGES.map(s => { const c = ls.filter(l => l.stage === s.id).length; return c ? <span key={s.id} style={{ width: `${c / ls.length * 100}%`, background: cv(s.id) }} title={`${s.name}: ${c}`}></span> : null; })}</div></td>
          {MAIN.map(s => <td key={s}>{ls.filter(l => l.stage === s).length || ""}</td>)}<td>{su || ""}</td></tr>;
      })}</tbody></table></div>
    <h2>Touches per day (last 14 days)</h2>
    <div className="card">{days.map(d => <div key={d} className="barrow"><span>{fmtDate(d)}</span><div><div className="bar" style={{ width: `${cnt[d] / mx * 100}%` }}></div></div><span>{cnt[d]}</span></div>)}</div>
    <h2>Copy for your check-in</h2>
    <pre className="tpl">{summary}</pre>
    <FlashButton label="Copy summary" onClick={() => copy(summary)} />
    <p className="small muted">Counts only, safe to paste into the vault or a report.</p>
  </>;
}
