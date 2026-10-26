// Process: how a school moves from cold to enrolled parents.
import { Fragment } from "react";
import { MAIN, STAGE } from "../lib/pipeline";
import { Dot, cv } from "../components/ui";

function Flow({ ids }: { ids: string[] }) {
  return <div className="flow">{ids.map((i, k) => <Fragment key={k}>{k ? " → " : null}<span className="s">{i}</span></Fragment>)}</div>;
}

export function Help() {
  return <div className="card" style={{ maxWidth: 820 }}>
    <h2 style={{ marginTop: 0 }}>From a cold school to enrolled parents</h2>
    <p>Schools are the channel: the principal forwards one message, and parents sign up with the school's link. The principal's only job is to forward it. Success is measured by sign-ups, not replies.</p>
    {MAIN.map(s => <div key={s} className="row" style={{ margin: "6px 0" }}><Dot c={cv(s)} /><b style={{ minWidth: 90 }}>{STAGE[s].name}</b><span className="muted">{STAGE[s].desc}</span></div>)}
    <h3>Outreach: 3 touches, then Nurture</h3>
    <Flow ids={["Day 0 · E1 email + family message", "Day 4 · call → voicemail + E2", "Day 10 · E3 right person?", "no reply → Nurture"]} />
    <p className="small">A reply, a call or "we shared it" moves the school to <b>Engaged</b> and stops the sequence. "No thanks" → R2, and the school is closed.</p>
    <h3>After Engaged</h3>
    <Flow ids={["School forwards the family message", "enter sign-ups from the dashboard", "Live → G2 thank-you + reminder", "Active → G3 monthly"]} />
    <p className="small">No sign-ups after about 8 workdays → G1 nudge. If a school wants us to send it, use R3 (the exception).</p>
    <h3>The parent's side</h3>
    <Flow ids={["Gets the school's message", "signs up on the web with the school link", "adds child + sets up the device", "onboarding call or video", "Zoey and Alyssa's 90-day activation sequence"]} />
    <h3>Calls: principals who opened the emails</h3>
    <Flow ids={["Call (script C1)", "pick the outcome in Calls", "next workday: follow-up email (F1 / F2 / F3 / R2)"]} />
    <p className="small">Interested → Engaged + F1 (who sends to families?). Needs info → Engaged + F2. Follow-up needed → F2, call back later. Unable to reach → voicemail + F3. Not interested → Declined + R2. Log each outcome in HubSpot too.</p>
    <h2>Starting a cold batch</h2>
    <ol><li>Fill in each school's <b>name</b>, <b>sign-up link</b> and any missing emails.</li><li>Fill in <b>Emails → Settings</b>: phone, onboarding page, support contact.</li><li>Click <b>Cold</b> in the strip → <b>Bulk email</b> → E1.</li><li>Send, then <b>Log as sent</b>. Calls come due on day 4 in <b>Today</b>.</li></ol>
    <h2>Rules</h2>
    <ul><li>No student or family details in notes. If a principal raises a specific child, pass it to Torino the same day.</li>
      <li>"No thanks" is final.</li>
      <li>HubSpot is the company's system of record. Sync weekly with Export CSV.</li></ul>
  </div>;
}
