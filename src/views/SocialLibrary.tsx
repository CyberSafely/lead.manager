// Social → Library: the team's shared media (uploaded to the private bucket, or Drive / Canva links), saved captions,
// hashtag sets and replies, and a link builder for tracked (UTM) links.
import { useRef, useState } from "react";
import { Copy, FolderOpen, Link2, Plus, Upload } from "lucide-react";
import { S, save } from "../store";
import { isAff } from "../lib/helpers";
import { FlashButton, Inp, Ta, copy } from "../components/ui";
import { MAX_FILE, delItem, isCloud, itemsOf, newItem, patch, safeUrl, uploadFile, type Snippet } from "../social/data";
import { FileCard, openFile } from "../social/ui";

export function Library() {
  return <div className="grid" style={{ gap: 16 }}>
    <Files />
    <div className="grid" style={{ gridTemplateColumns: "repeat(auto-fit,minmax(340px,1fr))", gap: 16, alignItems: "start" }}>
      <Snippets />
      <LinkBuilder />
    </div>
  </div>;
}

function Files() {
  const [folder, setFolder] = useState(""), [busy, setBusy] = useState(""), [q, setQ] = useState("");
  const fRef = useRef<HTMLInputElement>(null), nRef = useRef<HTMLInputElement>(null), uRef = useRef<HTMLInputElement>(null);
  const all = itemsOf("file"), folders = [...new Set(all.map(f => f.data.folder || "").filter(Boolean))].sort();
  const shown = all.filter(f => (!folder || f.data.folder === folder) && (!q || f.data.name.toLowerCase().includes(q.toLowerCase())))
    .sort((a, b) => (b.created_at || "").localeCompare(a.created_at || ""));
  const target = () => (fRef.current?.value || folder || "").trim();
  return <div className="card">
    <div className="row" style={{ marginBottom: 8 }}><h2 style={{ margin: 0 }} className="grow"><FolderOpen size={18} aria-hidden="true" /> Shared media</h2>
      <input placeholder="Search files" value={q} onChange={e => setQ(e.target.value)} />
      <select value={folder} onChange={e => setFolder(e.target.value)}><option value="">All folders ({all.length})</option>{folders.map(f => <option key={f}>{f}</option>)}</select></div>
    <p className="small muted" style={{ marginTop: 0 }}>{isCloud()
      ? "Files are stored in the team's private storage: only signed-in teammates can open them. Up to 50 MB each; for longer videos, add a Google Drive link."
      : "This copy of the app is local-only, so files can't be uploaded here. Add Google Drive, Canva or Dropbox links; the team (cloud) version also stores files."}</p>
    <div className="row" style={{ marginBottom: 10 }}>
      <input ref={fRef} list="soc-folders" placeholder={folder || "Folder (optional)"} style={{ width: 170 }} /><datalist id="soc-folders">{folders.map(f => <option key={f} value={f} />)}</datalist>
      {isCloud() ? <label className="b sm p filebtn"><Upload size={14} aria-hidden="true" /> Upload files
        <input type="file" multiple onChange={async e => {
          const fs = [...(e.target.files || [])]; e.target.value = ""; if (!fs.length) return;
          const big = fs.filter(f => f.size > MAX_FILE); if (big.length) alert(`Over 50 MB, not uploaded: ${big.map(f => f.name).join(", ")}. Add a Google Drive link for those instead.`);
          for (const f of fs.filter(f => f.size <= MAX_FILE)) {
            setBusy(`Uploading ${f.name}…`);
            try { await uploadFile(f, target()); } catch (err: any) { alert(`Couldn't upload ${f.name}: ${err?.message || err}`); }
          }
          setBusy("");
        }} /></label> : null}
      <span className="muted small">or</span>
      <input ref={nRef} placeholder="Link name" style={{ width: 140 }} /><input ref={uRef} type="url" className="grow" placeholder="https://drive.google.com/…" style={{ minWidth: 200 }} />
      <button className="b sm" onClick={() => {
        const u = safeUrl(uRef.current!.value); if (!u) { alert("Paste a link that starts with https://"); return; }
        newItem("file", { name: nRef.current!.value.trim() || u.replace(/^https?:\/\/(www\.)?/, "").slice(0, 40), url: u, folder: target() || "Links" });
        nRef.current!.value = ""; uRef.current!.value = "";
      }}><Link2 size={14} aria-hidden="true" /> Add link</button>
      {busy ? <span className="small muted">{busy}</span> : null}
    </div>
    {shown.length ? <div className="fgrid">{shown.map(f => <FileCard key={f.id} it={f} actions={<>
      {f.data.path ? <button className="b sm" onClick={() => openFile(f.data, true)}>Download</button> : null}
      <button className="b sm" title="Move to a folder" onClick={() => { const v = prompt("Folder", f.data.folder || ""); if (v !== null) patch(f, { folder: v.trim() }); }}>Folder</button>
      <button className="b sm d" onClick={() => { if (confirm(`Delete "${f.data.name}"${f.data.path ? " for everyone" : ""}? Posts using it lose it.`)) delItem(f.id); }}>Delete</button></>} />)}</div>
      : <p className="small muted">{all.length ? "No files match." : "No files yet."}</p>}
  </div>;
}

