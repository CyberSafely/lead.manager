// Call list for principals who opened the emails. One row per principal: tap to call, pick the outcome.
import { DL, S, W, lead, openLead, picked, render, save, tpl, ui } from "../store";
import { CALLS, CALL_IDS, KEY, callDef } from "../lib/pipeline";
import { dueClass, fmtDate, name, schoolOf } from "../lib/helpers";
import { fill, log, setCall } from "../lib/logic";
import { Inp, MailLink, PickBanner, TelLink, css } from "../components/ui";
import type { Lead } from "../lib/types";

const SCRIPT_KEY = KEY + "-call-script";

export function Calls() {
  // Picked on Analytics: just those records, soonest due first; otherwise the whole list by district
  const L = ui.pick ? picked().sort((a, b) => (a.nextDue || "9").localeCompare(b.nextDue || "9") || schoolOf(a).localeCompare(schoolOf(b)))
    : DL().sort((a, b) => (a.district || "").localeCompare(b.district || "") || schoolOf(a).localeCompare(schoolOf(b)));
  const st = (l: Lead) => (l.call && callDef(l.call.status)) ? l.call.status! : "none";
  const cf = ui.callFilt;
  const arr = L.filter(l => !cf || st(l) === cf);
  const cnt = (k: string) => L.filter(l => st(l) === k).length;
  const setCf = (k: string) => { ui.callFilt = ui.callFilt === k ? "" : k; render(); };
  const cell = (k: string, label: string, c: string) => <button key={k} className={cf === k ? "on" : ""} style={css({ "--c": `var(${c})` })} onClick={() => setCf(k)}>
    <div className="l">{label}</div><div className="v">{cnt(k)}</div></button>;
  // Script dropdown: every call script in emails/Calls (the voicemail has its own card below).
  // Default: C4s (simplified) for schools, C3 for district overseers. Falls back to C1 if C4s isn't synced yet.
  const ov = ui.ds === "overseer";
  const scripts = S.templates.filter(t => t.phase === "Calls" && t.id !== "vm");
  const def = ov ? "c3" : tpl("c4s") ? "c4s" : "c1";
  const sid = scripts.some(t => t.id === ui.callScript) ? ui.callScript : def;
  const setScript = (id: string) => { ui.callScript = id; try { localStorage.setItem(SCRIPT_KEY, id); } catch (e) { /* */ } render(); };
  // The script fills in the picked lead's name, school and district; with none picked it shows placeholders
  const who = ui.callLead ? arr.find(l => l.id === ui.callLead) : undefined;
  const sample = who || { first: ov ? "[Superintendent's name]" : "[Principal's name]", school: ov ? "" : "[school]", district: "[district]" };
  const pickLead = (id: string) => { ui.callLead = id; ui.callScriptOpen = true; render(); };
  const caller = S.settings.caller === "Torino" ? "Torino" : "Giancarlo";
  return <>
    <PickBanner arr={arr} />
    <div className="strip calls">{cell("none", "Not called yet", "--s0")}{CALL_IDS.map(k => cell(k, CALLS[k].name, CALLS[k].c))}</div>
    <div className="banner">Missouri is on <b>Central time</b> (1 h behind ET and Puerto Rico). Best windows: 7:30–8:15 AM or 2:45–3:45 PM CT. Keep it short, and don't repeat the emails. Each outcome queues its follow-up email in <b>Today</b> for the next workday.</div>
    <div className="row" style={{ marginBottom: 10 }}>
      <span className="small muted">Calling as</span>
      <select value={caller} onChange={e => { S.settings.caller = e.target.value; save(); }}><option>Giancarlo</option><option>Torino</option></select>
      <span className="grow"></span>
      <span className="small muted">{arr.length} of {L.length} {W().Who.toLowerCase()}s{cf ? <> · <a href="#" onClick={e => { e.preventDefault(); ui.callFilt = ""; render(); }}>show all</a></> : null}</span>
    </div>
    <details className="card" style={{ marginBottom: 8 }} open={ui.callScriptOpen} onToggle={e => { ui.callScriptOpen = (e.target as HTMLDetailsElement).open; }}>
      <summary><b>Call script</b> ({tpl(sid)?.name.split(" · ")[0] || sid.toUpperCase()}){who ? <> · {name(who)}, {schoolOf(who)}</> : null}</summary>
      <div className="row" style={{ margin: "8px 0" }}>
        <span className="small muted">Script</span>
        <select value={sid} onChange={e => setScript(e.target.value)}>{scripts.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}</select>
        <span className="small muted">Calling</span>
        <select value={who ? who.id : ""} onChange={e => pickLead(e.target.value)} style={{ maxWidth: 320 }}>
          <option value="">— pick a {W().Who.toLowerCase()} to fill in names —</option>
          {arr.map(l => <option key={l.id} value={l.id}>{name(l) || "(no name)"} · {schoolOf(l)}{l.school && l.district ? " · " + l.district : ""}</option>)}</select>
      </div>
      <pre className="tpl">{fill(tpl(sid)?.body || "", sample)}</pre></details>
    <details className="card" style={{ marginBottom: 12 }}><summary><b>Voicemail</b> (~20 s)</summary><pre className="tpl">{fill(tpl("vm")?.body || "", sample)}</pre></details>
    <div className="tablewrap"><table><thead><tr><th>{W().Unit}</th><th>{W().Who} · phone · email</th><th style={{ minWidth: 210 }}>Call outcome</th><th style={{ minWidth: 180 }}>Call note</th><th>Fundraising</th><th>Next step</th><th></th></tr></thead>
      <tbody>{arr.map(l => {
        const c = l.call || {}, cd = callDef(c.status);
        return <tr key={l.id}>
          <td><b>{schoolOf(l)}</b> <button className="b sm" title="Show the call script with this person's name and district" onClick={() => pickLead(l.id)}>Script</button>{l.school && l.district ? <div className="small muted">{l.district}</div> : null}</td>
          <td>{name(l)}<div style={{ fontSize: 15, fontWeight: 600 }}><TelLink l={l} /></div><div className="small"><MailLink l={l} /></div></td>
          <td><select value={cd ? c.status : ""} style={{ width: "100%", ...(c.status && cd ? { borderLeft: `4px solid var(${cd.c})` } : {}) }}
            onChange={e => { setCall(lead(l.id)!, e.target.value); save(); }}>
            <option value="">— not called —</option>{CALL_IDS.map(k => <option key={k} value={k}>{CALLS[k].name}</option>)}</select>
            {c.ts && c.status ? <div className="small muted">{new Date(c.ts).toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}{c.by ? " · " + c.by : ""}</div> : null}</td>
          <td><Inp value={c.note} placeholder="No student/family details" style={{ width: "100%" }} onCommit={raw => {
            const v = raw.trim(); l.call = { ...(l.call || {}), note: v }; if (v) log(l, "Note", "Call note: " + v); save();
          }} /></td>
          <td><label className="small"><input type="checkbox" checked={!!c.fundraising} onChange={e => {
            l.call = { ...(l.call || {}), fundraising: e.target.checked }; log(l, "Note", e.target.checked ? "Wants fundraising program info" : "Fundraising info: no"); save();
          }} /> wants info</label></td>
          <td className="small">{l.nextAction}{l.nextDue ? <div className={dueClass(l.nextDue)}>{fmtDate(l.nextDue)}</div> : null}</td>
          <td><button className="b sm" onClick={() => openLead(l.id)}>Open ›</button></td></tr>;
      })}</tbody></table></div>
  </>;
}
