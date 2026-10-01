import type { Answers } from "../types";
import { questions } from "./data";
import { cleanName } from "./name";
import { checkName } from "./nameFilter";

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

// The name lives under its own key so "Retake quiz" can clear the answers but keep the name.
// It's only ever stored in this browser; nothing is sent anywhere.
const NAME_KEY = "gd-house:name";

export function loadName(): string {
  try {
    const raw = localStorage.getItem(NAME_KEY);
    return typeof raw === "string" && checkName(raw) === "ok" ? cleanName(raw) : "";
  } catch {
    return "";
  }
}

export function saveName(name: string) {
  try {
    localStorage.setItem(NAME_KEY, cleanName(name));
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
