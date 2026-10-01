import { describe, expect, it } from "vitest";
import { AVATAR_TOP, flattenPresence, isPublicKey, sanitize, standingSpots } from "./presence";

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
    expect(sanitize({ ...ok, name: "x".repeat(500) })?.name).toHaveLength(30);
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

describe("standingSpots", () => {
  it("never puts an avatar over the clickable object", () => {
    const object = { label: "Stool", x: 25, y: 70, w: 10.6, h: 22.2 };
    const spots = standingSpots(object);
    expect(spots.length).toBeGreaterThanOrEqual(3);
    for (const x of spots) expect(x + 6.3 <= object.x || x - 6.3 >= object.x + object.w).toBe(true);
  });
  it("spaces avatars so neighbours don't overlap", () => {
    const spots = standingSpots({ label: "x", x: 0, y: 0, w: 1, h: 1 }).sort((a, b) => a - b);
    for (let i = 1; i < spots.length; i++) expect(spots[i] - spots[i - 1]).toBeGreaterThanOrEqual(12.6);
  });
  it("keeps avatars off the Living Room cat (anyone below it keeps their head and name clear)", () => {
    const picture = { label: "Pink picture", x: 32.5, y: 25.6, w: 12.5, h: 28.9 };
    const cat = { x: 74.4, y: 42.5 };
    for (const x of standingSpots(picture, cat)) {
      const besideCat = Math.abs(x - cat.x) >= 7 + 6.3;
      const belowCat = AVATAR_TOP >= cat.y - 2 + 14;
      expect(besideCat || belowCat).toBe(true);
    }
  });
});
