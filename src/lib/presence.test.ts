import { describe, expect, it } from "vitest";
import { flattenPresence, isPublicKey, sanitize } from "./presence";

const b64 = (o: object) => btoa(JSON.stringify(o)).replace(/=+$/, "");
const jwt = (role: string) => `${b64({ alg: "HS256" })}.${b64({ role, iss: "supabase" })}.sig`;

describe("isPublicKey", () => {
  it("accepts publishable and anon keys", () => {
    expect(isPublicKey("sb_publishable_abc123")).toBe(true);
    expect(isPublicKey(jwt("anon"))).toBe(true);
  });
  it("refuses secret / service_role keys and junk", () => {
    expect(isPublicKey("sb_secret_abc123")).toBe(false);
    expect(isPublicKey(jwt("service_role"))).toBe(false);
    expect(isPublicKey("not-a-key")).toBe(false);
  });
});

describe("sanitize", () => {
  const ok = { name: "  Niki  ", hostId: "claire-bula", year: "junior", interest: "branding", room: "kitchen" };
  it("keeps known values and cleans the name", () => {
    expect(sanitize(ok)).toEqual({ ...ok, name: "Niki" });
  });
  it("drops payloads with unknown rooms, years or interests", () => {
    expect(sanitize({ ...ok, room: "garage" })).toBeNull();
    expect(sanitize({ ...ok, year: "wizard" })).toBeNull();
    expect(sanitize({ ...ok, interest: 42 })).toBeNull();
    expect(sanitize("hello")).toBeNull();
  });
  it("falls back for unknown hosts and empty or huge names", () => {
    expect(sanitize({ ...ok, hostId: "mallory" })?.hostId).toBe("host");
    expect(sanitize({ ...ok, name: "   " })?.name).toBe("Guest");
    expect(sanitize({ ...ok, name: "x".repeat(500) })?.name.length).toBeLessThanOrEqual(30);
  });
  it("shows Guest for offensive or invalid names sent by other browsers", () => {
    expect(sanitize({ ...ok, name: "sh1t" })?.name).toBe("Guest");
    expect(sanitize({ ...ok, name: "f u c k" })?.name).toBe("Guest");
    expect(sanitize({ ...ok, name: "<img src=x>" })?.name).toBe("Guest");
  });
});

describe("flattenPresence", () => {
  it("uses each visitor's latest payload and marks yourself", () => {
    const base = { name: "A", hostId: "nick-rock", year: "senior", interest: "motion" };
    const peers = flattenPresence(
      { me: [{ ...base, room: "attic" }, { ...base, room: "library" }], them: [{ ...base, name: "B", room: "attic" }], bad: [{}] },
      "me",
    );
    expect(peers).toEqual([
      { ...base, room: "library", id: "me", self: true },
      { ...base, name: "B", room: "attic", id: "them", self: false },
    ]);
  });
});
