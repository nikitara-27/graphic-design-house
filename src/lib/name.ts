export const NAME_MAX = 30;

/** Trim the ends, squeeze repeated spaces, and cap at 30 characters. Returns "" if nothing is left. */
export function cleanName(raw: string): string {
  return raw.replace(/\s+/g, " ").trim().slice(0, NAME_MAX).trim();
}
