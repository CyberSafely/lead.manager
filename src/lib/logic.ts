// Merge fields and stage logic. Stage changes go through setStage() so they're logged and the next step is recomputed.
import { S, ctoOf, overseerOf, save, schoolsOf, tpl } from "../store";
import { CALLS, MAIN, callDef, nextFor, stg } from "./pipeline";
import { addBiz, isDist, isPr, nowTs, schoolOf, todayISO, uid } from "./helpers";
import type { Lead, SchoolContact, StageId } from "./types";

/* ---------- merge fields ---------- */
/** {{signup_link}} for an overseer: their district has one link per school (a default link would be wrong), so it's the
 *  one school's link, or the schools with links, one per line. */
function districtLinks(l: Partial<Lead>) {
  const ls = schoolsOf(l as Lead).filter(s => s.regLink);
  return !ls.length ? "[school's sign-up link]" : ls.length === 1 ? ls[0].regLink! : "\n" + ls.map(s => `${schoolOf(s)}: ${s.regLink}`).join("\n");
}
/** {{school_links}}: each school's own sign-up link, one per line. An overseer gets every school in their district. */
function schoolLinks(l: Partial<Lead>) {
  const ls = isDist(l) ? schoolsOf(l as Lead) : [l];
  if (!ls.length) return "[no schools from this district in the Lead Manager yet]";
  return ls.map(s => `${s.school || s.district || "[school]"}: ${s.regLink || "[no sign-up link on file]"}`).join("\n");
}
/** A SchoolContact's display name, or "" if they have none. */
function contactName(c?: SchoolContact) { return c ? `${c.first || ""} ${c.last || ""}`.trim() : ""; }
/** The tech/online-safety overseer on a lead (contact whose role reads "Tech"/"safety"/"overseer"), if any. */
function overseerContact(l: Partial<Lead>) { return (l.contacts || []).find(c => /tech|safety|overse/i.test(c.role || "")); }
/** The front-office "gatekeeper" who answers the phone (role reads "front"/"office"/"desk"/"reception"/"secretary"/"admin"), if any. */
function gatekeeperContact(l: Partial<Lead>) { return (l.contacts || []).find(c => /front|office|desk|reception|secretar|admin/i.test(c.role || "")); }
/** {{call_intro}}: the "I already called" opening, rewritten to name whoever is on file. Soft fallback: when a lead has
 *  no overseer and/or no front-office contact, the sentence stays true and names no one, never a blank or a placeholder. */
