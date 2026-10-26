// Shared building blocks: committed inputs, contact links, the stage stepper and strip, the lead table.
import { Fragment, useEffect, useRef, useState, type CSSProperties, type InputHTMLAttributes, type MouseEvent, type ReactNode, type TextareaHTMLAttributes } from "react";
import { DL, S, W, isAff, isCamp, isOv, openLead, render, schoolsOf, ui } from "../store";
import { AFF_SEQ, CALLS, MAIN, STAGE, STAGES, callDef, stg } from "../lib/pipeline";
import { bizSince, campsOf, digits, dueClass, firstEmailTs, fmtDate, fmtFollowers, fmtPhone, lastTouch, name, outlookUrl, schoolOf, touches } from "../lib/helpers";
import type { Lead, StageId, Template } from "../lib/types";

export const cv = (s: StageId) => `var(${STAGE[s].c})`;
export const css = (o: Record<string, string | number>) => o as CSSProperties;

/* ---------- inputs that save on "change" (blur / Enter), like the original app ---------- */
// Uncontrolled, so typing doesn't re-render the app; the DOM value follows the saved value when it changes.
function useCommit<T extends HTMLInputElement | HTMLTextAreaElement>(value: unknown, onCommit: (v: string, el: T) => void, elRef?: (el: T) => void) {
  const ref = useRef<T>(null);
  useEffect(() => { if (elRef) elRef(ref.current!); });
  const cb = useRef(onCommit); cb.current = onCommit;
  const v = value == null ? "" : String(value);
  useEffect(() => {
    const el = ref.current!; const h = () => cb.current(el.value, el);
    el.addEventListener("change", h); return () => el.removeEventListener("change", h);
  }, []);
  useEffect(() => { const el = ref.current; if (el && el.value !== v) el.value = v; }, [v]);
  return { ref, v };
}
type InpProps = Omit<InputHTMLAttributes<HTMLInputElement>, "value" | "defaultValue" | "onChange"> & { value?: unknown; onCommit: (v: string, el: HTMLInputElement) => void; elRef?: (el: HTMLInputElement) => void };
export function Inp({ value, onCommit, elRef, ...rest }: InpProps) {
  const { ref, v } = useCommit<HTMLInputElement>(value, onCommit, elRef);
  return <input ref={ref} defaultValue={v} {...rest} />;
}
type TaProps = Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, "value" | "defaultValue" | "onChange"> & { value?: unknown; onCommit: (v: string, el: HTMLTextAreaElement) => void; elRef?: (el: HTMLTextAreaElement) => void };
export function Ta({ value, onCommit, elRef, ...rest }: TaProps) {
  const { ref, v } = useCommit<HTMLTextAreaElement>(value, onCommit, elRef);
  return <textarea ref={ref} defaultValue={v} {...rest} />;
}

/** Button whose label briefly changes (e.g. "Copied") after its action succeeds. */
export function FlashButton({ label, done = "Copied", onClick, className = "b sm", id }: { label: ReactNode; done?: string; onClick: () => Promise<unknown> | void; className?: string; id?: string }) {
  const [flash, setFlash] = useState(false);
  return <button id={id} className={className} onClick={() => {
    Promise.resolve(onClick()).then(() => { setFlash(true); setTimeout(() => setFlash(false), 1200); });
  }}>{flash ? done : label}</button>;
}
export const copy = (text: string) => navigator.clipboard.writeText(text);

/* ---------- contact bits ---------- */
export function TelLink({ l }: { l: Lead }) {
  return l.phone ? <a href={`tel:+1${digits(l.phone)}`}>{fmtPhone(l.phone)}</a> : <span className="chip">no phone</span>;
}
export function MailLink({ l }: { l: Lead }) {
  return l.email ? <a href={outlookUrl(l.email)} target="_blank" rel="noopener">{l.email}</a> : <span className="chip">no email</span>;
}
export function Contact({ l }: { l: Lead }) {
  return <><div className="small"><TelLink l={l} /></div><div className="small"><MailLink l={l} /></div></>;
}
export function CallChip({ l }: { l: Lead }) {
  const c = l.call && callDef(l.call.status);
  return c ? <span className="chip" style={{ color: `var(${c.c})` }}>● {c.short}</span> : null;
}
export function Dot({ c }: { c: string }) { return <span className="dot" style={css({ "--c": c })}></span>; }

