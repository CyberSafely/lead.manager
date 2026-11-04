// Other people at a school/district — the influencer who actually picks up (tech overseer, counselor, "Dr."),
// alongside the formal principal contact on the lead. Used full in the lead drawer and as a compact quick-add on Calls.
// The lead's own first/last/email/phone stay the default email/call target; `primary` here is display-only.
import { useState } from "react";
import { save } from "../store";
import { addContact, log } from "../lib/logic";
import { digits, fmtPhone } from "../lib/helpers";
import { Inp } from "./ui";
import type { Lead, SchoolContact } from "../lib/types";

const ROLES = ["Technology / IT", "Guidance counselor", "Administrator (Dr.)", "Principal's office", "Front office", "Teacher", "Other"];

export const contactName = (c: SchoolContact) => [c.first, c.last].filter(Boolean).join(" ") || c.email || c.phone || "(no name)";

function roleInput(value: string | undefined, onCommit: (v: string) => void) {
  return <>
    <input list="cs-roles" defaultValue={value || ""} placeholder="Role (e.g. Technology)" style={{ width: "100%" }}
      onBlur={e => { const v = e.target.value.trim(); if (v !== (value || "")) onCommit(v); }} />
    <datalist id="cs-roles">{ROLES.map(r => <option key={r} value={r} />)}</datalist>
  </>;
}

/** A blank add form. Compact on Calls (name + role + email + ext); the drawer adds a direct phone too. */
function AddForm({ l, compact, onDone }: { l: Lead; compact?: boolean; onDone?: () => void }) {
  const blank = { first: "", last: "", role: "", email: "", phone: "", ext: "" };
  const [f, setF] = useState({ ...blank });
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement>) => setF({ ...f, [k]: e.target.value });
  const canSave = !!(f.first || f.last || f.email || f.phone);
  const commit = () => {
    if (!canSave) return;
    addContact(l, { first: f.first.trim() || undefined, last: f.last.trim() || undefined, role: f.role.trim() || undefined,
      email: f.email.trim() || undefined, phone: f.phone.trim() || undefined, ext: f.ext.trim() || undefined });
    save(); setF({ ...blank }); onDone?.();
  };
  return <div className="card" style={{ marginTop: 8 }}>
    <div className="row" style={{ gap: 6, flexWrap: "wrap" }}>
      <input value={f.first} onChange={set("first")} placeholder="First name" style={{ flex: "1 1 120px" }} />
      <input value={f.last} onChange={set("last")} placeholder="Last name" style={{ flex: "1 1 120px" }} />
    </div>
    <div style={{ marginTop: 6 }}>{roleInput(f.role, v => setF({ ...f, role: v }))}</div>
    <div className="row" style={{ gap: 6, flexWrap: "wrap", marginTop: 6 }}>
      <input value={f.email} onChange={set("email")} type="email" placeholder="Email" style={{ flex: "2 1 180px" }} />
      <input value={f.ext} onChange={set("ext")} placeholder="Ext." style={{ flex: "0 1 80px" }} />
    </div>
    {compact ? null : <div className="row" style={{ marginTop: 6 }}>
      <input value={f.phone} onChange={set("phone")} type="tel" placeholder="Direct line (if any)" style={{ width: "100%" }} /></div>}
    <div className="row" style={{ marginTop: 8 }}>
      <button className="b sm p" disabled={!canSave} onClick={commit}>Add person</button>
      {onDone ? <button className="b sm" onClick={() => { setF({ ...blank }); onDone(); }}>Cancel</button> : null}
    </div>
  </div>;
}

