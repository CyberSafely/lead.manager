// Pipeline definition. One lead = one principal = one school. Simplified flow: one email with a forward-ready family
// message; success is measured by sign-ups on the school's code. "We send it for you" is the exception.
import type { CallId, Lead, StageId } from "./types";
import { isDist } from "./helpers";

export const MAIN: StageId[] = ["new", "contacted", "engaged", "live", "active"];
export interface Stage { id: StageId; name: string; desc: string; c: string }
export const STAGES: Stage[] = [
  { id: "new",       name: "Cold",      desc: "Not contacted yet",                         c: "--s0" },
  { id: "contacted", name: "Contacted", desc: "In the 3-touch sequence",                   c: "--s1" },
  { id: "rejected",  name: "Rejected",  desc: "Email bounced or was rejected",             c: "--bad" },
  { id: "engaged",   name: "Engaged",   desc: "Replied, talked, or says they shared it",   c: "--s2" },
  { id: "live",      name: "Live",      desc: "First family sign-ups on the school's code", c: "--s3" },
  { id: "active",    name: "Active",    desc: "Sign-ups at the target level",              c: "--s4" },
  { id: "nurture",   name: "Nurture",   desc: "No reply after 3 touches",                  c: "--sx" },
  { id: "lost",      name: "Declined",  desc: "Said no, or wrong contact",                 c: "--sx" },
];
export const STAGE = Object.fromEntries(STAGES.map((s, i) => [s.id, { ...s, i }])) as Record<StageId, Stage & { i: number }>;
// List order (lists sort high → low): Rejected sits just below Contacted.
export const RANK = (id: StageId) => (id === "rejected" ? STAGE.contacted.i - 0.5 : STAGE[id].i);
export const SEQ = ["", "Email 1 sent", "Call / bump done", "Last email sent"];

// Affiliates (social media) use the same stage ids, so saved data and the database stay as they are, with their own names.
// Their outreach is by DM: first DM, one follow-up, then their own link; success is clicks and sign-ups on that link.
const AFF_NAMES: Record<StageId, [string, string]> = {
  new:       ["Not contacted",    "No DM sent yet"],
  contacted: ["DM sent",          "Waiting on a reply (DM + 1 follow-up)"],
  rejected:  ["Can't reach",      "DMs closed or the message didn't go through"],
  engaged:   ["In conversation",  "Replied; trying it out or getting their codes"],
  live:      ["Sharing our link", "Posted or shared their link; first sign-ups"],
  active:    ["Driving sign-ups", "Sign-ups from their link at the target level"],
  nurture:   ["No reply",         "No reply after the follow-up"],
  lost:      ["Declined",         "Said no"],
};
/** A stage as a list shows it: affiliates have their own names, every other list the standard ones. */
export const stg = (id: StageId, type?: string) => type === "affiliate" ? { ...STAGE[id], name: AFF_NAMES[id][0], desc: AFF_NAMES[id][1] } : STAGE[id];
export const stagesFor = (type?: string) => STAGES.map(s => stg(s.id, type));
export const AFF_SEQ = ["", "First DM sent", "Follow-up sent"];
export const AFF_ACTS = ["Replied", "Agreed to partner", "Link sent", "Posted / shared link", "Story or comment", "Declined", "Note"];
export const ACTS = ["Call: reached", "Voicemail", "Front office message", "Reply received", "Says they shared it", "Meeting / demo", "Note"];

// Call outcomes: Torino's five categories for principals who opened the emails (Oct 7, 2026).
// Each sets the stage and queues the matching follow-up email (sent from Thursday).
export interface CallDef { name: string; short: string; c: string; tpl: string; ov?: string; next: string; stage: StageId }
export const CALLS: Record<CallId, CallDef> = {
  interested: { name: "Interested / Ready to move forward", short: "Interested", c: "--ok", tpl: "f1", ov: "d4", next: "Send next steps (F1)", stage: "engaged" },
  info:       { name: "Needs more information", short: "Needs info", c: "--s1", tpl: "f2", next: "Answer questions + send summary (F2)", stage: "engaged" },
  followup:   { name: "Follow-up needed", short: "Follow-up", c: "--warn", tpl: "f2", next: "Send short summary (F2), then call back", stage: "contacted" },
  not:        { name: "Not interested", short: "Not interested", c: "--bad", tpl: "r2", next: "Send polite close (R2)", stage: "lost" },
  unreach:    { name: "Unable to reach", short: "No answer", c: "--muted", tpl: "f3", ov: "d3", next: "Voicemail left → send follow-up email (F3)", stage: "contacted" },
};
export const CALL_IDS = Object.keys(CALLS) as CallId[];
/** Look up a call outcome by a possibly-unknown status string. */
export const callDef = (s?: string): CallDef | undefined => (s ? (CALLS as Record<string, CallDef>)[s] : undefined);

export const KEY = "cs-outreach-v1";
export const TPL_VERSION = 6;

/** The follow-up email for a call outcome. Overseers get the district versions (D3, D4) where there is one. */
export const callTpl = (l: Partial<Lead>, c: CallDef) => (isDist(l) && c.ov) || c.tpl;

