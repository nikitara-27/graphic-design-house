import { useEffect, useRef, useState } from "react";
import type { Answers, Professor } from "../types";
import { interestOption, programOption, yearOption } from "../lib/data";
import { NAME_MAX, cleanName } from "../lib/name";
import { Avatar } from "./Avatar";

interface Props {
  answers: Answers;
  professor: Professor;
  name: string;
  /** When given, the card shows an "Edit name" option. */
  onSaveName?: (name: string) => void;
}

export function ProfileCard({ answers, professor, name, onSaveName }: Props) {
  const isHost = professor.id === "host";
  const specialties = professor.specialties.map((s) => interestOption(s)?.label).filter(Boolean);

  return (
    <div className="profile-card">
      <div className="profile-avatar">
        <Avatar professor={professor} size="lg" />
      </div>
      <p className="eyebrow">Your host professor</p>
      <h2 className="profile-name">{professor.name}</h2>
      {specialties.length > 0 && <p className="profile-specialty">{specialties.join(" · ")}</p>}
      {professor.bio && <p className="profile-bio">{professor.bio}</p>}
      {isHost && <p className="note">We couldn't find a host for that combination, so the house host will show you around.</p>}
      <dl className="profile-facts">
        <NameRow name={name} onSave={onSaveName} />
        <div>
          <dt>Year</dt>
          <dd>{yearOption(answers.year)?.label}</dd>
        </div>
        <div>
          <dt>Into</dt>
          <dd>{interestOption(answers.interest)?.label}</dd>
        </div>
        <div>
          <dt>Favorite program</dt>
          <dd>{programOption(answers.program)?.label}</dd>
        </div>
      </dl>
    </div>
  );
}

function NameRow({ name, onSave }: { name: string; onSave?: (name: string) => void }) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(name);
  const inputRef = useRef<HTMLInputElement>(null);
  const editRef = useRef<HTMLButtonElement>(null);
  const wasEditing = useRef(false);

  // Focus the input when editing starts, and return focus to "Edit name" when it ends.
  useEffect(() => {
    if (editing) inputRef.current?.select();
    else if (wasEditing.current) editRef.current?.focus();
    wasEditing.current = editing;
  }, [editing]);

  if (editing && onSave) {
    const clean = cleanName(value);
    return (
      <div className="name-edit-row">
        <dt>
          <label htmlFor="edit-name">Name</label>
        </dt>
        <dd>
          <form
            className="name-edit"
            onSubmit={(e) => {
              e.preventDefault();
              if (!clean) return;
              onSave(clean);
              setEditing(false);
            }}
          >
            <input
              id="edit-name"
              ref={inputRef}
              className="name-input name-input-sm"
              type="text"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              maxLength={NAME_MAX}
              autoComplete="given-name"
              autoCapitalize="words"
              placeholder="Your name"
              onKeyDown={(e) => {
                if (e.key !== "Escape") return;
                // Cancel the edit without closing the whole panel.
                e.preventDefault();
                e.stopPropagation();
                setEditing(false);
              }}
            />
            <div className="name-edit-actions">
              <button type="button" className="btn btn-sm" onClick={() => setEditing(false)}>
                Cancel
              </button>
              <button type="submit" className="btn btn-sm btn-primary" disabled={!clean}>
                Save
              </button>
            </div>
          </form>
        </dd>
      </div>
    );
  }

  return (
    <div>
      <dt>Name</dt>
      <dd className="name-value">
        {name || "—"}
        {onSave && (
          <button
            ref={editRef}
            type="button"
            className="link-btn"
            onClick={() => {
              setValue(name);
              setEditing(true);
            }}
          >
            Edit name
          </button>
        )}
      </dd>
    </div>
  );
}
