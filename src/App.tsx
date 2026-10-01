import { useCallback, useEffect, useMemo, useState } from "react";
import type { Answers } from "./types";
import { assignments, hostProfessor, professors, yearOption } from "./lib/data";
import { matchProfessor } from "./lib/match";
import { clearAnswers, loadAnswers, saveAnswers } from "./lib/storage";
import { classesHash, resolve, roomHash, type NavState } from "./lib/router";
import { Landing } from "./components/Landing";
import { Quiz } from "./components/Quiz";
import { Reveal } from "./components/Reveal";
import { House, type HouseNav } from "./components/House";

const readLocation = () => ({ hash: window.location.hash, state: (window.history.state ?? null) as NavState | null });

/** Push (or replace) a history entry. An empty hash means the bare page (the landing screen). */
function writeHistory(hash: string, state: NavState | null, replace = false) {
  const url = hash || window.location.pathname + window.location.search;
  if (replace) window.history.replaceState(state, "", url);
  else window.history.pushState(state, "", url);
}

export default function App() {
  const [answers, setAnswers] = useState<Answers | null>(loadAnswers);
  const [loc, setLoc] = useState(readLocation);

  // Back/forward buttons and hand-edited URLs.
  useEffect(() => {
    const sync = () => setLoc(readLocation());
    window.addEventListener("popstate", sync);
    window.addEventListener("hashchange", sync);
    return () => {
      window.removeEventListener("popstate", sync);
      window.removeEventListener("hashchange", sync);
    };
  }, []);

  const navigate = useCallback((hash: string, state: NavState | null = null, replace = false) => {
    writeHistory(hash, state, replace);
    setLoc(readLocation());
  }, []);

  const { route, hash: canonical } = resolve(loc.hash, loc.state, answers);

  // Missing or invalid hash: quietly rewrite the URL to the place we actually showed.
  useEffect(() => {
    if (canonical !== loc.hash) navigate(canonical, loc.state, true);
  }, [canonical, loc, navigate]);

  // The host is always recalculated from the answers, never stored.
  const professor = useMemo(
    () => (answers ? matchProfessor(answers, professors, assignments, hostProfessor) : hostProfessor),
    [answers],
  );

  const retake = () => {
    clearAnswers();
    setAnswers(null);
    navigate("", null, true);
  };

  if (route.screen === "quiz") {
    return (
      <Quiz
        initial={answers ?? undefined}
        onBack={() => navigate(answers ? roomHash(yearOption(answers.year)!.homeRoomId) : "", null, true)}
        onComplete={(a) => {
          saveAnswers(a);
          setAnswers(a);
          navigate("#/welcome", null, true);
        }}
      />
    );
  }
  if (route.screen === "welcome" && answers) {
    const home = yearOption(answers.year)!.homeRoomId;
    return <Reveal answers={answers} professor={professor} onEnter={() => navigate(roomHash(home), { room: home })} onRetake={retake} />;
  }
  if (route.screen === "house" && answers) {
    const { roomId } = route;
    const depth = loc.state?.depth ?? 0;
    const nav: HouseNav = {
      // Walking through a door or stairs: a new history entry, so Back walks you back.
      goRoom: (id) => navigate(roomHash(id), { room: id }),
      // Jumping from the map/profile: replace the panel's entry, so Back returns to the room you left.
      jumpTo: (id) => navigate(roomHash(id), { room: id }, depth > 0),
      openPanel: (p) => navigate(`#/${p}`, { room: roomId, depth: 1 }),
      openClasses: () => navigate(classesHash(roomId), { room: roomId, depth: 1 }),
      openCourse: (id) => navigate(classesHash(roomId, id), { room: roomId, depth: 2 }),
      closeCourse: () => (depth === 2 ? window.history.back() : navigate(classesHash(roomId), { room: roomId, depth: 1 }, true)),
      // Closing a panel undoes the entries it added, so Back afterwards doesn't reopen it.
      closePanel: () => (depth > 0 ? window.history.go(-depth) : navigate(roomHash(roomId), { room: roomId }, true)),
    };
    return (
      <House
        answers={answers}
        professor={professor}
        roomId={roomId}
        panel={route.panel}
        courseId={route.courseId}
        nav={nav}
        onRetake={retake}
      />
    );
  }
  return <Landing onStart={() => navigate("#/quiz")} />;
}
