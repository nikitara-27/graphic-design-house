import { describe, expect, it } from "vitest";
import { checkName, safeName } from "./nameFilter";

describe("checkName", () => {
  it("allows ordinary names, accents, and - ' .", () => {
    for (const n of ["Niki", "Cassandra", "José", "D'Angelo", "Mary-Jane", "Dr. Lee", "Analise", "Dick", "Sam 2", "Zoë"]) {
      expect(checkName(n), n).toBe("ok");
    }
  });
  it("blocks profanity, including disguised spellings", () => {
    for (const n of ["fuck", "a$$", "sh1t", "fuuuck", "b1tch", "f u c k", "S H I T"]) expect(checkName(n), n).toBe("blocked");
  });
  it("still blocks a bad word next to an allowlisted name", () => {
    expect(checkName("Dick sh1t")).toBe("blocked");
  });
  it("uses the custom blocklist", () => {
    expect(checkName("Mike Hunt")).toBe("blocked");
    expect(checkName("jap")).toBe("blocked");
    expect(checkName("Japan")).toBe("ok");
  });
  it("only allows letters, numbers, spaces and - ' .", () => {
    for (const n of ["Niki!", "<b>Niki</b>", "Niki 😀", "a@b.com", "Niki_T"]) expect(checkName(n), n).toBe("chars");
  });
  it("treats blank names as empty", () => {
    expect(checkName("   ")).toBe("empty");
  });
});

describe("safeName", () => {
  it("shows Guest for anything that fails", () => {
    expect(safeName("  Niki ")).toBe("Niki");
    expect(safeName("sh1t")).toBe("Guest");
    expect(safeName("<script>")).toBe("Guest");
  });
});
