// Affiliates "Quick add": turn a pasted profile link (and, for personal accounts, the pasted profile text) into
// affiliate fields. lookupIg() asks the team's own Supabase function (supabase/functions/ig-lookup), which asks
// Meta's Graph API. Only the username leaves the app. The local build has no Supabase, so it parses only.
import { supabase } from "../sync";
import { parseFollowers, profileUrlOf } from "./helpers";

export interface Draft { handle: string; platform: string; name: string; followers: string; profileUrl: string; email: string; notes: string }
export const emptyDraft = (): Draft => ({ handle: "", platform: "", name: "", followers: "", profileUrl: "", email: "", notes: "" });

const NOT_HANDLES = new Set(["p", "reel", "reels", "tv", "explore", "stories", "accounts", "direct", "share", "watch", "groups", "pages", "people", "profile.php", "video", "tag", "music"]);

/** A link or @username → handle, platform and profile link. */
export function parseLink(raw: string): Partial<Draft> | null {
  const s = raw.trim(); if (!s) return null;
  const at = /^@?([A-Za-z0-9._]{1,30})$/.exec(s);
  if (at && !s.includes(".com")) return { handle: at[1], platform: "Instagram", profileUrl: profileUrlOf(at[1], "instagram") };
  let u: URL; try { u = new URL(/^https?:\/\//i.test(s) ? s : "https://" + s); } catch { return null; }
  const host = u.hostname.replace(/^(www|m|vm|web)\./, ""), parts = u.pathname.split("/").filter(Boolean);
  if (host === "instagram.com" || host === "instagr.am") {
    const h = parts[0] === "stories" ? parts[1] : parts[0];
    return h && !NOT_HANDLES.has(h.toLowerCase()) ? { handle: h, platform: "Instagram", profileUrl: profileUrlOf(h, "instagram") } : null;
  }
  if (host === "tiktok.com") {
    const h = parts.find(p => p.startsWith("@"))?.slice(1);
    return h ? { handle: h, platform: "TikTok", profileUrl: profileUrlOf(h, "tiktok") } : null;
  }
  if (host === "facebook.com" || host === "fb.com") {
    if (parts[0] === "profile.php") { const id = u.searchParams.get("id"); return id ? { handle: id, platform: "Facebook", profileUrl: `https://www.facebook.com/profile.php?id=${id}` } : null; }
    const h = parts[0] === "pages" || parts[0] === "people" ? parts[1] : parts[0];
    return h && !NOT_HANDLES.has(h.toLowerCase()) ? { handle: h, platform: "Facebook", profileUrl: profileUrlOf(h, "facebook") } : null;
  }
  return null;
}

/**
 * Text copied from a profile page (⌘A, ⌘C) → followers, name and bio. Works on Instagram's and TikTok's layouts and on
 * Instagram's share preview ("12.5K Followers, 300 Following, 40 Posts - See Instagram photos and videos from Pat Example (@pat)").
 */
export function parseText(raw: string, handle = ""): Partial<Draft> {
  const text = raw.replace(/\r/g, ""), out: Partial<Draft> = {};
  const f = /([\d.,]+\s*[KkMm]?)\s*followers/i.exec(text); if (f) out.followers = parseFollowers(f[1].replace(/\s/g, ""));
  const prev = /videos from (.+?) \(@([A-Za-z0-9._]+)\)/.exec(text);
  if (prev) { out.name = prev[1].trim(); if (!handle) out.handle = prev[2]; return out; }
  const lines = text.split("\n").map(l => l.trim()).filter(Boolean);
  // Instagram: the name is the line after "N following"; the bio runs until the highlights / tabs
  const i = lines.findIndex(l => /^[\d.,]+\s*[KkMm]?\s*following$/i.test(l) || /\bfollowing$/i.test(l) && /followers/i.test(l));
  if (i >= 0 && lines[i + 1]) {
    const stop = /^(followed by|posts|reels|tagged|saved|videos|new|follow|message|see translation|threads)\b/i;
    const name = lines[i + 1];
    if (!stop.test(name) && name.toLowerCase() !== handle.toLowerCase()) out.name = name;
    const bio: string[] = [];
    for (const l of lines.slice(i + 2)) { if (stop.test(l) || bio.length >= 6) break; bio.push(l); }
    if (bio.length) out.notes = bio.join("\n");
  }
  return out;
}

export type LookupResult = { ok: true; d: Partial<Draft> & { posts?: number | null } } | { ok: false; why: string };

/** Meta lookup through the team's Supabase function. Instagram business and creator accounts only. */
export async function lookupIg(handle: string): Promise<LookupResult> {
  if (!supabase) return { ok: false, why: "local" };
  const { data, error } = await supabase.functions.invoke("ig-lookup", { body: { username: handle } });
  if (error) return { ok: false, why: "unreachable" };
  if (data?.error) return { ok: false, why: data.error };
  const notes = [data.bio, data.website].filter(Boolean).join("\n");
  return { ok: true, d: { name: data.name || "", followers: data.followers != null ? String(data.followers) : "", notes, posts: data.posts } };
}

export const WHY: Record<string, string> = {
  local: "Automatic lookup works on the team (cloud) version only.",
  not_configured: "Automatic lookup isn't set up yet (Meta token missing). See docs/instagram-lookup.md.",
  not_found: "Meta couldn't look this one up: it's probably a personal account (lookup covers business and creator accounts only).",
  token_expired: "The Meta token has expired. Make a new one (docs/instagram-lookup.md).",
  rate_limited: "Meta's hourly limit was reached. Try again in a bit.",
  not_member: "Your login isn't on the team list.",
  bad_username: "That doesn't look like an Instagram username.",
  unreachable: "Couldn't reach the lookup service.",
};
