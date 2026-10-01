import type { Room } from "../types";
import type { Peer } from "../lib/presence";
import type { Placement } from "../lib/crowd";
import { asset } from "../lib/data";
import { PeopleLayer } from "./People";
import { GreeterBubble } from "./GreeterBubble";

interface Props {
  room: Room;
  /** Everyone in this room right now, including you. */
  people: Peer[];
  placements: Map<string, Placement>;
  /** First visit: pulse the object so people learn it's tappable. */
  pulse: boolean;
  onOpenClasses: () => void;
  onPickPerson: (p: Peer) => void;
  /** The user's name, for the greeter's speech bubble. */
  name: string;
  greeting: boolean;
  onDismissGreeting: () => void;
}

export function RoomScene({ room, people, placements, pulse, onOpenClasses, onPickPerson, name, greeting, onDismissGreeting }: Props) {
  const o = room.object;
  const n = room.courses.length;
  return (
    <>
      <img className="scene-art" src={asset(room.sceneImage)} alt={room.sceneAlt} draggable={false} />

      <PeopleLayer people={people} placements={placements} onPick={onPickPerson} />

      {room.greeter && greeting && <GreeterBubble greeter={room.greeter} name={name} onDismiss={onDismissGreeting} />}

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
