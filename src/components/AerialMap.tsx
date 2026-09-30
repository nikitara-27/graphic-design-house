import { house, rooms } from "../lib/data";

interface Props { currentRoomId: string; homeRoomId: string; onJump: (id: string) => void }

/** Floor plan as a vertical stack of floors (Attic → Basement), readable at 375px. */
export function AerialMap({ currentRoomId, homeRoomId, onJump }: Props) {
  const floors = [...house.floors].sort((a, b) => b.floor - a.floor);
  return (
    <div className="aerial">
      <div className="roof" aria-hidden="true" />
      {floors.map((f) => {
        const onFloor = rooms.filter((r) => r.floor === f.floor);
        return (
          <section key={f.floor} className={`floor floor-${f.floor}`} aria-label={f.label}>
            <h3 className="floor-label">{f.label}</h3>
            <ul className="floor-rooms" style={{ gridTemplateColumns: `repeat(${onFloor.length}, minmax(0, 1fr))` }}>
              {onFloor.map((r) => {
                const current = r.id === currentRoomId;
                const home = r.id === homeRoomId;
                return (
                  <li key={r.id}>
                    <button
                      type="button"
                      className={`map-room${current ? " is-current" : ""}${home ? " is-home" : ""}`}
                      aria-current={current ? "location" : undefined}
                      onClick={() => onJump(r.id)}
                    >
                      <span className="map-room-name">{r.name}</span>
                      <span className="map-room-sub">{r.subtitle}</span>
                      <span className="map-dots" aria-label={`${r.courses.length} classes`}>
                        {r.courses.map((c) => (
                          <i key={c.id} className={c.active ? "" : "off"} />
                        ))}
                      </span>
                      {(current || home) && (
                        <span className="map-tags">
                          {current && <span className="tag tag-here">You're here</span>}
                          {home && <span className="tag tag-home">Your room</span>}
                        </span>
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
