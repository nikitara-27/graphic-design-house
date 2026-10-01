import type { Interest, Year } from "../types";
import { hostProfessor, professors, questions, roomById } from "./data";
import { safeName } from "./nameFilter";

/**
 * Live presence: who is in which room right now. Uses Supabase Realtime Presence on one shared
 * channel. Nothing is stored in a database; each browser only shares its own little payload
 * while the tab is open.
 */
// Local development uses its own channel so testing never shows up on the live site.
export const CHANNEL = import.meta.env.DEV ? "gd-house-dev" : "gd-house";

/** What each visitor shares. Only this, nothing else. */
export interface PeerInfo { name: string; hostId: string; year: Year; interest: Interest; program?: string; room: string }
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
const programs = new Set<string>(questions.program.options.map((o) => o.id));
const hostIds = new Set([hostProfessor.id, ...professors.map((p) => p.id)]);

/** Other people's payloads come from strangers' browsers: accept only known values. */
export function sanitize(raw: unknown): PeerInfo | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  if (typeof r.room !== "string" || !roomById.has(r.room)) return null;
  if (typeof r.year !== "string" || !years.has(r.year)) return null;
  if (typeof r.interest !== "string" || !interests.has(r.interest)) return null;
  // Anyone can bypass the check in their own browser, so re-check names from others here.
  const name = typeof r.name === "string" ? safeName(r.name) : "Guest";
  const hostId = typeof r.hostId === "string" && hostIds.has(r.hostId) ? r.hostId : hostProfessor.id;
  // Older versions of the site don't send a program; unknown values are dropped.
  const program = typeof r.program === "string" && programs.has(r.program) ? r.program : undefined;
  return { name, hostId, year: r.year as Year, interest: r.interest as Interest, ...(program && { program }), room: r.room };
}

/** When a payload was sent (each send includes `at`, a timestamp), for picking the newest. */
const sentAt = (m: unknown) => (m && typeof m === "object" && typeof (m as { at?: unknown }).at === "number" ? (m as { at: number }).at : -1);

/**
 * Turns Supabase's presenceState() into one entry per visitor. If a visitor has more than one
 * entry (e.g. while an update is replacing the old one), the newest one wins.
 */
export function flattenPresence(state: Record<string, unknown[]>, selfId: string): Peer[] {
  const out: Peer[] = [];
  for (const [id, metas] of Object.entries(state)) {
    if (!Array.isArray(metas) || metas.length === 0) continue;
    // Newest by timestamp; ties (and older versions without one) go to the last entry.
    const latest = metas.reduce((best, m) => (sentAt(m) >= sentAt(best) ? m : best));
    const info = sanitize(latest);
    if (info) out.push({ ...info, id, self: id === selfId });
  }
  return out;
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
