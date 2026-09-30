import { useState } from "react";
import type { Answers } from "./types";
import { assignments, hostProfessor, professors } from "./lib/data";
import { matchProfessor } from "./lib/match";
import { loadSaved, save } from "./lib/storage";
import { Landing } from "./components/Landing";
import { Quiz } from "./components/Quiz";
import { Reveal } from "./components/Reveal";
import { House } from "./components/House";

type Screen = "landing" | "quiz" | "reveal" | "house";

export default function App() {
  const [saved] = useState(loadSaved);
  const [screen, setScreen] = useState<Screen>("landing");
  const [answers, setAnswers] = useState<Answers | null>(saved?.answers ?? null);
  const [professorId, setProfessorId] = useState(saved?.professorId ?? hostProfessor.id);
  const professor = professors.find((p) => p.id === professorId) ?? hostProfessor;

  const complete = (a: Answers) => {
    const p = matchProfessor(a, professors, assignments, hostProfessor);
    setAnswers(a);
    setProfessorId(p.id);
    save({ answers: a, professorId: p.id });
    setScreen("reveal");
  };

  if (screen === "quiz") {
    return <Quiz initial={answers ?? undefined} onBack={() => setScreen("landing")} onComplete={complete} />;
  }
  if (screen === "reveal" && answers) {
    return <Reveal answers={answers} professor={professor} onEnter={() => setScreen("house")} onRetake={() => setScreen("quiz")} />;
  }
  if (screen === "house" && answers) {
    return <House answers={answers} professor={professor} onRetake={() => setScreen("quiz")} />;
  }
  return <Landing hasSaved={!!answers} onStart={() => setScreen("quiz")} onEnter={() => setScreen("house")} />;
}
