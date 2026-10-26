// Board: drag a card to change its stage. Next step and due date update automatically.
// Each column collapses to a narrow rail (still a drop target); which ones are collapsed is remembered per browser.
import { useState } from "react";
import { CalendarClock, ChevronDown, ChevronRight, ChevronsDownUp, ChevronsUpDown, GripVertical, User } from "lucide-react";
import { DL, isAff, lead, openLead, save, ui } from "../store";
import { KEY, stagesFor } from "../lib/pipeline";
import { dueClass, fmtDate, fmtFollowers, name, schoolOf } from "../lib/helpers";
import { setStage } from "../lib/logic";
import { CallChip, Strip, css, cv, rowOpen } from "../components/ui";
import type { Lead, StageId } from "../lib/types";

const FOLD_KEY = KEY + "-board";
const FOLD_DEFAULT: StageId[] = ["rejected", "nurture", "lost"];   // closed outcomes start collapsed
const MAX = 150;

function loadFolded(): Set<StageId> {
  try { const v = JSON.parse(localStorage.getItem(FOLD_KEY) || "null"); if (Array.isArray(v)) return new Set(v); } catch (e) { /* storage unavailable */ }
  return new Set(FOLD_DEFAULT);
}
function keepFolded(s: Set<StageId>) {
  try { localStorage.setItem(FOLD_KEY, JSON.stringify([...s])); } catch (e) { /* storage unavailable: only this visit remembers it */ }
}

function Tile({ l }: { l: Lead }) {
  const due = dueClass(l.nextDue);
  const meta = isAff(l) ? [
    l.platform || "", l.followers ? fmtFollowers(l.followers) : "",
    l.stage === "contacted" ? ((l.seq || 1) >= 2 ? "Followed up" : "DM 1") : "",
    (l.sent || []).includes("dm4") ? "Codes sent" : (l.sent || []).includes("dm3") ? "Video sent" : "", l.postUrl ? "Posted" : "",
    l.families?.signups ? `${l.families.signups} sign-ups` : "",
  ].filter(Boolean) : [
    l.stage === "contacted" ? `Touch ${l.seq || 1}/3` : "",
    l.shared ? "Shared" : "",
    l.path === "we" ? "We send" : "",
    l.families?.signups ? `${l.families.signups} sign-ups` : "",
  ].filter(Boolean);
  return <div className="tile" draggable role="button" tabIndex={0}
    onClick={rowOpen(l.id)} onKeyDown={e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); openLead(l.id); } }}
    onDragStart={e => { e.dataTransfer.setData("text/plain", l.id); e.dataTransfer.effectAllowed = "move"; }}>
    <div className="tile-top"><span className="t">{schoolOf(l)}</span><GripVertical className="grip" size={16} aria-hidden="true" /></div>
    <div className="tile-who"><User size={14} aria-hidden="true" /><span>{name(l) || "No name yet"}</span></div>
    {meta.length || l.call?.status ? <div className="tile-meta">{meta.map(m => <span key={m} className="pill">{m}</span>)}<CallChip l={l} /></div> : null}
    {l.nextDue ? <div className={"tile-due " + due}><CalendarClock size={14} aria-hidden="true" />
      <span><b>{due === "over" ? "Overdue · " : due === "today" ? "Today · " : ""}{fmtDate(l.nextDue)}</b> · {l.nextAction}</span></div> : null}
  </div>;
}

export function Board() {
  const [drop, setDrop] = useState<string | null>(null);
  const [folded, setFolded] = useState(loadFolded);
  const fold = (next: Set<StageId>) => { setFolded(next); keepFolded(next); };
  const toggle = (id: StageId) => { const n = new Set(folded); if (n.has(id)) n.delete(id); else n.add(id); fold(n); };
  const all = DL(), STAGES = stagesFor(ui.ds);
  return <>
    <Strip />
    <div className="board-bar">
      <p className="muted small"><GripVertical size={14} aria-hidden="true" /> Drag a card to change its stage. Next step and due date update automatically.</p>
      <div className="row">
        <button className="b sm" onClick={() => fold(new Set())}><ChevronsUpDown size={14} aria-hidden="true" /> Expand all</button>
        <button className="b sm" onClick={() => fold(new Set(STAGES.map(s => s.id)))}><ChevronsDownUp size={14} aria-hidden="true" /> Collapse all</button>
      </div>
    </div>
    <div className="board">{STAGES.map(s => {
      const ls = all.filter(l => l.stage === s.id), shut = folded.has(s.id);
      return <section key={s.id} aria-label={s.name} className={"col" + (shut ? " shut" : "") + (drop === s.id ? " drop" : "")} style={css({ "--c": cv(s.id) })}
        onDragOver={e => { e.preventDefault(); e.dataTransfer.dropEffect = "move"; setDrop(s.id); }}
        onDragLeave={e => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setDrop(d => d === s.id ? null : d); }}
        onDrop={e => { e.preventDefault(); setDrop(null); const l = lead(e.dataTransfer.getData("text/plain")); if (l) { setStage(l, s.id); save(); } }}>
        <button className="col-head" aria-expanded={!shut} title={shut ? `Show ${s.name}` : `Hide ${s.name}`} onClick={() => toggle(s.id)}>
          {shut ? <ChevronRight size={18} aria-hidden="true" /> : <ChevronDown size={18} aria-hidden="true" />}
          <span className="col-dot" aria-hidden="true"></span>
          <span className="col-title">{s.name}</span>
          <span className="count">{ls.length}</span>
        </button>
        {shut ? null : <>
          <div className="ph">{s.desc}</div>
          <div className="col-body">
            {ls.slice(0, MAX).map(l => <Tile key={l.id} l={l} />)}
            {ls.length ? null : <div className="col-empty">Drop a card here</div>}
            {ls.length > MAX ? <div className="small muted col-more">+{ls.length - MAX} more (use the list)</div> : null}
          </div>
        </>}
      </section>;
    })}</div>
  </>;
}
