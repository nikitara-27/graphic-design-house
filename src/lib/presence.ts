import type { Interest, SceneObject, Year } from "../types";
import { hostProfessor, house, professors, questions, roomById } from "./data";
import { cleanName } from "./name";

/**
 * Live presence: who is in which room right now. Uses Supabase Realtime Presence on one shared
 * channel. Nothing is stored in a database; each browser only shares its own little payload
 * while the tab is open.
 */
// Local development uses its own channel so testing never shows up on the live site.
export const CHANNEL = import.meta.env.DEV ? "gd-house-dev" : "gd-house";

/** What each visitor shares. Only this, nothing else. */
export interface PeerInfo { name: string; hostId: string; year: Year; interest: Interest; room: string }
export interface Peer extends PeerInfo { id: string; self: boolean }

/**
 * True only for keys that are safe to ship in a public website: Supabase "publishable" keys
 * (sb_publishable_…) or legacy "anon" JWTs. Secret / service_role keys are refused.
 */
export function isPublicKey(key: string): boolean {
  if (key.startsWith("sb_publishable_")) return true;
  if (key.startsWith("sb_secret_")) return false;
  const parts = key.split(".");
  if (parts.length !== 3) return false;
  try {
    const json = atob(parts[1].replace(/-/g, "+").replace(/_/g, "/"));
    return JSON.parse(json).role === "anon";
  } catch {
    return false;
  }
}

export function presenceConfig(): { url: string; key: string } | null {
  const url = (import.meta.env.VITE_SUPABASE_URL ?? "").trim();
  const key = (import.meta.env.VITE_SUPABASE_KEY ?? "").trim();
  if (!url || !key) return null;
  if (!isPublicKey(key)) {
    console.error("Live presence is off: VITE_SUPABASE_KEY must be the public anon/publishable key, never a secret key.");
    return null;
  }
  return { url, key };
}

const years = new Set<string>(questions.year.options.map((o) => o.id));
const interests = new Set<string>(questions.interest.options.map((o) => o.id));
const hostIds = new Set([hostProfessor.id, ...professors.map((p) => p.id)]);

/** Other people's payloads come from strangers' browsers: accept only known values. */
export function sanitize(raw: unknown): PeerInfo | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  if (typeof r.room !== "string" || !roomById.has(r.room)) return null;
  if (typeof r.year !== "string" || !years.has(r.year)) return null;
  if (typeof r.interest !== "string" || !interests.has(r.interest)) return null;
  const name = typeof r.name === "string" ? cleanName(r.name) : "";
  const hostId = typeof r.hostId === "string" && hostIds.has(r.hostId) ? r.hostId : hostProfessor.id;
  return { name: name || "Guest", hostId, year: r.year as Year, interest: r.interest as Interest, room: r.room };
}

/** Turns Supabase's presenceState() into one entry per visitor (their latest payload). */
export function flattenPresence(state: Record<string, unknown[]>, selfId: string): Peer[] {
  const out: Peer[] = [];
  for (const [id, metas] of Object.entries(state)) {
    const latest = metas[metas.length - 1];
    const info = sanitize(latest);
    if (info) out.push({ ...info, id, self: id === selfId });
  }
  return out;
}

// Avatar size, in % of the scene. Width matches the original Living Room host (15% of the room's
// width), which works out to ~28% of the room's height in the 16:9 artwork. Feet sit 86.5% down. The character art has
// empty margins, so spacing and collisions use the narrower body width.
export const AV_WIDTH = 15;
const AV_BODY_W = 12.6; // the drawn figure fills ~84% of its image width
const AV_H = AV_WIDTH * house.sceneAspect * (2000 / 1925);
const LABEL_H = 4; // name label above the head
/** Top of an avatar's name label, in % of the scene height. */
export const FEET_Y = 86.5; // just above the downstairs buttons
/** Top of an avatar's name label, in % of the scene height. */
export const AVATAR_TOP = FEET_Y - AV_H - LABEL_H;
const SPACING = 13.5; // just more than a figure's width, so neighbours don't overlap

type Box = { x: number; y: number; w: number; h: number };
const hits = (a: Box, b: Box) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;

/**
 * Where avatars can stand in a room: spots along the floor, kept away from the edges (side
 * arrows), the room's clickable object, and any greeter (the Living Room cat and its bubble).
 * Ordered from the middle outwards.
 */
export function standingSpots(object: SceneObject, greeter?: { x: number; y: number }): number[] {
  const avoid: Box[] = [object];
  // The cat sits just under the bubble's tail; keep heads off it (the bubble itself is higher up).
  if (greeter) avoid.push({ x: greeter.x - 7, y: greeter.y - 2, w: 14, h: 14 });
  const spots: number[] = [];
  for (let x = 14; x <= 86; x += SPACING) {
    const me = { x: x - AV_BODY_W / 2, y: FEET_Y - AV_H - LABEL_H, w: AV_BODY_W, h: AV_H + LABEL_H };
    if (!avoid.some((b) => hits(me, b))) spots.push(x);
  }
  return spots.sort((a, b) => Math.abs(a - 50) - Math.abs(b - 50));
}

/** Random id for this tab, kept across refreshes so a refresh doesn't look like a new visitor. */
export function sessionId(): string {
  const make = () => (crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2));
  try {
    const existing = sessionStorage.getItem("gd-house:session");
    if (existing) return existing;
    const id = make();
    sessionStorage.setItem("gd-house:session", id);
    return id;
  } catch {
    return make();
  }
}
