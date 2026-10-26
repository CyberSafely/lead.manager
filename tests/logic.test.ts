// Unit tests for the pipeline rules. Fake data only.
import { beforeEach, describe, expect, it, vi } from "vitest";
import { S, blank, replaceState, ui } from "../src/store";
import { nextFor, suggestTpl } from "../src/lib/pipeline";
import { addBiz, bizSince, fmtPhone, normD } from "../src/lib/helpers";
import { affAdvance, fill, logSent, render1, resetLead, setCall, setSignups, setStage, tick } from "../src/lib/logic";
import { familyFlag, hubspotBatch, importCsv, parseCsv, toCsv } from "../src/lib/csv";
import { rptBody } from "../src/lib/report";
import { postReminders, type Item, type Post } from "../src/social/data";
import type { Lead } from "../src/lib/types";

const L = (o: Partial<Lead> = {}): Lead => ({ id: "x", first: "Pat", last: "Example", school: "Example MS", stage: "new", seq: 0, sent: [], activity: [], families: {}, ...o });

beforeEach(() => {
  vi.useFakeTimers(); vi.setSystemTime(new Date("2026-10-15T10:00:00")); // a Thursday
  localStorage.clear(); replaceState(blank()); ui.ds = "principal";
});

describe("dates", () => {
  it("adds business days, skipping the weekend", () => {
    expect(addBiz(1)).toBe("2026-10-16");
    expect(addBiz(2)).toBe("2026-10-19");
    expect(addBiz(4)).toBe("2026-10-21");
  });
  it("counts business days since a timestamp", () => { expect(bizSince("2026-10-09T09:00:00Z")).toBe(4); });
});

describe("pipeline", () => {
  it("suggests the next step and email by stage", () => {
    expect(nextFor(L())).toEqual(["Send first email (E1)", 0]);
    expect(suggestTpl(L())).toBe("e1");
    expect(suggestTpl(L({ type: "overseer" }))).toBe("d1");
    expect(nextFor(L({ stage: "contacted", seq: 2 }))).toEqual(["Day 10: last email (E3)", 4]);
    expect(nextFor(L({ stage: "rejected" }))).toEqual(["Find a working email, then re-send", null]);
  });
  it("logging E1 moves Cold → Contacted and schedules the day-4 call", () => {
    const l = L(); logSent(l, "e1");
    expect(l.stage).toBe("contacted"); expect(l.seq).toBe(1); expect(l.nextDue).toBe("2026-10-21");
    expect(l.activity!.map(a => a.type)).toEqual(["Email sent", "Stage"]);
  });
  it("a call outcome moves the stage, and Clear puts it back", () => {
    const l = L({ stage: "contacted", seq: 1 });
    setCall(l, "interested");
    expect(l.stage).toBe("engaged"); expect(l.nextAction).toBe("Send next steps (F1)"); expect(l.nextDue).toBe("2026-10-16");
    setCall(l, "");
    expect(l.stage).toBe("contacted"); expect(l.seq).toBe(1); expect(l.call!.status).toBeUndefined();
  });
  it("sign-ups move to Live, then Active at the target", () => {
    const l = L({ stage: "engaged" });
    setSignups(l, "3"); expect(l.stage).toBe("live");
    setSignups(l, "10"); expect(l.stage).toBe("active");
  });
  it("tick moves overdue 3-touch schools to Nurture", () => {
    const l = L({ stage: "contacted", seq: 3, nextDue: "2026-10-14" }); S.leads.push(l);
    tick(); expect(l.stage).toBe("nurture");
  });
  it("reset puts a worked lead back to Cold but keeps contact info and notes", () => {
    const l = L({ notes: "Ask for the counselor", email: "pat@example.org" });
    logSent(l, "e1"); setCall(l, "interested", "liked it"); setSignups(l, "3"); l.shared = true;
    resetLead(l);
    expect(l).toMatchObject({ stage: "new", seq: 0, sent: [], activity: [], families: {}, shared: false, path: "",
      nextAction: "Send first email (E1)", notes: "Ask for the counselor", email: "pat@example.org" });
    expect(l.call).toBeUndefined();
  });
  it("setStage is a no-op for the same stage", () => { const l = L(); setStage(l, "new"); expect(l.activity).toHaveLength(0); });
});

describe("merge fields", () => {
  it("fills tokens, with placeholders for missing settings", () => {
    expect(fill("Hi {{greeting}} at {{school}}, call {{phone}} {{unknown}}", L({ title_salutation: "Dr." })))
      .toBe("Hi Dr. Example at Example MS, call [your phone] {{unknown}}");
  });
});

