import { describe, expect, it } from "vitest";
import { AV_HEIGHT, placePeople } from "./crowd";
import { roomById, rooms } from "./data";

const people = (n: number, prefix = "p") => Array.from({ length: n }, (_, i) => ({ id: `${prefix}-${i}` }));
const control = roomById.get("control-room")!;

describe("placePeople", () => {
  it("shows everyone, with no limit", () => {
    expect(placePeople(control, people(40)).size).toBe(40);
  });

  it("spreads people out before anyone overlaps", () => {
    const placed = [...placePeople(control, people(4)).values()].map((p) => p.x).sort((a, b) => a - b);
    for (let i = 1; i < placed.length; i++) expect(placed[i] - placed[i - 1]).toBeGreaterThanOrEqual(12.5);
  });

  it("keeps people in place when someone else joins or leaves", () => {
    const before = placePeople(control, people(3));
    const after = placePeople(control, [...people(3), { id: "newcomer" }]);
    let moved = 0;
    for (const [id, p] of before) if (after.get(id)!.x !== p.x) moved++;
    expect(moved).toBeLessThanOrEqual(1); // at most a bump if the newcomer wants the same spot
    for (const [id, p] of before) expect(after.get(id)!.y).toBe(p.y); // depth never changes
  });

  it("puts feet inside the room's floor band and draws the back row smaller", () => {
    for (const p of placePeople(control, people(20)).values()) {
      expect(p.y).toBeGreaterThanOrEqual(control.floorTop);
      expect(p.y).toBeLessThanOrEqual(control.floorBottom);
      expect(p.scale).toBeGreaterThanOrEqual(0.9);
      expect(p.scale).toBeLessThanOrEqual(1);
    }
  });

  it("draws people lower on screen in front, and you on top of everyone", () => {
    const placed = placePeople(control, [...people(6), { id: "me", self: true }]);
    const others = [...placed.entries()].filter(([id]) => id !== "me").map(([, p]) => p);
    for (const a of others) for (const b of others) if (a.y > b.y) expect(a.z).toBeGreaterThan(b.z);
    expect(placed.get("me")!.z).toBeGreaterThan(Math.max(...others.map((p) => p.z)));
  });

  it("never covers any room's clickable object, even when crowded", () => {
    for (const room of rooms) {
      for (const p of placePeople(room, people(30, room.id)).values()) {
        const h = AV_HEIGHT * p.scale;
        const o = room.object;
        const figure = { x: p.x - 6.3 * p.scale, y: p.y - h, w: 12.6 * p.scale, h };
        const overlaps = figure.x < o.x + o.w && figure.x + figure.w > o.x && figure.y < o.y + o.h && figure.y + figure.h > o.y;
        expect(overlaps, `${room.id} at x=${p.x.toFixed(1)}`).toBe(false);
      }
    }
  });
});