const SN_TYPES: [Snippet["type"], string][] = [["caption", "Caption"], ["hashtags", "Hashtag set"], ["reply", "Comment / DM reply"], ["link", "Link"]];
function Snippets() {
  const [type, setType] = useState<Snippet["type"] | "">("");
  const all = itemsOf("snippet").filter(s => !type || s.data.type === type).sort((a, b) => a.data.title.localeCompare(b.data.title));
  return <div className="card">
    <div className="row" style={{ marginBottom: 8 }}><h2 style={{ margin: 0 }} className="grow">Captions, hashtags and replies</h2>
      <select value={type} onChange={e => setType(e.target.value as Snippet["type"])}><option value="">All</option>{SN_TYPES.map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
      <button className="b sm" onClick={() => newItem("snippet", { title: "New " + (SN_TYPES.find(x => x[0] === (type || "caption"))![1]).toLowerCase(), type: type || "caption", text: "" })}><Plus size={14} aria-hidden="true" /> Add</button></div>
    <p className="small muted" style={{ marginTop: 0 }}>Reusable text. Insert it into a post from the post's Caption section, or copy it here.</p>
    {all.length ? all.map(s => <div key={s.id} className="snip">
      <div className="row"><Inp className="grow" value={s.data.title} onCommit={v => patch(s, { title: v.trim() })} />
        <select value={s.data.type} onChange={e => patch(s, { type: e.target.value as Snippet["type"] })}>{SN_TYPES.map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
        <FlashButton label={<Copy size={14} aria-label="Copy" />} onClick={() => copy(s.data.text)} />
        <button className="b sm d" onClick={() => { if (confirm("Delete this snippet?")) delItem(s.id); }}>Delete</button></div>
      <Ta value={s.data.text} rows={s.data.type === "hashtags" ? 2 : 4} placeholder={s.data.type === "hashtags" ? "#onlinesafety #parentingtips" : "Text…"} onCommit={v => patch(s, { text: v })} />
    </div>) : <p className="small muted">Nothing saved yet.</p>}
  </div>;
}

// Tracked links: utm_source / utm_medium / utm_campaign / utm_content, so clicks can be credited to a platform,
// post or affiliate once click tracking is connected.
function LinkBuilder() {
  const [f, setF] = useState({ base: S.settings.defaultLink || "https://cybersafely.ai", source: "instagram", medium: "affiliate", campaign: "parent-ambassadors", content: "" });
  const [aff, setAff] = useState("");
  const set = (k: keyof typeof f) => (e: { target: { value: string } }) => setF({ ...f, [k]: e.target.value });
  const slug = (s: string) => s.trim().toLowerCase().replace(/[^a-z0-9._-]+/g, "-").replace(/^-+|-+$/g, "");
  let url = "";
  try {
    const u = new URL(f.base.trim());
    ([["utm_source", f.source], ["utm_medium", f.medium], ["utm_campaign", f.campaign], ["utm_content", f.content]] as const).forEach(([k, v]) => { if (slug(v)) u.searchParams.set(k, slug(v)); });
    url = /^https?:$/.test(u.protocol) ? u.toString() : "";
  } catch (e) { /* not a URL yet */ }
  const affs = S.leads.filter(isAff).sort((a, b) => (a.handle || "").localeCompare(b.handle || ""));
  return <div className="card">
    <h2 style={{ marginTop: 0 }}>Link builder</h2>
    <p className="small muted" style={{ marginTop: 0 }}>Builds a tracked link (UTM tags) so clicks can be credited to a platform, post or affiliate once click tracking is connected.</p>
    <div className="f">
      <label>Page</label><input value={f.base} onChange={set("base")} placeholder="https://cybersafely.ai" />
      <label>Source</label><select value={f.source} onChange={set("source")}>{["instagram", "tiktok", "facebook", "facebook-group", "linkedin", "youtube", "x", "newsletter"].map(x => <option key={x}>{x}</option>)}</select>
      <label>Medium</label><select value={f.medium} onChange={set("medium")}>{["affiliate", "organic", "paid", "group-post", "dm", "bio-link"].map(x => <option key={x}>{x}</option>)}</select>
      <label>Campaign</label><input value={f.campaign} onChange={set("campaign")} placeholder="e.g. back-to-school" />
      <label>Content</label><div className="row"><input className="grow" value={f.content} onChange={set("content")} placeholder="Affiliate handle or post name" />
        {affs.length ? <select value="" onChange={e => { const l = affs.find(x => x.id === e.target.value); if (l) { setAff(l.id); setF({ ...f, content: l.handle || "", source: slug(l.platform || f.source) || f.source }); } }}>
          <option value="">From affiliate…</option>{affs.map(l => <option key={l.id} value={l.id}>@{l.handle}</option>)}</select> : null}</div>
    </div>
    <pre className="tpl" style={{ whiteSpace: "pre-wrap", wordBreak: "break-all" }}>{url || "Enter a page address that starts with https://"}</pre>
    <div className="row">
      <FlashButton label="Copy link" onClick={() => url ? copy(url) : undefined} />
      {aff && url ? <button className="b sm" onClick={() => {
        const l = S.leads.find(x => x.id === aff); if (!l) return;
        if (l.regLink && !confirm(`Replace @${l.handle}'s tracking link?\n\n${l.regLink}`)) return;
        l.regLink = url; l.updatedAt = new Date().toISOString(); save();
      }}>Save as @{S.leads.find(x => x.id === aff)?.handle}'s tracking link</button> : null}
    </div>
  </div>;
}
