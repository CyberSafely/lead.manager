// The drawer for an affiliate (a social media account). Outreach is by DM rather than calls and emails, and results
// are tracked on their own link and code (regLink / code), where click tracking will plug in later.
import { useEffect, useRef, useState } from "react";
import { AFF_ACTS, AFF_SEQ, stagesFor, suggestTpl } from "../lib/pipeline";
import { S, closeDrawer, save, tpl } from "../store";
import { dueClass, fmtDate, fmtFollowers, name, placeholders, schoolOf } from "../lib/helpers";
import { affAdvance, log, logSent, render1, resetLead, setNext, setSignups, setStage } from "../lib/logic";
import { FlashButton, Inp, MailLink, Stepper, Ta, TelLink, TplOptions, copy } from "./ui";
import type { Lead, StageId } from "../lib/types";

export function AffDrawer({ l }: { l: Lead }) {
  const fam = l.families || {};
  const sug = suggestTpl(l);
  const isDm = (t: { kind?: string }) => t.kind === "DM", hasDms = S.templates.some(isDm);
  const pick0 = () => sug && tpl(sug) ? sug : S.templates.find(isDm)?.id || S.templates[0]?.id || "";
  const [pick, setPick] = useState(pick0);
  // The DM picker follows the suggestion as the affiliate moves through the stages
  useEffect(() => { setPick(pick0()); }, [sug]);
  const actNote = useRef<HTMLInputElement>(null);
  const done = () => { l.updatedAt = new Date().toISOString(); save(); };

  const inp = (k: keyof Lead, lab: string, type = "text", ph = "") => <>
    <label>{lab}</label><Inp type={type} value={l[k] as string} placeholder={ph} onCommit={v => { (l as unknown as Record<string, string>)[k] = v; done(); }} /></>;
  const r = render1(pick, l), text = (r.s ? "Subject: " + r.s + "\n\n" : "") + r.b, ph = placeholders(r.s + r.b);
  const sent = (l.activity || []).filter(a => a.type === "DM sent" || a.type === "Email sent");

  return <>
    <div className="row"><h2 style={{ margin: 0 }} className="grow">{schoolOf(l)}</h2><button className="b sm" onClick={closeDrawer}>Close ✕</button></div>
    <div className="muted small">{name(l)}</div>
    <div className="small" style={{ marginTop: 4 }}>{[l.platform, l.followers && fmtFollowers(l.followers) + " followers"].filter(Boolean).join(" · ")}
      {l.profileUrl ? <> · <a href={l.profileUrl} target="_blank" rel="noopener noreferrer">Open profile ↗</a></> : null}</div>
    {l.email || l.phone ? <div className="row small" style={{ marginTop: 4 }}>{l.phone ? <b><TelLink l={l} /></b> : null}{l.email ? <span><MailLink l={l} /></span> : null}</div> : null}
    <div style={{ margin: "12px 0" }}><Stepper l={l} /></div>
    <div className="card small"><b>Next:</b> {l.nextAction || "—"} {l.nextDue ? <span className={dueClass(l.nextDue)}>· {fmtDate(l.nextDue)}</span> : null}</div>

    <h3>DM</h3>
    <div className="row"><select className="grow" value={pick} onChange={e => setPick(e.target.value)}><TplOptions star={sug} filter={hasDms ? isDm : undefined} /></select></div>
    <div className="row" style={{ marginTop: 6 }}>
      <FlashButton label="Copy DM" onClick={() => copy(r.b)} />
      {l.profileUrl ? <button className="b sm" onClick={() => window.open(l.profileUrl, "_blank", "noopener")}>Open profile to DM</button> : null}
      <button className="b sm p" onClick={() => { logSent(l, pick, "DM sent"); save(); }}>Log DM sent</button>
      {l.email ? <>
        <button className="b sm" onClick={() => { location.href = `mailto:${encodeURIComponent(l.email || "")}?subject=${encodeURIComponent(r.s)}&body=${encodeURIComponent(r.b)}`; }}>Open in mail app</button>
        <button className="b sm" onClick={() => { logSent(l, pick); save(); }}>Log as emailed</button></> : null}
      <button className="b sm d" title="DMs are closed, or the message didn't go through" onClick={() => {
        if (l.stage === "rejected") return; log(l, "DM not delivered", l.platform || ""); setStage(l, "rejected"); save();
      }}>{l.stage === "rejected" ? "Can't reach ✓" : "Can't reach"}</button></div>
    {ph.length ? <div className="banner warn" style={{ marginTop: 6 }}>Fill before sending: {ph.join(", ")}</div> : null}
    <pre className="tpl">{text}</pre>
    <div className="small muted">★ = suggested for where this affiliate is. Copy the DM, open their profile and paste it into a message, then <b>Log DM sent</b>. It records who sent it and schedules the follow-up.</div>

    <h3>DMs sent ({sent.length})</h3>
    {sent.length ? <div className="log">{sent.slice().reverse().map((a, i) =>
      <div key={i}><b>{a.type === "DM sent" ? "DM" : "Email"}</b> <span className="muted small">{new Date(a.ts).toLocaleString()}</span><div className="small">{a.note}</div></div>)}</div>
      : <p className="small muted">No DMs logged yet.</p>}

    <h3>Log progress</h3>
    <div className="row">{AFF_ACTS.map(a => <button key={a} className={"b sm" + (a === "Declined" ? " d" : "")} onClick={() => {
      const note = actNote.current!.value.trim(); log(l, a, note); affAdvance(l, a, note); actNote.current!.value = ""; save();
    }}>{a}</button>)}</div>
    <input ref={actNote} placeholder="Optional note, or the post's link for “Posted” (no student or family details)" style={{ width: "100%", marginTop: 6 }} />

    <h3>Their link and results</h3>
    <div className="f">
      {inp("regLink", "Their tracking link", "url", "The link they share with followers")}
      {inp("accessCode", "Access code", "text", "Their family's free access")}
      {inp("code", "Referral code", "text", "The code they share with followers")}
      <label>Latest post</label><div className="row"><Inp className="grow" type="url" value={l.postUrl} placeholder="Link to their post about us" onCommit={v => { l.postUrl = v.trim(); done(); }} />
        {l.postUrl ? <a className="small" href={l.postUrl} target="_blank" rel="noopener noreferrer">Open ↗</a> : null}</div>
      <label>Link clicks</label><div className="small muted" style={{ alignSelf: "center" }}>not yet measurable (click tracking isn't connected yet)</div>
      <label>Sign-ups from their link</label><Inp type="number" min="0" value={fam.signups} placeholder="not yet measured" onCommit={v => { setSignups(l, v); save(); }} />
      <label>Counts as of</label><Inp type="date" value={fam.asOf} onCommit={v => { l.families = l.families || {}; l.families.asOf = v; save(); }} />
    </div>
    <p className="small muted">Any sign-ups move them to Sharing our link. {String(S.settings.activeTarget)}+ moves them to Driving sign-ups.</p>

    <h3>Status</h3>
    <div className="f">
      <label>Stage</label><select value={l.stage} onChange={e => { setStage(l, e.target.value as StageId); save(); }}>{stagesFor("affiliate").map(s => <option key={s.id} value={s.id}>{s.name}: {s.desc}</option>)}</select>
      <label>DMs sent</label><select value={String(Math.min(l.seq || 0, 2))} onChange={e => { l.seq = +e.target.value; setNext(l); done(); }}>{AFF_SEQ.map((s, i) => <option key={i} value={i}>{i}{s ? " · " + s : ""}</option>)}</select>
      {inp("assigned", "Handled by", "text", "Who on the team DMs them")}
      {inp("nextAction", "Next step")}
      {inp("nextDue", "Due", "date")}
    </div>

    <h3>Account</h3>
    <div className="f">
      {inp("handle", "Username", "text", "Without the @")}{inp("platform", "Platform", "text", "Instagram / TikTok / Facebook")}
      {inp("followers", "Followers", "text", "e.g. 446000")}{inp("profileUrl", "Link to account", "url")}
    </div>
    <h3>Contact</h3>
    <div className="f">
      {inp("first", "First name")}{inp("last", "Last name")}
      {inp("title_salutation", "Salutation", "text", "Dr. / Mr. / Ms. (blank = first name)")}
      {inp("email", "Email", "email")}{inp("phone", "Phone", "tel")}
    </div>
    <h3>Notes</h3>
    <Ta value={l.notes} placeholder="What they post about, audience, terms discussed. No student or family details." onCommit={v => { l.notes = v; done(); }} />
    <h3>History</h3>
    <div className="log">{(l.activity || []).length ? (l.activity || []).slice().reverse().map((a, i) =>
      <div key={i}><b>{a.type}</b> <span className="muted small">{new Date(a.ts).toLocaleString()}</span><div className="small">{a.note}</div></div>)
      : <span className="muted small">No activity yet.</span>}</div>
    <div className="row" style={{ marginTop: 16 }}><button className="b sm" title="Clear DMs, sign-ups and history. Account details and notes stay." onClick={() => {
      if (confirm("Reset this affiliate to Not contacted and start over?\n\nThis clears DMs sent, sign-up counts and the whole history. Account details and notes stay. This can't be undone.")) { resetLead(l); save(); }
    }}>Reset outreach</button><button className="b d sm" onClick={() => {
      if (confirm("Delete this affiliate and its history?")) { S.leads = S.leads.filter(x => x.id !== l.id); save(); closeDrawer(); }
    }}>Delete affiliate</button></div>
  </>;
}
