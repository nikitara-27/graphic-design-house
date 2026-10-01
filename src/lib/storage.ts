import type { Answers } from "../types";
import { questions } from "./data";

// localStorage is a convenience only: every access can throw (private mode, blocked storage),
// so each one is wrapped and the app carries on without it.
const KEY = "gd-house:answers";
const OLD_KEYS = ["gd-house:v1"];

/** Saved quiz answers, if any. The host professor is never stored; it's recalculated from these. */
export function loadAnswers(): Answers | null {
  try {
    const a = JSON.parse(localStorage.getItem(KEY) ?? "null") as Answers | null;
    const valid =
      a &&
      questions.year.options.some((o) => o.id === a.year) &&
      questions.interest.options.some((o) => o.id === a.interest) &&
      questions.program.options.some((o) => o.id === a.program);
    return valid ? { year: a.year, interest: a.interest, program: a.program } : null;
  } catch {
    return null;
  }
}

export function saveAnswers(a: Answers) {
  try {
    localStorage.setItem(KEY, JSON.stringify(a));
  } catch {
    /* app works without storage */
  }
}

export function clearAnswers() {
  try {
    localStorage.removeItem(KEY);
    for (const k of OLD_KEYS) localStorage.removeItem(k);
  } catch {
    /* app works without storage */
  }
}

/** Small one-off UI flags (e.g. "hint seen"). */
export function loadFlag(name: string): boolean {
  try {
    return localStorage.getItem(`gd-house:${name}`) === "1";
  } catch {
    return false;
  }
}

export function saveFlag(name: string) {
  try {
    localStorage.setItem(`gd-house:${name}`, "1");
  } catch {
    /* app works without storage */
  }
}
