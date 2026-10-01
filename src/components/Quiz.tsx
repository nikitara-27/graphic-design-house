import { useEffect, useRef, useState } from "react";
import type { Answers, Interest, Year } from "../types";
import { questions } from "../lib/data";
import { NAME_MAX, cleanName } from "../lib/name";
import { presenceConfig } from "../lib/presence";

interface Props {
  initial?: Partial<Answers>;
  initialName?: string;
  onBack: () => void;
  /** Called when the name step is done, so the name survives a refresh mid-quiz. */
  onName: (name: string) => void;
  onComplete: (a: Answers) => void;
}

const TOTAL = 4; // name + 3 questions
const reducedMotion = () => window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

/** Name first, then one question per screen. Tapping an option auto-advances. */
export function Quiz({ initial = {}, initialName = "", onBack, onName, onComplete }: Props) {
  const [step, setStep] = useState(0);
  const [name, setName] = useState(initialName);
  const [draft, setDraft] = useState<Partial<Answers>>(initial);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const timer = useRef<number>(undefined);

  // The name step focuses its input; question steps focus the heading for screen readers.
  useEffect(() => (step === 0 ? inputRef.current?.focus() : headingRef.current?.focus()), [step]);
  useEffect(() => () => window.clearTimeout(timer.current), []);

  const questionSteps = [
    { key: "year" as const, prompt: questions.year.prompt, options: questions.year.options.map((o) => ({ id: o.id, label: o.label, hint: undefined })) },
    { key: "interest" as const, prompt: questions.interest.prompt, options: questions.interest.options.map((o) => ({ id: o.id, label: o.label, hint: o.hint })) },
    { key: "program" as const, prompt: questions.program.prompt, options: questions.program.options.map((o) => ({ id: o.id, label: o.label, hint: undefined })) },
  ];

  const submitName = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = cleanName(name);
    if (!clean) return;
    setName(clean);
    onName(clean);
    setStep(1);
  };

  const pick = (id: string) => {
    const current = questionSteps[step - 1];
    const next = { ...draft, [current.key]: id } as Partial<Answers>;
    setDraft(next);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => {
      if (step < TOTAL - 1) setStep(step + 1);
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
        <div className="progress" role="progressbar" aria-valuemin={1} aria-valuemax={TOTAL} aria-valuenow={step + 1} aria-label={`Step ${step + 1} of ${TOTAL}`}>
          {Array.from({ length: TOTAL }, (_, i) => (
            <span key={i} className={i <= step ? "on" : ""} />
          ))}
          <span className="progress-text">
            {step + 1}/{TOTAL}
          </span>
        </div>
      </div>

      {step === 0 ? (
        <form className="name-step" onSubmit={submitName}>
          <h1 className="quiz-prompt" id="name-prompt">
            What's your name?
          </h1>
          <input
            ref={inputRef}
            className="name-input"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Your name"
            maxLength={NAME_MAX}
            autoComplete="given-name"
            autoCapitalize="words"
            enterKeyHint="next"
            aria-labelledby="name-prompt"
          />
          {presenceConfig() && (
            <p className="name-note">Others exploring the house at the same time will see your first name, year, and design interest.</p>
          )}
          <button type="submit" className="btn btn-primary" disabled={!cleanName(name)}>
            Next
          </button>
        </form>
      ) : (
        <>
          <h1 className="quiz-prompt" ref={headingRef} tabIndex={-1}>
            {questionSteps[step - 1].prompt}
          </h1>
          <ul className={`options options-${questionSteps[step - 1].key}`}>
            {questionSteps[step - 1].options.map((o) => {
              const selected = draft[questionSteps[step - 1].key] === o.id;
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
        </>
      )}
    </main>
  );
}
