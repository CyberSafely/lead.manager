// Header: the top bar. Brand, list switch, search across all lists, save status. The tabs live in the Sidebar.
import { useEffect, useRef, useState } from "react";
import { S, openLead, setDs, ui } from "../store";
import { digits, name, schoolOf } from "../lib/helpers";
import type { Lead, ListId } from "../lib/types";
import { signOut } from "../sync";

const LISTS: [ListId, string][] = [["principal", "Principals"], ["overseer", "Overseers"], ["cto", "CTOs"], ["campaign", "Campaigns"], ["pta", "PTA"], ["user", "Users"], ["affiliate", "Affiliates"]];

export function Header() {
  return <header>
    <h1><span>CyberSafely<small>Lead Manager</small></span></h1>
    <GlobalSearch />
    <div className="ds">{LISTS.map(([k, v]) => <button key={k} className={ui.ds === k ? "on" : ""} onClick={() => { if (k !== ui.ds) setDs(k); }}>{v}</button>)}</div>
    <div className="grow"></div>
    <span className="small muted">{ui.savedMsg}</span>
    {ui.user ? <span className="small muted" title={ui.user}>{ui.user} · <button className="b sm" onClick={signOut}>Sign out</button></span> : null}
  </header>;
}

function gsSearch(q: string): Lead[] {
  q = q.trim().toLowerCase(); if (!q) return [];
  const qd = q.replace(/\D/g, "");
  return S.leads.filter(l => {
    const hay = [name(l), l.school, l.district, l.email, l.notes, l.city, l.campaign, l.jobtitle, l.assigned, l.handle].filter(Boolean).join(" ").toLowerCase();
    if (hay.includes(q)) return true;
    if (qd && qd.length >= 3 && digits(l.phone).includes(qd)) return true;
    return false;
  }).slice(0, 20);
}

function GlobalSearch() {
  const [q, setQ] = useState(""), [sel, setSel] = useState(0), [open, setOpen] = useState(false);
  const inp = useRef<HTMLInputElement>(null);
  const items = gsSearch(q);
  useEffect(() => {
    const h = (e: MouseEvent) => { if (!(e.target as Element).closest(".gs")) setOpen(false); };
    document.addEventListener("click", h); return () => document.removeEventListener("click", h);
  }, []);
  const go = (l: Lead) => {
    const target = (l.type || "principal") as ListId;
    if (target !== ui.ds) setDs(target);
    ui.view = "leads"; openLead(l.id);
    setQ(""); setOpen(false);
  };
  return <div className="gs">
    <input ref={inp} type="search" placeholder="Search all lists… (name, school, email, phone)" autoComplete="off" value={q}
      onChange={e => { setQ(e.target.value); setSel(0); setOpen(!!e.target.value.trim()); }}
      onFocus={() => { if (q.trim()) setOpen(true); }}
      onKeyDown={e => {
        if (e.key === "ArrowDown") { e.preventDefault(); if (items.length) { setSel((sel + 1) % items.length); setOpen(true); } }
        else if (e.key === "ArrowUp") { e.preventDefault(); if (items.length) { setSel((sel - 1 + items.length) % items.length); setOpen(true); } }
        else if (e.key === "Enter") { const it = items[sel]; if (it) { e.preventDefault(); go(it); } }
        else if (e.key === "Escape") { setOpen(false); inp.current?.blur(); }
      }} />
    <div className={"gs-r" + (open ? " open" : "")}>
      {!items.length ? <div className="gs-empty">No matches.</div> : items.map((l, i) => {
        const line2 = [schoolOf(l), l.district && l.district !== l.school ? l.district : ""].filter(Boolean).join(" · ");
        const line3 = [l.email, l.phone].filter(Boolean).join(" · ");
        return <button key={l.id} className={i === sel ? "sel" : ""} onClick={() => go(l)}>
          <div><b>{name(l)}</b> <span className="gs-badge">{l.type || "principal"}</span></div>
          {line2 ? <div className="small muted">{line2}</div> : null}
          {line3 ? <div className="small">{line3}</div> : null}</button>;
      })}
    </div>
  </div>;
}
