// The right-hand drawer: one school / contact (LeadDrawer) or a bulk send (BulkDrawer).
import { useEffect, useRef, useState } from "react";
import { KEY, ACTS, CALLS, CALL_IDS, SEQ, STAGE, STAGES, callDef, suggestTpl } from "../lib/pipeline";
import { S, W, closeDrawer, ctoOf, inDs, isAff, isCamp, isCto, isDist, isOv, isPta, isUser, lead, openLead, overseerOf, render, save, schoolsOf, tpl, ui } from "../store";
import { csvCell, dl, domainOf, dueClass, fmtDate, name, outlookUrl, placeholders, schoolOf, todayISO, campsOf } from "../lib/helpers";
import { autoAdvance, fwd, log, logSent, render1, resetLead, setCall, setNext, setSignups, setStage, toHubspot, tokens } from "../lib/logic";
import { AffDrawer } from "./AffDrawer";
import { Dot, FlashButton, Inp, MailLink, Ta, TelLink, TplOptions, Stepper, copy, cv } from "./ui";
import type { Lead, ListId, StageId } from "../lib/types";

export function Drawer() {
  // While the drawer slides closed it keeps showing what it last showed, like the original
  const last = useRef<{ id: string | null; bulk: typeof ui.bulk }>({ id: null, bulk: null });
  const open = !!((ui.openId && lead(ui.openId)) || ui.bulk);
  if (open) last.current = { id: ui.openId, bulk: ui.bulk };
  const show = last.current, l = show.id ? lead(show.id) : null;
  return <aside id="drawer" className={open ? "open" : ""}>
    {l ? isAff(l) ? <AffDrawer key={l.id} l={l} /> : <LeadDrawer key={l.id} l={l} /> : show.bulk ? <BulkDrawer key={show.bulk.tid + show.bulk.arr.length} arr={show.bulk.arr} tid0={show.bulk.tid} /> : null}
  </aside>;
}

