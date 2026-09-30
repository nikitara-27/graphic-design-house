import type { Answers, Professor, Room } from "../types";
import { asset } from "../lib/data";
import { Avatar } from "./Avatar";

interface Props {
  room: Room;
  professor: Professor;
  answers: Answers;
  /** First visit: pulse the object so people learn it's tappable. */
  pulse: boolean;
  onOpenClasses: () => void;
}

export function RoomScene({ room, professor, pulse, onOpenClasses }: Props) {
  const o = room.object;
  const n = room.courses.length;
  return (
    <>
      <img className="scene-art" src={asset(room.sceneImage)} alt={room.sceneAlt} draggable={false} />

      {room.hangout && (
        <div className="hangout" style={{ left: `${room.hangout.x}%`, top: `${room.hangout.y}%`, width: `${room.hangout.w}%` }}>
          <Avatar professor={professor} decorative />
          <span className="speech" aria-hidden="true">Take a break!</span>
        </div>
      )}

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
