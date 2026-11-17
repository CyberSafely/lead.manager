// Inferring a district's email format, and the "inferred" flag through both imports. Fake data only.
import { beforeEach, describe, expect, it } from "vitest";
import { S, blank, replaceState, ui } from "../src/store";
import { importContacts, importCsv } from "../src/lib/csv";
import { districtPeople, inferEmail, learnPattern } from "../scripts/lib/emailPattern.mjs";

beforeEach(() => { localStorage.clear(); replaceState(blank()); ui.ds = "principal"; });

const ppl = (pairs: [string, string, string][]) => pairs.map(([first, last, email]) => ({ first, last, email }));

describe("district email format", () => {
  it("learns the most common format on the district's domain and builds addresses from it", () => {
    const p = learnPattern(ppl([["Pat", "Example", "pat.example@example.org"], ["Sam", "Sample", "sam.sample@example.org"],
      ["Lee", "Tester", "lee.tester@example.org"], ["Kim", "Demo", "kdemo@example.org"], ["Ann", "Other", "ann@gmail.com"]]));
    expect(p).toMatchObject({ domain: "example.org", pattern: "first.last", matches: 3, total: 4 });
    expect(inferEmail(p, "Dr. Robin", "O'Neil-Smith Jr.")).toBe("robin.oneilsmith@example.org");
    expect(inferEmail(p, "", "Example")).toBe("");
  });
  it("refuses to guess without a clear format", () => {
    expect(learnPattern(ppl([["Pat", "Example", "pat.example@example.org"], ["Sam", "Sample", "ssample@example.org"]]))).toBeNull();
    expect(learnPattern(ppl([["Pat", "Example", "pat.example@example.org"], ["Sam", "Sample", "sam.sample@example.org"],
      ["Lee", "Tester", "lee.tester@example.org"], ["A", "B", "x1@example.org"], ["C", "D", "x2@example.org"], ["E", "F", "x3@example.org"],
      ["G", "H", "x4@example.org"]]))).toBeNull();   // 3 of 7 fit: under half
  });
  it("learns lastfirst, and never learns from emails that were themselves inferred", () => {
    const leads = [
      { districtId: "012345", first: "Pat", last: "Example", email: "examplepat@example.org" },
      { districtId: "12345", first: "Sam", last: "Sample", email: "samplesam@example.org", contacts: [{ first: "Lee", last: "Tester", email: "testerlee@example.org" }] },
      { districtId: "12345", first: "Kim", last: "Demo", email: "kim.demo@example.org", emailInferred: true },
      { districtId: "99999", first: "Ann", last: "Other", email: "ann.other@example.org" },
    ];
    expect(districtPeople(leads, "12345")).toHaveLength(3);
    expect(learnPattern(districtPeople(leads, "12345"))).toMatchObject({ pattern: "lastfirst", matches: 3 });
  });
});

describe("Email Inferred column", () => {
  it("flags inferred emails on imported leads, and clears it only when a different email arrives", () => {
    ui.ds = "cto";
    const csv = (email: string, inferred: string) => `District ID,District,First Name,Last Name,Email,Email Inferred,Job Title\n12345,Example R-I,Pat,Example,${email},${inferred},Director of Technology\n`;
    importCsv(csv("pat.example@example.org", "yes"), "");
    expect(S.leads[0]).toMatchObject({ type: "cto", email: "pat.example@example.org", emailInferred: true });
    importCsv("Email,First Name,Last Name,District\npat.example@example.org,Pat,Example,Example R-I\n", "");   // same email back (HubSpot round trip)
    expect(S.leads[0].emailInferred).toBe(true);
    importCsv(csv("pexample@example.org", ""), "");   // a different, published email: by name + district
    expect(S.leads[0]).toMatchObject({ email: "pexample@example.org" });
    expect(S.leads[0].emailInferred).toBeUndefined();
  });
  it("flags inferred emails on imported school contacts", () => {
    S.leads.push({ id: "a", first: "Pat", last: "Example", school: "Example Middle", districtId: "12345", district: "Example R-I", stage: "new", seq: 0, sent: [], activity: [], families: {} });
    importContacts("Lead ID,First Name,Last Name,Role,Email,Email Inferred\na,Lee,Sample,Guidance counselor,lee.sample@example.org,yes\na,Kim,Sample,Guidance counselor,kim.sample@example.org,\n");
    expect(S.leads[0].contacts).toMatchObject([{ first: "Lee", emailInferred: true }, { first: "Kim" }]);
    expect(S.leads[0].contacts![1].emailInferred).toBeUndefined();
  });
});
