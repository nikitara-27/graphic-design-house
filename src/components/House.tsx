import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import type { Answers, Direction, Professor } from "../types";
import type { Panel } from "../lib/router";
import { house, roomById, yearOption } from "../lib/data";
import { Avatar } from "./Avatar";
import { Sheet } from "./Sheet";
import { RoomScene } from "./RoomScene";
import { AerialMap } from "./AerialMap";
import { CourseDetail } from "./CourseDetail";
import { RoomClasses, RoomHeading } from "./RoomClasses";
import { ProfileCard } from "./ProfileCard";
import { loadFlag, saveFlag } from "../lib/storage";

/** Navigation callbacks; App turns each into a URL + history entry. */
export interface HouseNav {
  goRoom: (id: string) => void;
  jumpTo: (id: string) => void;
  openPanel: (p: "map" | "profile") => void;
  openClasses: () => void;
  openCourse: (courseId: string) => void;
  closeCourse: () => void;
  closePanel: () => void;
}

interface Props {
  answers: Answers;
  professor: Professor;
  roomId: string;
  panel: Panel | null;
  courseId?: string;
  nav: HouseNav;
  onRetake: () => void;
}

type Transition = Direction | "fade";
const ARROWS: Record<string, Direction> = { ArrowLeft: "left", ArrowRight: "right", ArrowUp: "up", ArrowDown: "down" };
const PULSE_MS = 2600;
const HINT_KEY = "look-hint-seen";

