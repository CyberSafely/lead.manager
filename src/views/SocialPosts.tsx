// Social → Calendar and Posts: plan posts on a month calendar (drag a post to another day), move them through
// Idea → Drafting → Ready for review → Scheduled → Posted on a board, and edit one in the side panel.
import { Fragment, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, ImagePlus, Link2, MessageSquare, Paperclip, Plus } from "lucide-react";
import { S, render, ui } from "../store";
import { fmtDate, fmtFollowers, isAff, iso, name, todayISO } from "../lib/helpers";
import { FlashButton, Inp, Ta, copy, css } from "../components/ui";
import {
  LIMITS, MAX_FILE, PLATFORMS, POST_C, POST_STATUS, RESULTS, commentsOf, delItem, isCloud, item, itemsOf, me, newItem, patch, safeUrl, uploadFile,
  type Item, type Post, type PostStatus,
} from "../social/data";
import { FileCard, PChip, Thread, openFile } from "../social/ui";

export const openItem = (id: string | null) => { ui.socOpen = id; render(); };
export function newPost(d: Partial<Post> = {}) {
  const it = newItem("post", { title: "", status: d.date ? "draft" : "idea", platforms: ["Instagram"], owner: me(), ...d });
  openItem(it.id);
}
const statusName = (s: PostStatus) => POST_STATUS.find(x => x[0] === s)![1];

function PostCard({ it, compact }: { it: Item<"post">; compact?: boolean }) {
  const p = it.data, n = commentsOf(it.id).length;
  return <div className={"tile" + (compact ? " sm" : "")} draggable role="button" tabIndex={0} style={css({ "--c": `var(${POST_C[p.status]})` })}
    onClick={e => { e.stopPropagation(); openItem(it.id); }} onKeyDown={e => { if (e.key === "Enter") openItem(it.id); }}
    onDragStart={e => { e.dataTransfer.setData("text/plain", it.id); e.dataTransfer.effectAllowed = "move"; }}>
    <div className="tile-top"><span className="t">{p.title || "(untitled post)"}</span></div>
    {compact ? null : <>
      <div className="tile-meta">{p.platforms.map(x => <PChip key={x} p={x} />)}</div>
      <div className="small muted">{[p.date ? fmtDate(p.date) + (p.time ? " " + p.time : "") : "No date", p.owner].filter(Boolean).join(" · ")}
        {p.media?.length ? <> · <Paperclip size={12} aria-hidden="true" /> {p.media.length}</> : null}{n ? <> · <MessageSquare size={12} aria-hidden="true" /> {n}</> : null}</div>
    </>}
  </div>;
}

