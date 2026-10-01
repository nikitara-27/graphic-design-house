import type { Room } from "../types";
import type { Peer } from "../lib/presence";
import type { Placement } from "../lib/crowd";
import { useMemo } from "react";
import { asset } from "../lib/data";
import objectArt from "../data/object-art.json";
import { PeopleLayer } from "./People";
import { GreeterBubble } from "./GreeterBubble";

interface Props {
  room: Room;
  /** Everyone in this room right now, including you. */
  people: Peer[];
  placements: Map<string, Placement>;
  onOpenClasses: () => void;
  onPickPerson: (p: Peer) => void;
  /** The user's name, for the greeter's speech bubble. */
  name: string;
  greeting: boolean;
  onDismissGreeting: () => void;
}

const ART: Record<string, { image: string; x: number; y: number; w: number; h: number }> = objectArt;

export function RoomScene({ room, people, placements, onOpenClasses, onPickPerson, name, greeting, onDismissGreeting }: Props) {
  const o = room.object;
  const n = room.courses.length;
  const art = ART[room.id];
  // Touch screens: the shine repeats every 4–6 s, a little differently in each room so it isn't mechanical.
  const shine = useMemo(() => ({ every: 4 + Math.random() * 2, delay: 0.6 + Math.random() * 1.6 }), [room.id]);
  return (
    <>
      <img className="scene-art" src={asset(room.sceneImage)} alt={room.sceneAlt} draggable={false} />

      <PeopleLayer people={people} placements={placements} onPick={onPickPerson} />

      {room.greeter && greeting && <GreeterBubble greeter={room.greeter} name={name} onDismiss={onDismissGreeting} />}

      {/* Positioned by its center so the 44px minimum grows evenly around small objects. */}
      <button
        type="button"
        className="room-object"
        style={{
          left: `${o.x + o.w / 2}%`,
          top: `${o.y + o.h / 2}%`,
          width: `max(44px, ${o.w}%)`,
          height: `max(44px, ${o.h}%)`,
        }}
        aria-label={
          room.objectOpens === "resources"
            ? `${o.label}: open the Design Resources board`
            : `${o.label}: open ${room.name} classes (${n} ${n === 1 ? "class" : "classes"})`
        }
        onClick={onOpenClasses}
      />

      {/* The object cut out of the art (scripts/cut-objects.py): brightens on hover, and carries the
          shine on touch screens. It sits under the people, so it never covers anyone. */}
      {art && (
        <span
          className="object-art"
          aria-hidden="true"
          style={{
            left: `${art.x}%`,
            top: `${art.y}%`,
            width: `${art.w}%`,
            height: `${art.h}%`,
            ["--mask" as string]: `url("${asset(art.image)}")`,
            ["--shine-every" as string]: `${shine.every.toFixed(2)}s`,
            ["--shine-delay" as string]: `${shine.delay.toFixed(2)}s`,
          }}
        >
          <img src={asset(art.image)} alt="" draggable={false} />
          <span className="object-shine" />
        </span>
      )}
    </>
  );
}
