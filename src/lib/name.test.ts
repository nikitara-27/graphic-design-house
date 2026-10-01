import { describe, expect, it } from "vitest";
import { cleanName } from "./name";

describe("cleanName", () => {
  it("trims and squeezes spaces", () => {
    expect(cleanName("  Niki   Tara  ")).toBe("Niki Tara");
  });
  it("treats whitespace-only as empty", () => {
    expect(cleanName("   \t ")).toBe("");
  });
  it("caps at 30 characters", () => {
    expect(cleanName("a".repeat(40))).toHaveLength(30);
  });
});
