// Affiliates list: paste a profile link and the fields fill in. Instagram business / creator accounts are looked up
// through Meta (cloud build); for personal accounts, paste the profile text and it's read from that.
import { useState } from "react";
import { DL, S, openLead, save } from "../store";
import { setNext } from "../lib/logic";
import { parseFollowers, uid } from "../lib/helpers";
import { WHY, emptyDraft, lookupIg, parseLink, parseText, type Draft } from "../lib/quickAdd";
import type { Lead } from "../lib/types";

const low = (s?: string) => (s || "").toLowerCase();
const PLATFORMS = ["Instagram", "TikTok", "Facebook", "YouTube", "X", "Other"];

/** Same name rules as the CSV import: "Dr. Pat Example" → Dr. + Pat + Example; "Pat & Sam" or a page name stays whole. */
function splitName(n: string) {
  let sal = ""; const f = n.trim().replace(/^(dr\.?|doctor)\s+/i, () => { sal = "Dr."; return ""; }), p = f.split(/\s+/).filter(Boolean);
  if (!p.length) return { first: "", last: "", sal };
  if (sal) { const last = p.pop()!; return { first: p.join(" "), last, sal }; }
  if (f.includes("&") || p.length > 2) return { first: f, last: "", sal };
  return { first: p[0], last: p.slice(1).join(" "), sal };
}

export function QuickAdd() {
  const [link, setLink] = useState("");
  const [d, setD] = useState<Draft>(emptyDraft);
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const [paste, setPaste] = useState("");
  const [open, setOpen] = useState(false);
  const set = (k: keyof Draft) => (e: { target: { value: string } }) => setD({ ...d, [k]: e.target.value });
  const existing = d.handle ? DL().find(l => low(l.handle) === low(d.handle) && low(l.platform) === low(d.platform)) : undefined;

  const go = async (raw: string) => {
    setLink(raw); setPaste(""); setMsg("");
    const p = parseLink(raw);
    if (!p) { setD(emptyDraft()); if (raw.trim()) setMsg("Paste a profile link (instagram.com/…, tiktok.com/@…, facebook.com/…) or @username."); return; }
    const base = { ...emptyDraft(), ...p } as Draft; setD(base); setOpen(true);
    if (p.platform !== "Instagram") { setMsg("Name and followers: paste the profile text below."); return; }
    setBusy(true);
    const r = await lookupIg(base.handle); setBusy(false);
    if (r.ok) { setD(x => ({ ...x, ...Object.fromEntries(Object.entries(r.d).filter(([k, v]) => v !== "" && v != null && k !== "posts")) })); setMsg(`✓ Filled from Instagram${r.d.posts != null ? ` · ${r.d.posts} posts` : ""}. Check it, then add.`); }
    else setMsg(WHY[r.why] || "Lookup failed.");
  };
  const fromText = (t: string) => {
    setPaste(t); const x = parseText(t, d.handle);
    setD(o => ({ ...o, ...Object.fromEntries(Object.entries(x).filter(([, v]) => v)) }));
    if (x.followers || x.name) setMsg("✓ Read from the pasted text. Check it, then add.");
  };
  const reset = () => { setLink(""); setD(emptyDraft()); setMsg(""); setPaste(""); };

  const add = () => {
    if (!d.handle) return;
    const nm = splitName(d.name), rec: Partial<Lead> = {
      handle: d.handle.replace(/^@/, ""), platform: d.platform, followers: parseFollowers(d.followers), profileUrl: d.profileUrl,
      ...(d.name ? { first: nm.first, last: nm.last, ...(nm.sal ? { title_salutation: nm.sal } : {}) } : {}),
      ...(d.email ? { email: d.email.trim().toLowerCase() } : {}),
    };
    if (existing) {
      // Update: fill in what's given; notes are added only if the record has none (as in the import)
      Object.entries(rec).forEach(([k, v]) => { if (v) (existing as unknown as Record<string, unknown>)[k] = v; });
      if (d.notes && !existing.notes) existing.notes = d.notes;
      save(); openLead(existing.id);
    } else {
      const l = { id: uid(), ...rec, notes: d.notes, type: "affiliate", stage: "new", seq: 0, sent: [], path: "", activity: [], families: {}, createdAt: new Date().toISOString() } as Lead;
      setNext(l); S.leads.push(l); save(); openLead(l.id);
    }
    reset();
  };

  const f = (k: keyof Draft, label: string, w = 160) => <label className="small" style={{ display: "grid", gap: 2 }}>{label}
    <input value={d[k]} onChange={set(k)} style={{ width: w }} /></label>;
  return <div className="card" style={{ marginBottom: 12 }} data-parity-skip>
    <div className="row">
      <b>Quick add</b>
      <input className="grow" style={{ minWidth: 240 }} placeholder="Paste an Instagram, TikTok or Facebook link (or @username)" value={link}
        onChange={e => setLink(e.target.value)} onPaste={e => { const t = e.clipboardData.getData("text"); e.preventDefault(); go(t); }}
        onKeyDown={e => { if (e.key === "Enter") go(link); }} />
      {d.handle || link ? <button className="b sm" onClick={reset}>Clear</button> : null}
    </div>
    {busy ? <p className="small muted" style={{ margin: "6px 0 0" }}>Looking up @{d.handle}…</p> : msg ? <p className="small muted" style={{ margin: "6px 0 0" }}>{msg}</p> : null}
    {d.handle && open ? <>
      <div className="row" style={{ marginTop: 8, alignItems: "flex-end", flexWrap: "wrap" }}>
        {f("handle", "Username", 150)}
        <label className="small" style={{ display: "grid", gap: 2 }}>Platform
          <select value={d.platform} onChange={set("platform")}>{[...new Set([d.platform, ...PLATFORMS])].filter(Boolean).map(p => <option key={p}>{p}</option>)}</select></label>
        {f("name", "Name", 180)}{f("followers", "Followers", 90)}{f("email", "Email", 180)}{f("profileUrl", "Link", 220)}
      </div>
      <label className="small" style={{ display: "grid", gap: 2, marginTop: 6 }}>Notes (bio)
        <textarea rows={2} value={d.notes} onChange={set("notes")} /></label>
      {!d.name || !d.followers ? <label className="small" style={{ display: "grid", gap: 2, marginTop: 6 }}>Missing name or followers? On the profile page press ⌘A then ⌘C, and paste here:
        <textarea rows={2} value={paste} placeholder="Paste the profile page text" onChange={e => fromText(e.target.value)} /></label> : null}
      <div className="row" style={{ marginTop: 8 }}>
        <button className="b p" onClick={add}>{existing ? "Update existing affiliate" : "Add affiliate"}</button>
        {existing ? <span className="small muted">@{existing.handle} on {existing.platform} is already on the list. This fills in what's new.</span> : null}
      </div>
    </> : null}
  </div>;
}
