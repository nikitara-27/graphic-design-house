import { professors, questions } from "./data";
import type { Peer } from "./presence";

/**
 * Development only: add `?fakePeers=8` to the local URL to fill the room you're in with pretend
 * visitors, to check crowding and the "+N more" bubble without real people online.
 * Never included in the published site (the call is behind import.meta.env.DEV).
 */
const NAMES = ["Ava", "Ben", "Chloe", "Dev", "Eli", "Fern", "Gus", "Hana", "Ivy", "Jo", "Kai", "Lu"];

export function fakePeers(room: string): Peer[] {
  const n = Number(new URLSearchParams(window.location.search).get("fakePeers") ?? 0);
  return Array.from({ length: Math.min(Math.max(n, 0), NAMES.length) }, (_, i) => ({
    id: `fake-${i}`,
    self: false,
    name: NAMES[i],
    hostId: professors[i % professors.length].id,
    year: questions.year.options[i % questions.year.options.length].id,
    interest: questions.interest.options[i % questions.interest.options.length].id,
    room: i % 4 === 3 ? "attic" : room,
  }));
}
