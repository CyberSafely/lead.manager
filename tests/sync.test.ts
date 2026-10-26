import { describe, expect, it } from "vitest";
import { canon } from "../src/lib/cloudShape";

describe("canon (cloud sync change detection)", () => {
  it("ignores key order, as jsonb reorders keys", () => {
    const local = { id: "x1", stage: "new", first: "Pat", sent: ["e1"], call: { status: "info", note: "" } };
    const fromDb = { call: { note: "", status: "info" }, first: "Pat", id: "x1", sent: ["e1"], stage: "new" };
    expect(canon(local)).toBe(canon(fromDb));
  });
  it("drops undefined fields like JSON does", () => {
    expect(canon({ id: "x1", email: undefined })).toBe(canon({ id: "x1" }));
  });
  it("sees real changes", () => {
    expect(canon({ id: "x1", stage: "new" })).not.toBe(canon({ id: "x1", stage: "contacted" }));
    expect(canon({ sent: ["e1", "e2"] })).not.toBe(canon({ sent: ["e2", "e1"] }));
  });
});