export function House({ answers, professor, roomId, panel, courseId, nav, onRetake }: Props) {
  const year = yearOption(answers.year)!;
  const homeRoomId = year.homeRoomId;

  const [visited] = useState(() => new Set<string>());
  const [pulsing, setPulsing] = useState(false);

  const room = roomById.get(roomId)!;
  const course = courseId ? room.courses.find((c) => c.id === courseId) ?? null : null;
  const exit = (d: Direction) => room.exits.find((e) => e.direction === d);
  const isHome = roomId === homeRoomId;

  // How we arrived in this room picks the entry animation. Rooms reached any other way
  // (Back/Forward, a refresh, the map) fade in.
  const lastMove = useRef<{ to: string; how: Transition } | null>(null);
  const transition: Transition = lastMove.current?.to === roomId ? lastMove.current.how : "fade";
  const go = useCallback(
    (to: string, how: Transition) => {
      lastMove.current = { to, how };
      if (how === "fade") nav.jumpTo(to);
      else nav.goRoom(to);
    },
    [nav],
  );

  // First visit: pulse the object so people learn what's tappable.
  useEffect(() => {
    if (visited.has(roomId)) {
      setPulsing(false);
      return;
    }
    setPulsing(true);
    const t = window.setTimeout(() => {
      visited.add(roomId);
      setPulsing(false);
    }, PULSE_MS);
    return () => window.clearTimeout(t);
  }, [roomId, visited]);

  // Arrow keys walk between rooms (not while a dialog is open).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const d = ARROWS[e.key];
      if (!d || e.altKey || e.metaKey || e.ctrlKey || document.querySelector("dialog[open]")) return;
      const target = room.exits.find((x) => x.direction === d);
      if (!target) return;
      e.preventDefault();
      go(target.toRoomId, d);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [room, go]);

  // On phones the room is full height and wider than the screen: you scroll sideways to look around.
  // Start where you "walked in": at the left wall if you came through a right-hand door, and vice versa.
  const scroller = useRef<HTMLDivElement>(null);
  const [pan, setPan] = useState({ x: 0, w: 1 });
  const [hintVisible, setHintVisible] = useState(() => !loadFlag(HINT_KEY));
  const startScroll = useRef(0);

  const measure = () => {
    const el = scroller.current;
    if (el) setPan({ x: el.scrollLeft / el.scrollWidth, w: el.clientWidth / el.scrollWidth });
  };

  useLayoutEffect(() => {
    const el = scroller.current;
    if (!el) return;
    const max = el.scrollWidth - el.clientWidth;
    el.scrollLeft = transition === "right" ? 0 : transition === "left" ? max : max / 2;
    startScroll.current = el.scrollLeft;
    measure();
  }, [roomId, transition]);

  useEffect(() => {
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, []);

  const onScroll = () => {
    measure();
    const el = scroller.current;
    if (hintVisible && el && Math.abs(el.scrollLeft - startScroll.current) > 40) {
      setHintVisible(false);
      saveFlag(HINT_KEY);
    }
  };

  // Keep swiping past the end of the room to walk through that door.
  const touch = useRef<{ x: number; y: number; atStart: boolean; atEnd: boolean } | null>(null);
  const onTouchStart = (e: React.TouchEvent) => {
    const el = scroller.current!;
    const t = e.touches[0];
    touch.current = { x: t.clientX, y: t.clientY, atStart: el.scrollLeft <= 2, atEnd: el.scrollLeft >= el.scrollWidth - el.clientWidth - 2 };
  };
  const onTouchEnd = (e: React.TouchEvent) => {
    const s = touch.current;
    touch.current = null;
    if (!s) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - s.x;
    const dy = t.clientY - s.y;
    if (Math.abs(dx) < 60 || Math.abs(dx) < Math.abs(dy) * 1.5) return;
    const dir: Direction = dx < 0 ? "right" : "left";
    if ((dir === "right" && !s.atEnd) || (dir === "left" && !s.atStart)) return;
    const target = exit(dir);
    if (target) go(target.toRoomId, dir);
  };

  const up = exit("up");
  const down = exit("down");
  const left = exit("left");
  const right = exit("right");
  const pans = pan.w < 0.98;

  return (
    <div className="house">
      <header className="hud">
        <button type="button" className="hud-btn" onClick={() => nav.openPanel("map")}>
          <MapIcon /> <span>Map</span>
        </button>
        <div className="hud-title">
          <h1>
            {room.name}
            {isHome && <span className="tag tag-home">Your room</span>}
          </h1>
          <p>{room.subtitle}</p>
        </div>
        <button
          type="button"
          className="hud-profile"
          onClick={() => nav.openPanel("profile")}
          aria-label={`Your profile: host professor ${professor.name}`}
        >
          <Avatar professor={professor} size="sm" decorative />
        </button>
      </header>

      <main className="stage" style={{ ["--aspect" as string]: house.sceneAspect }}>
        <div className="scene-scroller" ref={scroller} onScroll={onScroll} onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
          <div key={roomId} className={`scene-track enter-${transition}`}>
            {left ? <Door side="left" label={left.label} onClick={() => go(left.toRoomId, "left")} /> : <div className="wall-end" />}
            <div className="scene" role="group" aria-label={`${room.name} scene`}>
              <RoomScene
                room={room}
                answers={answers}
                professor={professor}
                pulse={pulsing}
                onOpenClasses={nav.openClasses}
              />
            </div>
            {right ? <Door side="right" label={right.label} onClick={() => go(right.toRoomId, "right")} /> : <div className="wall-end" />}
          </div>
        </div>

        {hintVisible && pans && (
          <div className="look-hint" aria-hidden="true">
            <span className="look-arrows">← →</span>
            Swipe to look around
          </div>
        )}

        <div className="stage-bottom">
          {pans && (
            <div className="pan-track" aria-hidden="true">
              <i style={{ left: `${pan.x * 100}%`, width: `${pan.w * 100}%` }} />
            </div>
          )}
          <div className="toolbar-row">
            {up ? (
              <button type="button" className="pill" onClick={() => go(up.toRoomId, "up")} aria-label={`Upstairs to ${up.label}`}>
                <span aria-hidden="true">↑</span> {up.label}
              </button>
            ) : <span />}
            <span />
            {down ? (
              <button type="button" className="pill" onClick={() => go(down.toRoomId, "down")} aria-label={`Downstairs to ${down.label}`}>
                <span aria-hidden="true">↓</span> {down.label}
              </button>
            ) : <span />}
          </div>
        </div>

        <p className="sr-only" aria-live="polite">
          {`${room.name}, ${room.subtitle}. ${room.courses.length} ${room.courses.length === 1 ? "class" : "classes"}.`}
        </p>
      </main>

      <Sheet open={panel === "map"} onClose={nav.closePanel} title="House map" className="sheet-map">
        <AerialMap
          currentRoomId={roomId}
          homeRoomId={homeRoomId}
          onJump={(id) => (id === roomId ? nav.closePanel() : go(id, "fade"))}
        />
      </Sheet>

      <Sheet open={panel === "classes"} onClose={nav.closePanel} title={<RoomHeading room={room} />} className="sheet-classes">
        {course ? (
          <>
            <button type="button" className="back-link" onClick={nav.closeCourse} autoFocus>
              ← All {room.name} classes
            </button>
            <CourseDetail course={course} room={room} answers={answers} />
          </>
        ) : (
          <RoomClasses room={room} answers={answers} onPick={(c) => nav.openCourse(c.id)} />
        )}
      </Sheet>

      <Sheet open={panel === "profile"} onClose={nav.closePanel} title="Your profile">
        <ProfileCard answers={answers} professor={professor} />
        <div className="actions">
          {!isHome && (
            <button type="button" className="btn btn-primary" onClick={() => go(homeRoomId, "fade")}>
              Go to your room
            </button>
          )}
          <button type="button" className="btn" onClick={onRetake}>
            Retake quiz
          </button>
        </div>
      </Sheet>
    </div>
  );
}

function Door({ side, label, onClick }: { side: "left" | "right"; label: string; onClick: () => void }) {
  return (
    <button type="button" className={`door door-${side}`} onClick={onClick} aria-label={`Go ${side} to ${label}`}>
      <span className="door-frame" aria-hidden="true">
        <span className="door-arrow">{side === "left" ? "←" : "→"}</span>
      </span>
      <span className="door-label">{label}</span>
    </button>
  );
}

function MapIcon() {
  return (
    <svg viewBox="0 0 16 16" width="18" height="18" aria-hidden="true" shapeRendering="crispEdges">
      <path d="M8 1 1 7h2v8h10V7h2z" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="miter" />
      <rect x="6" y="9" width="4" height="6" fill="currentColor" />
    </svg>
  );
}
