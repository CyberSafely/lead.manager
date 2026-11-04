// Resources: reference notes for the team — findings that clarify topics like "what counts as an affiliate".
// Team-shared in the cloud build (saved with the rest of the app state). Add, edit and delete in the app.
import { useState } from "react";
import { S, save } from "../store";
import { uid } from "../lib/helpers";
import { Inp, Ta } from "../components/ui";
import type { Resource } from "../lib/types";

function Card({ r }: { r: Resource }) {
  const [edit, setEdit] = useState(!r.title && !r.body);
  const done = () => { r.updatedAt = new Date().toISOString(); save(); };
  const remove = () => { if (confirm("Delete this resource?")) { S.resources = (S.resources || []).filter(x => x.id !== r.id); save(); } };
  const tags = (r.tags || "").split(",").map(t => t.trim()).filter(Boolean);
  if (edit) return <div className="card" style={{ maxWidth: 820, marginBottom: 12 }}>
    <Inp value={r.title} placeholder="Title (e.g. What counts as an affiliate)" style={{ width: "100%", fontWeight: 600 }} onCommit={v => { r.title = v; done(); }} />
    <Ta value={r.body} placeholder="Your findings. Plain text; blank lines and line breaks are kept." style={{ width: "100%", marginTop: 8, minHeight: 160 }} onCommit={v => { r.body = v; done(); }} />
    <Inp value={r.tags} placeholder="Tags (comma-separated, optional)" style={{ width: "100%", marginTop: 8 }} onCommit={v => { r.tags = v; done(); }} />
    <div className="row" style={{ marginTop: 8 }}>
      <button className="b sm p" onClick={() => setEdit(false)}>Done</button>
      <button className="b d sm" onClick={remove}>Delete</button>
    </div>
  </div>;
  return <div className="card" style={{ maxWidth: 820, marginBottom: 12 }}>
    <div className="row" style={{ alignItems: "baseline" }}>
      <h2 className="grow" style={{ margin: 0, fontSize: 18 }}>{r.title || "(untitled)"}</h2>
      <button className="b sm" onClick={() => setEdit(true)}>Edit</button>
    </div>
    {tags.length ? <div className="row" style={{ marginTop: 6 }}>{tags.map((t, i) => <span key={i} className="chip">{t}</span>)}</div> : null}
    <div style={{ whiteSpace: "pre-wrap", marginTop: 8 }}>{r.body || <span className="muted">No details yet.</span>}</div>
    {r.updatedAt ? <div className="small muted" style={{ marginTop: 8 }}>Updated {new Date(r.updatedAt).toLocaleDateString()}</div> : null}
  </div>;
}

export function Resources() {
  const list = S.resources || [];
  const add = () => { S.resources = [{ id: uid(), title: "", body: "", updatedAt: new Date().toISOString() }, ...list]; save(); };
  return <div>
    <div className="row" style={{ maxWidth: 820, marginBottom: 12 }}>
      <div className="grow">
        <h2 style={{ margin: 0 }}>Resources</h2>
        <p className="small muted" style={{ margin: "4px 0 0" }}>Reference notes and findings for the team — definitions, how-tos, and the things worth writing down as the affiliate program develops.</p>
      </div>
      <button className="b p" onClick={add}>＋ New resource</button>
    </div>
    {list.length ? list.map(r => <Card key={r.id} r={r} />)
      : <div className="card" style={{ maxWidth: 820 }}><p className="muted" style={{ margin: 0 }}>No resources yet. Click <b>New resource</b> to add your first finding — for example, what defines an affiliate.</p></div>}
  </div>;
}
