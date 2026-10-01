import { afterEach, describe, expect, it, vi } from "vitest";
import { clearAnswers, loadAnswers, loadFlag, loadName, saveAnswers, saveFlag, saveName } from "./storage";

const blocked = () => {
  throw new DOMException("The operation is insecure.", "SecurityError");
};

afterEach(() => vi.unstubAllGlobals());

describe("storage", () => {
  it("never throws when storage is blocked (e.g. private browsing)", () => {
    vi.stubGlobal("localStorage", { getItem: blocked, setItem: blocked, removeItem: blocked });
    expect(loadAnswers()).toBeNull();
    expect(() => saveAnswers({ year: "junior", interest: "branding", program: "figma" })).not.toThrow();
    expect(() => clearAnswers()).not.toThrow();
    expect(loadFlag("x")).toBe(false);
    expect(() => saveFlag("x")).not.toThrow();
    expect(loadName()).toBe("");
    expect(() => saveName("Niki")).not.toThrow();
  });

  it("round-trips valid answers and ignores tampered ones", () => {
    const mem = new Map<string, string>();
    vi.stubGlobal("localStorage", {
      getItem: (k: string) => mem.get(k) ?? null,
      setItem: (k: string, v: string) => mem.set(k, v),
      removeItem: (k: string) => mem.delete(k),
    });
    saveAnswers({ year: "junior", interest: "branding", program: "figma" });
    expect(loadAnswers()).toEqual({ year: "junior", interest: "branding", program: "figma" });
    mem.set("gd-house:answers", JSON.stringify({ year: "wizard", interest: "branding", program: "figma" }));
    expect(loadAnswers()).toBeNull();
    saveName("  Niki  ");
    expect(loadName()).toBe("Niki");
    clearAnswers();
    expect([...mem.keys()]).toEqual(["gd-house:name"]); // retake keeps the name
  });
});
