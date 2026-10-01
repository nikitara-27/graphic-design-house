import { useEffect, useRef } from "react";
import type { Room } from "../types";

interface Props { greeter: NonNullable<Room["greeter"]>; name: string; onDismiss: () => void }

/** A speech bubble whose tail points at the greeter (the Living Room cat). */
export function GreeterBubble({ greeter, name, onDismiss }: Props) {
  const ref = useRef<HTMLButtonElement>(null);

  // Tapping anywhere else hides it too. "click" (not pointerdown) so swiping to look around doesn't.
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) onDismiss();
    };
    // Wait a tick so the tap that brought you into the room doesn't count.
    const t = window.setTimeout(() => document.addEventListener("click", onClick, true), 0);
    return () => {
      window.clearTimeout(t);
      document.removeEventListener("click", onClick, true);
    };
  }, [onDismiss]);

  const text = name ? `Hi ${name}, welcome to the GD House!` : "Hi there, welcome to the GD House!";
  return (
    <button
      ref={ref}
      type="button"
      className="greeter-bubble"
      style={{ left: `${greeter.x}%`, top: `${greeter.y}%` }}
      onClick={onDismiss}
      aria-label={`${greeter.label} says: ${text} Tap to close.`}
    >
      <span aria-hidden="true">{text}</span>
    </button>
  );
}
