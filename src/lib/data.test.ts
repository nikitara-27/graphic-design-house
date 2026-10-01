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
  it("has full details for the Basement classes", () => {
    const basement = rooms.find((r) => r.id === "basement")!.courses;
    const ar545 = basement.find((c) => c.id === "AR545")!;
    const ar587 = basement.find((c) => c.id === "AR587")!;
    expect(ar545.title).toBe("Performative Text and Design");
    expect(ar545.credits).toBe(4);
    expect(ar545.hubAreas).toHaveLength(3);
    expect(ar545.description).toContain("ideas--asking about the political potential");
    expect(ar587.credits).toBe(2);
    expect(ar587.note).toBe("Open to undergraduate and graduate graphic design students.");
  });
  it("has full details for the Bathroom classes", () => {
    const bathroom = rooms.find((r) => r.id === "bathroom")!.courses;
    expect(bathroom.map((c) => [c.code, c.title, c.term, c.credits, c.prerequisites])).toEqual([
      ["AR225", "Sophomore Graphic Design", "F", 4, undefined],
      ["AR385", "Typography 1: Rules of Typography", "F", 2, "CFA AR 225"],
      ["AR226", "Sophomore Graphic Design 2", "S", 4, "CFA AR 225"],
      ["AR386", "Sophomore Type Spring: Hierarchy, Composition", "S", 2, "CFA AR 226"],
    ]);
    expect(bathroom[2].description).toContain("Form--content relationships");
    expect(bathroom[0].hubAreas).toEqual(["Aesthetic Exploration", "Digital/Multimedia Expression"]);
  });
  it("has full details for the Kitchen classes", () => {
    const kitchen = rooms.find((r) => r.id === "kitchen")!.courses;
    expect(kitchen.map((c) => [c.code, c.title, c.term, c.credits, c.prerequisites])).toEqual([
      ["AR381", "Junior Graphic Design 1", "F", 4, undefined],
      ["AR487", "Junior Typography", "F", 2, undefined],
      ["AR382", "Junior Graphic Design 2", "S", 4, "CFA AR 381"],
      ["AR497", "Junior Type: Motion + Interactivity", "S", 2, undefined],
    ]);
    expect(kitchen[0].hubAreas).toEqual(["Research and Information Literacy", "Teamwork/Collaboration"]);
    expect(kitchen[3].note).toBe("Open to undergraduate junior graphic design students. This is a required course for graphic design majors.");
  });
  it("has full details for the Bedroom classes", () => {
    const bedroom = rooms.find((r) => r.id === "bedroom")!.courses;
    expect(bedroom.map((c) => [c.code, c.title, c.term, c.credits, c.prerequisites])).toEqual([
      ["AR483", "Senior Graphic Design: Collaboration", "F", 4, "CFA AR 382"],
      ["AR484", "Senior Graphic Design Studio", "S", 4, undefined],
    ]);
    expect(bedroom[1].description).toContain("The idea of 'designer as author' will be emphasized");
    expect(bedroom[1].hubAreas).toEqual(["Creativity/Innovation", "Teamwork/Collaboration"]);
  });
  it("marks every basement course inactive and nothing else", () => {
    for (const r of rooms) for (const c of r.courses) expect(c.active).toBe(r.id !== "basement");
  });
  it("gives every host professor a profile image", () => {
    for (const p of professors) expect(p.image).not.toBe("");
  });
});
