import { useEffect, useRef } from "react";
import type { Answers, Professor } from "../types";
import { ProfileCard } from "./ProfileCard";

interface Props { answers: Answers; professor: Professor; name: string; onEnter: () => void; onRetake: () => void }

export function Reveal({ answers, professor, name, onEnter, onRetake }: Props) {
  const ref = useRef<HTMLHeadingElement>(null);
  useEffect(() => ref.current?.focus(), []);
  return (
    <main className="screen reveal">
      <h1 className="title title-sm" ref={ref} tabIndex={-1}>
        {name ? `Welcome, ${name}!` : "Welcome!"}
      </h1>
      <ProfileCard answers={answers} professor={professor} name={name} />
      <div className="actions">
        <button type="button" className="btn btn-primary" onClick={onEnter}>
          Enter the house
        </button>
        <button type="button" className="btn" onClick={onRetake}>
          Retake quiz
        </button>
      </div>
    </main>
  );
}
