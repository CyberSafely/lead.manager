// Data: import, export, activity-log import, backup / restore, reset. Applies to the list selected at the top.
import { useRef, useState } from "react";
import { DL, S, W, inDs, load, migrate, openLead, replaceState, render, save, ui } from "../store";
import { KEY } from "../lib/pipeline";
import { dl, name, todayISO } from "../lib/helpers";
import { aggCsv, applyActivityLog, familyFlag, hubspotBatch, importCsv, toCsv, type LogResult } from "../lib/csv";
import { filtered } from "./Leads";
import { log, setNext } from "../lib/logic";

// First HubSpot test (N.'s rules, docs/database.md §4 phase 0): Export CSV's columns for 10–20 contacts with an email.
function HubSpotBatch() {
  const [n, setN] = useState(15);
  const [ok, setOk] = useState<Set<string>>(new Set()); // flagged call notes a person chose to send
  const src = filtered(), { rows, dup, noEmail } = hubspotBatch(src, n);
  const flagged = rows.filter(l => familyFlag(l.call?.note)), held = flagged.filter(l => !ok.has(l.id)).length;
  const tick = (id: string) => { const o = new Set(ok); o.has(id) ? o.delete(id) : o.add(id); setOk(o); };
  return <div className="card" data-parity-skip><h2 style={{ marginTop: 0 }}>HubSpot test batch</h2>
    <p className="small muted">For the first HubSpot test: the same columns as Export CSV, for the first contacts with an email in the Schools tab's current filter ({src.length} shown there). Narrow it there first (district, stage, search) to choose who goes in. HubSpot matches on email, so contacts without one are left out. The Notes field is never exported. Send the file to your HubSpot admin. Deals are made in HubSpot, never from here.</p>
    <div className="row"><label className="small muted">Contacts (max 20)</label>
      <input type="number" min={1} max={20} value={n} style={{ width: 70 }} onChange={e => setN(Math.max(1, Math.min(20, Math.round(+e.target.value) || 1)))} />
      <button className="b p" disabled={!rows.length} onClick={() => dl(`hubspot-test-batch-${todayISO()}.csv`, toCsv(rows, l => familyFlag(l.call?.note) && !ok.has(l.id) ? "" : l.call?.note || ""), "text/csv")}>Export {rows.length} for HubSpot</button></div>
    {rows.length ? <p className="small">{rows.map(name).join(", ")}</p> : <p className="small muted">No contacts with an email in this filter.</p>}
    {noEmail ? <div className="small over">{noEmail} in this filter have no email and are left out (Email: Missing email in the filter finds them).</div> : null}
    {dup ? <div className="small over">{dup} share an email with a contact already in the batch and are left out.</div> : null}
    {flagged.length ? <div className="small" style={{ marginTop: 8 }}>
      <div className="over">{flagged.length} call note{flagged.length > 1 ? "s" : ""} may mention a student, family or other contact details. {held ? `${held} will be left blank` : "All will be sent"}. Tick one only if it's safe to send, or open it and edit the note.</div>
      {flagged.map(l => <div key={l.id} className="row" style={{ marginTop: 4 }}>
        <label><input type="checkbox" checked={ok.has(l.id)} onChange={() => tick(l.id)} /> <b>{name(l)}</b>: {l.call?.note}</label>
        <button className="b sm" onClick={() => openLead(l.id)}>Open</button></div>)}</div> : null}
  </div>;
}

const backup = (file: string) => dl(file, JSON.stringify(S, null, 1), "application/json");

