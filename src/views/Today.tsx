import { DL, bulkOpen, tpl } from "../store";
import { suggestTpl } from "../lib/pipeline";
import { addBiz, todayISO } from "../lib/helpers";
import { LeadTable, Strip } from "../components/ui";
import type { Lead } from "../lib/types";

export function Today() {
  const t = todayISO(), wk = addBiz(5);
  const act = DL().filter(l => l.nextDue && l.stage !== "lost");
  const over = act.filter(l => l.nextDue! < t).sort((a, b) => a.nextDue!.localeCompare(b.nextDue!));
  const tod = act.filter(l => l.nextDue === t);
  const soon = act.filter(l => l.nextDue! > t && l.nextDue! <= wk).sort((a, b) => a.nextDue!.localeCompare(b.nextDue!));
  const byTpl: Record<string, Lead[]> = {};
  [...over, ...tod].forEach(l => { const s = suggestTpl(l); if (s) (byTpl[s] = byTpl[s] || []).push(l); });
  const batches = Object.entries(byTpl);
  const sec = (title: string, arr: Lead[], empty: string) => <>
    <h2>{title} <span className="muted">({arr.length})</span></h2>
    {arr.length ? <LeadTable arr={arr} compact /> : <p className="muted">{empty}</p>}
  </>;
  return <>
    <Strip />
    <div className="banner">Missouri is on <b>Central time</b> (1 h behind ET). Calls: 7:30–8:15 AM or 2:45–3:45 PM CT. Emails: mornings, Tue–Thu.</div>
    {batches.length ? <div className="card"><h2 style={{ marginTop: 0 }}>Emails due now</h2>
      {batches.map(([id, ls]) => {
        const ne = ls.filter(l => !l.email).length;
        return <div key={id} className="row" style={{ padding: "4px 0" }}><span className="chip">{ls.length}</span>
          <span className="grow">{tpl(id)?.name || id}{ne ? <> <span className="small over">({ne} missing email)</span></> : null}</span>
          <button className="b sm p" onClick={() => bulkOpen(byTpl[id], id)}>Send as batch</button></div>;
      })}</div> : null}
    {sec("Overdue", over, "Nothing overdue.")}
    {sec("Due today", tod, "Nothing due today.")}
    {sec("Next 5 workdays", soon, "Nothing scheduled.")}
  </>;
}
