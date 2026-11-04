// Resources: reference notes for the team — findings that clarify topics like "what counts as an affiliate".
// Team-shared in the cloud build (saved with the rest of the app state). Add, edit and delete in the app.
// Each resource is its own container: the title shows collapsed; click the chevron (or title) to expand the details.
import { useState } from "react";
import { ChevronRight } from "lucide-react";
import { S, save } from "../store";
import { uid } from "../lib/helpers";
import { Inp, Ta } from "../components/ui";
import type { Resource } from "../lib/types";

function Card({ r, startOpen }: { r: Resource; startOpen?: boolean }) {
  const isNew = !r.title && !r.body;
  const [open, setOpen] = useState(!!startOpen || isNew);
  const [edit, setEdit] = useState(isNew);
  const done = () => { r.updatedAt = new Date().toISOString(); save(); };
  const remove = () => { if (confirm("Delete this resource?")) { S.resources = (S.resources || []).filter(x => x.id !== r.id); save(); } };
  const tags = (r.tags || "").split(",").map(t => t.trim()).filter(Boolean);

  return <div className="card" style={{ maxWidth: 820, marginBottom: 10, padding: 0, overflow: "hidden" }}>
    <div className="row" style={{ alignItems: "center", gap: 8, padding: "12px 14px", cursor: "pointer" }}
      onClick={() => { if (!edit) setOpen(o => !o); }}>
      <ChevronRight size={18} strokeWidth={2} aria-hidden="true"
        style={{ flexShrink: 0, transition: "transform .15s", transform: open ? "rotate(90deg)" : "none", color: "var(--muted)" }} />
      <b className="grow" style={{ fontSize: 16 }}>{r.title || "(untitled)"}</b>
      {!open && tags.length ? <span className="chip">{tags[0]}{tags.length > 1 ? " +" + (tags.length - 1) : ""}</span> : null}
    </div>
    {open ? <div style={{ padding: "0 14px 14px", borderTop: "1px solid var(--line)" }}>
      {edit ? <>
        <Inp value={r.title} placeholder="Title (e.g. What counts as an affiliate)" style={{ width: "100%", marginTop: 12, fontWeight: 600 }} onCommit={v => { r.title = v; done(); }} />
        <Ta value={r.body} placeholder="Your findings. Plain text; blank lines and line breaks are kept." style={{ width: "100%", marginTop: 8, minHeight: 180 }} onCommit={v => { r.body = v; done(); }} />
        <Inp value={r.tags} placeholder="Tags (comma-separated, optional)" style={{ width: "100%", marginTop: 8 }} onCommit={v => { r.tags = v; done(); }} />
        <div className="row" style={{ marginTop: 10 }}>
          <button className="b sm p" onClick={() => setEdit(false)}>Done</button>
          <button className="b d sm" onClick={remove}>Delete</button>
        </div>
      </> : <>
        {tags.length ? <div className="row" style={{ marginTop: 12 }}>{tags.map((t, i) => <span key={i} className="chip">{t}</span>)}</div> : null}
        <div style={{ whiteSpace: "pre-wrap", marginTop: 12 }}>{r.body || <span className="muted">No details yet.</span>}</div>
        <div className="row" style={{ marginTop: 12, alignItems: "center" }}>
          <button className="b sm" onClick={() => setEdit(true)}>Edit</button>
          <button className="b d sm" onClick={remove}>Delete</button>
          <span className="grow"></span>
          {r.updatedAt ? <span className="small muted">Updated {new Date(r.updatedAt).toLocaleDateString()}</span> : null}
        </div>
      </>}
    </div> : null}
  </div>;
}

export function Resources() {
  const list = S.resources || [];
  const add = () => { S.resources = [{ id: uid(), title: "", body: "", updatedAt: new Date().toISOString() }, ...list]; save(); };
  return <div>
    <div className="row" style={{ maxWidth: 820, marginBottom: 12 }}>
      <div className="grow">
        <h2 style={{ margin: 0 }}>Resources</h2>
        <p className="small muted" style={{ margin: "4px 0 0" }}>Reference notes and findings for the team — definitions, how-tos, and the things worth writing down as the affiliate program develops. Click a title to expand it.</p>
      </div>
      <button className="b p" onClick={add}>＋ New resource</button>
    </div>
    {list.length ? list.map(r => <Card key={r.id} r={r} />)
      : <div className="card" style={{ maxWidth: 820 }}><p className="muted" style={{ margin: 0 }}>No resources yet. Click <b>New resource</b> to add your first finding — for example, what defines an affiliate.</p></div>}
  </div>;
}
