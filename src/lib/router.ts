import type { Answers } from "../types";
import { entryRoomId, roomById } from "./data";

/**
 * Hash routes (hash, not paths, so a refresh never 404s on GitHub Pages):
 *   (none)                         landing (no saved answers) / the entry room, the Living Room (saved answers)
 *   #/quiz                         the quiz
 *   #/welcome                      profile reveal right after the quiz
 *   #/room/<roomId>                inside a room
 *   #/room/<roomId>/classes        that room's class list
 *   #/room/<roomId>/classes/<id>   one class in that list
 *   #/map, #/profile               panels over the room you were in
 */
export type Panel = "map" | "profile" | "classes";

export type Route =
  | { screen: "landing" }
  | { screen: "quiz" }
  | { screen: "welcome" }
  | { screen: "house"; roomId: string; panel: Panel | null; courseId?: string };

/** Stored on each history entry. `room` is the room behind a panel; `depth` is how many panel entries sit on top of it. */
export interface NavState { room?: string; depth?: number }

export const roomHash = (id: string) => `#/room/${encodeURIComponent(id)}`;
export const classesHash = (roomId: string, courseId?: string) =>
  `${roomHash(roomId)}/classes${courseId ? `/${encodeURIComponent(courseId)}` : ""}`;

/** Turns any hash (including junk) into a valid route plus the hash that route should have. */
export function resolve(hash: string, state: NavState | null, answers: Answers | null): { route: Route; hash: string } {
  let parts: string[];
  try {
    parts = hash.replace(/^#\/?/, "").split("/").filter(Boolean).map(decodeURIComponent);
  } catch {
    parts = ["invalid"];
  }
  const [a, b, c, d, extra] = parts;

  if (a === "quiz" && !b) return { route: { screen: "quiz" }, hash: "#/quiz" };
  if (!answers) return { route: { screen: "landing" }, hash: "" };

  const toRoom = (id: string) => ({ route: { screen: "house" as const, roomId: id, panel: null }, hash: roomHash(id) });

  if (a === "welcome" && !b) return { route: { screen: "welcome" }, hash: "#/welcome" };
  if ((a === "map" || a === "profile") && !b) {
    const behind = state?.room && roomById.has(state.room) ? state.room : entryRoomId;
    return { route: { screen: "house", roomId: behind, panel: a }, hash: `#/${a}` };
  }
  if (a === "room" && b && roomById.has(b) && !extra) {
    if (!c) return toRoom(b);
    if (c === "classes" && !d) return { route: { screen: "house", roomId: b, panel: "classes" }, hash: classesHash(b) };
    if (c === "classes" && d) {
      const known = roomById.get(b)!.courses.some((x) => x.id === d);
      return known
        ? { route: { screen: "house", roomId: b, panel: "classes", courseId: d }, hash: classesHash(b, d) }
        : { route: { screen: "house", roomId: b, panel: "classes" }, hash: classesHash(b) };
    }
  }
  // Missing or invalid: start at the entry room (not the user's year room).
  return toRoom(entryRoomId);
}
