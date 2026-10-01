import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { CATEGORIES, checkDraft, domainOf, linkKey, parseLink, toResource, type Draft, type Resource } from "./resources";

const sql = readFileSync(new URL("../../supabase/resources.sql", import.meta.url), "utf8");
const draft = (d: Partial<Draft> = {}): Draft => ({ url: "https://example.com/type", title: "Type specimens", description: "", category: "Typography", ...d });
const board: Resource[] = [
  { id: "1", url: "https://coolors.co", title: "Coolors", description: "", category: "Color", sharedBy: "Niki", createdAt: "2026-10-01" },
];

describe("links", () => {
  it("only accepts full http(s) links", () => {
    for (const ok of ["https://fonts.google.com", "http://example.com/a?b=1", "HTTPS://Coolors.co/"]) expect(parseLink(ok), ok).not.toBeNull();
    for (const bad of ["javascript:alert(1)", "data:text/html,hi", "ftp://x.com", "fonts.google.com", "https://localhost", "https://a b.com", "https://user:pw@x.com", "//x.com"]) {
      expect(parseLink(bad), bad).toBeNull();
    }
  });
  it("treats http/https, www. and a trailing slash as the same link", () => {
    expect(linkKey("http://www.Behance.net/")).toBe(linkKey("https://www.behance.net"));
    expect(linkKey("https://coolors.co/")).toBe(linkKey("https://coolors.co"));
  });
  it("shows the domain without www.", () => {
    expect(domainOf("https://www.figma.com/community")).toBe("figma.com");
    expect(domainOf("https://fonts.google.com")).toBe("fonts.google.com");
  });
});

describe("checkDraft", () => {
  it("returns a clean row for a good submission", () => {
    expect(checkDraft(draft({ url: " https://Example.com/type/#top ", title: "  Type   specimens " }), board, 0)).toEqual({
      ok: true, url: "https://example.com/type", title: "Type specimens", description: "", category: "Typography",
    });
  });
  it("requires a link, a title (≤ 60) and a category; description ≤ 140", () => {
    expect(checkDraft(draft({ url: "example.com" }), board, 0)).toEqual({ ok: false, error: "url" });
    expect(checkDraft(draft({ title: "  " }), board, 0)).toEqual({ ok: false, error: "title" });
    expect(checkDraft(draft({ title: "x".repeat(61) }), board, 0)).toEqual({ ok: false, error: "title" });
    expect(checkDraft(draft({ description: "x".repeat(141) }), board, 0)).toEqual({ ok: false, error: "description" });
    expect(checkDraft(draft({ category: "" }), board, 0)).toEqual({ ok: false, error: "category" });
  });
  it("blocks unfriendly titles, descriptions and domains", () => {
    expect(checkDraft(draft({ title: "sh1t fonts" }), board, 0)).toEqual({ ok: false, error: "blocked" });
    expect(checkDraft(draft({ description: "f u c k this" }), board, 0)).toEqual({ ok: false, error: "blocked" });
    expect(checkDraft(draft({ url: "https://fuck.example.com" }), board, 0)).toEqual({ ok: false, error: "blocked" });
    for (const fine of ["Classic grotesques", "Free assets and mockups", "Scunthorpe type foundry", "Class notes"]) {
      expect(checkDraft(draft({ title: fine }), board, 0).ok, fine).toBe(true);
    }
  });
  it("blocks links already on the board", () => {
    expect(checkDraft(draft({ url: "http://coolors.co/" }), board, 0)).toEqual({ ok: false, error: "duplicate" });
  });
  it("allows 5 per hour", () => {
    expect(checkDraft(draft(), board, 4).ok).toBe(true);
    expect(checkDraft(draft(), board, 5)).toEqual({ ok: false, error: "rate" });
  });
});

describe("toResource (rows from the database)", () => {
  const row = { id: "1", url: "https://coolors.co", title: "Coolors", description: "Palettes", category: "Color", shared_by: "Niki", created_at: "2026-10-01" };
  it("keeps good rows", () => {
    expect(toResource(row)).toMatchObject({ title: "Coolors", sharedBy: "Niki", category: "Color" });
  });
  it("drops unsafe links, hidden rows and unfriendly text", () => {
    expect(toResource({ ...row, url: "javascript:alert(1)" })).toBeNull();
    expect(toResource({ ...row, hidden: true })).toBeNull();
    expect(toResource({ ...row, title: "sh1t" })).toBeNull();
    expect(toResource("nope")).toBeNull();
  });
  it("shows Guest for bad names and Other for unknown categories", () => {
    expect(toResource({ ...row, shared_by: "<img src=x>" })?.sharedBy).toBe("Guest");
    expect(toResource({ ...row, category: "Weird" })?.category).toBe("Other");
  });
});

describe("database setup", () => {
  it("uses the same categories in the database check", () => {
    expect(CATEGORIES).toEqual(["Typography", "UI/UX", "Motion Graphics", "Color", "Inspiration", "Tools", "Mockups", "Tutorials", "Other"]);
    const list = `category in (${CATEGORIES.map((c) => `'${c}'`).join(", ")})`;
    expect(sql).toContain(list);
    expect(sql).not.toMatch(/'Media'/);
  });
  it("seeds only the GD House starter resources, without duplicates on a re-run", () => {
    const urls = [...sql.matchAll(/\('[0-9a-f-]{36}'::uuid, '([^']+)'/g)].map((m) => m[1]);
    expect(urls).toEqual([
      "https://www.colophon-foundry.org",
      "https://fonts.google.com",
      "https://fonts.google.com/knowledge",
      "https://lawsofux.com",
      "https://www.awwwards.com",
      "https://youtu.be/IJ3QHNQSJg8",
    ]);
    expect(sql).toMatch(/on conflict do nothing/);
  });
  it("never lets the website update or delete resources", () => {
    expect(sql).not.toMatch(/for (update|delete|all)/i);
  });
});
