// Social: the social media team's workspace. Affiliates and their results, post planning (calendar + board),
// Facebook groups to join and post in, a shared library (media, captions, hashtags, link builder) and team discussion.
// Its data lives in src/social/data.ts (the team database in the cloud build), apart from the outreach lists.
import { useEffect, useState } from "react";
import { CalendarDays, ExternalLink, KanbanSquare, LayoutDashboard, Library as LibIcon, MessagesSquare, Plus, Sparkles, Users } from "lucide-react";
import { S, openLead, render, setDs, setView, ui } from "../store";
import { MAIN, stg, stagesFor } from "../lib/pipeline";
import { dueClass, fmtDate, fmtFollowers, isAff, name, todayISO } from "../lib/helpers";
import { Dot, Inp, Ta, css, cv } from "../components/ui";
import {
  GROUP_STATUS, POST_C, POST_STATUS, commentsOf, delItem, ensureSocial, item, itemsOf, me, newItem, patch, safeUrl, soc,
  type GroupStatus, type Item,
} from "../social/data";
import { Thread } from "../social/ui";
import { Calendar, PostBoard, PostPanel, newPost, openItem } from "./SocialPosts";
import { Library } from "./SocialLibrary";
import type { Lead, StageId } from "../lib/types";

const TABS = [["overview", "Overview", LayoutDashboard], ["affiliates", "Affiliates", Sparkles], ["calendar", "Calendar", CalendarDays], ["posts", "Posts", KanbanSquare],
  ["groups", "Facebook groups", Users], ["library", "Library", LibIcon], ["team", "Team discussion", MessagesSquare]] as const;
const go = (t: string) => { ui.socTab = t; render(); };

export function Social() {
  useEffect(() => { ensureSocial(); }, []);
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === "Escape" && ui.socOpen) openItem(null); };
    document.addEventListener("keydown", h); return () => document.removeEventListener("keydown", h);
  }, []);
  const open = item(ui.socOpen), tab = ui.socTab;
  return <>
    <div className="row" style={{ marginBottom: 14 }}>
      <div className="ds soc-tabs" role="tablist">{TABS.map(([k, v, Ic]) => <button key={k} role="tab" aria-selected={tab === k} className={tab === k ? "on" : ""} onClick={() => go(k)}>
        <Ic size={15} aria-hidden="true" /> {v}</button>)}</div>
    </div>
    {soc.saveErr ? <div className="banner warn">{soc.saveErr}</div> : null}
    {soc.status === "error" ? <div className="banner warn">{soc.err}</div>
      : soc.status !== "ready" ? <p className="muted">Loading the team's social workspace…</p>
      : tab === "affiliates" ? <Affiliates /> : tab === "calendar" ? <Calendar /> : tab === "posts" ? <PostBoard />
      : tab === "groups" ? <Groups /> : tab === "library" ? <Library /> : tab === "team" ? <Team /> : <Overview />}
    <aside className={"sdrawer" + (open ? " open" : "")} aria-hidden={!open}>
      {open?.kind === "post" ? <PostPanel key={open.id} it={open as Item<"post">} /> : open?.kind === "group" ? <GroupPanel key={open.id} it={open as Item<"group">} /> : null}
    </aside>
  </>;
}

/* ---------- overview ---------- */
const Kpi = ({ l, v, s, onClick }: { l: string; v: string | number; s?: string; onClick?: () => void }) =>
  <button className="kpi" onClick={onClick} disabled={!onClick}><span className="kpi-l">{l}</span><span className="kpi-v">{typeof v === "number" ? v.toLocaleString() : v}</span>{s ? <span className="kpi-s">{s}</span> : null}</button>;
const affs = () => S.leads.filter(isAff);
const sumSignups = (L: Lead[]) => { const v = L.map(l => l.families?.signups).filter(x => x !== undefined && x !== ""); return v.length ? v.reduce((a: number, b) => a + +b!, 0) : null; };
const monday = () => { const d = new Date(); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); return d; };

