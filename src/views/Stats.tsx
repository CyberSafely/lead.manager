// Analytics: the progress report, live in the app, for any period. Same numbers and layout as the exported PDF.
import { render, save, ui } from "../store";
import { dtLocal } from "../lib/helpers";
import { anaRange, exportReport, rptBody, rptSet } from "../lib/report";
import { Inp } from "../components/ui";

const PERIODS: [string, string][] = [["today", "Today"], ["report", "Since last report"], ["week", "This week"], ["7", "Last 7 days"], ["30", "Last 30 days"], ["all", "Contract to date"], ["custom", "Custom…"]];

export function Stats() {
  const r = rptSet(), from = anaRange();
  return <>
    <div className="row" style={{ marginBottom: 12 }}>
      <div className="ds">{PERIODS.map(([k, v]) => <button key={k} className={ui.anaP === k ? "on" : ""} onClick={() => {
        ui.anaP = k; if (k === "custom" && !ui.anaFrom) ui.anaFrom = dtLocal(from); render();
      }}>{v}</button>)}</div>
      {ui.anaP === "custom" ? <Inp type="datetime-local" value={dtLocal(from)} onCommit={v => { ui.anaFrom = v; render(); }} /> : null}
      <Inp placeholder="District / region in focus" value={r.focus} style={{ minWidth: 220 }} onCommit={v => { r.focus = v.trim(); save(); }} />
      <span className="grow"></span>
      <button className="b sm" onClick={render}>Refresh</button>
      <button className="b sm p" onClick={() => exportReport(from, true)}>Export this period</button>
    </div>
    <div className="card rpt" dangerouslySetInnerHTML={{ __html: rptBody({ from, to: new Date(), ...r, live: true }) }} />
    <p className="small muted">Counts only, all lists. Same numbers as the exported progress report. Notes come from Dashboard → Progress report.</p>
  </>;
}
