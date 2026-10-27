import { describe, expect, it, vi } from "vitest";
vi.mock("../src/sync", () => ({ supabase: null }));
import { parseLink, parseText } from "../src/lib/quickAdd";

describe("quick add", () => {
  it("reads handle and platform from links", () => {
    expect(parseLink("https://www.instagram.com/pat.example/?hl=en")).toMatchObject({ handle: "pat.example", platform: "Instagram", profileUrl: "https://www.instagram.com/pat.example/" });
    expect(parseLink("instagram.com/pat_example")).toMatchObject({ handle: "pat_example", platform: "Instagram" });
    expect(parseLink("@pat.example")).toMatchObject({ handle: "pat.example", platform: "Instagram" });
    expect(parseLink("https://www.tiktok.com/@pat.example?lang=en")).toMatchObject({ handle: "pat.example", platform: "TikTok" });
    expect(parseLink("https://www.facebook.com/PatExamplePage")).toMatchObject({ handle: "PatExamplePage", platform: "Facebook" });
    expect(parseLink("https://www.instagram.com/p/ABC123/")).toBeNull();
    expect(parseLink("https://example.org/pat")).toBeNull();
  });
  it("reads followers, name and bio from pasted profile text", () => {
    const ig = "pat.example\nFollow\nMessage\n1,204 posts\n12.5K followers\n310 following\nPat Example\nMom of 3 · Springfield\nLink in bio\nFollowed by sam.example\nPosts\nReels";
    expect(parseText(ig, "pat.example")).toEqual({ followers: "12500", name: "Pat Example", notes: "Mom of 3 · Springfield\nLink in bio" });
    expect(parseText("12.5K Followers, 300 Following, 40 Posts - See Instagram photos and videos from Pat Example (@pat.example)")).toMatchObject({ followers: "12500", name: "Pat Example" });
    expect(parseText("pat.example\n200 Following\n1.2M Followers\n3M Likes")).toMatchObject({ followers: "1200000" });
  });
});
