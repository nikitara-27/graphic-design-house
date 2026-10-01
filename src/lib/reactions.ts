import { roomById } from "./data";

/**
 * Quick reactions people send to the room they're in. Sent as Realtime "broadcast" messages on the
 * presence channel; nothing is saved. Each shows above the sender's head for a few seconds.
 */
export const REACTIONS = [
  { id: "hi", label: "Say hi", text: "hi" },
  { id: "wave", label: "Wave", text: "👋" },
  { id: "computer", label: "Computer", text: "💻" },
  { id: "sleep", label: "Sleepy", text: "😴" },
  { id: "food", label: "Food", text: "🍕" },
  { id: "book", label: "Book", text: "📚" },
] as const;
export type ReactionId = (typeof REACTIONS)[number]["id"];

export const REACTION_EVENT = "reaction";
export const REACTION_SHOW_MS = 3000;
/** One reaction every 2 s per person. */
export const REACTION_COOLDOWN_MS = 2000;

export interface ReactionMessage { from: string; room: string; type: ReactionId }

const ids = new Set<string>(REACTIONS.map((r) => r.id));
export const reactionText = (id: ReactionId) => REACTIONS.find((r) => r.id === id)!.text;

/** Messages come from strangers' browsers: accept only these three fields with known values. */
export function sanitizeReaction(raw: unknown): ReactionMessage | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  if (typeof r.from !== "string" || !r.from || r.from.length > 64) return null;
  if (typeof r.room !== "string" || !roomById.has(r.room)) return null;
  if (typeof r.type !== "string" || !ids.has(r.type)) return null;
  return { from: r.from, room: r.room, type: r.type as ReactionId };
}
