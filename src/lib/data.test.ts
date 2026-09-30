import { describe, expect, it } from "vitest";
import { professors, rooms, validateContent } from "./data";

describe("content", () => {
  it("has no broken references and a host for every interest + program", () => {
    expect(validateContent()).toEqual([]);
  });
  it("has all 13 rooms, each with artwork", () => {
    expect(rooms).toHaveLength(13);
    for (const r of rooms) expect(r.sceneImage).not.toBe("");
  });
  it("marks every basement course inactive and nothing else", () => {
    for (const r of rooms) for (const c of r.courses) expect(c.active).toBe(r.id !== "basement");
  });
  it("gives every host professor a profile image", () => {
    for (const p of professors) expect(p.image).not.toBe("");
  });
});
