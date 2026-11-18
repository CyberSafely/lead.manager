// Work out how a district addresses its staff email (e.g. first.last@lsr7.net) from the emails we already have, and
// build the likely email for someone we only have a name for. Used by scripts/scrape-staff.mjs and
// scripts/infer-emails.ts. An inferred email is a best guess: it's always marked as inferred so a person confirms it.

// Free/personal mailboxes say nothing about the district's own format
const PERSONAL = /^(gmail|yahoo|hotmail|outlook|icloud|aol|live|msn|comcast|att|sbcglobal|charter|me|protonmail)\./i;

/** Name parts as they usually appear in an address: lowercase, no accents, titles, suffixes, spaces or punctuation. */
export function nameParts(first, last) {
  const clean = s => String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase()
    .replace(/\b(dr|mr|mrs|ms|miss|prof)\.?\s+/g, "").replace(/\b(jr|sr|ii|iii|iv)\.?$/g, "").trim();
  const f = clean(first).split(/\s+/)[0]?.replace(/[^a-z]/g, "") || "";
  const lastWords = clean(last).split(/\s+/).filter(Boolean);
  const l = lastWords.join("").replace(/[^a-z]/g, "");                     // "de la cruz" → "delacruz", "o'neil" → "oneil"
  const lHyphen = (lastWords.at(-1) || "").replace(/[^a-z-]/g, "");          // keeps "smith-jones" for districts that keep hyphens
  return { f, l, lHyphen };
}

// The address formats districts use, as functions of first (f) and last (l)
export const PATTERNS = {
  "first.last": (f, l) => `${f}.${l}`,
  "firstlast": (f, l) => `${f}${l}`,
  "flast": (f, l) => `${f[0]}${l}`,
  "f.last": (f, l) => `${f[0]}.${l}`,
  "first_last": (f, l) => `${f}_${l}`,
  "first-last": (f, l) => `${f}-${l}`,
  "lastfirst": (f, l) => `${l}${f}`,
  "last.first": (f, l) => `${l}.${f}`,
  "last_first": (f, l) => `${l}_${f}`,
  "lastf": (f, l) => `${l}${f[0]}`,
  "last.f": (f, l) => `${l}.${f[0]}`,
  "firstl": (f, l) => `${f}${l[0]}`,
  "first.l": (f, l) => `${f}.${l[0]}`,
};

/**
 * Learn the district's format from people we have both a name and an email for.
 * people: [{ first, last, email }]. Returns { domain, pattern, matches, total, share } or null when there's no clear
 * format: at least `minMatches` addresses must fit, and the format must fit at least `minShare` of the district's
 * addresses on that domain (nicknames, middle names and older accounts account for the rest).
 */
export function learnPattern(people, { minMatches = 3, minShare = 0.5 } = {}) {
  const byDomain = new Map();
  for (const p of people) {
    const email = String(p.email || "").trim().toLowerCase(), at = email.lastIndexOf("@");
    if (at < 1) continue;
    const local = email.slice(0, at), domain = email.slice(at + 1);
    if (!domain || PERSONAL.test(domain)) continue;
    const { f, l, lHyphen } = nameParts(p.first, p.last);
    const d = byDomain.get(domain) || { total: 0, hits: {} };
    d.total++;
    if (f && l) for (const [k, fn] of Object.entries(PATTERNS)) if (fn(f, l) === local || (lHyphen !== l && fn(f, lHyphen) === local)) d.hits[k] = (d.hits[k] || 0) + 1;
    byDomain.set(domain, d);
  }
  // The district's own domain is the one most of its addresses use
  const [domain, d] = [...byDomain].sort((a, b) => b[1].total - a[1].total)[0] || [];
  if (!d) return null;
  const [pattern, matches] = Object.entries(d.hits).sort((a, b) => b[1] - a[1])[0] || [];
  if (!pattern || matches < minMatches || matches / d.total < minShare) return null;
  return { domain, pattern, matches, total: d.total, share: matches / d.total };
}

/** The likely email for this person under a learned format, or "" when the name isn't complete enough. */
export function inferEmail(pat, first, last) {
  if (!pat) return "";
  const { f, l } = nameParts(first, last);
  if (!f || !l) return "";
  return `${PATTERNS[pat.pattern](f, l)}@${pat.domain}`;
}

/** One line for a lead's notes explaining where an inferred email came from. */
export function inferNote(pat) {
  const from = pat.source === "DESE" ? "principal and superintendent emails in the DESE directory" : "known district emails";
  return `Email inferred from the district's address format (${pat.pattern}@${pat.domain}: ${pat.matches} of ${pat.total} ${from} fit). Not published: confirm it on the call.`;
}

/**
 * The district's format according to the DESE directory, from public/district-stats.js (scripts/district-stats.py).
 * stats: window.MO_DISTRICT_STATS (or the same object loaded in Node). Same bar as learnPattern: the format must be
 * one we can build (in PATTERNS) and fit at least `minMatches` and `minShare` of the addresses on the main domain.
 */
export function desePattern(stats, districtId, { minMatches = 3, minShare = 0.5 } = {}) {
  const code = String(districtId || "").trim().padStart(6, "0");
  const e = stats?.[code]?.emails?.[0];
  if (!e || PERSONAL.test(e.domain)) return null;
  const [pattern, matches] = (e.patterns || []).find(([p]) => PATTERNS[p]) || [];
  if (!pattern || matches < minMatches || matches / e.n < minShare) return null;
  return { domain: e.domain, pattern, matches, total: e.n, share: matches / e.n, source: "DESE" };
}

/** Everyone in a district we have a name + email for: the leads themselves and the people on their school records. */
export function districtPeople(leads, districtId) {
  const id = String(districtId || "").replace(/^0+/, "");
  const out = [];
  for (const l of leads) {
    if (String(l.districtId || "").replace(/^0+/, "") !== id) continue;
    if (l.email && !l.emailInferred) out.push({ first: l.first, last: l.last, email: l.email });
    for (const c of l.contacts || []) if (c.email && !c.emailInferred) out.push({ first: c.first, last: c.last, email: c.email });
  }
  return out;
}
