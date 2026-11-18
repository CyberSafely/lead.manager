// District facts for the Graph view: the DESE numbers in public/district-stats.js (window.MO_DISTRICT_STATS, optional),
// matched to the leads you have, plus the staff email format. Shares the email-format logic with the scripts.
import { PATTERNS, learnPattern, type EmailPattern } from "../../scripts/lib/emailPattern.mjs";
import { normD } from "./helpers";
import type { DistrictBuilding, DistrictStats, Lead } from "./types";

/** The DESE facts for a district: by DESE code (leads store it without leading zeros), else by name. */
export function statsFor(districtId?: string, district?: string): DistrictStats | undefined {
  const all = window.MO_DISTRICT_STATS;
  if (!all) return undefined;
  const id = String(districtId || "").trim();
  if (id && all[id.padStart(6, "0")]) return all[id.padStart(6, "0")];
  const k = normD(district);
  return k ? Object.values(all).find(d => normD(d.name) === k) : undefined;
}

/** School names compared loosely (same rule as the scripts: drop "school"/"the", punctuation and case). */
export const normS = (s?: string) => String(s || "").toLowerCase().replace(/\b(school|schools|the)\b/g, "").replace(/[^a-z0-9]/g, "");

/** The DESE buildings a school lead covers (its school field can name several, joined by " / "). */
export function buildingsOf(l: Lead, st?: DistrictStats): DistrictBuilding[] {
  if (!st || !l.school) return [];
  const want = new Set(String(l.school).split(" / ").map(normS).filter(Boolean));
  return st.buildings.filter(b => want.has(normS(b.name)));
}

/** "1,433 students · grades 9-12" for a school lead, or "" when DESE doesn't list it. */
export function sizeLine(bs: DistrictBuilding[]): string {
  if (!bs.length) return "";
  const known = bs.filter(b => b.students);   // DESE lists 0 when no enrollment was reported
  const n = known.reduce((a, b) => a + (b.students || 0), 0);
  const grades = bs.length === 1 ? bs[0].grades : "";
  return [known.length ? n.toLocaleString("en-US") + " students" : "", grades ? "grades " + grades : ""].filter(Boolean).join(" · ");
}

/** Plain-English name of an email format. "#" = digits on the end (e.g. a number to tell two people apart). */
const LABEL: Record<string, string> = {
  "first.last": "first.last", "firstlast": "firstlast", "flast": "first initial + last", "f.last": "first initial . last",
  "first_last": "first_last", "first-last": "first-last", "lastfirst": "lastfirst", "last.first": "last.first",
  "last_first": "last_first", "lastf": "last + first initial", "last.f": "last . first initial", "firstl": "first + last initial",
  "first.l": "first . last initial", "fmlast": "first + middle initial + last", "first": "first name only", "last": "last name only",
};
export function patternLabel(p: string) {
  const num = p.endsWith("#"), base = num ? p.slice(0, -1) : p;
  return (LABEL[base] || base) + (num ? " + a number" : "");
}

/** What a made-up person's address looks like under a format, e.g. "pexample@sps.org" (never a real name). */
export function exampleEmail(p: string, domain: string) {
  const num = p.endsWith("#"), base = num ? p.slice(0, -1) : p;
  const local = PATTERNS[base]?.("pat", "example") ?? (base === "fmlast" ? "pjexample" : base === "first" ? "pat" : base === "last" ? "example" : "");
  return local ? local + (num ? "2" : "") + "@" + domain : "";
}

/** The format your own leads and contacts in this district follow (published emails only, not inferred ones). */
export function leadsPattern(members: Lead[]): (EmailPattern & { people: number }) | { people: number } {
  const people: { first?: string; last?: string; email?: string }[] = [];
  for (const l of members) {
    if (l.email && !l.emailInferred) people.push({ first: l.first, last: l.last, email: l.email });
    for (const c of l.contacts || []) if (c.email && !c.emailInferred) people.push({ first: c.first, last: c.last, email: c.email });
  }
  const p = learnPattern(people);
  return p ? { ...p, people: people.length } : { people: people.length };
}
