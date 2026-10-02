import { describe, expect, it } from "vitest";
import { matchProfessor } from "./match";
import { assignments, hostProfessor, professors } from "./data";
import type { Answers } from "../types";

const pick = (interest: Answers["interest"], program: string) =>
  matchProfessor({ year: "junior", interest, program }, professors, assignments, hostProfessor).id;

describe("matchProfessor", () => {
  it("follows the team's assignment table", () => {
    expect(pick("branding", "illustrator")).toBe("mary-yang");
    expect(pick("branding", "figma")).toBe("nick-rock");
    expect(pick("motion", "photoshop")).toBe("james-grady");
    expect(pick("interactive", "procreate")).toBe("halim-lee");
    expect(pick("typography", "indesign")).toBe("christopher-sleboda");
    expect(pick("exhibition", "blender")).toBe("brockett-horne");
  });
  it("uses the updated Branding & Identity table, with Mary Yang", () => {
    const expected = {
      illustrator: "mary-yang", photoshop: "mary-yang", indesign: "nick-rock", "after-effects": "nick-rock",
      figma: "nick-rock", blender: "claire-bula", procreate: "claire-bula", other: "mary-yang",
    };
    for (const [program, host] of Object.entries(expected)) expect(pick("branding", program), program).toBe(host);
  });
  it("gives one professor for every program in editorial and history", () => {
    for (const p of ["illustrator", "canva", "other"]) {
      expect(pick("editorial", p)).toBe("christopher-sleboda");
      expect(pick("history", p)).toBe("kristen-coogan");
    }
  });
  it("falls back to the host for an unknown program", () => {
    expect(pick("branding", "not-a-program")).toBe("host");
  });
});
