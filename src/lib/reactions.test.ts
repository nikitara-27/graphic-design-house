import { describe, expect, it } from "vitest";
import { REACTIONS, sanitizeReaction } from "./reactions";

describe("reactions", () => {
  it("has the six reactions", () => {
    expect(REACTIONS.map((r) => r.id)).toEqual(["hi", "wave", "computer", "sleep", "food", "book"]);
  });
  it("accepts only a sender, a real room and an allowed reaction", () => {
    const ok = { from: "abc", room: "kitchen", type: "wave" };
    expect(sanitizeReaction(ok)).toEqual(ok);
    expect(sanitizeReaction({ ...ok, extra: "<img>" })).toEqual(ok);
    expect(sanitizeReaction({ ...ok, type: "💩" })).toBeNull();
    expect(sanitizeReaction({ ...ok, type: "<script>" })).toBeNull();
    expect(sanitizeReaction({ ...ok, room: "garage" })).toBeNull();
    expect(sanitizeReaction({ ...ok, from: "" })).toBeNull();
    expect(sanitizeReaction({ ...ok, from: "x".repeat(65) })).toBeNull();
    expect(sanitizeReaction("wave")).toBeNull();
  });
});
