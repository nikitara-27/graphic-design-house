import { asset, house, rooms } from "../lib/data";

interface Props {
  currentRoomId: string;
  homeRoomId: string;
  /** People in each room right now (live presence). */
  counts: Record<string, number>;
  onJump: (id: string) => void;
}

const floorLabel = new Map(house.floors.map((f) => [f.floor, f.label]));

/** The team's illustrated cross-section of the house, with every room tappable. */
export function AerialMap({ currentRoomId, homeRoomId, counts, onJump }: Props) {
  const { map } = house;
  const total = Object.values(counts).reduce((a, b) => a + b, 0);
  return (
    <>
      <div className="housemap" style={{ aspectRatio: `${map.width} / ${map.height}` }}>
        <img className="housemap-art" src={asset(map.image)} alt={map.alt} draggable={false} />
        {rooms.map((r) => {
          const a = r.mapArea;
          const current = r.id === currentRoomId;
          const home = r.id === homeRoomId;
        const n = counts[r.id] ?? 0;
          return (
            <button
              key={r.id}
              type="button"
              className={`map-spot${current ? " is-current" : ""}${home ? " is-home" : ""}`}
              style={{
                left: `${a.x + a.w / 2}%`,
                top: `${a.y + a.h / 2}%`,
                width: `max(44px, ${a.w}%)`,
                height: `max(44px, ${a.h}%)`,
              }}
              aria-current={current ? "location" : undefined}
              aria-label={`${r.name}, ${r.subtitle}, ${floorLabel.get(r.floor)}${current ? ". You're here" : ""}${home ? ". Your room" : ""}${n ? `. ${n} ${n === 1 ? "person" : "people"} here` : ""}`}
              onClick={() => onJump(r.id)}
            >
              {(current || home) && (
                <span className="map-spot-tags" aria-hidden="true">
                  {current && <span className="tag tag-here">You're here</span>}
                  {home && <span className="tag tag-home">Your room</span>}
                </span>
              )}
              {n > 0 && (
              <span className="map-count" aria-hidden="true">
                <PersonIcon />
                {n}
              </span>
            )}
            <span className="map-spot-name" aria-hidden="true">{r.name}</span>
            </button>
          );
        })}
      </div>
      <p className="housemap-hint">
        Tap a room to go there.
        {total > 1 && ` ${total} people are exploring right now.`}
      </p>
    </>
  );
}

function PersonIcon() {
  return (
    <svg viewBox="0 0 8 10" width="8" height="10" aria-hidden="true" shapeRendering="crispEdges">
      <rect x="2" y="0" width="4" height="4" fill="currentColor" />
      <rect x="1" y="5" width="6" height="5" fill="currentColor" />
    </svg>
  );
}
