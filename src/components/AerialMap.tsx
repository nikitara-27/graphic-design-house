import { asset, house, rooms } from "../lib/data";

interface Props { currentRoomId: string; homeRoomId: string; onJump: (id: string) => void }

const floorLabel = new Map(house.floors.map((f) => [f.floor, f.label]));

/** The team's illustrated cross-section of the house, with every room tappable. */
export function AerialMap({ currentRoomId, homeRoomId, onJump }: Props) {
  const { map } = house;
  return (
    <>
      <div className="housemap" style={{ aspectRatio: `${map.width} / ${map.height}` }}>
        <img className="housemap-art" src={asset(map.image)} alt={map.alt} draggable={false} />
        {rooms.map((r) => {
          const a = r.mapArea;
          const current = r.id === currentRoomId;
          const home = r.id === homeRoomId;
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
              aria-label={`${r.name}, ${r.subtitle}, ${floorLabel.get(r.floor)}${current ? ". You're here" : ""}${home ? ". Your room" : ""}`}
              onClick={() => onJump(r.id)}
            >
              {(current || home) && (
                <span className="map-spot-tags" aria-hidden="true">
                  {current && <span className="tag tag-here">You're here</span>}
                  {home && <span className="tag tag-home">Your room</span>}
                </span>
              )}
              <span className="map-spot-name" aria-hidden="true">{r.name}</span>
            </button>
          );
        })}
      </div>
      <p className="housemap-hint">Tap a room to go there.</p>
    </>
  );
}
