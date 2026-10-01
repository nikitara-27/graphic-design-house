import { useEffect, useId, useRef, useState } from "react";
import {
  CATEGORIES,
  DESC_MAX,
  DRAFT_MESSAGES,
  TITLE_MAX,
  domainOf,
  reportedIds,
  type Category,
  type Draft,
  type Resource,
} from "../lib/resources";
import type { AddResult, BoardStatus } from "../lib/useResources";

interface Props {
  items: Resource[];
  status: BoardStatus;
  canShare: boolean;
  name: string;
  onAdd: (d: Draft) => Promise<AddResult>;
  onReport: (id: string) => Promise<boolean>;
}

type Filter = Category | "All";

/**
 * The Living Room's shared board of design links. Everything people type is rendered as plain
 * text (React escapes it); links only ever open as http(s) in a new tab.
 */
export function ResourceBoard({ items, status, canShare, name, onAdd, onReport }: Props) {
  const [filter, setFilter] = useState<Filter>("All");
  const [adding, setAdding] = useState(false);
  const [thanks, setThanks] = useState(false);
  const shown = filter === "All" ? items : items.filter((r) => r.category === filter);

  if (adding) {
    return (
      <ResourceForm
        name={name}
        initialCategory={filter === "All" ? "" : filter}
        onCancel={() => setAdding(false)}
        onAdd={async (d) => {
          const result = await onAdd(d);
          if (result.ok) {
            setAdding(false);
            setFilter("All");
            setThanks(true);
          }
          return result;
        }}
      />
    );
  }

  return (
    <div className="board">
      <p className="board-intro">Links the house finds useful. Tap a card to open it.</p>

      <button
        type="button"
        className="btn btn-primary board-add"
        onClick={() => {
          setThanks(false);
          setAdding(true);
        }}
        disabled={!canShare}
      >
        + Add a resource
      </button>
      {status === "offline" && <p className="board-status">The board isn't available right now.</p>}
      {status === "error" && <p className="board-status">Couldn't load the board. Please try again later.</p>}
      {thanks && (
        <p className="board-thanks" role="status">
          Thanks! Your resource is on the board.
        </p>
      )}

      <div className="chip-row" role="group" aria-label="Filter by category">
        {(["All", ...CATEGORIES] as Filter[]).map((c) => (
          <button key={c} type="button" className="chip" aria-pressed={filter === c} onClick={() => setFilter(c)}>
            {c}
          </button>
        ))}
      </div>

      {(status === "offline" || status === "error") && items.length === 0 ? null : status === "loading" && items.length === 0 ? (
        <p className="board-empty">Loading…</p>
      ) : shown.length === 0 ? (
        <p className="board-empty">{filter === "All" ? "Nothing here yet. Be the first to share a link!" : `No ${filter} links yet.`}</p>
      ) : (
        <ul className="res-list">
          {shown.map((r) => (
            <ResourceCard key={r.id} resource={r} onReport={onReport} canReport={canShare} />
          ))}
        </ul>
      )}
    </div>
  );
}

const slug = (c: string) => c.toLowerCase().replace(/[^a-z]+/g, "-");

function ResourceCard({ resource: r, onReport, canReport }: { resource: Resource; onReport: (id: string) => Promise<boolean>; canReport: boolean }) {
  const [report, setReport] = useState<"idle" | "confirm" | "sending" | "done" | "failed">(() => (reportedIds().has(r.id) ? "done" : "idle"));
  const domain = domainOf(r.url);
  const send = async () => {
    setReport("sending");
    setReport((await onReport(r.id)) ? "done" : "failed");
  };

  return (
    <li className="res-card">
      <a className="res-link" href={r.url} target="_blank" rel="noopener noreferrer nofollow">
        <span className="res-title">{r.title}</span>
        {r.description && <span className="res-desc">{r.description}</span>}
        <span className="res-meta">
          <span className={`tag res-cat res-cat-${slug(r.category)}`}>{r.category}</span>
          <span className="res-domain">
            {domain} <span aria-hidden="true">↗</span>
          </span>
        </span>
        <span className="sr-only"> (opens in a new tab)</span>
      </a>
      <div className="res-foot">
        <span className="res-by">Shared by {r.sharedBy}</span>
        {canReport &&
          (report === "done" ? (
            <span className="res-reported">Reported. Thanks!</span>
          ) : report === "confirm" || report === "sending" ? (
            <span className="res-confirm">
              Report this link?
              <button type="button" className="link-btn" onClick={send} disabled={report === "sending"}>
                Yes
              </button>
              <button type="button" className="link-btn" onClick={() => setReport("idle")}>
                Cancel
              </button>
            </span>
          ) : (
            <button type="button" className="link-btn res-report" onClick={() => setReport("confirm")} aria-label={`Report ${r.title}`}>
              {report === "failed" ? "Couldn't report. Try again" : "Report"}
            </button>
          ))}
      </div>
    </li>
  );
}

interface FormProps {
  name: string;
  initialCategory: Category | "";
  onCancel: () => void;
  onAdd: (d: Draft) => Promise<AddResult>;
}

function ResourceForm({ name, initialCategory, onCancel, onAdd }: FormProps) {
  const [draft, setDraft] = useState<Draft>({ url: "", title: "", description: "", category: initialCategory });
  const [error, setError] = useState<string>("");
  const [sending, setSending] = useState(false);
  const linkRef = useRef<HTMLInputElement>(null);
  const errorRef = useRef<HTMLParagraphElement>(null);
  const id = useId();
  useEffect(() => linkRef.current?.focus(), []);
  // On phones the message can be below the fold: bring it into view.
  useEffect(() => {
    if (error) errorRef.current?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [error]);

  const set = (k: keyof Draft) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setDraft((d) => ({ ...d, [k]: e.target.value }));
    setError("");
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (sending) return;
    setSending(true);
    const result = await onAdd(draft);
    setSending(false);
    if (!result.ok) setError(DRAFT_MESSAGES[result.error]);
  };

  return (
    <form className="res-form" onSubmit={submit} noValidate>
      <button type="button" className="back-link" onClick={onCancel}>
        ← All resources
      </button>
      <h3 className="res-form-title">Add a resource</h3>

      <label className="field" htmlFor={`${id}-url`}>
        <span className="field-label">Link</span>
        <input
          ref={linkRef}
          id={`${id}-url`}
          className="name-input name-input-sm"
          type="url"
          inputMode="url"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          placeholder="https://"
          value={draft.url}
          onChange={set("url")}
          maxLength={500}
          required
        />
      </label>

      <label className="field" htmlFor={`${id}-title`}>
        <span className="field-label">
          Title <span className="field-count">{draft.title.length}/{TITLE_MAX}</span>
        </span>
        <input
          id={`${id}-title`}
          className="name-input name-input-sm"
          type="text"
          value={draft.title}
          onChange={set("title")}
          maxLength={TITLE_MAX}
          required
        />
      </label>

      <label className="field" htmlFor={`${id}-desc`}>
        <span className="field-label">
          Description <span className="field-optional">(optional)</span>
          <span className="field-count">{draft.description.length}/{DESC_MAX}</span>
        </span>
        <textarea
          id={`${id}-desc`}
          className="name-input name-input-sm res-textarea"
          rows={3}
          value={draft.description}
          onChange={set("description")}
          maxLength={DESC_MAX}
        />
      </label>

      <label className="field" htmlFor={`${id}-cat`}>
        <span className="field-label">Category</span>
        <select id={`${id}-cat`} className="name-input name-input-sm res-select" value={draft.category} onChange={set("category")} required>
          <option value="" disabled>
            Choose a category
          </option>
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </label>

      <p className="name-note">
        Shared by <strong>{name || "Guest"}</strong>. Everyone in the house will see it.
      </p>

      {error && (
        <p className="name-error" role="alert" ref={errorRef}>
          {error}
        </p>
      )}

      <div className="res-form-actions">
        <button type="button" className="btn" onClick={onCancel}>
          Cancel
        </button>
        <button type="submit" className="btn btn-primary" disabled={sending}>
          {sending ? "Sharing…" : "Share"}
        </button>
      </div>
    </form>
  );
}