/** <option>s grouped by category, in vault folder order. ★ marks the suggested email. */
export function TplOptions({ star, filter }: { star?: string | null; filter?: (t: Template) => unknown }) {
  const ts = S.templates.filter(filter || (() => true)), cats = [...new Set(ts.map(t => t.phase || "Other"))];
  return <>{cats.map(c => <optgroup key={c} label={c}>{ts.filter(t => (t.phase || "Other") === c).map(t =>
    <option key={t.id} value={t.id}>{t.id === star ? "★ " : ""}{t.name}</option>)}</optgroup>)}</>;
}

/* ---------- pipeline visuals ---------- */
// Four bars = Contacted, Engaged, Live, Active. A half bar = partway (later touches, or "shared").
export function Stepper({ l }: { l: Lead }) {
  const i = MAIN.indexOf(l.stage), closed = i < 0, c = closed ? "var(--muted)" : cv(l.stage);
  const bars = MAIN.slice(1).map((_, k0) => {
    const k = k0 + 1; let cls = "";
    if (!closed && k <= i) cls = "on";
    else if (!closed && k === i + 1 && ((l.stage === "contacted" && (l.seq || 0) >= 2) || (l.stage === "engaged" && l.shared))) cls = "half";
    return <i key={k} className={cls}></i>;
  });
  const aff = isAff(l);
  let sub = stg(l.stage, l.type).name;
  if (l.stage === "contacted") sub += aff ? ` · ${AFF_SEQ[Math.min(l.seq || 1, 2)].toLowerCase()}` : ` · touch ${l.seq || 1} of 3`;
  if (l.stage === "engaged") sub += aff ? ((l.sent || []).includes("dm4") ? " · codes sent" : (l.sent || []).includes("dm3") ? " · video sent" : "") : l.path === "we" ? " · we send it" : l.shared ? " · shared" : "";
  if (["live", "active"].includes(l.stage)) sub += ` · ${l.families?.signups || 0} sign-ups`;
  const d = aff ? null : bizSince(firstEmailTs(l)); if (d !== null && ["contacted", "engaged"].includes(l.stage)) sub += ` · day ${d}`;
  const cd = l.call && callDef(l.call.status); if (cd) sub += ` · call: ${cd.short}`;
  return <><div className="steps" style={css({ "--c": c })} title={stg(l.stage, l.type).desc}>{bars}</div>
    <div className="stlabel"><Dot c={c} />{sub}</div></>;
}

function stripClick(s: string) { ui.filt.stage = ui.filt.stage === s ? "" : s; ui.view = "leads"; render(); }
export function Strip() {
  const L = DL(), n = L.length, f = ui.filt.stage;
  const reach = (id: StageId) => L.filter(l => MAIN.indexOf(l.stage) >= MAIN.indexOf(id)).length;
  const nur = L.filter(l => l.stage === "nurture").length, lost = L.filter(l => l.stage === "lost").length;
  const rej = L.filter(l => l.stage === "rejected").length;
  const aff = ui.ds === "affiliate", sn = (s: StageId) => stg(s, ui.ds).name;
  return <div className="strip">
    {MAIN.map((s, k) => {
      const cnt = L.filter(l => l.stage === s).length, prev = k > 0 ? reach(MAIN[k - 1]) : 0;
      const conv = k === 0 ? `${n} ${W().many} total` : prev ? `${Math.round(reach(s) / prev * 100)}% made it past ${sn(MAIN[k - 1])}` : "";
      return <button key={s} className={f === s ? "on" : ""} style={css({ "--c": cv(s) })} onClick={() => stripClick(s)}>
        <div className="l">{sn(s)}</div><div className="v">{cnt}</div><div className="r">{conv}</div></button>;
    })}
    <button className={f === "rejected" ? "on" : ""} style={css({ "--c": "var(--bad)" })} onClick={() => stripClick("rejected")}>
      <div className="l">{sn("rejected")}</div><div className="v">{rej}</div><div className="r">{aff ? "DMs closed or not delivered" : "emails that bounced"}</div></button>
    <button className={"closed " + (["nurture", "lost"].includes(f) ? "on" : "")} style={css({ "--c": "var(--sx)" })} onClick={() => stripClick(f === "nurture" ? "lost" : "nurture")}>
      <div className="l">Closed</div><div className="v">{nur + lost}</div><div className="r">{nur} {aff ? "no reply" : "nurture"} · {lost} declined</div></button>
  </div>;
}

