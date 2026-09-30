import type { Answers } from "../types";

const KEY = "gd-house:v1";

export interface Saved { answers: Answers; professorId: string }

// localStorage is a convenience only: every access can throw (private mode, blocked storage).
export function loadSaved(): Saved | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const s = JSON.parse(raw) as Saved;
    if (!s?.answers?.year || !s.answers.interest || !s.answers.program || !s.professorId) return null;
    return s;
  } catch {
    return null;
  }
}

export function save(s: Saved) {
  try {
    localStorage.setItem(KEY, JSON.stringify(s));
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