/* ---------- calendar ---------- */
export function Calendar() {
  const [m, setM] = useState(() => todayISO().slice(0, 7));
  const [drop, setDrop] = useState("");
  const first = new Date(m + "-01T12:00"), start = new Date(first); start.setDate(1 - ((first.getDay() + 6) % 7));
  const days = Array.from({ length: 42 }, (_, i) => { const d = new Date(start); d.setDate(start.getDate() + i); return iso(d); });
  const weeks = days[35].slice(0, 7) === m ? 6 : 5, t = todayISO();
  const posts = itemsOf("post");
  // Affiliates' posts about us (logged with "Posted / shared link"), so the calendar shows them too
  const affPosts = S.leads.filter(isAff).flatMap(l => (l.activity || []).filter(a => a.type === "Posted / shared link").map(a => ({ l, d: iso(new Date(a.ts)) })));
  const shift = (n: number) => { const d = new Date(m + "-01T12:00"); d.setMonth(d.getMonth() + n); setM(iso(d).slice(0, 7)); };
  const unplanned = posts.filter(p => !p.data.date && p.data.status !== "posted");
  return <>
    <div className="row" style={{ marginBottom: 10 }}>
      <button className="b sm" aria-label="Previous month" onClick={() => shift(-1)}><ChevronLeft size={16} aria-hidden="true" /></button>
      <h2 style={{ margin: 0, minWidth: 180, textAlign: "center" }}>{first.toLocaleDateString(undefined, { month: "long", year: "numeric" })}</h2>
      <button className="b sm" aria-label="Next month" onClick={() => shift(1)}><ChevronRight size={16} aria-hidden="true" /></button>
      <button className="b sm" onClick={() => setM(t.slice(0, 7))}>Today</button>
      <span className="grow"></span>
      <span className="leg small muted">{POST_STATUS.map(([k, v]) => <span key={k}><span className="dot" style={css({ "--c": `var(${POST_C[k]})` })}></span>{v}</span>)}</span>
      <button className="b sm p" onClick={() => newPost({ date: t })}><Plus size={14} aria-hidden="true" /> New post</button>
    </div>
    <div className="cal">
      {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map(d => <div key={d} className="cal-h">{d}</div>)}
      {days.slice(0, weeks * 7).map(d => {
        const ps = posts.filter(p => p.data.date === d).sort((a, b) => (a.data.time || "").localeCompare(b.data.time || ""));
        const ap = affPosts.filter(x => x.d === d);
        return <div key={d} className={"cal-d" + (d.slice(0, 7) !== m ? " out" : "") + (d === t ? " today" : "") + (drop === d ? " drop" : "")}
          onClick={() => newPost({ date: d })} title="Click to plan a post on this day"
          onDragOver={e => { e.preventDefault(); setDrop(d); }} onDragLeave={() => setDrop(x => x === d ? "" : x)}
          onDrop={e => { e.preventDefault(); setDrop(""); const it = item(e.dataTransfer.getData("text/plain")); if (it?.kind === "post") patch(it as Item<"post">, { date: d }); }}>
          <div className="cal-n">{+d.slice(8)}</div>
          {ps.map(p => <PostCard key={p.id} it={p} compact />)}
          {ap.map((x, i) => <div key={i} className="cal-aff small" title="An affiliate posted about us" onClick={e => e.stopPropagation()}>📣 @{x.l.handle || name(x.l)}</div>)}
        </div>;
      })}
    </div>
    {unplanned.length ? <div className="card" style={{ marginTop: 12 }}><h3 style={{ marginTop: 0 }}>No date yet ({unplanned.length})</h3>
      <p className="small muted" style={{ marginTop: 0 }}>Drag one onto a day to schedule it.</p>
      <div className="unplanned">{unplanned.map(p => <PostCard key={p.id} it={p} />)}</div></div> : null}
  </>;
}

/* ---------- board ---------- */
export function PostBoard() {
  const [drop, setDrop] = useState("");
  const posts = itemsOf("post");
  return <>
    <div className="row" style={{ marginBottom: 10 }}>
      <p className="small muted grow" style={{ margin: 0 }}>Drag a card to change its status. Ideas don't need a date.</p>
      <button className="b sm" onClick={() => newPost()}><Plus size={14} aria-hidden="true" /> New idea</button>
    </div>
    <div className="board">{POST_STATUS.map(([k, v]) => {
      const ps = posts.filter(p => p.data.status === k).sort((a, b) => (a.data.date || "9").localeCompare(b.data.date || "9"));
      return <section key={k} aria-label={v} className={"col" + (drop === k ? " drop" : "")} style={css({ "--c": `var(${POST_C[k]})` })}
        onDragOver={e => { e.preventDefault(); setDrop(k); }} onDragLeave={e => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setDrop(""); }}
        onDrop={e => { e.preventDefault(); setDrop(""); const it = item(e.dataTransfer.getData("text/plain")); if (it?.kind === "post") patch(it as Item<"post">, { status: k }); }}>
        <div className="col-head" style={{ cursor: "default" }}><span className="col-dot" aria-hidden="true"></span><span className="col-title">{v}</span><span className="count">{ps.length}</span></div>
        <div className="col-body">{ps.map(p => <PostCard key={p.id} it={p} />)}{ps.length ? null : <div className="col-empty">Drop a card here</div>}</div>
      </section>;
    })}</div>
  </>;
}