/** Click on a row or tile opens the lead, unless the click was on a link or control inside it. */
export function rowOpen(id: string) {
  return (e: MouseEvent) => { if ((e.target as Element).closest("a,input,select,label,button")) return; openLead(id); };
}

export function LeadTable({ arr, compact }: { arr: Lead[]; compact?: boolean }) {
  const w = W();
  // Campaigns are people more than organizations: the name leads, and the organization sits with the contact details
  const camp = ui.ds === "campaign";
  return <div className="tablewrap"><table><thead><tr><th>{camp ? "Name" : w.Unit}</th><th>{w.Who}</th><th style={{ minWidth: 150 }}>Where they are</th><th>Next step</th><th>Due</th>
    {compact ? null : <><th>Touches</th><th>Last touch</th><th>Owner</th></>}</tr></thead>
    <tbody>{arr.map(l => camp ? <tr key={l.id} className="click" onClick={rowOpen(l.id)}>
      <td><b>{name(l)}</b>
        {l.state ? <div className="small muted">{l.state}</div> : null}
        <div>{campsOf(l).map((c, i) => <Fragment key={i}>{i ? " " : null}<span className="chip">{c}</span></Fragment>)}</div>
      </td>
      <td>{l.school || l.district ? <div>{l.school || l.district}</div> : null}
        {l.school && l.district && l.school !== l.district ? <div className="small muted">{l.district}</div> : null}
        <Contact l={l} /></td>
      <td><Stepper l={l} /></td>
      <td>{l.nextAction}</td>
      <td className={dueClass(l.nextDue)}>{fmtDate(l.nextDue)}</td>
      {compact ? null : <><td>{touches(l)}</td><td>{fmtDate(lastTouch(l))}</td><td>{l.owner}</td></>}
    </tr> : <tr key={l.id} className="click" onClick={rowOpen(l.id)}>
      <td><b>{schoolOf(l)}</b>
        {l.school && l.district && l.school !== l.district ? <div className="small muted">{l.district}</div> : null}
        {l.level || l.grades || l.city ? <div className="small muted">{[l.level, l.grades && "Gr " + l.grades, l.city].filter(Boolean).join(" · ")}</div> : null}
        {isOv(l) ? <div><span className="chip">{schoolsOf(l).length} schools</span></div> : null}
        {isAff(l) ? <div className="small muted">{[l.platform, l.followers && fmtFollowers(l.followers) + " followers"].filter(Boolean).join(" · ")}
          {l.profileUrl ? <> · <a href={l.profileUrl} target="_blank" rel="noopener noreferrer">profile ↗</a></> : null}</div> : null}
        {isCamp(l) ? <><div className="small muted">{l.state || ""}</div><div>{campsOf(l).map((c, i) => <Fragment key={i}>{i ? " " : null}<span className="chip">{c}</span></Fragment>)}</div></> : null}
      </td>
      <td>{name(l)}<Contact l={l} /></td>
      <td><Stepper l={l} /></td>
      <td>{l.nextAction}</td>
      <td className={dueClass(l.nextDue)}>{fmtDate(l.nextDue)}</td>
      {compact ? null : <><td>{touches(l)}</td><td>{fmtDate(lastTouch(l))}</td><td>{l.owner}</td></>}
    </tr>)}</tbody></table></div>;
}

export { CALLS, STAGES };
