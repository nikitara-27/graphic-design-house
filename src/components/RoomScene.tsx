import type { Room } from "../types";
import type { Peer } from "../lib/presence";
import { asset } from "../lib/data";
import { PeopleLayer } from "./People";

interface Props {
  room: Room;
  /** Everyone in this room right now, including you. */
  people: Peer[];
  /** First visit: pulse the object so people learn it's tappable. */
  pulse: boolean;
  onOpenClasses: () => void;
  onPickPerson: (p: Peer) => void;
  onMorePeople: (rest: Peer[]) => void;
}

export function RoomScene({ room, people, pulse, onOpenClasses, onPickPerson, onMorePeople }: Props) {
  const o = room.object;
  const n = room.courses.length;
  return (
    <>
      <img className="scene-art" src={asset(room.sceneImage)} alt={room.sceneAlt} draggable={false} />

      <PeopleLayer room={room} people={people} onPick={onPickPerson} onMore={onMorePeople} />

      {/* Positioned by its center so the 44px minimum grows evenly around small objects. */}
      <button
        type="button"
        className={`room-object${pulse ? " is-pulsing" : ""}`}
        style={{
          left: `${o.x + o.w / 2}%`,
          top: `${o.y + o.h / 2}%`,
          width: `max(44px, ${o.w}%)`,
          height: `max(44px, ${o.h}%)`,
        }}
        aria-label={`${o.label}: open ${room.name} classes (${n} ${n === 1 ? "class" : "classes"})`}
        onClick={onOpenClasses}
      />
    </>
  );
}
