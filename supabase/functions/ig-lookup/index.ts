// Instagram lookup for the Affiliates "Quick add" box (cloud build only).
// Takes a username, asks Meta's Graph API (Business Discovery) for that account's public profile, and returns
// name, followers, bio and website. Works for business and creator accounts only; personal accounts return
// "not_found" and the app falls back to pasted profile text.
// Only signed-in team members (public.members) can call it. The Meta token stays here as a secret:
//   IG_ACCESS_TOKEN  a long-lived token with instagram_basic + pages_show_list + pages_read_engagement
//   IG_USER_ID       the id of CyberSafely's own Instagram business account (the one the token belongs to)
//   IG_GRAPH_VERSION optional, default v23.0
// Setup steps: docs/instagram-lookup.md
import { createClient } from "jsr:@supabase/supabase-js@2";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...CORS, "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ error: "method" }, 405);

  // Team members only (same check as the database's row-level security)
  const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
    global: { headers: { Authorization: req.headers.get("Authorization") || "" } },
  });
  const { data: member, error: mErr } = await sb.rpc("is_member");
  if (mErr || member !== true) return json({ error: "not_member" }, 403);

  const token = Deno.env.get("IG_ACCESS_TOKEN"), igId = Deno.env.get("IG_USER_ID"), v = Deno.env.get("IG_GRAPH_VERSION") || "v23.0";
  if (!token || !igId) return json({ error: "not_configured" });

  let username = "";
  try { username = String((await req.json()).username || ""); } catch { /* bad body */ }
  username = username.trim().replace(/^@/, "");
  // Instagram usernames: letters, digits, dots and underscores, up to 30
  if (!/^[A-Za-z0-9._]{1,30}$/.test(username)) return json({ error: "bad_username" }, 400);

  const fields = `business_discovery.username(${username}){username,name,biography,followers_count,media_count,website}`;
  const url = `https://graph.facebook.com/${v}/${encodeURIComponent(igId)}?fields=${encodeURIComponent(fields)}&access_token=${encodeURIComponent(token)}`;
  const r = await fetch(url), d = await r.json().catch(() => ({}));
  if (!r.ok || !d.business_discovery) {
    const e = d?.error || {};
    // 110 / 100 with "Invalid user id" = personal account or no such username; 190 = token expired or revoked; 4 / 32 = rate limit
    const code = e.code === 190 ? "token_expired" : e.code === 4 || e.code === 32 || e.code === 17 ? "rate_limited" : "not_found";
    console.warn("ig-lookup", username, e.code, e.error_subcode, e.message);
    return json({ error: code });
  }
  const b = d.business_discovery;
  return json({ username: b.username, name: b.name || "", bio: b.biography || "", followers: b.followers_count ?? null, posts: b.media_count ?? null, website: b.website || "" });
});