function Overview() {
  const t = todayISO(), A = affs(), posts = itemsOf("post"), groups = itemsOf("group");
  const in7 = new Date(); in7.setDate(in7.getDate() + 7); const d7 = in7.toISOString().slice(0, 10);
  const in14 = new Date(); in14.setDate(in14.getDate() + 14); const d14 = in14.toISOString().slice(0, 10);
  const mon = monday(), dmsWeek = A.reduce((a, l) => a + (l.activity || []).filter(x => x.type === "DM sent" && new Date(x.ts) >= mon).length, 0);
  const su = sumSignups(A), reach = (s: StageId) => A.filter(l => MAIN.indexOf(l.stage) >= MAIN.indexOf(s)).length;
  const upcoming = posts.filter(p => p.data.date && p.data.date >= t && p.data.date <= d14 && p.data.status !== "posted").sort((a, b) => (a.data.date! + (a.data.time || "")).localeCompare(b.data.date! + (b.data.time || "")));
  const review = posts.filter(p => p.data.status === "ready");
  const overdue = posts.filter(p => p.data.date && p.data.date < t && p.data.status !== "posted");
  const due = A.filter(l => l.nextDue && l.nextDue <= t && l.stage !== "lost").sort((a, b) => a.nextDue!.localeCompare(b.nextDue!));
  const recent = [...soc.comments].sort((a, b) => b.created_at.localeCompare(a.created_at)).slice(0, 6);
  const gs = (s: GroupStatus[]) => groups.filter(g => s.includes(g.data.status)).length;
  const ym = t.slice(0, 7);
  return <div className="grid" style={{ gap: 16 }}>
    <div className="kpis">
      <Kpi l="Affiliates" v={A.length} s={`${reach("contacted")} DM'd · ${A.filter(l => l.stage === "engaged").length} in conversation`} onClick={() => go("affiliates")} />
      <Kpi l="DMs this week" v={dmsWeek} s="since Monday" onClick={() => go("affiliates")} />
      <Kpi l="Sharing our link" v={reach("live")} s={su !== null ? `${su.toLocaleString()} sign-ups from their codes` : "sign-ups not yet measurable"} onClick={() => go("affiliates")} />
      <Kpi l="Link clicks" v="—" s="not yet measurable (tracking not connected)" />
      <Kpi l="Posts next 7 days" v={posts.filter(p => p.data.date && p.data.date >= t && p.data.date <= d7 && p.data.status !== "posted").length} s={`${posts.filter(p => p.data.status === "scheduled").length} scheduled in total`} onClick={() => go("calendar")} />
      <Kpi l="Posted this month" v={posts.filter(p => p.data.status === "posted" && (p.data.date || "").startsWith(ym)).length} s={`${posts.filter(p => p.data.status === "idea").length} ideas in the backlog`} onClick={() => go("posts")} />
      <Kpi l="Waiting for review" v={review.length} s="posts marked Ready for review" onClick={() => go("posts")} />
      <Kpi l="Facebook groups" v={gs(["joined", "can-post"])} s={`joined · ${gs(["to-join", "requested"])} to join or pending`} onClick={() => go("groups")} />
    </div>
    <div className="soc-cols"><div className="soc-stack">
      <div className="card"><div className="row"><h3 className="grow" style={{ margin: 0 }}>Coming up (next 14 days)</h3><button className="b sm" onClick={() => newPost({ date: t })}><Plus size={14} aria-hidden="true" /> New post</button></div>
        {overdue.length ? <div className="banner warn" style={{ margin: "8px 0" }}>{overdue.length} planned post{overdue.length === 1 ? " is" : "s are"} past {overdue.length === 1 ? "its" : "their"} date and not marked Posted.</div> : null}
        {upcoming.length ? <div className="subl">{upcoming.map(p => <div key={p.id} className="it" onClick={() => openItem(p.id)}>
          <div><b>{p.data.title || "(untitled post)"}</b><div className="small muted">{p.data.platforms.join(", ")}{p.data.owner ? " · " + p.data.owner : ""}</div></div>
          <div className="small" style={{ textAlign: "right" }}><div>{fmtDate(p.data.date)}{p.data.time ? " " + p.data.time : ""}</div><Dot c={`var(${POST_C[p.data.status]})`} />{POST_STATUS.find(x => x[0] === p.data.status)![1]}</div></div>)}</div>
          : <p className="small muted">Nothing planned. Open the Calendar to plan posts.</p>}</div>
      <div className="card"><h3 style={{ marginTop: 0 }}>Waiting for review</h3>
        {review.length ? <div className="subl">{review.map(p => <div key={p.id} className="it" onClick={() => openItem(p.id)}>
          <div><b>{p.data.title || "(untitled post)"}</b><div className="small muted">{p.data.owner || ""}{p.data.date ? " · for " + fmtDate(p.data.date) : ""}</div></div>
          <div className="small muted">{commentsOf(p.id).length} comment{commentsOf(p.id).length === 1 ? "" : "s"}</div></div>)}</div> : <p className="small muted">Nothing to review.</p>}</div>
      <div className="card"><div className="row"><h3 className="grow" style={{ margin: 0 }}>Recent discussion</h3><button className="b sm" onClick={() => go("team")}>Team thread</button></div>
        {recent.length ? <div className="subl">{recent.map(c => { const it = item(c.item_id); return <div key={c.id} className="it" onClick={() => it ? openItem(it.id) : go("team")}>
          <div><b>{c.author || "Teammate"}</b> <span className="small muted">on {it ? (it.kind === "post" ? (it as Item<"post">).data.title || "a post" : (it as Item<"group">).data.name) : "the team thread"}</span>
            <div className="small clamp">{c.body}</div></div><div className="small muted">{fmtDate(c.created_at.slice(0, 10))}</div></div>; })}</div>
          : <p className="small muted">No comments yet.</p>}</div>
    </div>
    <div className="soc-stack">
      <div className="card"><h3 style={{ marginTop: 0 }}>Affiliate follow-ups due</h3>
        {due.length ? <div className="subl">{due.slice(0, 8).map(l => <div key={l.id} className="it" onClick={() => openLead(l.id)}>
          <div><b>@{l.handle || name(l)}</b><div className="small muted">{l.nextAction}</div></div>
          <div className="small" style={{ textAlign: "right" }}><div className={dueClass(l.nextDue)}>{fmtDate(l.nextDue)}</div><Dot c={cv(l.stage)} />{stg(l.stage, "affiliate").name}</div></div>)}</div>
          : <p className="small muted">Nothing due today.</p>}
        {due.length > 8 ? <p className="small muted">+{due.length - 8} more in the Affiliates section.</p> : null}</div>
    </div>
    </div>
  </div>;
}

