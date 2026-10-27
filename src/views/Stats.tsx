// Analytics: the progress report, live in the app, for any period. Same numbers and layout as the exported PDF.
import { goTo, render, save, ui, type Go } from "../store";
import { dtLocal } from "../lib/helpers";
import { anaRange, exportReport, rptBody, rptSet } from "../lib/report";
import { Inp } from "../components/ui";

const PERIODS: [string, string][] = [["today", "Today"], ["report", "Since last report"], ["week", "This week"], ["7", "Last 7 days"], ["30", "Last 30 days"], ["all", "Contract to date"], ["custom", "Custom…"]];

export function Stats() {
  const r = rptSet(), from = anaRange(), links: Go[] = [];
  const html = rptBody({ from, to: new Date(), ...r, live: true, links });
  // Every number and row in the report is a link (data-go = index into links): it opens those records
  const go = (e: React.SyntheticEvent) => { const el = (e.target as Element).closest("[data-go]") as HTMLElement | null; const g = el && links[+el.dataset.go!]; if (g) goTo(g); };
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
    <div className="small muted" style={{ marginBottom: 6 }} data-parity-skip>Click any number or row to see the records behind it.</div>
    <div className="card rpt" onClick={go} onKeyDown={e => { if (e.key === "Enter" || e.key === " ") { if ((e.target as Element).closest("[data-go]")) e.preventDefault(); go(e); } }} dangerouslySetInnerHTML={{ __html: html }} />
    <p className="small muted">Counts only, all lists. Same numbers as the exported progress report. Notes come from Dashboard → Progress report.</p>
  </>;
}
