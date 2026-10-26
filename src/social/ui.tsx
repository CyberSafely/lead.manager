// Social tab building blocks: discussion threads, media thumbnails, platform chips.
import { useEffect, useRef, useState } from "react";
import { FileText, Film, Link2, Trash2 } from "lucide-react";
import { addComment, commentsOf, delComment, fileUrl, fmtSize, safeUrl, type Item, type SFile } from "./data";

/** A discussion thread on a post, a group, or the team ("team"). Text only; links in it aren't clickable. */
export function Thread({ id, compact }: { id: string; compact?: boolean }) {
  const cs = commentsOf(id), ta = useRef<HTMLTextAreaElement>(null);
  const send = () => { addComment(id, ta.current!.value); ta.current!.value = ""; };
  return <div className="thread">
    {cs.length ? cs.map(c => <div key={c.id} className="cmt">
      <div className="cmt-h"><b>{c.author || "Teammate"}</b><span className="muted small">{new Date(c.created_at).toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}</span>
        <button className="b sm ghost" title="Delete comment" aria-label="Delete comment" onClick={() => { if (confirm("Delete this comment?")) delComment(c.id); }}><Trash2 size={13} aria-hidden="true" /></button></div>
      <div className="cmt-b">{c.body}</div></div>) : <p className="small muted">No comments yet.</p>}
    <textarea ref={ta} rows={compact ? 2 : 3} placeholder="Write a comment… (Ctrl+Enter to post. No student or family details.)"
      onKeyDown={e => { if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) { e.preventDefault(); send(); } }} />
    <div className="row" style={{ marginTop: 6 }}><button className="b sm p" onClick={send}>Post comment</button></div>
  </div>;
}

/** Thumbnail for an image or video file; an icon for anything else. Stored files load through a short-lived link. */
export function Thumb({ f }: { f: SFile }) {
  const [src, setSrc] = useState<string | undefined>(f.path ? undefined : safeUrl(f.url));
  useEffect(() => { let on = true; if (f.path && /^(image|video)\//.test(f.type || "")) fileUrl(f).then(u => { if (on) setSrc(u); }); return () => { on = false; }; }, [f.path]);
  if (f.path && src && (f.type || "").startsWith("image/")) return <img className="thumb" src={src} alt={f.name} loading="lazy" />;
  if (f.path && src && (f.type || "").startsWith("video/")) return <video className="thumb" src={src} muted preload="metadata" />;
  const Ic = f.url ? Link2 : (f.type || "").startsWith("video/") ? Film : FileText;
  return <div className="thumb ico"><Ic size={26} aria-hidden="true" /></div>;
}

/** Open a file (stored: a fresh private link; linked: the link itself) in a new tab. */
export async function openFile(f: SFile, download = false) {
  const w = window.open("", "_blank"); const u = await fileUrl(f, download);
  if (w && u) { w.opener = null; w.location.href = u; } else w?.close();
}

export function FileCard({ it, actions }: { it: Item<"file">; actions?: React.ReactNode }) {
  const f = it.data;
  return <div className="fcard">
    <button className="fcard-t" onClick={() => openFile(f)} title={"Open " + f.name}><Thumb f={f} /></button>
    <div className="fcard-n" title={f.name}>{f.name}</div>
    <div className="small muted">{[f.folder, f.url ? "Link" : fmtSize(f.size)].filter(Boolean).join(" · ")}</div>
    {actions ? <div className="row fcard-a">{actions}</div> : null}
  </div>;
}

export const PChip = ({ p }: { p: string }) => <span className="pill">{p}</span>;