/** The call's follow-up email has gone out. After a voicemail, the group send F4 counts as well as F3 / D3. */
export const callFollowed = (l: Lead, c: CallDef) => { const sent = l.sent || []; return sent.includes(callTpl(l, c)) || (c === CALLS.unreach && sent.includes("f4")); };
export function callPending(l: Lead) {
  const c = l.call && callDef(l.call.status);
  return c && !["live", "active"].includes(l.stage) && !callFollowed(l, c) ? c : null;
}

export function nextFor(l: Lead): [string, number | null] | null {
  const s = l.stage, q = l.seq || 0;
  const c = callPending(l); if (c && s !== "lost") return [c.next.replace(c.tpl.toUpperCase(), callTpl(l, c).toUpperCase()), 1];
  if (l.type === "affiliate") return affNext(l);
  if (s === "new") return l.type === "pta" ? ["Send PTA intro (PT1)", 0] : l.type === "user" ? ["Send check-in email (U1)", 0] : l.type === "campaign" ? ["Send a personal follow-up email", 0] : ["Send first email (E1)", 0];
  if (s === "contacted" && (l.type === "pta" || l.type === "user")) return ["No reply? Send a short personal follow-up", 5];
  if (s === "contacted") return q <= 1 ? ["Day 4: call. No answer → voicemail + E2", 4] : q === 2 ? ["Day 10: last email (E3)", 4] : ["No reply: moves to Nurture", 4];
  if (s === "engaged" && isDist(l)) return !(l.sent || []).includes("d4") ? ["Send each school's sign-up link (D4)", 0] : ["Check sign-ups at the district's schools", 5];
  if (s === "engaged") return l.path === "we" ? ["We send it: get contacts (R3), send family message", 2] :
    l.shared ? ["Check sign-ups on the school's code", 5] : ["Check sign-ups; nudge (G1) if none", 8];
  if (s === "live") return (l.sent || []).includes("g2") ? ["Monthly update (G3)", 20] : ["Send thank-you + reminder (G2)", 0];
  if (s === "active") return ["Monthly update (G3)", 20];
  if (s === "nurture") return ["Re-try with a fresh angle (E3)", 30];
  if (s === "rejected") return ["Find a working email, then re-send", null];
  return null;
}

export function suggestTpl(l: Pick<Lead, "stage"> & Partial<Lead>): string | null {
  const s = l.stage, q = l.seq || 0, sent = l.sent || [];
  const c = callPending(l as Lead); if (c) return callTpl(l, c);
  if (l.type === "affiliate") return affTpl(l);
  if (s === "new") return isDist(l) ? "d1" : l.type === "pta" ? "pt1" : l.type === "user" ? "u1" : l.type === "campaign" ? null : "e1";
  if ((l.type === "pta" || l.type === "user") && s === "contacted") return null;
  if (s === "contacted") return q <= 1 ? "e2" : "e3";
  if (s === "engaged" && isDist(l)) return sent.includes("d4") ? null : "d4";
  if (s === "engaged") return l.path === "we" ? "r3" : "g1";
  if (s === "live") return sent.includes("g2") ? "g3" : "g2";
  if (s === "active") return "g3";
  if (s === "nurture") return "e3";
  if (s === "rejected") return sent[sent.length - 1] || (isDist(l) ? "d1" : "e1");
  return "r2";
}

/* ---------- affiliates: DM1 invite → DM2 follow-up → DM3 video + free access → DM4 welcome + codes → DM5 thank-you ---------- */
function affNext(l: Partial<Lead>): [string, number | null] | null {
  const s = l.stage, q = l.seq || 0, sent = l.sent || [];
  if (s === "new") return ["Send first DM (DM1)", 0];
  if (s === "contacted") return q <= 1 ? ["No reply? Send follow-up DM (DM2)", 3] : ["No reply: moves to No reply", 5];
  if (s === "engaged") return !sent.includes("dm3") ? ["Send the video + free access (DM3)", 0]
    : !sent.includes("dm4") ? ["When they say yes: welcome + codes (DM4)", 3] : ["Check they've signed up and posted; nudge if not", 5];
  if (s === "live") return sent.includes("dm5") ? ["Check clicks and sign-ups from their code", 10] : ["Thank them for sharing (DM5)", 0];
  if (s === "active") return ["Monthly check-in (DM5)", 20];
  if (s === "nurture") return ["Try once more with a fresh angle", 30];
  if (s === "rejected") return ["Find another way in (email or another platform)", null];
  return null;
}
function affTpl(l: Partial<Lead>): string | null {
  const s = l.stage, q = l.seq || 0, sent = l.sent || [];
  if (s === "new") return "dm1";
  if (s === "contacted") return q <= 1 ? "dm2" : null;
  if (s === "engaged") return !sent.includes("dm3") ? "dm3" : !sent.includes("dm4") ? "dm4" : null;
  if (s === "live" || s === "active") return "dm5";
  return null;
}
