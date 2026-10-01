import roomsJson from "../data/rooms.json";
import professorsJson from "../data/professors.json";
import questionsJson from "../data/questions.json";
import type { Assignments, HouseData, Professor, Questions, Room } from "../types";

export const house = roomsJson as HouseData;
export const rooms: Room[] = house.rooms;
export const roomById = new Map(rooms.map((r) => [r.id, r]));
export const entryRoomId = house.entryRoomId;
export const questions = questionsJson as Questions;
export const hostProfessor = professorsJson.host as Professor;
export const professors = professorsJson.professors as Professor[];
export const assignments = professorsJson.assignments as Assignments;

/** Resolve a /public asset path so it works under any deploy base path. */
export const asset = (path: string) => (path ? import.meta.env.BASE_URL + path.replace(/^\//, "") : "");

export const yearOption = (id: string) => questions.year.options.find((o) => o.id === id);
export const interestOption = (id: string) => questions.interest.options.find((o) => o.id === id);
export const programOption = (id: string) => questions.program.options.find((o) => o.id === id);

/** Finds content mistakes the team might make while editing JSON. Returns human-readable problems. */
export function validateContent(): string[] {
  const problems: string[] = [];
  const ids = new Set<string>();
  for (const room of rooms) {
    if (ids.has(room.id)) problems.push(`Duplicate room id "${room.id}"`);
    ids.add(room.id);
  }
  const courseIds = new Set<string>();
  for (const room of rooms) {
    if (!room.object) problems.push(`${room.name}: no clickable object`);
    for (const c of room.courses) {
      if (courseIds.has(c.id)) problems.push(`Course id "${c.id}" is used in more than one room`);
      courseIds.add(c.id);
    }
    for (const e of room.exits) {
      if (!roomById.has(e.toRoomId)) problems.push(`${room.name}: exit leads to unknown room "${e.toRoomId}"`);
    }
  }
  if (!roomById.has(house.entryRoomId)) problems.push(`entryRoomId "${house.entryRoomId}" is not a room`);
  for (const y of questions.year.options) {
    if (!roomById.has(y.homeRoomId)) problems.push(`Year "${y.id}" has unknown home room "${y.homeRoomId}"`);
  }
  const profIds = new Set(professors.map((p) => p.id));
  for (const i of questions.interest.options) {
    for (const prog of questions.program.options) {
      const id = assignments[i.id]?.[prog.id];
      if (!id) problems.push(`No host assigned for ${i.label} + ${prog.label}`);
      else if (!profIds.has(id)) problems.push(`${i.label} + ${prog.label} points at unknown professor "${id}"`);
    }
  }
  for (const p of professors) {
    for (const c of p.courses) if (!courseIds.has(c)) problems.push(`Professor "${p.id}" lists unknown course "${c}"`);
  }
  return problems;
}
