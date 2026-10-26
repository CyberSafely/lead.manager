// Small pure helpers: escaping, ids, dates (business days), names, phone and email links.
import type { Lead } from "./types";

export function esc(v: unknown): string {
  return String(v ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
}
export function uid() { return Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4); }

export function iso(d: Date) { return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0"); }
export function todayISO() { return iso(new Date()); }

// "YYYY-MM-DD" while applying a dated activity log
let BASE: string | null = null;
export function setBase(v: string | null) { BASE = v; }
export function nowTs() { return BASE ? new Date(BASE + "T12:00").toISOString() : new Date().toISOString(); }
/** Date n business days from today (or from BASE), as YYYY-MM-DD. */
export function addBiz(n: number) {
  const d = BASE ? new Date(BASE + "T12:00") : new Date(); let k = 0;
  while (k < n) { d.setDate(d.getDate() + 1); const w = d.getDay(); if (w && w < 6) k++; }
  return iso(d);
}
export function bizSince(ts: string | null | undefined) {
  if (!ts) return null;
  const a = new Date(ts.slice(0, 10) + "T12:00"), b = new Date(todayISO() + "T12:00"); let n = 0;
  while (a < b) { a.setDate(a.getDate() + 1); const w = a.getDay(); if (w && w < 6) n++; }
  return n;
}
export function fmtDate(s?: string) { if (!s) return ""; const d = new Date(s + "T12:00"); return d.toLocaleDateString(undefined, { month: "short", day: "numeric" }); }
export function dueClass(s?: string) { if (!s) return ""; const t = todayISO(); return s < t ? "over" : s === t ? "today" : ""; }
export function dtLocal(d: Date) { return iso(d) + "T" + String(d.getHours()).padStart(2, "0") + ":" + String(d.getMinutes()).padStart(2, "0"); }

export const isOv = (l: Lead) => l.type === "overseer";
export const isCamp = (l: Lead) => l.type === "campaign";
export const isPta = (l: Lead) => l.type === "pta";
export const isUser = (l: Lead) => l.type === "user";
export const isAff = (l: Lead) => l.type === "affiliate";
export const isPr = (l: Lead) => !l.type || l.type === "principal";

/** "446K", "66.6k", "2,546", "1.2M" → "446000" etc. Anything else is kept as typed. */
export function parseFollowers(s?: string) {
  const m = String(s || "").replace(/,/g, "").trim().match(/^(\d+(?:\.\d+)?)\s*([km])?$/i);
  return m ? String(Math.round(+m[1] * (m[2] ? (m[2].toLowerCase() === "k" ? 1e3 : 1e6) : 1))) : String(s || "").trim();
}
export function fmtFollowers(s?: string) { return s && /^\d+$/.test(s) ? new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 }).format(+s) : s || ""; }
/** The account's address when only the handle is known. */
export function profileUrlOf(handle?: string, platform?: string) {
  const h = String(handle || "").trim().replace(/^@/, ""), p = String(platform || "").toLowerCase();
  if (!h) return "";
  return p.startsWith("insta") ? `https://www.instagram.com/${h}/` : p.startsWith("tiktok") ? `https://www.tiktok.com/@${h}` : p.startsWith("face") ? `https://www.facebook.com/${h}` : "";
}

export function campsOf(l: Lead) { return String(l.campaign || "").split(",").map(s => s.trim()).filter(Boolean); }
const FREE_MAIL = /^(gmail|yahoo|hotmail|outlook|aol|icloud|live|msn|comcast|att|sbcglobal|charter|me|protonmail)\./;
export function domainOf(l: Lead) { const d = String(l.email || "").toLowerCase().split("@")[1] || ""; return d && !FREE_MAIL.test(d) ? d : ""; }

export function name(l: Lead) { return [l.first, l.last].filter(Boolean).join(" ") || l.email || "(no name)"; }
export function schoolOf(l: Lead) { return l.school || l.district || (isAff(l) ? (l.handle ? "@" + l.handle : "(account not set)") : isUser(l) ? "" : isCamp(l) || isPta(l) ? "(organization not set)" : "(school not set)"); }
export function lastTouch(l: Lead) { const a = (l.activity || []).filter(x => x.type !== "Stage" && x.type !== "Note"); return a.length ? a[a.length - 1].ts.slice(0, 10) : ""; }
export function touches(l: Lead) { return (l.activity || []).filter(x => x.type !== "Stage" && x.type !== "Note").length; }
export function firstEmailTs(l: Lead) { const a = (l.activity || []).find(x => x.type === "Email sent"); return a ? a.ts : null; }

// District matching: District ID first, then a normalized name ("St. Louis City" = "Saint Louis Public Schools")
export function normD(s?: string) { return String(s || "").toLowerCase().replace(/\bsaint\b/g, "st").replace(/\b(school|schools|district|public|city|the)\b/g, "").replace(/[^a-z0-9]/g, ""); }
export function sameD(a: Lead, b: Lead) { if (a.districtId && b.districtId) return String(a.districtId) === String(b.districtId); const x = normD(a.district); return !!x && x === normD(b.district); }

export function digits(p?: string) { let d = String(p || "").replace(/\D/g, ""); if (d.length === 11 && d[0] === "1") d = d.slice(1); return d; }
export function fmtPhone(p?: string) { const d = digits(p); return d.length === 10 ? `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}` : String(p || ""); }
export function outlookUrl(to?: string, s?: string, b?: string, bcc?: string) {
  const q = ([["to", to], ["bcc", bcc], ["subject", s], ["body", b]] as [string, string | undefined][])
    .filter(([, v]) => v).map(([k, v]) => k + "=" + encodeURIComponent(v!)).join("&");
  return "https://outlook.cloud.microsoft/mail/deeplink/compose?" + q;
}
export function placeholders(text: string) { return text.match(/\[[^\]\n]{2,80}\]/g) || []; }

export function csvCell(v: unknown) { const s = String(v ?? ""); return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; }
/** User-triggered download of a text file. */
export function dl(file: string, content: string, type: string) {
  const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([content], { type })); a.download = file; a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}