export function Data() {
  const ds = ui.ds, w = W();
  const campRef = useRef<HTMLInputElement>(null);
  const [csvOut, setCsvOut] = useState("");
  const [actOut, setActOut] = useState<LogResult | null>(null);

  return <>
    <div className="banner"><b>Working on: {ds === "affiliate" ? "Affiliates (social media)" : ds === "user" ? "App users (retention)" : ds === "pta" ? "PTA contacts" : ds === "campaign" ? "Campaigns (newsletter contacts)" : ds === "overseer" ? "District overseers" : "Principals"}.</b> Import, export and reset below apply to this list only. Switch lists at the top of the page.</div>
    {ui.cloud === "off"
      ? <div className="banner warn">School data lives <b>only in this browser</b> on this computer. Nothing is uploaded. Back up weekly, and keep CSV and backup files <b>outside the Obsidian vault</b> (they contain names and emails).</div>
      : <div className="banner warn">Data is <b>shared with your team</b> through the CyberSafely database: imports, resets, restores and deletes here change it for everyone. Keep CSV and backup files <b>outside the Obsidian vault</b> (they contain names and emails).</div>}
    <div className="grid" style={{ gridTemplateColumns: "repeat(auto-fit,minmax(300px,1fr))" }}>
      <div className="card"><h2 style={{ marginTop: 0 }}>Import {ds === "affiliate" ? "affiliates" : ds === "user" ? "users" : ds === "pta" ? "PTA contacts" : ds === "campaign" ? "a newsletter list" : ds === "overseer" ? "overseers" : "principals"} (CSV)</h2>
        {ds === "campaign" ? <><p className="small">From HubSpot: the email's recipients who opened or clicked → Export → CSV. Columns used: <code>First Name</code> <code>Last Name</code> (or <code>Name</code>) <code>Email</code>, and if present <code>Phone Number</code> <code>Company</code> <code>State/Region</code> <code>Job Title</code>. Someone already in Campaigns gets the new campaign added, not a duplicate.</p>
          <div className="row" style={{ marginBottom: 8 }}><label className="small muted">Campaign name</label><input ref={campRef} className="grow" placeholder="e.g. Sept 2026 newsletter (opened)" /></div></> : null}
        {ds === "user" ? <p className="small">Columns: <code>Name</code> <code>Email</code>. Run <code>python3 scripts/clean-users.py users.csv</code> first and import <code>users-import.csv</code>. Rows with only an email are kept (name left blank); a person's name is split into first and last. Re-importing matches by email, so there are no duplicates.</p> : null}
        {ds === "affiliate" ? <p className="small">Columns: <code>Name</code> <code>Username</code> (or <code>Social Media Handle</code>) <code>Platform</code> <code>Follower Count</code> <code>Link</code>, and <code>Email</code> if you have one. Counts like 446K or 2,546 are read as numbers. Without a link, Instagram, TikTok and Facebook links are made from the username. Re-importing matches by username + platform, so there are no duplicates.</p> : null}
        {ds === "pta" ? <p className="small">Columns: <code>Name</code> <code>Email</code>. A title line above the header is skipped. Names that look like an organization (PTA, PTO, PTSA, council…) go in the organization field; a person's name is split into first and last. Re-importing matches by email, so there are no duplicates.</p> : null}
        {ds === "overseer" ? <p className="small">Columns: <code>District ID</code> <code>District</code> <code>First Name</code> <code>Last Name</code> <code>Email</code> <code>Phone Number</code> <code>Job Title</code>. Overseers link to principals by District ID (or matching district name).</p> : null}
        {ds === "pta" || ds === "user" || ds === "affiliate" ? null : <p className="small muted">In HubSpot: Contacts → your Missouri view → Export → CSV. Columns are matched automatically (First Name, Last Name, Email, Phone Number, Job Title, School, Primary/Associated Company, Contact owner, Record ID, Notes). Re-importing updates schools by Record ID, email, or name + company, and keeps stages and history.</p>}
        <input type="file" accept=".csv,text/csv" onChange={e => {
          const f = e.target.files?.[0]; if (!f) return;
          const camp = ds === "campaign" ? (campRef.current?.value || "").trim() : "";
          if (ds === "campaign" && !camp) { alert("Give this list a campaign name first, e.g. \"Sept 2026 newsletter (opened)\"."); e.target.value = ""; return; }
          f.text().then(t => { setCsvOut(importCsv(t, camp)); e.target.value = ""; render(); });
        }} />
        <div className="small" style={{ marginTop: 8 }}>{csvOut}</div></div>

      <div className="card"><h2 style={{ marginTop: 0 }}>Export</h2>
        <p className="small muted">CSV for HubSpot re-import or a status share. Includes Record ID and email so HubSpot can match rows.</p>
        <div className="row"><button className="b" onClick={() => dl(`missouri-schools-${todayISO()}.csv`, toCsv(), "text/csv")}>Export CSV</button>
          <button className="b" onClick={() => dl(`missouri-schools-counts-${todayISO()}.csv`, aggCsv(), "text/csv")}>Export counts only (no PII)</button></div>
        <p className="small muted" style={{ marginBottom: 4 }}>Progress report for Torino: 1–2 page PDF, counts only, all lists.</p>
        <button className="b p" onClick={() => { ui.view = "dash"; render(); requestAnimationFrame(() => document.getElementById("rpt")?.scrollIntoView()); }}>Progress report…</button></div>

      <div className="card"><h2 style={{ marginTop: 0 }}>Import activity log (CSV)</h2>
        <p className="small muted">Log past emails and calls in bulk. Columns: <code>Name</code> or <code>Email</code>, <code>Action</code>, <code>Date</code> (YYYY-MM-DD), <code>Note</code>. Action is an email ID (e1, e1c, e2, f3…) or <code>voicemail</code>. Name <code>*</code> means everyone in this list not named elsewhere in the file. Rows already logged on the same date are skipped, so re-importing is safe. A backup downloads first.</p>
        <input type="file" accept=".csv,text/csv" onChange={e => {
          const f = e.target.files?.[0]; if (!f) return;
          f.text().then(t => { backup(`outreach-backup-before-log-${todayISO()}.json`); setActOut(applyActivityLog(t)); e.target.value = ""; render(); });
        }} />
        <div className="small" style={{ marginTop: 8 }}>{actOut ? <>{actOut.msg}
          {actOut.missing.length ? <div className="over">No match for: {actOut.missing.join(", ")}. Check the spelling against the Schools list.</div> : null}
          {actOut.bad.length ? <div className="over">Unknown email IDs: {actOut.bad.join(", ")}.</div> : null}</> : null}</div></div>

      <div className="card"><h2 style={{ marginTop: 0 }}>Back up / restore</h2>
        <p className="small muted">Full copy of schools, history and emails as JSON.</p>
        <div className="row"><button className="b" onClick={() => backup(`outreach-backup-${todayISO()}.json`)}>Back up</button>
          <label className="b">Restore<input type="file" accept=".json" className="hide" onChange={e => {
            const f = e.target.files?.[0]; if (!f) return;
            f.text().then(t => {
              try {
                const d = JSON.parse(t); if (!Array.isArray(d.leads)) throw 0;
                if (ui.cloud !== "off") {
                  // Cloud build: load it straight into the team data (never into this browser's local-only storage)
                  const dup = d.leads.length - new Set(d.leads.map((l: { id: string }) => l.id)).size;
                  if (dup) { alert(`This backup has ${dup} duplicate record id(s), so it can't be restored safely.`); e.target.value = ""; return; }
                  if (confirm(`Replace the team's data with this backup (${d.leads.length} records)?\n\nThis replaces the shared database for the whole team. Earlier versions are kept in the database's history.`)) { replaceState(migrate(d)); save(); }
                } else if (confirm(`Replace current data with backup (${d.leads.length} schools)?`)) { localStorage.setItem(KEY, JSON.stringify(d)); replaceState(load()); save(); }
              } catch (_) { alert("That file isn't a valid backup."); }
              e.target.value = "";
            });
          }} /></label></div></div>

      <div className="card"><h2 style={{ marginTop: 0 }}>Reset</h2>
        <p className="small muted"><b>Start fresh:</b> keep every school and contact, but set them all back to Cold and clear call outcomes, call notes, emails logged, history and sign-up counts. A backup downloads first.</p>
        <button className="b" onClick={() => {
          if (!confirm(`Reset all ${DL().length} ${W().many} to Cold? Contacts stay; outcomes, notes, emails logged, history and sign-ups are cleared. A backup will download first.`)) return;
          backup(`outreach-backup-before-reset-${todayISO()}.json`);
          DL().forEach(l => {
            l.stage = "new"; l.seq = 0; l.sent = []; l.path = ""; l.shared = false; l.families = {}; delete l.call;
            l.activity = []; log(l, "Note", "Reset to Cold (fresh start)"); setNext(l);
          });
          save();
        }}>Reset all {w.many} to Cold</button>
        <p className="small muted" style={{ marginTop: 12 }}>Delete every {w.one} in this list from this browser.</p>
        <button className="b d" onClick={() => {
          if (confirm(`Delete ALL ${W().many} from ${ui.cloud === "off" ? "this browser" : "the shared database (for the whole team)"}? Back up first if unsure.`) && confirm("Really delete them?")) { S.leads = S.leads.filter(l => !inDs(l)); save(); }
        }}>Delete all {w.many}</button></div>

      <HubSpotBatch />
    </div>
  </>;
}
