import { useEffect, useId, useRef, type ReactNode } from "react";

interface Props { open: boolean; onClose: () => void; title: ReactNode; children: ReactNode; className?: string }

const CLOSE_DRAG_PX = 90;

/**
 * Native <dialog> as a bottom sheet (mobile) / centered modal (desktop).
 * Handles focus trap and Esc; tap the backdrop or swipe the sheet down to close.
 */
export function Sheet({ open, onClose, title, children, className = "" }: Props) {
  const ref = useRef<HTMLDialogElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const titleId = useId();
  // When the URL closes the sheet (e.g. Back), `open` is already false: don't navigate again.
  const openRef = useRef(open);
  openRef.current = open;
  const requestClose = () => {
    if (openRef.current) onClose();
  };

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);

  // Swipe down to close: from the handle/header anytime, or from the body when it's scrolled to the top.
  const drag = useRef<{ y: number; dy: number } | null>(null);
  const onTouchStart = (e: React.TouchEvent) => {
    const fromTop = (e.target as Element).closest(".sheet-grab, .sheet-header");
    if (!fromTop && (bodyRef.current?.scrollTop ?? 0) > 0) return;
    drag.current = { y: e.touches[0].clientY, dy: 0 };
  };
  const onTouchMove = (e: React.TouchEvent) => {
    const d = drag.current;
    const el = ref.current;
    if (!d || !el) return;
    d.dy = Math.max(0, e.touches[0].clientY - d.y);
    el.style.transition = "none";
    el.style.transform = d.dy ? `translateY(${d.dy}px)` : "";
  };
  const onTouchEnd = () => {
    const d = drag.current;
    const el = ref.current;
    drag.current = null;
    if (!el) return;
    el.style.transition = "";
    el.style.transform = "";
    if (d && d.dy > CLOSE_DRAG_PX) requestClose();
  };

  return (
    <dialog
      ref={ref}
      className={`sheet ${className}`}
      aria-labelledby={titleId}
      onClose={requestClose}
      onClick={(e) => e.target === ref.current && requestClose()}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
      onTouchCancel={onTouchEnd}
    >
      <div className="sheet-grab" aria-hidden="true" />
      <header className="sheet-header">
        <h2 id={titleId}>{title}</h2>
        <button type="button" className="icon-btn" onClick={requestClose} aria-label="Close">
          ✕
        </button>
      </header>
      <div className="sheet-body" ref={bodyRef}>
        {open && children}
      </div>
    </dialog>
  );
}