function callIntro(l: Partial<Lead>, school: string, ov: string, gk: string) {
  if (ov && gk) return `I recently called ${school} and spoke with ${gk}, who let me know that ${ov} is the person who oversees online safety for your students.`;
  if (ov) return `I recently called ${school} to ask who oversees online safety for your students, and learned it's ${ov}.`;
  if (gk) return `I recently called ${school} and spoke with ${gk} about who oversees online safety for your students.`;
  return `I recently called ${school} to ask who oversees online safety for your students.`;
}
export function tokens(l: Partial<Lead>) {
  const sal = l.title_salutation;
  const t: Record<string, string | number> = {
    greeting: sal ? `${sal} ${l.last || l.first || ""}`.trim() : (l.first || "there"),
    first: l.first || "", last: l.last || "", school: l.school || l.district || "your school", district: l.district || "",
    sender: S.settings.sender, phone: S.settings.phone || "[your phone]",
    title: S.settings.title || "[your title]", sender_email: S.settings.sender_email || "[your email]",
    mailing_address: S.settings.mailingAddress || "[CyberSafely.ai mailing address]",
    signup_link: l.regLink || (isDist(l) ? districtLinks(l) : l.type === "affiliate" ? "[their tracking link]" : S.settings.defaultLink || "[school's sign-up link]"),
    school_links: schoolLinks(l),
    onboarding_page: S.settings.onboardingPage || "[parent onboarding page link]",
    support: S.settings.support || "[support email or phone]",
    code: l.code || "[referral code]", access_code: l.accessCode || "[access code]",
    signups: (l.families?.signups !== undefined && l.families.signups !== "") ? l.families.signups : "[number]",
  };
  const ov = contactName(overseerContact(l)), gk = contactName(gatekeeperContact(l));
  t.overseer = ov || "whoever oversees online safety";
  t.gatekeeper = gk || "your front office";
  t.call_intro = callIntro(l, String(t.school), ov, gk);
  const sub = (id: string) => { const x = tpl(id); return x ? x.body.replace(/\{\{(\w+)\}\}/g, (_, k) => String(t[k] ?? "")) : ""; };
  t.newsletter = sub("n1"); t.parent_email = sub("p1");
  return t;
}
export function fill(text: string | undefined, l: Partial<Lead>) {
  const t = tokens(l); return String(text || "").replace(/\{\{(\w+)\}\}/g, (_, k) => String(t[k] ?? "{{" + k + "}}"));
}
export function render1(id: string, l: Partial<Lead>) { const x = tpl(id); return x ? { s: fill(x.subject, l), b: fill(x.body, l) } : { s: "", b: "" }; }
/** {{token}} → HubSpot personalization tokens, for pasting into a HubSpot marketing email. */
export function toHubspot(text?: string) {
  const H: Record<string, string> = {
    greeting: "{{ contact.firstname }}", first: "{{ contact.firstname }}", last: "{{ contact.lastname }}", school: "{{ contact.company }}",
    district: "{{ contact.company }}", sender: S.settings.sender, phone: S.settings.phone || "[your phone]",
    title: S.settings.title || "[your title]", sender_email: S.settings.sender_email || "[your email]",
    mailing_address: S.settings.mailingAddress || "[CyberSafely.ai mailing address]",
    signup_link: S.settings.defaultLink || "[school's sign-up link]", onboarding_page: S.settings.onboardingPage || "[parent onboarding page link]",
    support: S.settings.support || "[support email or phone]", signups: "[number]", school_links: "[each school's sign-up link]",
  };
  const sub = (id: string) => (tpl(id)?.body || "").replace(/\{\{(\w+)\}\}/g, (_, k) => H[k] ?? "");
  H.newsletter = sub("n1"); H.parent_email = sub("p1");
  return String(text || "").replace(/\{\{(\w+)\}\}/g, (_, k) => H[k] ?? "");
}

