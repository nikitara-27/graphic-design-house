import type { Room } from "../types";
import { house } from "./data";

/**
 * Where everyone stands in a room. Every person is shown (no "+N more"): first one per free spot
 * across the width of the room, then, once the spots run out, overlapping like a crowd.
 * Positions come from each person's id, so people don't jump around when others join or leave.
 */

// Avatar size, in % of the scene. Width matches the original Living Room host (15% of the room's
// width) ≈ 28% of the room's height in the 16:9 artwork. The figure itself fills ~84% of that width.
export const AV_WIDTH = 15;
const BODY_W = 12.6;
export const AV_HEIGHT = AV_WIDTH * house.sceneAspect * (2000 / 1925);
const LABEL_H = 4;
const LABEL_W = 7;
const BACK_SCALE = 0.9; // people at the back of the floor band are drawn at 90%
const EDGE = 8; // keep figures off the very edges of the room

export interface Box { x: number; y: number; w: number; h: number }
export interface Placement {
  /** Centre of the feet, in % of the scene. */
  x: number;
  y: number;
  scale: number;
  /** Stacking order: lower on screen = in front; you're always on top. */
  z: number;
}

/** Stable pseudo-random number in [0, 1) from a string (FNV-1a). */
export function hash01(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0) / 2 ** 32;
}

const hits = (a: Box, b: Box) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;

/** The parts of a person that must stay clear: their figure and the name label above it. */
function footprint(x: number, y: number, scale: number): Box[] {
  const h = AV_HEIGHT * scale;
  return [
    { x: x - (BODY_W * scale) / 2, y: y - h, w: BODY_W * scale, h },
    { x: x - LABEL_W / 2, y: y - h - LABEL_H, w: LABEL_W, h: LABEL_H },
  ];
}

export interface CrowdOptions {
  /** Lowest the feet may go (e.g. the visible bottom of the room in wide windows), % of scene. */
  floorLimit?: number;
  /** Extra areas to keep clear, in % of the scene (e.g. arrows, when they sit over the room). */
  obstacles?: Box[];
}

export function placePeople(room: Room, people: { id: string; self?: boolean }[], opts: CrowdOptions = {}): Map<string, Placement> {
  const bottom = Math.min(room.floorBottom, opts.floorLimit ?? 100);
  const top = Math.min(room.floorTop, bottom - 1);
  const depth = (y: number) => (bottom > top ? (y - top) / (bottom - top) : 1); // 0 = back, 1 = front
  const scaleAt = (y: number) => BACK_SCALE + (1 - BACK_SCALE) * depth(y);

  const avoid: Box[] = [...(room.avatarsMayOverlapObject ? [] : [room.object]), ...(opts.obstacles ?? [])];
  // The Living Room cat sits under its speech bubble; keep heads and names off it.
  if (room.greeter) avoid.push({ x: room.greeter.x - 7, y: room.greeter.y - 2, w: 14, h: 14 });
  const clear = (x: number, y: number) => !footprint(x, y, scaleAt(y)).some((f) => avoid.some((a) => hits(f, a)));

  // Free spots across the width, one figure-width apart, usable at any depth in the band.
  const slots: number[] = [];
  for (let x = EDGE + BODY_W / 2; x <= 100 - EDGE - BODY_W / 2 + 0.01; x += BODY_W) {
    if (clear(x, top) && clear(x, bottom)) slots.push(x);
  }
  if (slots.length === 0) slots.push(50);

  // Assign in a fixed order (by id), each person to their preferred slot or the next free one.
  const order = [...people].sort((a, b) => hash01(a.id) - hash01(b.id) || a.id.localeCompare(b.id));
  const taken = new Set<number>();
  const out = new Map<string, Placement>();
  for (const p of order) {
    const y = top + (bottom - top) * hash01(`${p.id}:y`);
    let x: number;
    if (taken.size < slots.length) {
      let i = Math.floor(hash01(`${p.id}:slot`) * slots.length);
      while (taken.has(i)) i = (i + 1) % slots.length;
      taken.add(i);
      x = slots[i];
    } else {
      // Room's full: join the crowd near a spot, overlapping whoever's there.
      const base = slots[Math.floor(hash01(`${p.id}:crowd`) * slots.length)];
      const nudged = base + (hash01(`${p.id}:dx`) - 0.5) * BODY_W;
      x = clear(nudged, y) ? nudged : base;
    }
    out.set(p.id, { x, y, scale: scaleAt(y), z: p.self ? 100000 : Math.round(y * 100) });
  }
  return out;
}

/** Top of a placed person's name label, in % of the scene (for positioning the label). */
export const labelTop = (p: Placement) => p.y - AV_HEIGHT * p.scale;