/* ---------- affiliates ---------- */
const SORTS: [string, string][] = [["followers", "Most followers"], ["signups", "Most sign-ups"], ["stage", "Furthest along"], ["lastdm", "Most recent DM"], ["due", "Next due"]];
function Affiliates() {
  const [plat, setPlat] = useState(""), [st, setSt] = useState(""), [sort, setSort] = useState("followers"), [q, setQ] = useState("");
  const A = affs(), plats = [...new Set(A.map(l => l.platform || "").filter(Boolean))].sort();
  const lastDm = (l: Lead) => (l.activity || []).filter(a => a.type === "DM sent").map(a => a.ts).sort().pop() || "";
  const posts = (l: Lead) => (l.activity || []).filter(a => a.type === "Posted / shared link").length;
  const rows = A.filter(l => (!plat || l.platform === plat) && (!st || l.stage === st)
      && (!q || [l.handle, name(l), l.notes, l.platform].join(" ").toLowerCase().includes(q.toLowerCase())))
    .sort((a, b) => sort === "signups" ? (+(b.families?.signups || 0) - +(a.families?.signups || 0)) || (+(b.followers || 0) - +(a.followers || 0))
      : sort === "stage" ? (MAIN.indexOf(b.stage) - MAIN.indexOf(a.stage)) : sort === "lastdm" ? lastDm(b).localeCompare(lastDm(a))
      : sort === "due" ? (a.nextDue || "9").localeCompare(b.nextDue || "9") : (+(b.followers || 0) - +(a.followers || 0)));
  const su = sumSignups(A), dms = A.reduce((a, l) => a + (l.activity || []).filter(x => x.type === "DM sent").length, 0);
  const toList = (v: "data" | "board") => { setDs("affiliate"); setView(v); };
  return <>
    <div className="kpis" style={{ marginBottom: 16 }}>
      {stagesFor("affiliate").filter(s => !["rejected", "nurture", "lost"].includes(s.id)).map(s => <Kpi key={s.id} l={s.name} v={A.filter(l => l.stage === s.id).length} s={s.desc} onClick={() => setSt(st === s.id ? "" : s.id)} />)}
      <Kpi l="DMs sent" v={dms} s="all time" />
      <Kpi l="Sign-ups from their codes" v={su !== null ? su : "—"} s={su !== null ? "entered per affiliate" : "not yet measurable"} />
      <Kpi l="Link clicks" v="—" s="not yet measurable" />
    </div>
    <div className="row" style={{ marginBottom: 10 }}>
      <input className="grow" placeholder="Search handle, name, notes" value={q} onChange={e => setQ(e.target.value)} style={{ minWidth: 180 }} />
      <select value={plat} onChange={e => setPlat(e.target.value)}><option value="">All platforms</option>{plats.map(p => <option key={p}>{p}</option>)}</select>
      <select value={st} onChange={e => setSt(e.target.value)}><option value="">All stages</option>{stagesFor("affiliate").map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select>
      <select value={sort} onChange={e => setSort(e.target.value)}>{SORTS.map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
      <button className="b sm" onClick={() => toList("board")}>Open the affiliate board</button>
      <button className="b sm" onClick={() => toList("data")}>Import affiliates</button>
    </div>
    <div className="small muted" style={{ marginBottom: 6 }}>{rows.length} of {A.length} affiliates · click a row to DM, log progress and update their numbers</div>
    <div className="tablewrap"><table><thead><tr><th>Account</th><th>Name</th><th className="n">Followers</th><th>Stage</th><th className="n">DMs</th><th>Last DM</th><th className="n">Posts</th><th className="n">Sign-ups</th><th className="n">Clicks</th><th>Next step</th><th>Due</th></tr></thead>
      <tbody>{rows.map(l => { const ld = lastDm(l); return <tr key={l.id} className="click" onClick={e => { if ((e.target as Element).closest("a")) return; openItem(null); openLead(l.id); }}>
        <td><b>@{l.handle}</b><div className="small muted">{l.platform}{safeUrl(l.profileUrl) ? <> · <a href={safeUrl(l.profileUrl)} target="_blank" rel="noopener noreferrer">profile <ExternalLink size={11} aria-hidden="true" /></a></> : null}</div></td>
        <td>{name(l)}</td><td className="n">{fmtFollowers(l.followers)}</td>
        <td><Dot c={cv(l.stage)} />{stg(l.stage, "affiliate").name}</td>
        <td className="n">{(l.activity || []).filter(a => a.type === "DM sent").length || ""}</td><td>{ld ? fmtDate(ld.slice(0, 10)) : ""}</td>
        <td className="n">{posts(l) || ""}</td><td className="n">{l.families?.signups || <span className="muted">—</span>}</td><td className="n muted">—</td>
        <td>{l.nextAction}</td><td className={dueClass(l.nextDue)}>{fmtDate(l.nextDue)}</td></tr>; })}</tbody></table></div>
    {!A.length ? <p className="small muted">No affiliates yet. Import a list with <b>Import affiliates</b>.</p> : null}
  </>;
}

/* ---------- Facebook groups ---------- */
const gName = (s: GroupStatus) => GROUP_STATUS.find(x => x[0] === s)![1];
const G_C: Record<GroupStatus, string> = { "to-join": "--s0", requested: "--s1", joined: "--s2", "can-post": "--s4", left: "--sx" };
function Groups() {
  const [st, setSt] = useState<GroupStatus | "">(""), [q, setQ] = useState("");
  const [nm, setNm] = useState(""), [url, setUrl] = useState("");
  const all = itemsOf("group"), rows = all.filter(g => (!st || g.data.status === st) && (!q || [g.data.name, g.data.topic, g.data.notes].join(" ").toLowerCase().includes(q.toLowerCase())))
    .sort((a, b) => GROUP_STATUS.findIndex(x => x[0] === a.data.status) - GROUP_STATUS.findIndex(x => x[0] === b.data.status) || a.data.name.localeCompare(b.data.name));
  const add = () => { if (!nm.trim()) return; const g = newItem("group", { name: nm.trim(), url: safeUrl(url) || "", status: "to-join", owner: me() }); setNm(""); setUrl(""); openItem(g.id); };
  return <>
    <div className="kpis" style={css({ marginBottom: 16, "--n": 5 })}>{GROUP_STATUS.map(([k, v]) => <Kpi key={k} l={v} v={all.filter(g => g.data.status === k).length} onClick={() => setSt(st === k ? "" : k)} />)}</div>
    <div className="card" style={{ marginBottom: 12 }}><div className="row">
      <input className="grow" placeholder="Group name, e.g. Missouri Moms Connect" value={nm} onChange={e => setNm(e.target.value)} onKeyDown={e => { if (e.key === "Enter") add(); }} style={{ minWidth: 200 }} />
      <input className="grow" type="url" placeholder="https://www.facebook.com/groups/…" value={url} onChange={e => setUrl(e.target.value)} onKeyDown={e => { if (e.key === "Enter") add(); }} style={{ minWidth: 200 }} />
      <button className="b p" onClick={add}><Plus size={14} aria-hidden="true" /> Add group</button></div>
      <p className="small muted" style={{ margin: "6px 0 0" }}>Track each group from finding it to posting in it. Note its rules about promotional posts before posting.</p></div>
    <div className="row" style={{ marginBottom: 8 }}>
      <input className="grow" placeholder="Search groups" value={q} onChange={e => setQ(e.target.value)} />
      <select value={st} onChange={e => setSt(e.target.value as GroupStatus)}><option value="">All statuses</option>{GROUP_STATUS.map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
    </div>
    {rows.length ? <div className="tablewrap"><table><thead><tr><th>Group</th><th className="n">Members</th><th>Topic / area</th><th>Status</th><th>Promo rules</th><th>Last posted</th><th>Owner</th><th className="n">Posts</th></tr></thead>
      <tbody>{rows.map(g => { const d = g.data, np = itemsOf("post").filter(p => p.data.groupId === g.id).length; return <tr key={g.id} className="click" onClick={e => { if ((e.target as Element).closest("a,select")) return; openItem(g.id); }}>
        <td><b>{d.name}</b>{safeUrl(d.url) ? <div className="small"><a href={safeUrl(d.url)} target="_blank" rel="noopener noreferrer">Open group <ExternalLink size={11} aria-hidden="true" /></a></div> : null}</td>
        <td className="n">{d.members}</td><td>{d.topic}</td>
        <td><select value={d.status} style={css({ borderColor: `var(${G_C[d.status]})` })} onChange={e => patch(g, { status: e.target.value as GroupStatus })}>{GROUP_STATUS.map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></td>
        <td className="small"><div className="clamp">{d.rules}</div></td><td>{fmtDate(d.lastPosted)}</td><td>{d.owner}</td><td className="n">{np || ""}</td></tr>; })}</tbody></table></div>
      : <p className="small muted">{all.length ? "No groups match." : "No groups yet. Add the first one above."}</p>}
  </>;
}

function GroupPanel({ it }: { it: Item<"group"> }) {
  const d = it.data, set = (x: Partial<typeof d>) => patch((item(it.id) || it) as Item<"group">, x);
  const posts = itemsOf("post").filter(p => p.data.groupId === it.id).sort((a, b) => (b.data.date || "").localeCompare(a.data.date || ""));
  const inp = (k: "name" | "url" | "members" | "topic" | "admin" | "owner", lab: string, ph = "", type = "text") => <><label>{lab}</label>
    <Inp type={type} value={d[k]} placeholder={ph} onCommit={v => set({ [k]: k === "url" ? (safeUrl(v) || "") : v.trim() })} /></>;
  return <>
    <div className="row"><h2 style={{ margin: 0 }} className="grow">{d.name || "Facebook group"}</h2><button className="b sm" onClick={() => openItem(null)}>Close ✕</button></div>
    {safeUrl(d.url) ? <div className="small" style={{ marginTop: 4 }}><a href={safeUrl(d.url)} target="_blank" rel="noopener noreferrer">Open the group ↗</a></div> : null}
    <div className="f" style={{ marginTop: 12 }}>
      {inp("name", "Name")}{inp("url", "Link", "https://www.facebook.com/groups/…", "url")}
      <label>Status</label><select value={d.status} onChange={e => set({ status: e.target.value as GroupStatus })}>{GROUP_STATUS.map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
      {inp("members", "Members", "e.g. 12K")}{inp("topic", "Topic / area", "e.g. Missouri parents, St. Louis moms")}
      {inp("admin", "Admin / moderator", "Who approves posts")}{inp("owner", "Handled by")}
      <label>Last posted</label><Inp type="date" value={d.lastPosted} onCommit={v => set({ lastPosted: v })} />
    </div>
    <h3>Rules about promotional posts</h3>
    <Ta value={d.rules} rows={3} placeholder="e.g. Promo only on Fridays · no links in the post, put them in comments · ask the admin first" onCommit={v => set({ rules: v })} />
    <h3>Notes</h3>
    <Ta value={d.notes} rows={3} placeholder="What the members talk about, what worked, who to thank." onCommit={v => set({ notes: v })} />
    <div className="row" style={{ marginTop: 14 }}><h3 className="grow" style={{ margin: 0 }}>Posts in this group ({posts.length})</h3>
      <button className="b sm" onClick={() => newPost({ platforms: ["Facebook group"], groupId: it.id })}><Plus size={14} aria-hidden="true" /> Plan a post here</button></div>
    {posts.length ? <div className="subl" style={{ marginTop: 6 }}>{posts.map(p => <div key={p.id} className="it" onClick={() => openItem(p.id)}>
      <div><b>{p.data.title || "(untitled post)"}</b></div><div className="small"><Dot c={`var(${POST_C[p.data.status]})`} />{POST_STATUS.find(x => x[0] === p.data.status)![1]}{p.data.date ? " · " + fmtDate(p.data.date) : ""}</div></div>)}</div> : null}
    <h3>Discussion ({commentsOf(it.id).length})</h3>
    <Thread id={it.id} />
    <div className="row" style={{ marginTop: 16 }}><button className="b sm d" onClick={() => { if (confirm(`Delete "${d.name}" and its comments?`)) { delItem(it.id); openItem(null); } }}>Delete group</button></div>
  </>;
}

/* ---------- team discussion ---------- */
function Team() {
  const elsewhere = [...soc.comments].filter(c => c.item_id !== "team").sort((a, b) => b.created_at.localeCompare(a.created_at)).slice(0, 15);
  return <div className="grid" style={{ gridTemplateColumns: "repeat(auto-fit,minmax(340px,1fr))", gap: 16, alignItems: "start" }}>
    <div className="card"><h2 style={{ marginTop: 0 }}>Team thread</h2>
      <p className="small muted" style={{ marginTop: 0 }}>Plans, ideas and questions for the social team. Each post and group also has its own discussion.</p>
      <Thread id="team" /></div>
    <div className="card"><h2 style={{ marginTop: 0 }}>Latest on posts and groups</h2>
      {elsewhere.length ? <div className="subl">{elsewhere.map(c => { const it = item(c.item_id); return <div key={c.id} className="it" onClick={() => it && openItem(it.id)}>
        <div><b>{c.author || "Teammate"}</b> <span className="small muted">on {it ? (it.kind === "post" ? (it as Item<"post">).data.title || "a post" : (it as Item<"group">).data.name) : "a deleted item"}</span>
          <div className="small clamp">{c.body}</div></div><div className="small muted">{fmtDate(c.created_at.slice(0, 10))}</div></div>; })}</div>
        : <p className="small muted">No comments on posts or groups yet.</p>}</div>
  </div>;
}
