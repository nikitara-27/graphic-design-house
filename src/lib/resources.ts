import { hasBlockedWords, safeName } from "./nameFilter";

/**
 * The Living Room's shared "Design Resources" board. Rows live in Supabase (table `resources`,
 * set up by supabase/resources.sql); this file holds the rules both sides agree on.
 */

export const CATEGORIES = ["Typography", "Motion Graphics", "UI/UX", "Media", "Other"] as const;
export type Category = (typeof CATEGORIES)[number];

export const TITLE_MAX = 60;
export const DESC_MAX = 140;
const URL_MAX = 500;
export const HOURLY_LIMIT = 5;
const HOUR_MS = 60 * 60 * 1000;

export interface Resource {
  id: string;
  url: string;
  title: string;
  description: string;
  category: Category;
  sharedBy: string;
  createdAt: string;
}

/** Columns the site reads. Never `*`, so nothing else is ever pulled into the page. */
export const COLUMNS = "id,url,title,description,category,shared_by,created_at";

const isCategory = (c: unknown): c is Category => typeof c === "string" && (CATEGORIES as readonly string[]).includes(c);
const oneLine = (s: string) => s.replace(/\s+/g, " ").trim();

/** A link people can open: http(s) only, a real-looking host, no spaces. */
export function parseLink(raw: string): URL | null {
  const text = raw.trim();
  if (!/^https?:\/\//i.test(text) || /\s/.test(text) || text.length > URL_MAX) return null;
  try {
    const u = new URL(text);
    if (u.protocol !== "http:" && u.protocol !== "https:") return null;
    if (!u.hostname.includes(".") || u.username || u.password) return null;
    return u;
  } catch {
    return null;
  }
}

/** The link as saved: no #fragment, no trailing slash. */
export function normalizeLink(u: URL): string {
  const copy = new URL(u.href);
  copy.hash = "";
  return copy.href.replace(/\/+$/, "");
}

/** Same rule as the database's unique index: ignores http/https, "www." and a trailing slash. */
export function linkKey(url: string): string {
  return url.replace(/^https?:\/\/(www\.)?/i, "").replace(/\/+$/, "").toLowerCase();
}

/** "fonts.google.com" from a full link (without "www."). */
export function domainOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

/**
 * Rows come from strangers' browsers (via the database): accept only well-formed ones, show
 * names that fail the filter as "Guest", and drop cards whose text fails it.
 */
export function toResource(raw: unknown): Resource | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  if (r.hidden === true) return null;
  if (typeof r.id !== "string" || typeof r.url !== "string" || typeof r.title !== "string") return null;
  const link = parseLink(r.url);
  if (!link) return null;
  const title = oneLine(r.title).slice(0, TITLE_MAX);
  const description = typeof r.description === "string" ? oneLine(r.description).slice(0, DESC_MAX) : "";
  if (!title || hasBlockedWords(title) || hasBlockedWords(description) || hasBlockedWords(link.hostname)) return null;
  return {
    id: r.id,
    url: link.href,
    title,
    description,
    category: isCategory(r.category) ? r.category : "Other",
    sharedBy: typeof r.shared_by === "string" ? safeName(r.shared_by) : "Guest",
    createdAt: typeof r.created_at === "string" ? r.created_at : "",
  };
}

export const newestFirst = (list: Resource[]) => [...list].sort((a, b) => b.createdAt.localeCompare(a.createdAt));


export interface Draft { url: string; title: string; description: string; category: Category | "" }
export type DraftError = "url" | "title" | "description" | "category" | "blocked" | "duplicate" | "rate";

export const DRAFT_MESSAGES: Record<DraftError | "busy" | "network", string> = {
  url: "Please paste a full link that starts with http:// or https://.",
  title: `Please add a title (up to ${TITLE_MAX} characters).`,
  description: `Please keep the description to ${DESC_MAX} characters.`,
  category: "Please pick a category.",
  blocked: "Let's keep it friendly — please reword that.",
  duplicate: "That link is already on the board.",
  rate: `You can share up to ${HOURLY_LIMIT} resources an hour. Please try again a little later.`,
  busy: "The board is very busy right now. Please try again later.",
  network: "Couldn't share that right now. Please try again.",
};

/** The row to save, or the first problem with the form. */
export function checkDraft(
  d: Draft,
  existing: Resource[],
  recentPosts: number,
): { ok: true; url: string; title: string; description: string; category: Category } | { ok: false; error: DraftError } {
  const link = parseLink(d.url);
  if (!link) return { ok: false, error: "url" };
  const title = oneLine(d.title);
  if (!title || title.length > TITLE_MAX) return { ok: false, error: "title" };
  const description = oneLine(d.description);
  if (description.length > DESC_MAX) return { ok: false, error: "description" };
  if (!isCategory(d.category)) return { ok: false, error: "category" };
  if (hasBlockedWords(title) || hasBlockedWords(description) || hasBlockedWords(link.hostname)) return { ok: false, error: "blocked" };
  const url = normalizeLink(link);
  if (existing.some((r) => linkKey(r.url) === linkKey(url))) return { ok: false, error: "duplicate" };
  if (recentPosts >= HOURLY_LIMIT) return { ok: false, error: "rate" };
  return { ok: true, url, title, description, category: d.category };
}

// ---- This browser's own bookkeeping (localStorage; every access may throw) ----

const POSTS_KEY = "gd-house:resource-posts";
const REPORTED_KEY = "gd-house:resource-reports";
const SUBMITTER_KEY = "gd-house:submitter";

function readList(key: string): unknown[] {
  try {
    const v = JSON.parse(localStorage.getItem(key) ?? "[]");
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
}
function writeList(key: string, list: unknown[]) {
  try {
    localStorage.setItem(key, JSON.stringify(list));
  } catch {
    /* works without storage */
  }
}

/** How many resources this browser shared in the last hour. */
export function recentPostCount(now = Date.now()): number {
  return readList(POSTS_KEY).filter((t) => typeof t === "number" && now - t < HOUR_MS).length;
}
export function recordPost(now = Date.now()) {
  const recent = readList(POSTS_KEY).filter((t): t is number => typeof t === "number" && now - t < HOUR_MS);
  writeList(POSTS_KEY, [...recent, now]);
}

export function reportedIds(): Set<string> {
  return new Set(readList(REPORTED_KEY).filter((x): x is string => typeof x === "string"));
}
export function recordReport(id: string) {
  writeList(REPORTED_KEY, [...reportedIds(), id].slice(-200));
}

const randomId = () => (crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`);

/** Random id for this browser, used only for the database's hourly limit (never shown). */
export function submitterId(): string {
  try {
    const existing = localStorage.getItem(SUBMITTER_KEY);
    if (existing) return existing;
    const id = randomId();
    localStorage.setItem(SUBMITTER_KEY, id);
    return id;
  } catch {
    return randomId();
  }
}

export { randomId as newResourceId };
