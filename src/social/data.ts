// Social tab data: posts (planning + calendar), Facebook groups, caption / hashtag snippets, shared files, and the
// team's discussion. Kept apart from the outreach data (S): the local build saves it under its own browser key; the cloud
// build uses the social_items / social_comments tables and the private social-media storage bucket
// (supabase/migrations/0004_social.sql). Each item saves on its own, and teammates' changes arrive over realtime.
import type { RealtimeChannel } from "@supabase/supabase-js";
import { KEY } from "../lib/pipeline";
import { S, render, ui } from "../store";
import { todayISO, uid } from "../lib/helpers";
import { supabase } from "../sync";

export type Kind = "post" | "group" | "snippet" | "file";
export const POST_STATUS = [["idea", "Idea"], ["draft", "Drafting"], ["ready", "Ready for review"], ["scheduled", "Scheduled"], ["posted", "Posted"]] as const;
export type PostStatus = typeof POST_STATUS[number][0];
export const POST_C: Record<PostStatus, string> = { idea: "--s0", draft: "--s1", ready: "--s2", scheduled: "--s3", posted: "--s4" };
export const PLATFORMS = ["Instagram", "TikTok", "Facebook", "Facebook group", "LinkedIn", "YouTube", "X"];
// Caption limits (characters) and Instagram's hashtag cap
export const LIMITS: Record<string, number> = { Instagram: 2200, TikTok: 4000, Facebook: 63206, "Facebook group": 63206, LinkedIn: 3000, YouTube: 5000, X: 280 };
export const GROUP_STATUS = [["to-join", "To join"], ["requested", "Requested"], ["joined", "Joined"], ["can-post", "Can post"], ["left", "Left / declined"]] as const;
export type GroupStatus = typeof GROUP_STATUS[number][0];
export const RESULTS = ["views", "likes", "comments", "shares", "saves", "clicks", "signups"] as const;

export interface Post {
  title: string; status: PostStatus; platforms: string[]; date?: string; time?: string; owner?: string;
  caption?: string; hashtags?: string; links?: string; media?: string[]; postUrl?: string;
  groupId?: string; affiliateId?: string; notes?: string; results?: Partial<Record<typeof RESULTS[number], string>>;
}
export interface Group { name: string; url?: string; members?: string; topic?: string; status: GroupStatus; rules?: string; admin?: string; lastPosted?: string; owner?: string; notes?: string }
export interface Snippet { title: string; type: "caption" | "hashtags" | "reply" | "link"; text: string }
export interface SFile { name: string; path?: string; url?: string; size?: number; type?: string; folder?: string; note?: string }
type DataOf = { post: Post; group: Group; snippet: Snippet; file: SFile };
export interface Item<K extends Kind = Kind> { id: string; kind: K; data: DataOf[K]; created_at?: string; updated_at?: string }
export interface Comment { id: string; item_id: string; body: string; author?: string; created_at: string }

export const soc = {
  items: [] as Item[], comments: [] as Comment[],
  status: "idle" as "idle" | "loading" | "ready" | "error", err: "", saveErr: "",
};
export const BUCKET = "social-media";
const LKEY = KEY + "-social";
/** The cloud build, signed in: items go to the team database. Otherwise this browser only. */
export const isCloud = () => ui.cloud === "ready" && !!supabase;

export const itemsOf = <K extends Kind>(k: K) => soc.items.filter(i => i.kind === k) as Item<K>[];
export const item = (id?: string | null) => soc.items.find(i => i.id === id);
export const commentsOf = (id: string) => soc.comments.filter(c => c.item_id === id).sort((a, b) => a.created_at.localeCompare(b.created_at));
export const me = () => S.settings.sender || ui.user || "Me";
/** Only http(s) links become clickable (a typed "javascript:" link must never run). */
export const safeUrl = (u?: string) => u && /^https?:\/\//i.test(u.trim()) ? u.trim() : undefined;

/* ---------- load ---------- */
function readLocal() {
  try { const d = JSON.parse(localStorage.getItem(LKEY) || "null"); if (d && Array.isArray(d.items)) { soc.items = d.items; soc.comments = d.comments || []; } }
  catch (e) { /* storage unavailable: start empty */ }
}
function writeLocal() {
  if (isCloud()) return;
  try { localStorage.setItem(LKEY, JSON.stringify({ items: soc.items, comments: soc.comments })); soc.saveErr = ""; }
  catch (e) { soc.saveErr = "Not saved: browser storage unavailable."; }
}

