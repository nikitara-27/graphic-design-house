import { describe, expect, it } from "vitest";
import { resolve } from "./router";
import type { Answers } from "../types";

const junior: Answers = { year: "junior", interest: "branding", program: "figma" };

describe("resolve", () => {
  it("shows the landing page without saved answers, whatever the hash", () => {
    expect(resolve("", null, null).route).toEqual({ screen: "landing" });
    expect(resolve("#/room/kitchen", null, null).route).toEqual({ screen: "landing" });
    expect(resolve("#/quiz", null, null).route).toEqual({ screen: "quiz" });
  });
  it("skips the quiz and opens the home room when answers are saved", () => {
    expect(resolve("", null, junior)).toEqual({ route: { screen: "house", roomId: "kitchen", panel: null }, hash: "#/room/kitchen" });
  });
  it("opens the exact room, class list, or class", () => {
    expect(resolve("#/room/attic", null, junior).route).toMatchObject({ roomId: "attic", panel: null });
    expect(resolve("#/room/attic/classes", null, junior).route).toMatchObject({ roomId: "attic", panel: "classes" });
    expect(resolve("#/room/dining-room/classes/AR596-thesis", null, junior).route).toMatchObject({ courseId: "AR596-thesis" });
  });
  it("puts map and profile over the room you were in, or your home room", () => {
    expect(resolve("#/map", { room: "library" }, junior).route).toMatchObject({ roomId: "library", panel: "map" });
    expect(resolve("#/profile", null, junior).route).toMatchObject({ roomId: "kitchen", panel: "profile" });
  });
  it("falls back to the home room for invalid hashes", () => {
    for (const h of ["#/room/nope", "#/garage", "#/room/attic/oops", "#/room/kitchen/classes/x/y", "#/%E0%A4%A"]) {
      expect(resolve(h, null, junior).hash).toBe("#/room/kitchen");
    }
  });
  it("drops an unknown class but keeps the class list open", () => {
    expect(resolve("#/room/kitchen/classes/NOPE", null, junior).hash).toBe("#/room/kitchen/classes");
  });
});
