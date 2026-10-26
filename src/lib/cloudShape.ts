// The shape the cloud database gives back (supabase/migrations/0001_lead_manager.sql: lead_to_json, templates_json),
// written in TypeScript so the sync, the backup migration script and the tests agree on what "unchanged" means.
//
// The mapping keeps every value. It normalises only these, none of which changes how the app behaves:
//  - a field set to null comes back absent (the app never stores null in a lead);
//  - a lead without `activity` comes back with `activity: []`;
//  - `call.prev` with neither stage nor seq is dropped;
//  - a template's `to` is always present (null when it had none).
import type { Lead, Template } from "./types";

/** JSON with sorted keys, so values compare equal after a round trip through jsonb (which reorders keys). */
export function canon(v: unknown): string {
  if (Array.isArray(v)) return "[" + v.map(x => x === undefined ? "null" : canon(x)).join(",") + "]";
  if (v && typeof v === "object") {
    return "{" + Object.keys(v).sort().filter(k => (v as any)[k] !== undefined)
      .map(k => JSON.stringify(k) + ":" + canon((v as any)[k])).join(",") + "}";
  }
  return JSON.stringify(v ?? null);
}

/** Lead fields with their own column. Anything else is kept verbatim in `extra`. */
export const LEAD_COLUMNS = new Set(["id", "type", "first", "last", "title_salutation", "email", "phone", "jobtitle", "school",
  "district", "districtId", "state", "city", "region", "level", "grades", "owner", "hubspotId", "assigned", "code", "regLink",
  "campaign", "notes", "stage", "seq", "sent", "path", "shared", "nextAction", "nextDue", "call", "families", "activity",
  "createdAt", "updatedAt"]);

const dropNull = (o: Record<string, unknown>) => {
  const r: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(o)) if (v !== null && v !== undefined) r[k] = v;
  return r;
};

export function normLead(l: Lead): Lead {
  const o: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(l)) {
    if (v === undefined || (v === null && LEAD_COLUMNS.has(k))) continue;
    o[k] = v;
  }
  o.activity = (Array.isArray(l.activity) ? l.activity : []).map(a => {
    const { ts, type, note, ...rest } = a as unknown as Record<string, unknown>;
    return { ...rest, ...dropNull({ ts, type, note }) };
  });
  if (l.call && typeof l.call === "object") {
    const c = dropNull(l.call as unknown as Record<string, unknown>);
    if (c.prev && typeof c.prev === "object") {
      const p = dropNull(c.prev as Record<string, unknown>);
      if (Object.keys(p).length) c.prev = p; else delete c.prev;
    }
    o.call = c;
  }
  if (l.families && typeof l.families === "object") o.families = dropNull(l.families as unknown as Record<string, unknown>);
  return o as unknown as Lead;
}

export const TEMPLATE_COLUMNS = new Set(["id", "phase", "name", "to", "seq", "path", "subject", "body", "kind", "file"]);

export function normTpl(t: Template): Template {
  const o: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(t)) {
    if (v === undefined || (v === null && TEMPLATE_COLUMNS.has(k))) continue;
    o[k] = v;
  }
  o.to = t.to ?? null;
  return o as unknown as Template;
}

/** 53-bit string hash (cyrb53). Keeps the sync baseline small enough to store in the browser. */
export function hash(s: string): string {
  let h1 = 0xdeadbeef, h2 = 0x41c6ce57;
  for (let i = 0; i < s.length; i++) { const c = s.charCodeAt(i); h1 = Math.imul(h1 ^ c, 2654435761); h2 = Math.imul(h2 ^ c, 1597334677); }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(36) + ":" + s.length.toString(36);
}

/** Fingerprints used to tell whether something changed since it was last synced. */
export const leadKey = (l: Lead) => hash(canon(normLead(l)));
export const tplKey = (t: Template, pos: number) => hash(canon({ pos, t: normTpl(t) }));
export const valueKey = (v: unknown) => hash(canon(v));
