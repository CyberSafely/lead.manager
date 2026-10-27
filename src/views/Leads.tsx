// Schools: the full list with filters, paging, bulk email and bulk stage moves.
import { DL, W, bulkOpen, openLead, picked, render, save, tpl, ui } from "../store";
import { newLead } from "../actions";
import { RANK, callDef, callFollowed, callTpl, stagesFor, stg } from "../lib/pipeline";
import { campsOf, digits, dueClass, fmtDate, name, schoolOf, todayISO } from "../lib/helpers";
import { Megaphone } from "lucide-react";
import { setStage } from "../lib/logic";
import { Contact, LeadTable, PickBanner, Strip, rowOpen } from "../components/ui";
import type { Lead, StageId } from "../lib/types";
import type { Filters } from "../store";

export function filtered(): Lead[] {
  const t = todayISO(), filt = ui.filt, ds = ui.ds;
  return (ui.pick ? picked() : DL()).filter(l => {
    if (filt.stage === "called" ? !wasCalled(l) : filt.stage && l.stage !== filt.stage) return false;
    if (filt.district && (ds === "campaign" ? !campsOf(l).includes(filt.district) : l.district !== filt.district)) return false;
    if (filt.due === "over" && !(l.nextDue && l.nextDue <= t)) return false;
    if (filt.email === "yes" && !l.email) return false;
    if (filt.email === "no" && l.email) return false;
    if (filt.level && l.level !== filt.level) return false;
    if (filt.grades && l.grades !== filt.grades) return false;
    if (filt.region && l.region !== filt.region) return false;
    if (filt.q) { const q = filt.q.toLowerCase(); if (![name(l), l.school, l.district, l.email, l.phone, digits(l.phone), l.notes, l.city, l.code, l.assigned, l.handle, l.platform].join(" ").toLowerCase().includes(q)) return false; }
    return true;
  }).sort((a, b) => (RANK(b.stage) - RANK(a.stage)) || (a.district || "").localeCompare(b.district || ""));
}

// "Called" in the stage dropdown (schools and overseers): not a stage, a filter for everyone with a call logged
const CALL_ACTS = ["Call", "Call: reached", "Voicemail", "Front office message"];
const wasCalled = (l: Lead) => !!callDef(l.call?.status) || (l.activity || []).some(a => CALL_ACTS.includes(a.type));
const lastCall = (l: Lead) => l.call?.ts || (l.activity || []).filter(a => CALL_ACTS.includes(a.type)).map(a => a.ts).sort().pop() || "";
// The follow-up email after the call: its id, whether it went out, and when
function followUp(l: Lead) {
  const c = callDef(l.call?.status); if (!c) return null;
  const tid = callTpl(l, c), done = callFollowed(l, c);
  const used = done ? ((l.sent || []).includes(tid) ? tid : "f4") : tid;
  const ts = done ? (l.activity || []).filter(a => a.type === "Email sent" && a.note === tpl(used)?.name).map(a => a.ts).sort().pop() : undefined;
  return { tid: used, done, ts };
}