/** One saved contact, editable in the drawer. */
function Row({ l, c }: { l: Lead; c: SchoolContact }) {
  const done = () => { l.updatedAt = new Date().toISOString(); save(); };
  const makePrimary = () => { (l.contacts || []).forEach(x => { x.primary = x.id === c.id ? !c.primary : false; }); done(); };
  const remove = () => { if (confirm("Remove " + contactName(c) + " from this school?")) { l.contacts = (l.contacts || []).filter(x => x.id !== c.id); log(l, "Contact removed", contactName(c)); done(); } };
  return <div className="card" style={{ marginTop: 8, ...(c.primary ? { borderColor: "var(--ok)" } : {}) }}>
    <div className="row" style={{ gap: 6, flexWrap: "wrap", alignItems: "center" }}>
      <b className="grow">{contactName(c)}</b>
      {c.primary ? <span className="chip" style={{ color: "var(--ok)" }}>★ Main contact</span> : null}
      <button className="b sm" title="The person you work most here (display only — emails still go to the principal)" onClick={makePrimary}>{c.primary ? "Unset main" : "Set as main"}</button>
      <button className="b d sm" onClick={remove}>Remove</button>
    </div>
    <div className="row" style={{ gap: 6, flexWrap: "wrap", marginTop: 6 }}>
      <Inp value={c.first} placeholder="First name" style={{ flex: "1 1 120px" }} onCommit={v => { c.first = v; done(); }} />
      <Inp value={c.last} placeholder="Last name" style={{ flex: "1 1 120px" }} onCommit={v => { c.last = v; done(); }} />
    </div>
    <div style={{ marginTop: 6 }}>{roleInput(c.role, v => { c.role = v; done(); })}</div>
    <div className="row" style={{ gap: 6, flexWrap: "wrap", marginTop: 6 }}>
      <Inp value={c.email} type="email" placeholder="Email" style={{ flex: "2 1 180px" }} onCommit={v => { c.email = v; done(); }} />
      <Inp value={c.ext} placeholder="Ext." style={{ flex: "0 1 80px" }} onCommit={v => { c.ext = v; done(); }} />
    </div>
    <div className="row" style={{ marginTop: 6 }}>
      <Inp value={c.phone} type="tel" placeholder="Direct line (if any)" style={{ width: "100%" }} onCommit={v => { c.phone = v; done(); }} />
    </div>
    <div className="row small" style={{ marginTop: 6 }}>
      {c.phone ? <a href={`tel:+1${digits(c.phone)}`}>{fmtPhone(c.phone)}{c.ext ? " ×" + c.ext : ""}</a> : null}
      {c.email ? <a href={`mailto:${encodeURIComponent(c.email)}`}>{c.email}</a> : null}
    </div>
    <Inp value={c.notes} placeholder="Note (no student or family details)" style={{ width: "100%", marginTop: 6 }} onCommit={v => { c.notes = v; done(); }} />
  </div>;
}

/** Full editor for the lead drawer. */
export function ContactsSection({ l }: { l: Lead }) {
  const cs = (l.contacts || []).slice().sort((a, b) => (b.primary ? 1 : 0) - (a.primary ? 1 : 0));
  const [adding, setAdding] = useState(false);
  return <>
    <h3>People at this school</h3>
    <p className="small muted">The principal above stays the formal contact. Add the people you actually reach — the person who picks up, a tech overseer, a counselor — with their own extension and email.</p>
    {cs.map(c => <Row key={c.id} l={l} c={c} />)}
    {adding ? <AddForm l={l} onDone={() => setAdding(false)} />
      : <div className="row" style={{ marginTop: 8 }}><button className="b sm" onClick={() => setAdding(true)}>＋ Add a person</button></div>}
  </>;
}

/** Compact quick-add for the Calls tab: log the person you just reached without leaving the list. */
export function QuickAddContact({ l }: { l: Lead }) {
  const cs = l.contacts || [];
  const [open, setOpen] = useState(false);
  return <div style={{ marginTop: 4 }}>
    {cs.map(c => <div key={c.id} className="small muted">
      {c.primary ? "★ " : "• "}{contactName(c)}{c.role ? " · " + c.role : ""}
      {c.phone ? <> · <a href={`tel:+1${digits(c.phone)}`}>{fmtPhone(c.phone)}{c.ext ? " ×" + c.ext : ""}</a></> : c.ext ? " · ×" + c.ext : ""}
    </div>)}
    {open ? <AddForm l={l} compact onDone={() => setOpen(false)} />
      : <button className="b sm" style={{ marginTop: 4 }} onClick={() => setOpen(true)}>＋ person reached</button>}
  </div>;
}
