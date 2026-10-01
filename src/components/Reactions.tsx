import { useEffect, useRef, useState } from "react";
import { REACTIONS, REACTION_COOLDOWN_MS, type ReactionId } from "../lib/reactions";

interface Props {
  onSend: (type: ReactionId) => boolean;
}

/** The smiley button and its picker. Only shown while connected (see House). */
export function ReactButton({ onSend }: Props) {
  const [open, setOpen] = useState(false);
  const [cooling, setCooling] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const firstRef = useRef<HTMLButtonElement>(null);

  // Tapping anywhere outside, or Escape, closes the picker without sending.
  useEffect(() => {
    if (!open) return;
    firstRef.current?.focus();
    const onDown = (e: PointerEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      setOpen(false);
      buttonRef.current?.focus();
    };
    document.addEventListener("pointerdown", onDown, true);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown, true);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  useEffect(() => {
    if (!cooling) return;
    const t = window.setTimeout(() => setCooling(false), REACTION_COOLDOWN_MS);
    return () => window.clearTimeout(t);
  }, [cooling]);

  const pick = (id: ReactionId) => {
    if (onSend(id)) setCooling(true);
    setOpen(false);
    buttonRef.current?.focus();
  };

  return (
    <div className="react" ref={wrapRef}>
      {open && (
        <div className="react-picker" role="menu" aria-label="Reactions">
          {REACTIONS.map((r, i) => (
            <button
              key={r.id}
              ref={i === 0 ? firstRef : undefined}
              type="button"
              role="menuitem"
              className={`react-option${r.id === "hi" ? " is-text" : ""}`}
              aria-label={r.label}
              title={r.label}
              disabled={cooling}
              onClick={() => pick(r.id)}
            >
              {r.text}
            </button>
          ))}
        </div>
      )}
      <button
        ref={buttonRef}
        type="button"
        className="react-btn"
        aria-label="Send a reaction"
        aria-haspopup="menu"
        aria-expanded={open}
        title="Send a reaction"
        onClick={() => setOpen((o) => !o)}
      >
        <SmileyIcon />
      </button>
    </div>
  );
}

// Pixel smiley on a 12×12 grid: # = forest outline/features, o = butter face.
const SMILEY = [
  "...######...",
  "..#oooooo#..",
  ".#oooooooo#.",
  "#oooooooooo#",
  "#ooo#oo#ooo#",
  "#ooo#oo#ooo#",
  "#oooooooooo#",
  "#oo#oooo#oo#",
  "#ooo####ooo#",
  ".#oooooooo#.",
  "..#oooooo#..",
  "...######...",
];

function SmileyIcon() {
  return (
    <svg viewBox="0 0 12 12" width="24" height="24" aria-hidden="true" shapeRendering="crispEdges">
      {SMILEY.flatMap((row, y) =>
        [...row].map((c, x) =>
          c === "." ? null : <rect key={`${x}-${y}`} x={x} y={y} width="1" height="1" fill={c === "#" ? "var(--forest)" : "var(--butter)"} />,
        ),
      )}
    </svg>
  );
}