function CalledTable({ arr }: { arr: Lead[] }) {
  const rows = arr.map(l => ({ l, f: followUp(l), at: lastCall(l) }))
    .sort((a, b) => (+!!a.f?.done - +!!b.f?.done) || b.at.localeCompare(a.at));
  const todo = rows.filter(r => r.f && !r.f.done && r.l.stage !== "lost"), sent = rows.filter(r => r.f?.done).length;
  const byTpl: Record<string, Lead[]> = {};
  todo.forEach(r => (byTpl[r.f!.tid] = byTpl[r.f!.tid] || []).push(r.l));
  const unreach = todo.filter(r => r.l.call?.status === "unreach").map(r => r.l);
  const tname = (id: string) => (tpl(id)?.name || id.toUpperCase()).split(" · ")[0];
  return <>
    <div className="card" style={{ marginBottom: 10 }} data-parity-skip>
      <div className="row"><span className="grow"><b>{rows.length}</b> called · <span style={{ color: "var(--ok)" }}>{sent} follow-up{sent === 1 ? "" : "s"} sent</span> · <span className={todo.length ? "over" : ""}>{todo.length} not sent yet</span></span></div>
      {todo.length ? <div style={{ marginTop: 6 }}>
        {Object.entries(byTpl).map(([id, ls]) => <div key={id} className="row" style={{ padding: "3px 0" }}><span className="chip">{ls.length}</span>
          <span className="grow">{tpl(id)?.name || id}</span><button className="b sm p" onClick={() => bulkOpen(ls, id)}>Send as batch</button></div>)}
        {unreach.length > 1 && tpl("f4") ? <div className="row" style={{ padding: "3px 0" }}><span className="chip">{unreach.length}</span>
          <span className="grow">{tpl("f4")!.name} <span className="small muted">(one BCC send for all voicemails)</span></span><button className="b sm" onClick={() => bulkOpen(unreach, "f4")}>Send F4 as BCC</button></div> : null}
      </div> : null}
    </div>
    <div className="tablewrap"><table><thead><tr><th>{W().Unit}</th><th>{W().Who}</th><th>Call</th><th style={{ minWidth: 190 }}>Follow-up email</th><th>Next step</th><th>Due</th></tr></thead>
      <tbody>{rows.map(({ l, f, at }) => {
        const c = callDef(l.call?.status);
        return <tr key={l.id} className="click" onClick={rowOpen(l.id)}>
          <td><b>{schoolOf(l)}</b>{l.school && l.district && l.school !== l.district ? <div className="small muted">{l.district}</div> : null}</td>
          <td>{name(l)}<Contact l={l} /></td>
          <td>{c ? <span className="pill" style={{ borderLeft: `3px solid var(${c.c})` }}>{c.short}</span> : <span className="small muted">no outcome set</span>}
            {at ? <div className="small muted">{new Date(at).toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}{l.call?.by ? " · " + l.call.by : ""}</div> : null}</td>
          <td>{!f ? <span className="small muted">— pick a call outcome</span>
            : f.done ? <span style={{ color: "var(--ok)", fontWeight: 600 }}>✓ {tname(f.tid)} sent{f.ts ? <span className="small muted" style={{ fontWeight: 400 }}> · {new Date(f.ts).toLocaleDateString(undefined, { month: "short", day: "numeric" })}</span> : null}</span>
            : l.stage === "lost" ? <span className="small muted">Declined, none needed</span>
            : <span className="row" style={{ gap: 6 }}><span className="over">✗ {tname(f.tid)} not sent</span><button className="b sm p" onClick={() => openLead(l.id)}>Send</button></span>}</td>
          <td className="small">{l.nextAction}</td>
          <td className={dueClass(l.nextDue)}>{fmtDate(l.nextDue)}</td>
        </tr>;
      })}</tbody></table></div>
  </>;
}

// Campaigns list: one card per campaign above the table. Clicking one filters the table to its contacts
// (the same filter as the "All campaigns" dropdown, so the two stay in sync).
function CampaignPicker() {
  const all = DL(), cur = ui.filt.district;
  const camps = [...new Set(all.flatMap(campsOf))].sort().map(c => {
    const ls = all.filter(l => campsOf(l).includes(c));
    return { c, n: ls.length, reached: ls.filter(l => l.stage !== "new").length };
  });
  if (!camps.length) return null;
  const pick = (c: string) => { ui.filt.district = c; ui.showAll = false; render(); };
  const card = (key: string, on: boolean, title: string, sub: string, onClick: () => void) =>
    <button key={key} className={"camp" + (on ? " on" : "")} aria-pressed={on} onClick={onClick}>
      <span className="camp-t">{title}</span><span className="camp-s">{sub}</span></button>;
  return <section className="camps" aria-label="Campaigns" data-parity-skip>
    <h3><Megaphone size={16} aria-hidden="true" /> Campaigns</h3>
    <div className="camp-row">
      {card("", !cur, "All campaigns", `${all.length} ${W().many}`, () => pick(""))}
      {camps.map(x => card(x.c, cur === x.c, x.c, `${x.n} ${x.n === 1 ? W().one : W().many} · ${x.reached} contacted so far`, () => pick(cur === x.c ? "" : x.c)))}
    </div>
  </section>;
}

