import { describe, expect, it } from "vitest";
import { desePattern, inferEmail } from "../scripts/lib/emailPattern.mjs";
import { buildingsOf, exampleEmail, patternLabel, sizeLine } from "../src/lib/district";
import type { DistrictStats, Lead } from "../src/lib/types";

const st = {
  name: "Example R-I", city: "Exampleton", county: "Example", phone: "(555) 555-0100", url: "http://example.org",
  students: 900, schools: 3, teachers: 60, levels: {},
  emails: [{ domain: "example.org", n: 10, patterns: [["fmlast", 4], ["flast", 6]] as [string, number][] }],
  buildings: [
    { name: "Example High", grades: "9-12", lo: 9, hi: 12, level: "High", students: 500, phone: "" },
    { name: "Example Middle", grades: "6-8", lo: 6, hi: 8, level: "Middle", students: 0, phone: "" },
  ],
} satisfies DistrictStats;

describe("district info", () => {
  it("matches a school lead to its DESE buildings, including a lead over two buildings", () => {
    const l = { id: "x", stage: "new", school: "The Example High School / Example Middle" } as Lead;
    expect(buildingsOf(l, st).map(b => b.name)).toEqual(["Example High", "Example Middle"]);
    expect(sizeLine(buildingsOf(l, st))).toBe("500 students");   // 0 = DESE has no enrollment, not counted
    expect(sizeLine(buildingsOf({ ...l, school: "Example High" }, st))).toBe("500 students · grades 9-12");
  });
  it("describes formats with a made-up name", () => {
    expect(exampleEmail("flast", "example.org")).toBe("pexample@example.org");
    expect(exampleEmail("first.last#", "example.org")).toBe("pat.example2@example.org");
    expect(patternLabel("flast#")).toBe("first initial + last + a number");
  });
  it("falls back to the DESE format only when it is one we can build and clear enough", () => {
    const pat = desePattern({ "012345": st }, "12345");   // leads store the code without leading zeros
    expect(pat).toMatchObject({ domain: "example.org", pattern: "flast", matches: 6, total: 10, source: "DESE" });
    expect(inferEmail(pat, "Pat", "Example")).toBe("pexample@example.org");
    expect(desePattern({ "012345": { ...st, emails: [{ domain: "example.org", n: 10, patterns: [["flast", 4]] }] } }, "12345")).toBeNull();
    expect(desePattern({}, "12345")).toBeNull();
  });
});

import { readDistrictCsv } from "../src/lib/districtImport";
describe("Graph → Import people", () => {
  const head = "District ID,District,First Name,Last Name,Email,Email Inferred,Phone Number,Job Title,Notes";
  it("keeps this district's rows, skips other districts, assigns rows with no district", () => {
    const csv = [head,
      "12345,Example R-I,Pat,Example,pexample@example.org,,555-555-0100,Chief Technology Officer,",
      "99999,Other R-II,Sam,Sample,ssample@example.org,,,Director of Technology,",
      ",,Jo,Demo,jdemo@example.org,yes,,Safety Coordinator,",
    ].join("\n");
    const r = readDistrictCsv(csv, "cto-example-import.csv", "Example R-I", "012345");
    expect(r).toMatchObject({ kind: "people", total: 3, kept: 2, other: 1, filled: 1, suggest: "cto" });
    expect(r.csv.split("\n")[2]).toBe("12345,Example R-I,Jo,Demo,jdemo@example.org,yes,,Safety Coordinator,");
  });
  it("adds district columns to a sheet without them, and spots a school contacts file", () => {
    const r = readDistrictCsv("First Name,Last Name,Email\nPat,Example,pat@example.org", "mine.csv", "Example R-I", "12345");
    expect(r.csv).toBe("First Name,Last Name,Email,District ID,District\nPat,Example,pat@example.org,12345,Example R-I");
    const c = readDistrictCsv("School,District ID,First Name,Last Name,Role\nExample High,12345,Pat,Example,Guidance counselor", "contacts-x.csv", "Example R-I", "12345");
    expect(c).toMatchObject({ kind: "contacts", kept: 1 });
    expect(readDistrictCsv("Foo,Bar\n1,2", "x.csv", "Example R-I", "12345").error).toBeTruthy();
  });
});
