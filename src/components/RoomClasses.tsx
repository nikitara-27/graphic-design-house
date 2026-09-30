import type { Answers, Course, Room } from "../types";

const TERM = { F: "Fall", S: "Spring" } as const;

const EMPTY: Record<string, string> = {
  playroom: "Classes coming soon.",
  "living-room": "Take a break — no classes here.",
};

/** Sheet header: room name in Doto, then what the room represents. */
export function RoomHeading({ room }: { room: Room }) {
  return (
    <>
      <span className="heading-room">{room.name}</span>
      <span className="heading-sub"> · {room.subtitle}</span>
    </>
  );
}

interface Props { room: Room; answers: Answers; onPick: (c: Course) => void }

export function RoomClasses({ room, answers, onPick }: Props) {
  if (room.courses.length === 0) {
    return <p className="empty-classes">{EMPTY[room.id] ?? "Classes coming soon."}</p>;
  }
  return (
    <ul className="class-list">
      {room.courses.map((c) => {
        const match = c.active && c.interests.includes(answers.interest);
        return (
          <li key={c.id}>
            <button type="button" className={`class-row${c.active ? "" : " is-inactive"}`} onClick={() => onPick(c)}>
              <span className="class-code">{c.code}</span>
              <span className="class-text">
                <span className="class-title">{c.title}</span>
                {(c.term || !c.active || match) && (
                  <span className="class-meta">
                    {c.term && TERM[c.term]}
                    {!c.active && <span className="tag tag-inactive">Not currently offered</span>}
                    {match && <span className="tag tag-match">★ Your interest</span>}
                  </span>
                )}
              </span>
              <span className="class-chevron" aria-hidden="true">›</span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
