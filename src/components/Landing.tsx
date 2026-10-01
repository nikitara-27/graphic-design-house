interface Props { onStart: () => void }

export function Landing({ onStart }: Props) {
  return (
    <main className="screen landing">
      <HouseMark />
      <h1 className="title">Graphic Design House</h1>
      <p className="lede">Walk through BU's Graphic Design curriculum, one room at a time. Answer 3 quick questions to get your profile.</p>
      <div className="actions">
        <button type="button" className="btn btn-primary" onClick={onStart}>
          Start
        </button>
      </div>
    </main>
  );
}

function HouseMark() {
  // Five floors, top to bottom: attic, upper, middle, ground, basement.
  return (
    <svg className="house-mark" viewBox="0 0 24 26" aria-hidden="true" shapeRendering="crispEdges">
      <path d="M12 1h0v1h1v1h1v1h1v1h1v1h1v1h1v1h1v1h1v1H3V9h1V8h1V7h1V6h1V5h1V4h1V3h1V2h1z" fill="#EF8DB3" />
      <rect x="10" y="5" width="4" height="3" fill="#EBD48F" />
      <rect x="3" y="10" width="18" height="15" fill="#B7D0A4" />
      <path d="M3 10h18v15H3z" fill="none" stroke="#385B48" strokeWidth="1" />
      {[11, 15, 19].map((y) => [5, 11, 17].map((x) => <rect key={`${x}-${y}`} x={x} y={y} width="2.5" height="2.5" fill="#C3D2E9" />))}
      <rect x="10.5" y="21" width="3" height="4" fill="#6D2749" />
      <rect x="1" y="25" width="22" height="1" fill="#385B48" />
    </svg>
  );
}