export function Leads() {
  const ds = ui.ds, filt = ui.filt;
  const uniq = (k: "district" | "level" | "grades" | "region") => [...new Set(DL().map(l => l[k]).filter(Boolean) as string[])].sort();
  const arr = filtered(), STAGES = stagesFor(ds);
  const set = (k: keyof Filters) => (e: { target: { value: string } }) => { filt[k] = e.target.value; render(); };
  const levels = uniq("level"), grades = uniq("grades"), regions = uniq("region");
  const dOpts = ds === "campaign" ? [...new Set(DL().flatMap(campsOf))].sort() : uniq("district");
  return <>
    <PickBanner arr={arr} />
    <Strip />
    {ds === "campaign" ? <CampaignPicker /> : null}
    <div className="row" style={{ marginBottom: 12 }}>
      <input placeholder={`Search ${ds === "affiliate" ? "name, username, platform" : ds === "campaign" || ds === "pta" || ds === "user" ? "name, email, organization" : ds === "overseer" ? "overseer, district" : "school, principal, district"}, notes`}
        value={filt.q} onChange={set("q")} className="grow" style={{ minWidth: 200 }} />
      <select value={filt.stage} onChange={set("stage")}><option value="">All stages</option>{STAGES.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}{ds === "principal" || ds === "overseer" ? <option value="called">Called</option> : null}</select>
      <select value={filt.district} onChange={set("district")}><option value="">{ds === "campaign" ? "All campaigns" : "All districts"}</option>{dOpts.map(d => <option key={d}>{d}</option>)}</select>
      <select value={filt.due} onChange={set("due")}><option value="">Any due date</option><option value="over">Due now</option></select>
      <select value={filt.email} onChange={set("email")}><option value="">Email: any</option><option value="yes">Has email</option><option value="no">Missing email</option></select>
      {levels.length ? <select value={filt.level} onChange={set("level")}><option value="">Any level</option>{levels.map(v => <option key={v}>{v}</option>)}</select> : null}
      {grades.length ? <select value={filt.grades} onChange={set("grades")}><option value="">Any grades</option>{grades.map(v => <option key={v}>{v}</option>)}</select> : null}
      {regions.length ? <select value={filt.region} onChange={set("region")}><option value="">Any region</option>{regions.sort((a, b) => (a as any) - (b as any)).map(v => <option key={v} value={v}>Region {v}</option>)}</select> : null}
      <button className="b" onClick={newLead}>+ Add {W().one}</button>
    </div>
    <div className="row small muted" style={{ marginBottom: 8 }}>{arr.length} of {(ui.pick ? picked() : DL()).length} {W().many}
      {arr.length > 25 ? <> · showing {ui.showAll ? arr.length : Math.min(25, arr.length)} · <button className="b sm" onClick={() => { ui.showAll = !ui.showAll; render(); }}>{ui.showAll ? "Show 25" : "Show all " + arr.length}</button></> : null}
      {arr.length ? <> · <button className="b sm p" onClick={() => bulkOpen(arr.slice(0, 25))}>Bulk email these {Math.min(25, arr.length)} with Outlook</button> · Move to <select value="" onChange={e => {
        const st = e.target.value as StageId; if (!st) return;
        if (!confirm(`Move ${arr.length} ${W().many} to "${stg(st, ds).name}"?`)) return;
        arr.forEach(l => setStage(l, st, "bulk")); save();
      }}><option value="">stage…</option>{STAGES.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select></> : null}
    </div>
    {filt.stage === "called" ? <CalledTable arr={arr} /> : <LeadTable arr={ui.showAll ? arr : arr.slice(0, 25)} />}
  </>;
}
