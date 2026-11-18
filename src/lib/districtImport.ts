// Graph → Import people: read a scraped CSV (scripts/scrape-staff.mjs output, a CTO/overseer list, or a hand-made
// sheet) for the district on the chart. Rows for other districts are dropped; rows with no district are assigned to
// this one. The kept rows then go through the same importers as the Data tab (importContacts / importCsv).
import { parseCsv } from "./csv";
import { csvCell, normD } from "./helpers";
import type { ListId } from "./types";

export interface DistrictCsv {
  kind: "contacts" | "people";   // contacts = people at a school (Role + School/Lead ID columns); people = leads
  total: number;                 // rows with a name or email
  kept: number; other: number; filled: number;   // for this district / another district (skipped) / no district (assigned here)
  suggest: ListId;               // which list "people" rows most likely belong on
  csv: string;                   // the kept rows, with District ID / District filled in
  error?: string;
}

const did = (s?: string) => String(s || "").trim().replace(/^0+/, "");

export function readDistrictCsv(text: string, fileName: string, district: string, districtId: string): DistrictCsv {
  let rows = parseCsv(text.replace(/^﻿/, ""));
  const empty = { kind: "people" as const, total: 0, kept: 0, other: 0, filled: 0, suggest: "cto" as ListId, csv: "" };
  // Skip a title line above the header, like the Data tab does
  const hi = rows.slice(0, 5).findIndex(r => r.some(c => /^(e-?mail|name|full name|first ?name)$/i.test(c.trim())));
  if (hi > 0) rows = rows.slice(hi);
  if (rows.length < 2) return { ...empty, error: "No rows found in that file." };
  const head = rows[0].map(h => h.trim()), H = head.map(h => h.toLowerCase());
  const at = (n: string) => H.indexOf(n);
  if (at("email") < 0 && at("first name") < 0 && at("last name") < 0 && at("name") < 0)
    return { ...empty, error: "Couldn't find First Name / Last Name or Email columns." };
  const kind = H.includes("role") && (H.includes("school") || H.includes("lead id")) ? "contacts" : "people";

  // Make sure there are District ID and District columns to fill
  let iId = at("district id"), iName = at("district");
  if (iId < 0) { head.push("District ID"); iId = head.length - 1; }
  if (iName < 0) { head.push("District"); iName = head.length - 1; }
  const wantId = did(districtId), wantName = normD(district);

  let total = 0, other = 0, filled = 0;
  const keep: string[][] = [];
  for (const r0 of rows.slice(1)) {
    if (!r0.some(c => c.trim())) continue;
    total++;
    const r = head.map((_, i) => (r0[i] || "").trim());
    const rid = did(r[iId]), rname = normD(r[iName]);
    const mine = rid && wantId ? rid === wantId : rname ? rname === wantName : !rid;
    if (!rid && !rname) { filled++; }
    else if (!mine) { other++; continue; }
    r[iId] = r[iId] || wantId; r[iName] = r[iName] || district;
    keep.push(r);
  }

  // People files: the scraper names district-leader files cto-*.csv; otherwise go by the job titles
  const titles = keep.map(r => (r[at("job title")] || r[at("jobtitle")] || "").toLowerCase()).join(" | ");
  const suggest: ListId = /^cto-/i.test(fileName) ? "cto"
    : /superintendent/.test(titles) && !/technolog|information|\bcto\b|\bcio\b/.test(titles) ? "overseer"
    : at("school") >= 0 && keep.some(r => r[at("school")]) ? "principal" : "cto";

  const csv = [head, ...keep].map(r => r.map(csvCell).join(",")).join("\n");
  return { kind, total, kept: keep.length, other, filled, suggest, csv };
}