async function fetchAll() {
  const [it, cm] = await Promise.all([
    supabase!.from("social_items").select("id,kind,data,created_at,updated_at").order("created_at").limit(10000),
    supabase!.from("social_comments").select("id,item_id,body,author,created_at").order("created_at").limit(10000)]);
  if (it.error) throw it.error; if (cm.error) throw cm.error;
  return { items: it.data as Item[], comments: cm.data as Comment[] };
}
/** Load once, when the Social tab first opens. */
export async function ensureSocial() {
  if (soc.status === "loading" || soc.status === "ready") return;
  if (!isCloud()) { readLocal(); soc.status = "ready"; render(); return; }
  soc.status = "loading"; soc.err = ""; render();
  try {
    const d = await fetchAll();
    soc.items = d.items; soc.comments = d.comments; soc.status = "ready";
    subscribe();
  } catch (e: any) {
    console.error("Social load failed", e);
    soc.status = "error";
    soc.err = /social_items|relation|schema cache/i.test(e?.message || "") ? "The Social tables aren't in the team database yet. Run npm run db -- apply." : "Couldn't reach the team database: " + (e?.message || e);
  }
  render();
}

/* ---------- save ---------- */
// Items with an upload in flight: a realtime echo of an older version must not replace the newer one on screen
const inflight = new Map<string, number>();
function failed(what: string, e: any) { console.error(what, e); soc.saveErr = `⚠️ ${what}: ${e?.message || e}. Your change is only on this screen; try again.`; render(); }

export function putItem(it: Item) {
  it.updated_at = new Date().toISOString(); if (!it.created_at) it.created_at = it.updated_at;
  const i = soc.items.findIndex(x => x.id === it.id); if (i < 0) soc.items.push(it); else soc.items[i] = it;
  writeLocal(); render();
  if (!isCloud()) return;
  const n = (inflight.get(it.id) || 0) + 1; inflight.set(it.id, n);
  supabase!.from("social_items").upsert({ id: it.id, kind: it.kind, data: it.data }).then(({ error }) => {
    if (inflight.get(it.id) === n) inflight.delete(it.id);
    if (error) failed("Couldn't save to the team database", error); else if (soc.saveErr) { soc.saveErr = ""; render(); }
  });
}
/** Change some fields of an item and save it. */
export function patch<K extends Kind>(it: Item<K>, d: Partial<DataOf[K]>) { putItem({ ...it, data: { ...it.data, ...d } } as Item); }
export function newItem<K extends Kind>(kind: K, data: DataOf[K]): Item<K> { const it = { id: uid(), kind, data } as Item<K>; putItem(it as Item); return it; }

export async function delItem(id: string) {
  const it = item(id);
  soc.items = soc.items.filter(x => x.id !== id); soc.comments = soc.comments.filter(c => c.item_id !== id);
  // Unlink a deleted file from the posts that use it
  if (it?.kind === "file") itemsOf("post").filter(p => p.data.media?.includes(id)).forEach(p => patch(p, { media: p.data.media!.filter(m => m !== id) }));
  writeLocal(); render();
  if (!isCloud()) return;
  const r = await supabase!.from("social_comments").delete().eq("item_id", id);
  const r2 = await supabase!.from("social_items").delete().eq("id", id);
  if (it?.kind === "file" && (it as Item<"file">).data.path) await supabase!.storage.from(BUCKET).remove([(it as Item<"file">).data.path!]);
  if (r.error || r2.error) failed("Couldn't delete from the team database", r.error || r2.error);
}

/* ---------- discussion ---------- */
export function addComment(itemId: string, body: string) {
  body = body.trim(); if (!body) return;
  const c: Comment = { id: uid(), item_id: itemId, body: body.slice(0, 5000), author: me(), created_at: new Date().toISOString() };
  soc.comments.push(c); writeLocal(); render();
  if (isCloud()) supabase!.from("social_comments").insert({ id: c.id, item_id: c.item_id, body: c.body, author: c.author })
    .then(({ error }) => { if (error) failed("Couldn't post the comment", error); });
}
export function delComment(id: string) {
  soc.comments = soc.comments.filter(c => c.id !== id); writeLocal(); render();
  if (isCloud()) supabase!.from("social_comments").delete().eq("id", id).then(({ error }) => { if (error) failed("Couldn't delete the comment", error); });
}