/* ---------- one lead ---------- */
function LeadDrawer({ l }: { l: Lead }) {
  const fam = l.families || {};
  const sug = suggestTpl(l);
  // A <select> shows its first option when the suggested email doesn't exist
  const pick0 = () => sug && tpl(sug) ? sug : S.templates[0]?.id || "";
  const [pick, setPick] = useState(pick0);
  // Like the original, the email picker follows the suggestion as the school moves through the pipeline
  useEffect(() => { setPick(pick0()); }, [sug]);
  const callNote = useRef<HTMLInputElement | null>(null), actNote = useRef<HTMLInputElement>(null);
  const done = () => { l.updatedAt = new Date().toISOString(); save(); };

  const inp = (k: keyof Lead, lab: string, type = "text", ph = "") => <>
    <label>{lab}</label><Inp type={type} value={l[k] as string} placeholder={ph} onCommit={v => { (l as unknown as Record<string, string>)[k] = v; done(); }} /></>;
  const r = render1(pick, l), prevText = (r.s ? "Subject: " + r.s + "\n\n" : "") + r.b, ph = placeholders(r.s + r.b);
  const cd = callDef(l.call?.status);

  return <>
    <div className="row"><h2 style={{ margin: 0 }} className="grow">{schoolOf(l)}</h2><button className="b sm" onClick={closeDrawer}>Close ✕</button></div>
    <div className="muted small">{name(l)}{l.district && l.school ? " · " + l.district : ""}</div>
    <div className="row small" style={{ marginTop: 4 }}><b style={{ fontSize: 15 }}><TelLink l={l} /></b><span><MailLink l={l} /></span></div>
    <div style={{ margin: "12px 0" }}><Stepper l={l} /></div>
    <div className="card small"><b>Next:</b> {l.nextAction || "—"} {l.nextDue ? <span className={dueClass(l.nextDue)}>· {fmtDate(l.nextDue)}</span> : null}</div>
    <LinkBox l={l} />

    <h3>Call outcome</h3>
    <div className="row">{CALL_IDS.map(k => <button key={k} className={"b sm " + (l.call?.status === k ? "p" : "")} onClick={() => {
      const note = callNote.current!.value.trim(); l.call = { ...(l.call || {}), note }; setCall(l, k, note); save();
    }}>{CALLS[k].name}</button>)}
      {l.call?.status ? <button className="b sm" title="Remove this call outcome" onClick={() => { setCall(l, ""); save(); }}>Clear ✕</button> : null}</div>
    <div className="row" style={{ marginTop: 6 }}>
      <Inp elRef={el => { callNote.current = el; }} className="grow" placeholder="Call note (no student or family details)" value={l.call?.note}
        onCommit={v => { l.call = { ...(l.call || {}), note: v.trim() }; save(); }} />
      <label className="small"><input type="checkbox" checked={!!l.call?.fundraising} onChange={e => {
        l.call = { ...(l.call || {}), fundraising: e.target.checked }; log(l, "Note", e.target.checked ? "Wants fundraising program info" : "Fundraising info: no"); save();
      }} /> Wants fundraising info</label></div>
    {l.call?.status ? <div className="small muted" style={{ marginTop: 4 }}>Last call: {new Date(l.call.ts!).toLocaleString()}{l.call.by ? " · " + l.call.by : ""}</div> : null}

    <h3>Email</h3>
    <div className="row"><select className="grow" value={pick} onChange={e => setPick(e.target.value)}><TplOptions star={sug} /></select></div>
    <div className="row" style={{ marginTop: 6 }}>
      <button className="b sm" onClick={() => window.open(outlookUrl(l.email, r.s, r.b), "_blank")}>Open in Outlook</button>
      <button className="b sm" onClick={() => { location.href = `mailto:${encodeURIComponent(l.email || "")}?subject=${encodeURIComponent(r.s)}&body=${encodeURIComponent(r.b)}`; }}>Open in mail app</button>
      <FlashButton label="Copy" onClick={() => copy(prevText)} />
      <button className="b sm p" onClick={() => { logSent(l, pick); save(); }}>Log as sent</button>
      <button className="b sm d" title="The email bounced or was rejected" onClick={() => {
        if (l.stage === "rejected") return; log(l, "Email rejected", l.email || ""); setStage(l, "rejected"); save();
      }}>{l.stage === "rejected" ? "Rejected ✓" : "Rejected"}</button></div>
    {ph.length ? <div className="banner warn" style={{ marginTop: 6 }}>Fill before sending: {ph.join(", ")}</div> : null}
    <pre className="tpl">{prevText}</pre>
    <div className="small muted">★ = suggested for where this school is. <b>Log as sent</b> moves it forward and schedules the next step.</div>

    <h3>Log a touch</h3>
    <div className="row">{ACTS.map(a => <button key={a} className="b sm" onClick={() => {
      const note = actNote.current!.value.trim(); log(l, a, note); autoAdvance(l, a); actNote.current!.value = ""; save();
    }}>{a}</button>)}</div>
    <input ref={actNote} placeholder="Optional note (no student or family details)" style={{ width: "100%", marginTop: 6 }} />

    <h3>Family sign-ups (this school's code)</h3>
    <div className="f">
      <label>Parent sign-ups</label><Inp type="number" min="0" value={fam.signups} placeholder="not yet measured" onCommit={v => { setSignups(l, v); save(); }} />
      <label>Activated (setup verified)</label><Inp type="number" min="0" value={fam.activated} placeholder="not yet measured" onCommit={v => { l.families = l.families || {}; l.families.activated = v; save(); }} />
      <label>Counts as of</label><Inp type="date" value={fam.asOf} onCommit={v => { l.families = l.families || {}; l.families.asOf = v; save(); }} />
    </div>
    <p className="small muted">Any sign-ups move the school to Live. {String(S.settings.activeTarget)}+ moves it to Active (change the target in Emails → Settings).</p>

    <h3>Status</h3>
    <div className="f">
      <label>Stage</label><select value={l.stage} onChange={e => { setStage(l, e.target.value as StageId); save(); }}>{STAGES.map(s => <option key={s.id} value={s.id}>{s.name}: {s.desc}</option>)}</select>
      <label>Outreach touches</label><select value={String(l.seq || 0)} onChange={e => { l.seq = +e.target.value; setNext(l); done(); }}>{SEQ.map((s, i) => <option key={i} value={i}>{i}{s ? " · " + s : ""}</option>)}</select>
      <label>Shared with families</label><select value={l.shared ? "1" : ""} onChange={e => {
        l.shared = !!e.target.value; if (l.shared) { log(l, "Says they shared it", ""); if (fwd(l, "engaged")) setStage(l, "engaged"); else setNext(l); } done();
      }}><option value="">Not confirmed</option><option value="1">Principal says it's shared</option></select>
      <label>Who sends to families</label><select value={l.path === "we" ? "we" : ""} onChange={e => { l.path = e.target.value; setNext(l); done(); }}>
        <option value="">School forwards it (default)</option><option value="we">We send it (exception)</option></select>
      {inp("nextAction", "Next step")}
      {inp("nextDue", "Due", "date")}
    </div>

    <h3>School and contact</h3>
    <div className="f">
      {inp("school", "School", "text", "HubSpot often only has the district")}{inp("district", "District")}
      {inp("regLink", "Sign-up link", "url", "This school's registration link")}{inp("code", "Referral / QR code")}
      {inp("level", "Level", "text", "Middle / Junior High")}{inp("grades", "Grades", "text", "e.g. 06-08")}{inp("city", "City")}{inp("region", "Region")}
      {inp("first", "First name")}{inp("last", "Last name")}
      {inp("title_salutation", "Salutation", "text", "Dr. / Mr. / Ms. (blank = first name)")}
      {inp("jobtitle", "Job title")}{inp("email", "Email", "email")}{inp("phone", "Phone", "tel")}
      {inp("owner", "HubSpot owner")}{inp("hubspotId", "HubSpot record ID")}{inp("districtId", "District ID")}
      {isCamp(l) ? <>{inp("campaign", "Campaigns", "text", "Comma-separated")}{inp("state", "State")}</> : null}
    </div>
    <h3>Notes</h3>
    <Ta value={l.notes} placeholder="Context, objections, who to ask for. No student or family details." onCommit={v => { l.notes = v; done(); }} />
    <h3>History</h3>
    <div className="log">{(l.activity || []).length ? (l.activity || []).slice().reverse().map((a, i) =>
      <div key={i}><b>{a.type}</b> <span className="muted small">{new Date(a.ts).toLocaleString()}</span><div className="small">{a.note}</div></div>)
      : <span className="muted small">No activity yet.</span>}</div>
    <div className="row" style={{ marginTop: 16 }}><button className="b sm" title="Clear touches, emails sent, call outcome, sign-ups and history. Contact details and notes stay." onClick={() => {
      if (confirm("Reset this " + (isOv(l) ? "overseer" : isCto(l) ? "CTO" : isCamp(l) || isPta(l) ? "contact" : isUser(l) ? "user" : "school") + " to Cold and start over?\n\nThis clears touches, emails sent, the call outcome, sign-up counts and the whole history. Contact details and notes stay. This can't be undone.")) { resetLead(l); save(); }
    }}>Reset outreach</button><button className="b d sm" onClick={() => {
      if (confirm("Delete this school and its history?")) { S.leads = S.leads.filter(x => x.id !== l.id); save(); closeDrawer(); }
    }}>Delete {isOv(l) ? "overseer" : isCto(l) ? "CTO" : isCamp(l) || isPta(l) ? "contact" : isUser(l) ? "user" : "school"}</button></div>
  </>;
}

// Jump to a linked record (switching lists if needed) unless the click was on a phone or email link.
function jump(id: string) {
  return (e: React.MouseEvent) => {
    if ((e.target as Element).closest("a")) return;
    const t = lead(id);
    if (t && !inDs(t)) { ui.ds = (t.type || "principal") as ListId; try { localStorage.setItem(KEY + "-ds", ui.ds); } catch (_) { /* */ } }
    openLead(id);
  };
}

// Overseer drawer: every school in the district with its principal's contact info. Principal drawer: the district's overseer.
// Campaign drawer: campaigns, plus anyone already in the pipeline at the same email domain.
function LinkBox({ l }: { l: Lead }) {
  if (isPta(l) || isUser(l)) return null;
  if (isCamp(l)) {
    const d = domainOf(l), ppl = d ? S.leads.filter(x => !isCamp(x) && domainOf(x) === d) : [], cs = campsOf(l);
    return <><h3>Campaigns</h3><div className="row">{cs.length ? cs.map((c, i) => <span key={i} className="chip">{c}</span>) : <span className="small muted">None</span>}</div>
      {ppl.length ? <><h3>Already in our pipeline at @{d} ({ppl.length})</h3><div className="subl">{ppl.map(s => <div key={s.id} className="it" onClick={jump(s.id)}>
        <div><b>{name(s)}</b><div className="small">{isOv(s) ? "District overseer" : isCto(s) ? "District CTO" : schoolOf(s)}</div></div>
        <div className="small" style={{ textAlign: "right" }}><TelLink l={s} /><div><Dot c={cv(s.stage)} />{STAGE[s.stage].name}</div></div></div>)}</div></> : null}</>;
  }
  if (isDist(l)) {
    const ss = schoolsOf(l);
    return <><h3>Schools in this district ({ss.length})</h3>
      {ss.length ? <div className="subl">{ss.map(s => <div key={s.id} className="it" onClick={jump(s.id)}>
        <div><b>{schoolOf(s)}</b><div className="small">{name(s)}{s.jobtitle ? " · " + s.jobtitle : ""}</div></div>
        <div className="small" style={{ textAlign: "right" }}><TelLink l={s} /><div><MailLink l={s} /></div><Dot c={cv(s.stage)} />{STAGE[s.stage].name}{callDef(s.call?.status) ? " · " + callDef(s.call?.status)!.short : ""}</div></div>)}</div>
        : <p className="small muted">No principals matched. Check that the District ID or district name matches the principal data.</p>}</>;
  }
  // Principal drawer: the district's overseer, and its CTO if there is one
  const box = (o: Lead | undefined, h: string) => o ? <><h3>{h}</h3><div className="subl"><div className="it" onClick={jump(o.id)}>
    <div><b>{name(o)}</b><div className="small">{o.jobtitle || h} · {o.district} · {schoolsOf(o).length} schools</div></div>
    <div className="small" style={{ textAlign: "right" }}><TelLink l={o} /><div><MailLink l={o} /></div><Dot c={cv(o.stage)} />{STAGE[o.stage].name}</div></div></div></> : null;
  const o = overseerOf(l), c = ctoOf(l); if (!o && !c) return null;
  return <>{box(o, "District overseer")}{box(c, "District CTO")}</>;
}

/* ---------- bulk send ---------- */
function BulkDrawer({ arr, tid0 }: { arr: Lead[]; tid0: string }) {
  const withEmail = arr.filter(l => l.email), noEmail = arr.length - withEmail.length;
  const [id, setId] = useState(() => tpl(tid0)?.subject ? tid0 : S.templates.find(t => t.subject)?.id || tid0);
  const [gi, setGi] = useState(0);
  const [gLast, setGLast] = useState("");
  const [bon, setBon] = useState(false);
  const w = W(), first = withEmail[0] || arr[0];
  const r = first ? render1(id, first) : null;
  const ph = new Set(withEmail.flatMap(x => { const q = render1(id, x); return placeholders(q.s + q.b); }));
  const n25 = Math.min(25, withEmail.length);
  return <>
    <div className="row"><h2 style={{ margin: 0 }} className="grow">Bulk email · {arr.length} {w.many}</h2><button className="b sm" onClick={closeDrawer}>Close ✕</button></div>
    {noEmail ? <div className="banner warn" style={{ marginTop: 10 }}>{noEmail} have no email and are skipped. Fill them in from HubSpot (Schools → "Missing email").</div> : null}
    <h3>1 · Pick the email</h3>
    <select style={{ width: "100%" }} value={id} onChange={e => { setId(e.target.value); setGi(0); setGLast(""); }}><TplOptions filter={t => t.subject} /></select>
    {ph.size ? <div className="banner warn" style={{ marginTop: 8 }}>Fill before sending: {[...ph].join(", ")}. Set them in <b>Profile</b> or per school.</div> : null}
    <h3>Preview (first {w.one})</h3><pre className="tpl">{r ? "Subject: " + r.s + "\n\n" + r.b : ""}</pre>
    <h3>2 · Send</h3>
    <div className="card small" style={{ marginBottom: 8, border: "1px solid var(--ok)" }}><b>One Outlook draft, up to 25 in BCC.</b> Opens a compose window with subject + body filled and copies the {n25} email addresses to your clipboard — click the BCC field in Outlook and paste. Content is identical for everyone (don't use a template with <code>{"{{first}}"}</code>-style personal tokens).
      <div className="row" style={{ marginTop: 6 }}><button className="b p sm" onClick={async () => {
        const batch = withEmail.slice(0, 25); if (!batch.length) return;
        const rr = render1(id, batch[0]);
        try { await navigator.clipboard.writeText(batch.map(l => l.email).join("; ")); } catch (e) { /* clipboard blocked */ }
        window.open(outlookUrl("", rr.s, rr.b), "_blank"); setBon(true);
      }}>Open Outlook draft + copy {n25} BCC</button>
        <span className="small" style={{ marginLeft: 8 }}>{bon ? <>✓ Draft opened · <b>{n25} emails copied to clipboard</b> — click the BCC field in Outlook and paste (Ctrl/⌘+V).</> : null}</span></div></div>
    <div className="card small" style={{ marginBottom: 8 }}><b>Under ~30 schools: one by one from Gmail.</b> Most personal, best deliverability. Opens a filled Gmail draft per school.
      <div className="row" style={{ marginTop: 6 }}><button className="b sm" onClick={() => {
        if (gi >= withEmail.length) return; const l = withEmail[gi], rr = render1(id, l);
        window.open(`https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(l.email!)}&su=${encodeURIComponent(rr.s)}&body=${encodeURIComponent(rr.b)}`, "_blank");
        setGi(gi + 1); setGLast(schoolOf(l));
      }}>Open next Gmail draft</button>
        <span className="muted">{withEmail.length ? `${gi} of ${withEmail.length} opened${gLast ? " · last: " + gLast : ""}` : ""}</span></div></div>
    <div className="card small" style={{ marginBottom: 8 }}><b>Mail merge (Gmail mail merge, YAMM, GMass).</b> One row per school with subject and body filled in.
      <div className="row" style={{ marginTop: 6 }}><button className="b sm" onClick={() => {
        const rows = [["Email", "First Name", "Last Name", "Greeting", "School", "District", "Subject", "Body"], ...withEmail.map(l => { const rr = render1(id, l), t = tokens(l); return [l.email, l.first, l.last, t.greeting, t.school, l.district, rr.s, rr.b]; })];
        dl(`merge-${id}-${todayISO()}.csv`, rows.map(r => r.map(csvCell).join(",")).join("\n"), "text/csv");
      }}>Export merge CSV</button></div></div>
    <div className="card small" style={{ marginBottom: 8 }}><b>HubSpot marketing email.</b> Tracks opens and clicks, adds the unsubscribe link.
      <div className="row" style={{ marginTop: 6 }}>
        <FlashButton label="Copy HubSpot version" onClick={() => { const t = tpl(id)!; return copy("Subject: " + toHubspot(t.subject) + "\n\n" + toHubspot(t.body)); }} />
        <FlashButton label="Copy email list" onClick={() => copy(withEmail.map(l => l.email).join(", "))} /></div></div>
    <h3>3 · Log it</h3>
    <p className="small muted">Logging moves each school forward and schedules its next step.</p>
    <button className="b p" onClick={() => {
      if (!confirm(`Log "${tpl(id)!.name}" as sent to ${withEmail.length} ${w.many}?`)) return;
      // Look each school up again: a teammate's change may have arrived while the drawer was open (cloud build)
      withEmail.map(x => lead(x.id)).forEach(l => { if (l) logSent(l, id); }); save(); closeDrawer();
    }}>Log as sent for {withEmail.length} {w.many}</button>
  </>;
}
export { render };