/* ---------- one post ---------- */
export function PostPanel({ it }: { it: Item<"post"> }) {
  // Always patch the latest copy (an upload or a teammate may have changed it since this render)
  const p = it.data, set = (d: Partial<Post>) => patch((item(it.id) || it) as Item<"post">, d);
  const [busy, setBusy] = useState(""), linkName = useRef<HTMLInputElement>(null), linkUrl = useRef<HTMLInputElement>(null);
  const text = [p.caption, p.hashtags].filter(Boolean).join("\n\n"), tags = (p.hashtags || "").match(/#[\p{L}\p{N}_]+/gu)?.length || 0;
  const files = (p.media || []).map(id => item(id)).filter(Boolean) as Item<"file">[];
  const lib = itemsOf("file").filter(f => !(p.media || []).includes(f.id));
  const owners = [...new Set([me(), ...itemsOf("post").map(x => x.data.owner), ...itemsOf("group").map(x => x.data.owner)].filter(Boolean) as string[])];
  const attach = (id: string) => set({ media: [...(p.media || []), id] });
  const affs = S.leads.filter(isAff).sort((a, b) => (a.handle || "").localeCompare(b.handle || ""));
  return <>
    <div className="row"><h2 style={{ margin: 0 }} className="grow">{p.title || "New post"}</h2><button className="b sm" onClick={() => openItem(null)}>Close ✕</button></div>
    <div className="f" style={{ marginTop: 12 }}>
      <label>Title</label><Inp value={p.title} placeholder="e.g. Back-to-school screen time tips" onCommit={v => set({ title: v.trim() })} />
      <label>Status</label><select value={p.status} onChange={e => set({ status: e.target.value as PostStatus })}>{POST_STATUS.map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
      <label>Date and time</label><div className="row"><Inp type="date" value={p.date} onCommit={v => set({ date: v })} /><Inp type="time" value={p.time} onCommit={v => set({ time: v })} /></div>
      <label>Owner</label><><Inp value={p.owner} list="soc-owners" placeholder="Who posts it" onCommit={v => set({ owner: v.trim() })} /><datalist id="soc-owners">{owners.map(o => <option key={o} value={o} />)}</datalist></>
    </div>
    <h3>Platforms</h3>
    <div className="row">{PLATFORMS.map(x => { const on = p.platforms.includes(x); return <button key={x} className={"b sm" + (on ? " p" : "")} aria-pressed={on}
      onClick={() => set({ platforms: on ? p.platforms.filter(y => y !== x) : [...p.platforms, x] })}>{x}</button>; })}</div>
    {p.platforms.includes("Facebook group") ? <div className="f" style={{ marginTop: 8 }}><label>Facebook group</label>
      <select value={p.groupId || ""} onChange={e => set({ groupId: e.target.value })}><option value="">Pick a group…</option>
        {itemsOf("group").map(g => <option key={g.id} value={g.id}>{g.data.name}</option>)}</select></div> : null}

    <h3>Caption</h3>
    <Ta value={p.caption} rows={7} placeholder="Write the caption. Keep it in your own words; no student or family details." onCommit={v => set({ caption: v })} />
    <label className="small muted" style={{ display: "block", marginTop: 6 }}>Hashtags</label>
    <Ta value={p.hashtags} rows={2} placeholder="#onlinesafety #parenting" onCommit={v => set({ hashtags: v })} />
    <div className="row small" style={{ marginTop: 4 }}>
      {p.platforms.filter(x => LIMITS[x]).map(x => <span key={x} className={text.length > LIMITS[x] ? "over" : "muted"}>{x}: {text.length.toLocaleString()} / {LIMITS[x].toLocaleString()}</span>)}
      {p.platforms.includes("Instagram") ? <span className={tags > 30 ? "over" : "muted"}>{tags} / 30 hashtags</span> : null}
    </div>
    <div className="row" style={{ marginTop: 6 }}>
      <FlashButton label="Copy caption + hashtags" onClick={() => copy(text)} />
      {itemsOf("snippet").length ? <select value="" onChange={e => { const s = item(e.target.value); if (s?.kind !== "snippet") return; const sn = (s as Item<"snippet">).data;
        if (sn.type === "hashtags") set({ hashtags: [p.hashtags, sn.text].filter(Boolean).join(" ") }); else set({ caption: [p.caption, sn.text].filter(Boolean).join("\n\n") }); }}>
        <option value="">Insert from library…</option>{itemsOf("snippet").map(s => <option key={s.id} value={s.id}>{s.data.type === "hashtags" ? "# " : ""}{s.data.title}</option>)}</select> : null}
    </div>

    <h3>Media ({files.length})</h3>
    {files.length ? <div className="fgrid">{files.map(f => <FileCard key={f.id} it={f} actions={<>
      {f.data.path ? <button className="b sm" onClick={() => openFile(f.data, true)}>Download</button> : null}
      <button className="b sm" onClick={() => set({ media: (p.media || []).filter(m => m !== f.id) })}>Remove</button></>} />)}</div> : <p className="small muted">No media yet.</p>}
    <div className="row" style={{ marginTop: 8 }}>
      {isCloud() ? <label className="b sm p filebtn"><ImagePlus size={14} aria-hidden="true" /> Upload images / video
        <input type="file" multiple accept="image/*,video/*,application/pdf" onChange={async e => {
          const fs = [...(e.target.files || [])]; e.target.value = ""; if (!fs.length) return;
          const big = fs.filter(f => f.size > MAX_FILE); if (big.length) alert(`Over 50 MB, not uploaded: ${big.map(f => f.name).join(", ")}. Add a Google Drive link for those instead.`);
          let ids = [...(it.data.media || [])];
          for (const f of fs.filter(f => f.size <= MAX_FILE)) {
            setBusy(`Uploading ${f.name}…`);
            try { const x = await uploadFile(f, p.title || "Posts"); ids = [...ids, x.id]; patch(item(it.id) as Item<"post">, { media: ids }); }
            catch (err: any) { alert(`Couldn't upload ${f.name}: ${err?.message || err}`); }
          }
          setBusy("");
        }} /></label> : <span className="small muted">Uploading files works in the team (cloud) version. Here, add a link instead.</span>}
      {lib.length ? <select value="" onChange={e => e.target.value && attach(e.target.value)}><option value="">Attach from library…</option>
        {lib.map(f => <option key={f.id} value={f.id}>{f.data.folder ? f.data.folder + " / " : ""}{f.data.name}</option>)}</select> : null}
      {busy ? <span className="small muted">{busy}</span> : null}
    </div>
    <div className="row" style={{ marginTop: 6 }}>
      <input ref={linkName} placeholder="Link name" style={{ width: 140 }} /><input ref={linkUrl} className="grow" type="url" placeholder="Google Drive, Canva or Dropbox link" />
      <button className="b sm" onClick={() => {
        const u = safeUrl(linkUrl.current!.value); if (!u) { alert("Paste a link that starts with https://"); return; }
        const f = newItem("file", { name: linkName.current!.value.trim() || u.replace(/^https?:\/\/(www\.)?/, "").slice(0, 40), url: u, folder: "Links" });
        attach(f.id); linkName.current!.value = ""; linkUrl.current!.value = "";
      }}><Link2 size={14} aria-hidden="true" /> Add link</button>
    </div>

    <h3>Links in the post</h3>
    <Ta value={p.links} rows={2} placeholder="One per line: the sign-up page, a tracked link from Library → Link builder…" onCommit={v => set({ links: v })} />

    <h3>Connections</h3>
    <div className="f">
      <label>With an affiliate</label><select value={p.affiliateId || ""} onChange={e => set({ affiliateId: e.target.value })}><option value="">None</option>
        {affs.map(l => <option key={l.id} value={l.id}>@{l.handle} · {l.platform}{l.followers ? " · " + fmtFollowers(l.followers) : ""}</option>)}</select>
      <label>Live post link</label><div className="row"><Inp className="grow" type="url" value={p.postUrl} placeholder="After it's posted" onCommit={v => set({ postUrl: v.trim() })} />
        {safeUrl(p.postUrl) ? <a className="small" href={safeUrl(p.postUrl)} target="_blank" rel="noopener noreferrer">Open ↗</a> : null}</div>
    </div>
    {p.status === "posted" ? <><h3>Results</h3>
      <div className="f">{RESULTS.map(k => <Fragment key={k}><label>{k === "signups" ? "Sign-ups" : k[0].toUpperCase() + k.slice(1)}</label>
        <Inp type="number" min="0" value={p.results?.[k]} placeholder="not yet measured" onCommit={v => set({ results: { ...(item(it.id) as Item<"post">).data.results, [k]: v } })} /></Fragment>)}</div></> : null}
    <h3>Notes</h3>
    <Ta value={p.notes} rows={3} placeholder="Ideas, references, what to change." onCommit={v => set({ notes: v })} />
    <h3>Discussion ({commentsOf(it.id).length})</h3>
    <Thread id={it.id} />
    <div className="row" style={{ marginTop: 16 }}>
      <button className="b sm" onClick={() => { const c = newItem("post", { ...structuredClone(p), title: (p.title || "Post") + " (copy)", status: p.status === "posted" ? "draft" : p.status, postUrl: "", results: {} }); openItem(c.id); }}>Duplicate</button>
      <button className="b sm d" onClick={() => { if (confirm("Delete this post and its comments? Its media stays in the Library.")) { delItem(it.id); openItem(null); } }}>Delete post</button>
    </div>
  </>;
}
export { statusName };
