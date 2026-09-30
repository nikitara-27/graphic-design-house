import type { Answers, Assignments, Professor } from "../types";

/**
 * Picks the host professor from the team's assignment table:
 * design interest (Q2) + favorite program (Q3) → professor. Falls back to the house host.
 */
export function matchProfessor(answers: Answers, professors: Professor[], assignments: Assignments, fallback: Professor): Professor {
  const id = assignments[answers.interest]?.[answers.program];
  return professors.find((p) => p.id === id) ?? fallback;
}
