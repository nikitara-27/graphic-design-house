import {
  DataSet,
  RegExpMatcher,
  englishDataset,
  englishRecommendedTransformers,
  parseRawPattern,
} from "obscenity";
import allowlist from "../data/name-allowlist.json";
import blocklist from "../data/name-blocklist.json";
import { NAME_MAX, cleanName } from "./name";

/**
 * Keeps names friendly. Uses the "obscenity" library (English words + its recommended tricks
 * detection: leetspeak, repeated letters, etc.), plus two lists the team can edit:
 *   src/data/name-allowlist.json – real names the library flags by mistake
 *   src/data/name-blocklist.json – extra words the library misses
 */
const dataset = new DataSet<{ originalWord?: string }>().addAll(englishDataset);
for (const word of blocklist.words) {
  dataset.addPhrase((phrase) => phrase.addPattern(parseRawPattern(word.toLowerCase())));
}
const matcher = new RegExpMatcher({ ...dataset.build(), ...englishRecommendedTransformers });
const allowed = new Set(allowlist.names.map((n) => n.toLowerCase()));

/** Letters (any language), numbers, spaces, and - ' . only. */
const ALLOWED_CHARS = /^[\p{L}\p{M}\p{N} '.-]+$/u;

export type NameCheck = "ok" | "empty" | "chars" | "blocked";

/** True if the text contains a blocked word. Also used for the Design Resources board's titles and descriptions. */
export function hasBlockedWords(text: string): boolean {
  const lower = text.toLowerCase();
  // Ignore matches that sit entirely inside an allowlisted word (e.g. the name "Dick").
  const words = [...lower.matchAll(/[\p{L}\p{M}\p{N}'.-]+/gu)].map((m) => ({ text: m[0], start: m.index!, end: m.index! + m[0].length - 1 }));
  const realHit = matcher.getAllMatches(lower).some((match) => {
    const word = words.find((w) => match.startIndex >= w.start && match.endIndex <= w.end);
    return !(word && allowed.has(word.text.replace(/^['.-]+|['.-]+$/g, "")));
  });
  if (realHit) return true;
  // Spaced-out letters ("f u c k"): if most of the name is single characters, check them joined.
  const tokens = lower.split(/[\s'.-]+/).filter(Boolean);
  const singles = tokens.filter((t) => t.length === 1).length;
  if (singles >= 3 && singles >= tokens.length - 1) return matcher.hasMatch(tokens.join(""));
  return false;
}

/** Checks a name before it's used or shown. Normalises curly apostrophes first. */
export function checkName(raw: string): NameCheck {
  const name = cleanName(raw.replace(/[‘’]/g, "'"));
  if (!name) return "empty";
  // Offensive first, so disguised words like "a$$" get the friendly message, not the characters one.
  if (hasBlockedWords(name)) return "blocked";
  if (name.length > NAME_MAX || !ALLOWED_CHARS.test(name)) return "chars";
  return "ok";
}

export const NAME_MESSAGES: Record<Exclude<NameCheck, "ok" | "empty">, string> = {
  blocked: "Let's keep it friendly — please choose a different name.",
  chars: "Please use only letters, numbers, spaces, and - ' .",
};

/** A name that's safe to display: the cleaned name if it passes, otherwise "Guest". */
export function safeName(raw: string): string {
  return checkName(raw) === "ok" ? cleanName(raw.replace(/[‘’]/g, "'")) : "Guest";
}
