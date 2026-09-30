import { useEffect, useRef, useState } from "react";
import type { Answers, Interest, Year } from "../types";
import { questions } from "../lib/data";

interface Props { initial?: Partial<Answers>; onBack: () => void; onComplete: (a: Answers) => void }

const reducedMotion = () => window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

/** One question per screen. Tapping an option auto-advances. */
export function Quiz({ initial = {}, onBack, onComplete }: Props) {
  const [step, setStep] = useState(0);
  const [draft, setDraft] = useState<Partial<Answers>>(initial);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const timer = useRef<number>(undefined);

  useEffect(() => headingRef.current?.focus(), [step]);
  useEffect(() => () => window.clearTimeout(timer.current), []);

  const steps = [
    { key: "year" as const, prompt: questions.year.prompt, options: questions.year.options.map((o) => ({ id: o.id, label: o.label, hint: undefined })) },
    { key: "interest" as const, prompt: questions.interest.prompt, options: questions.interest.options.map((o) => ({ id: o.id, label: o.label, hint: o.hint })) },
    { key: "program" as const, prompt: questions.program.prompt, options: questions.program.options.map((o) => ({ id: o.id, label: o.label, hint: undefined })) },
  ];
  const current = steps[step];

  const pick = (id: string) => {
    const next = { ...draft, [current.key]: id } as Partial<Answers>;
    setDraft(next);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => {
      if (step < steps.length - 1) setStep(step + 1);
      else onComplete({ year: next.year as Year, interest: next.interest as Interest, program: next.program! });
    }, reducedMotion() ? 0 : 220);
  };

  const back = () => {
    window.clearTimeout(timer.current);
    if (step === 0) onBack();
    else setStep(step - 1);
  };

  return (
    <main className="screen quiz">
      <div className="quiz-top">
        <button type="button" className="btn btn-ghost" onClick={back}>
          ← Back
        </button>
        <div className="progress" role="progressbar" aria-valuemin={1} aria-valuemax={3} aria-valuenow={step + 1} aria-label={`Question ${step + 1} of 3`}>
          {steps.map((_, i) => (
            <span key={i} className={i <= step ? "on" : ""} />
          ))}
          <span className="progress-text">{step + 1}/3</span>
        </div>
      </div>
      <h1 className="quiz-prompt" ref={headingRef} tabIndex={-1}>
        {current.prompt}
      </h1>
      <ul className={`options options-${current.key}`}>
        {current.options.map((o) => {
          const selected = draft[current.key] === o.id;
          return (
            <li key={o.id}>
              <button type="button" className={`option${selected ? " selected" : ""}`} aria-pressed={selected} onClick={() => pick(o.id)}>
                <span className="option-text">
                  <span className="option-label">{o.label}</span>
                  {o.hint && <span className="option-hint">{o.hint}</span>}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </main>
  );
}