/* ---------- files (cloud build: private bucket; local build: links only) ---------- */
export async function uploadFile(f: File, folder = ""): Promise<Item<"file">> {
  const id = uid(), path = `${todayISO().slice(0, 7)}/${id}-${f.name.replace(/[^\w.-]+/g, "_").slice(-80)}`;
  const { error } = await supabase!.storage.from(BUCKET).upload(path, f, { contentType: f.type || undefined, upsert: false });
  if (error) throw error;
  return newItem("file", { name: f.name, path, size: f.size, type: f.type, folder });
}
const signed = new Map<string, { url: string; at: number }>();
/** A short-lived link to a stored file (the bucket is private). Cached for 50 minutes. */
export async function fileUrl(f: SFile, download = false): Promise<string | undefined> {
  if (!f.path) return safeUrl(f.url);
  const k = f.path + (download ? "#dl" : ""), c = signed.get(k);
  if (c && Date.now() - c.at < 50 * 60e3) return c.url;
  const { data, error } = await supabase!.storage.from(BUCKET).createSignedUrl(f.path, 3600, download ? { download: f.name } : undefined);
  if (error) { console.error("Signed URL failed", error); return undefined; }
  signed.set(k, { url: data.signedUrl, at: Date.now() }); return data.signedUrl;
}
export const fmtSize = (n?: number) => !n ? "" : n < 1024 ? n + " B" : n < 1048576 ? Math.round(n / 1024) + " KB" : (n / 1048576).toFixed(1) + " MB";
export const MAX_FILE = 50 * 1048576;

/* ---------- teammates' changes ---------- */
let channel: RealtimeChannel | null = null;
function subscribe() {
  if (channel) return;
  channel = supabase!.channel("social")
    .on("postgres_changes", { event: "*", schema: "public", table: "social_items" }, p => {
      if (p.eventType === "DELETE") { const id = (p.old as { id: string }).id; soc.items = soc.items.filter(i => i.id !== id); render(); return; }
      const row = p.new as Item;
      if (inflight.has(row.id)) return;   // our own save is still on its way; the newer version is already on screen
      const i = soc.items.findIndex(x => x.id === row.id), it = { id: row.id, kind: row.kind, data: row.data, created_at: row.created_at, updated_at: row.updated_at } as Item;
      if (i < 0) soc.items.push(it); else soc.items[i] = it;
      render();
    })
    .on("postgres_changes", { event: "*", schema: "public", table: "social_comments" }, p => {
      if (p.eventType === "DELETE") { const id = (p.old as { id: string }).id; soc.comments = soc.comments.filter(c => c.id !== id); render(); return; }
      const c = p.new as Comment; if (!soc.comments.some(x => x.id === c.id)) { soc.comments.push(c); render(); }
      else { soc.comments = soc.comments.map(x => x.id === c.id ? { ...x, created_at: c.created_at } : x); }
    })
    // After a dropped connection (sleep, offline), catch up on what changed meanwhile
    .subscribe(status => { if (status === "SUBSCRIBED" && soc.status === "ready") catchUp(); });
}
async function catchUp() {
  try {
    const d = await fetchAll();
    // Items with a save still on its way keep this browser's newer copy (including ones the database hasn't seen yet)
    const prev = new Map(soc.items.map(x => [x.id, x])), ids = new Set(d.items.map(x => x.id));
    soc.items = [...d.items.map(x => inflight.has(x.id) ? prev.get(x.id) || x : x),
      ...[...inflight.keys()].filter(id => !ids.has(id) && prev.has(id)).map(id => prev.get(id)!)];
    soc.comments = [...d.comments, ...soc.comments.filter(c => !d.comments.some(x => x.id === c.id) && Date.now() - Date.parse(c.created_at) < 60e3)];
    render();
  } catch (e) { console.error("Social refresh failed", e); }
}

/* ---------- posting reminders (Home) ---------- */
export type PostRem = { it: Item<"post">; level: "overdue" | "today" | "soon"; late?: boolean; notReady?: boolean };
/** What needs posting, from the calendar: overdue (date passed, not Posted), today, and the next 2 days.
 *  Today's post is "late" once its time has passed; it's "notReady" while still an idea, drafting or waiting for review. */
export function postReminders(posts: Item<"post">[], now = new Date()) {
  const ymd = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  const t = ymd(now), d2 = new Date(now); d2.setDate(d2.getDate() + 2); const soon = ymd(d2);
  const hm = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
  const open = posts.filter(p => p.data.status !== "posted");
  const key = (p: Item<"post">) => (p.data.date || "") + (p.data.time || "99:99");
  const rems: PostRem[] = open.filter(p => p.data.date && p.data.date <= soon).sort((a, b) => key(a).localeCompare(key(b))).map(p => {
    const d = p.data.date!, notReady = ["idea", "draft", "ready"].includes(p.data.status);
    return d < t ? { it: p, level: "overdue" as const, notReady } : d === t ? { it: p, level: "today" as const, late: !!p.data.time && p.data.time < hm, notReady } : { it: p, level: "soon" as const, notReady };
  });
  const next = open.filter(p => p.data.date && p.data.date > soon).sort((a, b) => key(a).localeCompare(key(b)))[0];
  return { rems, next, undated: open.filter(p => !p.data.date).length, caughtUp: !rems.some(r => r.level !== "soon" || r.notReady) };
}