describe("CSV", () => {
  it("parses quotes, commas and blank lines", () => {
    expect(parseCsv('a,b\n"x, y","say ""hi"""\n\n')).toEqual([["a", "b"], ["x, y", 'say "hi"']]);
  });
  it("imports, then re-import updates by email instead of duplicating", () => {
    const csv = "First Name,Last Name,Email,School,Associated Company\nPat,Example,PAT@example.org,Example MS,Example District\n";
    expect(importCsv(csv, "")).toMatch(/^Added 1, updated 0/);
    expect(importCsv(csv.replace("Example MS", "Example Middle"), "")).toMatch(/^Added 0, updated 1/);
    expect(S.leads).toHaveLength(1);
    expect(S.leads[0]).toMatchObject({ email: "pat@example.org", school: "Example Middle", district: "Example District", nextAction: "Send first email (E1)" });
    expect(toCsv().split("\n")[1]).toContain("pat@example.org");
  });
  it("imports affiliates by username + platform, with follower counts and names", () => {
    ui.ds = "affiliate";
    const csv = "Social Media Handle,Name,Follower Count,Platform\npat.example,Pat Example,446K\npatexample_tips,Pat Example,\"2,546\",Instagram\n" +
      "sam.and.lee,Sam & Lee,66.6k,Instagram\ndr.pat,Dr. Pat N. Example,20.9K,Instagram\n";
    expect(importCsv(csv.replace(",446K", ",446K,Instagram"), "")).toMatch(/^Added 4, updated 0/);
    expect(importCsv(csv.replace(",446K", ",446K,Instagram"), "")).toMatch(/^Added 0, updated 4/);
    const by = (h: string) => S.leads.find(l => l.handle === h)!;
    expect(by("pat.example")).toMatchObject({ type: "affiliate", first: "Pat", last: "Example", followers: "446000", profileUrl: "https://www.instagram.com/pat.example/" });
    expect(by("patexample_tips").followers).toBe("2546");
    expect(by("sam.and.lee")).toMatchObject({ first: "Sam & Lee", followers: "66600" });
    expect(by("dr.pat")).toMatchObject({ title_salutation: "Dr.", first: "Pat N.", last: "Example" });
    expect(nextFor(by("dr.pat"))).toEqual(["Send first DM (DM1)", 0]);
    expect(suggestTpl(by("dr.pat"))).toBe("dm1");
  });
  it("runs the affiliate DM flow: DM1 → follow-up → No reply, or reply → link → posted", () => {
    S.templates.push({ id: "dm1", name: "DM1", to: "contacted", seq: 1, subject: "", body: "Hi {{greeting}}", kind: "DM" },
      { id: "dm2", name: "DM2", to: "contacted", seq: 2, subject: "", body: "Bump", kind: "DM" },
      { id: "dm3", name: "DM3", to: null, subject: "", body: "Video", kind: "DM" },
      { id: "dm4", name: "DM4", to: null, subject: "", body: "Access {{access_code}} · share {{code}} · {{signup_link}}", kind: "DM" });
    S.settings.caller = "Pat";
    const a = L({ type: "affiliate", handle: "pat.example" });
    logSent(a, "dm1", "DM sent");
    expect(a).toMatchObject({ stage: "contacted", seq: 1, nextAction: "No reply? Send follow-up DM (DM2)", nextDue: "2026-10-20" });
    expect(a.activity!.find(x => x.type === "DM sent")!.note).toBe("DM1 · by Pat");
    expect(a.activity!.find(x => x.type === "Stage")!.note).toBe("Not contacted → DM sent: DM1");
    logSent(a, "dm2", "DM sent");
    expect(suggestTpl(a)).toBeNull();
    S.leads.push(a); vi.setSystemTime(new Date("2026-10-30T10:00:00")); tick();
    expect(a.stage).toBe("nurture");

    const b = L({ type: "affiliate", stage: "contacted", seq: 1 });
    expect(fill("{{signup_link}}", b)).toBe("[their tracking link]");
    affAdvance(b, "Replied", "");
    expect(b).toMatchObject({ stage: "engaged", nextAction: "Send the video + free access (DM3)" });
    logSent(b, "dm3", "DM sent");
    expect(suggestTpl(b)).toBe("dm4");
    expect(render1("dm4", b).b).toBe("Access [access code] · share [referral code] · [their tracking link]");
    b.accessCode = "FAM1"; b.code = "PAT1"; b.regLink = "https://example.org/r/pat";
    expect(render1("dm4", b).b).toBe("Access FAM1 · share PAT1 · https://example.org/r/pat");
    logSent(b, "dm4", "DM sent");
    expect(b.nextAction).toBe("Check they've signed up and posted; nudge if not");
    affAdvance(b, "Posted / shared link", "https://example.org/post/1");
    expect(b).toMatchObject({ stage: "live", postUrl: "https://example.org/post/1", nextAction: "Thank them for sharing (DM5)" });
  });
});

