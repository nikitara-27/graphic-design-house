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
  it("makes every staircase two-way (except the one-way trips into the Basement) and keeps at most one door per side", () => {
    const opposite = { up: "down", down: "up", left: "right", right: "left" } as const;
    // The team's exception: these rooms go down to the Basement, but the Basement only leads back up to the Living Room.
    const oneWay = new Set(["bathroom->basement", "playroom->basement", "office-room->basement"]);
    for (const r of rooms) {
      for (const e of r.exits) {
        if (oneWay.has(`${r.id}->${e.toRoomId}`)) continue;
        const back = rooms.find((x) => x.id === e.toRoomId)!.exits;
        expect(back.some((x) => x.toRoomId === r.id && x.direction === opposite[e.direction]), `${r.id} -> ${e.toRoomId}`).toBe(true);
      }
      expect(r.exits.filter((e) => e.direction === "left").length).toBeLessThanOrEqual(1);
      expect(r.exits.filter((e) => e.direction === "right").length).toBeLessThanOrEqual(1);
    }
  });
  it("marks every basement course inactive and nothing else", () => {
    for (const r of rooms) for (const c of r.courses) expect(c.active).toBe(r.id !== "basement");
  });
  it("gives every host professor a profile image", () => {
    for (const p of professors) expect(p.image).not.toBe("");
  });
});
