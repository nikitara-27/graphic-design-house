import { useEffect, useRef } from "react";
import { hostProfessor, interestOption, professors, programOption } from "../lib/data";
import type { Peer } from "../lib/presence";
import { labelTop, type Placement } from "../lib/crowd";
import { Avatar } from "./Avatar";

export const hostFor = (id: string) => professors.find((p) => p.id === id) ?? hostProfessor;

interface LayerProps {
  people: Peer[];
  /** Where each person stands (from placePeople), keyed by id. */
  placements: Map<string, Placement>;
  onPick: (p: Peer) => void;
}

/**
 * Everyone in this room, feet on the floor. Avatars may overlap like a crowd: lower on screen is
 * drawn in front, and you're always on top. Names sit in their own layer above all the figures,
 * in the same order, so a name is never hidden behind someone's head.
 */
export function PeopleLayer({ people, placements, onPick }: LayerProps) {
  const placed = people
    .map((p) => ({ p, at: placements.get(p.id)! }))
    .filter((e) => e.at)
    .sort((a, b) => a.at.z - b.at.z);

  return (
    <>
      {placed.map(({ p, at }) => (
        <button
          key={p.id}
          type="button"
          className={`person${p.self ? " is-self" : ""}`}
          style={{ left: `${at.x}%`, top: `${at.y}%`, zIndex: 10 + at.z, ["--s" as string]: at.scale }}
          onClick={() => onPick(p)}
          aria-label={p.self ? `You (${p.name}): open your profile` : `${p.name}: show details`}
        >
          <Avatar professor={hostFor(p.hostId)} size="sm" decorative />
        </button>
      ))}
      <div className="person-names" aria-hidden="true">
        {placed.map(({ p, at }) => (
          <span
            key={p.id}
            className={`person-name${p.self ? " is-self" : ""}`}
            style={{ left: `${at.x}%`, top: `${labelTop(at)}%`, zIndex: at.z }}
          >
            {p.self ? `${p.name} (you)` : p.name}
          </span>
        ))}
      </div>
    </>
  );
}

interface CardProps { peer: Peer; onClose: () => void }

/** Small floating card with one person's details. */
export function PeopleCard({ peer, onClose }: CardProps) {
  const closeRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="people-card" role="dialog" aria-label={`${peer.name}'s details`}>
      <button ref={closeRef} type="button" className="icon-btn people-card-close" onClick={onClose} aria-label="Close">
        ✕
      </button>
      <div className="person-detail">
        <div className="person-detail-avatar">
          <Avatar professor={hostFor(peer.hostId)} size="sm" decorative />
        </div>
        <div>
          <p className="person-detail-name">{peer.name}</p>
          <p>Into: {interestOption(peer.interest)?.label}</p>
          {peer.program && <p>Favorite program: {programOption(peer.program)?.label}</p>}
        </div>
      </div>
    </div>
  );
}