/* ---------- stage logic ---------- */
export function setStage(l: Lead, st: StageId, note?: string) {
  if (l.stage === st) return;
  const from = l.stage; l.stage = st;
  log(l, "Stage", `${stg(from, l.type)?.name || from} → ${stg(st, l.type).name}${note ? ": " + note : ""}`);
  setNext(l);
}
export function setNext(l: Lead) {
  const nx = nextFor(l);
  if (nx) { l.nextAction = nx[0]; l.nextDue = nx[1] == null ? "" : addBiz(nx[1]); } else { l.nextAction = ""; l.nextDue = ""; }
}
export function log(l: Lead, type: string, note?: string) {
  (l.activity = l.activity || []).push({ ts: nowTs(), type, note: note || "" }); l.updatedAt = new Date().toISOString();
}
// Add another person at this school/district (the influencer who actually picked up). Logs it to the history.
export function addContact(l: Lead, c: Omit<SchoolContact, "id">): SchoolContact {
  const person: SchoolContact = { id: uid(), ...c };
  (l.contacts = l.contacts || []).push(person);
  const who = [person.first, person.last].filter(Boolean).join(" ") || person.email || person.phone || "contact";
  log(l, "Contact added", who + (person.role ? " (" + person.role + ")" : ""));
  return person;
}
export function fwd(l: Lead, st: StageId) { return MAIN.indexOf(st) > MAIN.indexOf(l.stage) || l.stage === "nurture"; }
// type "DM sent" for affiliates: the note also says who sent it, since several people DM from the team
export function logSent(l: Lead, tid: string, type = "Email sent") {
  const t = tpl(tid); log(l, type, (t ? t.name : "") + (type === "DM sent" && S.settings.caller ? " · by " + S.settings.caller : ""));
  l.sent = [...new Set([...(l.sent || []), tid])];
  if (t?.seq) l.seq = Math.max(l.seq || 0, t.seq);
  if (t?.path) l.path = t.path;
  if (t?.shared) l.shared = true;
  if (t?.to === "lost") return setStage(l, "lost", t.name);
  if (t?.to && fwd(l, t.to)) return setStage(l, t.to, t.name);
  setNext(l);
}
export function autoAdvance(l: Lead, a: string) {
  if (["Call: reached", "Reply received", "Meeting / demo"].includes(a)) { if (fwd(l, "engaged")) setStage(l, "engaged"); else setNext(l); return; }
  if (a === "Says they shared it") { l.shared = true; if (fwd(l, "engaged")) setStage(l, "engaged"); else setNext(l); return; }
  if ((a === "Voicemail" || a === "Front office message") && l.stage === "contacted") { l.nextAction = "Send E2 (after call attempt)"; l.nextDue = todayISO(); }
}
// Affiliates: progress buttons in the drawer. A URL in the note of "Posted / shared link" becomes their latest post.
export function affAdvance(l: Lead, a: string, note: string) {
  if (["Replied", "Agreed to partner", "Link sent"].includes(a)) { if (fwd(l, "engaged")) setStage(l, "engaged", a); else setNext(l); return; }
  if (a === "Posted / shared link") { if (/^https?:\/\//.test(note)) l.postUrl = note; if (fwd(l, "live")) setStage(l, "live", a); else setNext(l); return; }
  if (a === "Declined") setStage(l, "lost", a);
}
export function setSignups(l: Lead, v: string) {
  l.families = l.families || {}; l.families.signups = v; l.families.asOf = todayISO();
  const n = +v || 0, tgt = +S.settings.activeTarget || 10;
  if (n >= tgt && l.stage !== "active") setStage(l, "active", `${n} sign-ups`);
  else if (n > 0 && n < tgt && MAIN.indexOf(l.stage) < MAIN.indexOf("live")) setStage(l, "live", `${n} sign-ups`);
  // The district's overseer and CTO go Live with the first sign-ups at any of its schools
  if (n > 0 && isPr(l)) [overseerOf(l), ctoOf(l)].forEach(o => { if (o && MAIN.indexOf(o.stage) < MAIN.indexOf("live")) setStage(o, "live", `${schoolOf(l)}: ${n} sign-ups`); });
}
// Record a call outcome: moves the stage and queues the matching follow-up email
export function setCall(l: Lead, st: string, note?: string) {
  if (!st) {
    // Clear: drop the outcome and put the stage back to where it was before the first outcome
    if (l.call) {
      const p = l.call.prev; delete l.call.status; delete l.call.ts; delete l.call.by; delete l.call.prev;
      if (p) { l.stage = p.stage; l.seq = p.seq || 0; }
      log(l, "Note", "Call outcome cleared"); setNext(l);
    }
    return;
  }
  const c = callDef(st); if (!c) return;
  const prev = l.call?.prev || { stage: l.stage, seq: l.seq || 0 };
  l.call = { ...(l.call || {}), status: st, ts: nowTs(), by: S.settings.caller || "", prev };
  log(l, "Call", c.name + (st === "unreach" ? " (voicemail)" : "") + (note ? ": " + note : ""));
  if (c.stage === "lost") setStage(l, "lost", c.name);
  else if (c.stage === "engaged" && fwd(l, "engaged")) setStage(l, "engaged", c.name);
  else if (c.stage === "contacted" && ["new", "lost", "nurture"].includes(l.stage)) setStage(l, "contacted", c.name);
  if (c.stage === "contacted") l.seq = Math.max(l.seq || 0, 2);
  setNext(l);
}
// Start over: put the pipeline back to a fresh Cold lead. Contact details and notes stay.
export function resetLead(l: Lead) {
  l.stage = "new"; l.seq = 0; l.sent = []; l.activity = []; l.families = {}; l.path = ""; l.shared = false;
  delete l.call;
  setNext(l); l.updatedAt = new Date().toISOString();
}
// Outreach finished with no reply → Nurture
export function tick() {
  const t = todayISO(); let ch = false;
  S.leads.forEach(l => {
    const aff = l.type === "affiliate";
    if (l.stage === "contacted" && (l.seq || 0) >= (aff ? 2 : 3) && l.nextDue && l.nextDue < t) { setStage(l, "nurture", aff ? "no reply after the follow-up DM" : "no reply after 3 touches"); ch = true; }
  });
  if (ch) save();
}
export { CALLS };