describe("report", () => {
  it("adds an affiliates section only when there are affiliates", () => {
    const from = new Date("2026-10-12T00:00:00"), to = new Date();
    S.leads.push(L({ id: "p1" }));
    expect(rptBody({ from, to })).not.toContain("Affiliates (social media)");
    const a = L({ id: "a1", type: "affiliate", handle: "pat.example", platform: "Instagram", followers: "12300", stage: "new" });
    S.leads.push(a); S.templates.push({ id: "dm1", name: "DM1", to: "contacted", seq: 1, subject: "", body: "Hi", kind: "DM" });
    logSent(a, "dm1", "DM sent"); affAdvance(a, "Replied", ""); affAdvance(a, "Posted / shared link", ""); setSignups(a, "3");
    const h = rptBody({ from, to });
    expect(h).toContain("Affiliates (social media)");
    expect(h).toContain("@pat.example");
    expect(h).toMatch(/Sign-ups from affiliate links<\/div><div class="v">3</);
    expect(h).toMatch(/DMs sent<\/div><div class="v">1</);
    expect(h).toContain("1 DM to 1 affiliate.");
  });
});

describe("posting reminders", () => {
  const P = (id: string, d: Partial<Post>): Item<"post"> => ({ id, kind: "post", data: { title: id, status: "scheduled", platforms: ["Instagram"], ...d } });
  const now = new Date("2026-10-15T10:00:00");   // a Thursday
  it("is caught up with nothing due, and points to the next post and undated ideas", () => {
    const r = postReminders([P("later", { date: "2026-10-22" }), P("idea", { status: "idea" }), P("done", { date: "2026-10-14", status: "posted" })], now);
    expect(r).toMatchObject({ rems: [], caughtUp: true, undated: 1 });
    expect(r.next!.id).toBe("later");
  });
  it("flags overdue, today (late or not ready) and unfinished posts in the next 2 days, in date order", () => {
    const r = postReminders([
      P("sat", { date: "2026-10-17", status: "draft" }), P("fri", { date: "2026-10-16" }),
      P("today-late", { date: "2026-10-15", time: "09:00" }), P("today-later", { date: "2026-10-15", time: "15:00", status: "ready" }),
      P("missed", { date: "2026-10-13" }), P("far", { date: "2026-10-18", status: "idea" })], now);
    expect(r.rems.map(x => [x.it.id, x.level, !!x.late, !!x.notReady])).toEqual([
      ["missed", "overdue", false, false], ["today-late", "today", true, false], ["today-later", "today", false, true],
      ["fri", "soon", false, false], ["sat", "soon", false, true]]);
    expect(r.caughtUp).toBe(false);
    expect(r.next!.id).toBe("far");
  });
  it("only scheduled posts coming up still counts as caught up", () => {
    expect(postReminders([P("fri", { date: "2026-10-16" })], now)).toMatchObject({ caughtUp: true });
  });
});

describe("helpers", () => {
  it("formats phones and normalizes district names", () => {
    expect(fmtPhone("1-555-010-1234")).toBe("(555) 010-1234");
    expect(normD("St. Louis City")).toBe(normD("Saint Louis Public Schools"));
  });
});

describe("HubSpot test batch", () => {
  it("takes the first n with an email, one per email, and counts the rest", () => {
    const from = [L({ id: "a", email: "pat@example.org" }), L({ id: "b" }), L({ id: "c", email: "PAT@example.org " }), L({ id: "d", email: "sam@example.org" }), L({ id: "e", email: "lee@example.org" })];
    const r = hubspotBatch(from, 2);
    expect(r.rows.map(l => l.id)).toEqual(["a", "d"]);
    expect(r).toMatchObject({ dup: 1, noEmail: 1 });
  });
  it("flags call notes that may hold student or family details", () => {
    expect(familyFlag("Her daughter is in 5th grade")).toBe(true);
    expect(familyFlag("Call the mom at 555-010-0199")).toBe(true);
    expect(familyFlag("reach her at pat@example.org")).toBe(true);
    expect(familyFlag("Will share at the staff meeting Friday")).toBe(false);
    expect(familyFlag(undefined)).toBe(false);
  });
  it("exports the same columns, with held-back call notes blank", () => {
    const l = L({ email: "pat@example.org", call: { status: "vm", ts: "2026-10-14T15:00:00Z", note: "Her son goes there" } as Lead["call"] });
    const full = toCsv([l]), held = toCsv([l], () => "");
    expect(full.split("\n")[0]).toBe(held.split("\n")[0]);
    expect(full).toContain("Her son goes there");
    expect(held).not.toContain("Her son");
  });
});
