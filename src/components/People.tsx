import { useEffect, useRef } from "react";
import type { Room } from "../types";
import { hostProfessor, interestOption, professors, yearOption } from "../lib/data";
import { FEET_Y, standingSpots, type Peer } from "../lib/presence";
import { Avatar } from "./Avatar";

const MAX_SHOWN = 6;
export const hostFor = (id: string) => professors.find((p) => p.id === id) ?? hostProfessor;

/** Sort so you come first, then everyone else alphabetically (stable as people come and go). */
const order = (a: Peer, b: Peer) => Number(b.self) - Number(a.self) || a.name.localeCompare(b.name) || a.id.localeCompare(b.id);

interface LayerProps {
  room: Room;
  people: Peer[];
  onPick: (p: Peer) => void;
  onMore: (rest: Peer[]) => void;
}

/** Everyone in this room, standing along the floor. Crowds collapse into a "+N" bubble. */
export function PeopleLayer({ room, people, onPick, onMore }: LayerProps) {
  const spots = standingSpots(room.object);
  const sorted = [...people].sort(order);
  const capacity = Math.min(spots.length, MAX_SHOWN);
  const overflow = sorted.length > capacity;
  const shown = overflow ? sorted.slice(0, capacity - 1) : sorted;
  const rest = overflow ? sorted.slice(capacity - 1) : [];

  return (
    <>
      {shown.map((p, i) => (
        <button
          key={p.id}
          type="button"
          className={`person${p.self ? " is-self" : ""}`}
          style={{ left: `${spots[i]}%`, top: `${FEET_Y}%` }}
          onClick={() => onPick(p)}
          aria-label={p.self ? `You (${p.name}): open your profile` : `${p.name}: show details`}
        >
          <span className="person-name" aria-hidden="true">{p.self ? `${p.name} (you)` : p.name}</span>
          <Avatar professor={hostFor(p.hostId)} size="sm" decorative />
        </button>
      ))}
      {rest.length > 0 && (
        <button
          type="button"
          className="person-more"
          style={{ left: `${spots[capacity - 1]}%`, top: `${FEET_Y}%` }}
          onClick={() => onMore(rest)}
          aria-label={`${rest.length} more people here: show the list`}
        >
          +{rest.length} more
        </button>
      )}
    </>
  );
}

interface CardProps { peer?: Peer; list?: Peer[]; onPick: (p: Peer) => void; onClose: () => void }

/** Small floating card: one person's details, or the list behind "+N more". */
export function PeopleCard({ peer, list, onPick, onClose }: CardProps) {
  const closeRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="people-card" role="dialog" aria-label={peer ? `${peer.name}'s details` : "More people here"}>
      <button ref={closeRef} type="button" className="icon-btn people-card-close" onClick={onClose} aria-label="Close">
        ✕
      </button>
      {peer ? (
        <div className="person-detail">
          <div className="person-detail-avatar">
            <Avatar professor={hostFor(peer.hostId)} size="sm" decorative />
          </div>
          <div>
            <p className="person-detail-name">{peer.name}</p>
            <p>
              {yearOption(peer.year)?.label} · {interestOption(peer.interest)?.label}
            </p>
            <p className="person-detail-host">Host: {hostFor(peer.hostId).name}</p>
          </div>
        </div>
      ) : (
        <>
          <p className="people-card-title">Also here</p>
          <ul className="people-list">
            {list?.map((p) => (
              <li key={p.id}>
                <button type="button" onClick={() => onPick(p)}>
                  {p.name}
                  {p.self && " (you)"}
                </button>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
