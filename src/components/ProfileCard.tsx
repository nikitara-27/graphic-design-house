import { useEffect, useRef, useState } from "react";
import type { Answers, Professor } from "../types";
import { interestOption, programOption, yearOption } from "../lib/data";
import { NAME_MAX, cleanName } from "../lib/name";
import { NAME_MESSAGES, checkName } from "../lib/nameFilter";
import { Avatar } from "./Avatar";

interface Props {
  answers: Answers;
  professor: Professor;
  name: string;
  /** When given, the card shows an "Edit name" option. */
  onSaveName?: (name: string) => void;
  /**
   * "reveal" (after the quiz): introduces the host professor by name and specialties.
   * "profile" (the Your profile panel): the user's name is the heading; the host is a row below.
   */
  variant?: "reveal" | "profile";
}

export function ProfileCard({ answers, professor, name, onSaveName, variant = "reveal" }: Props) {
  const isHost = professor.id === "host";
  const specialties = professor.specialties.map((s) => interestOption(s)?.label).filter(Boolean);
  const isProfile = variant === "profile";

  return (
    <div className="profile-card">
      <div className="profile-avatar">
        <Avatar professor={professor} size="lg" />
      </div>
      {isProfile ? (
        <NameHeading name={name} onSave={onSaveName} />
      ) : (
        <>
          <p className="eyebrow">Your host professor</p>
          <h2 className="profile-name">{professor.name}</h2>
          {specialties.length > 0 && <p className="profile-specialty">{specialties.join(" · ")}</p>}
        </>
      )}
      {professor.bio && <p className="profile-bio">{professor.bio}</p>}
      {isHost && <p className="note">We couldn't find a host for that combination, so the house host will show you around.</p>}
      <dl className="profile-facts">
        {isProfile ? (
          <div>
            <dt>Professor</dt>
            <dd>{professor.name}</dd>
          </div>
        ) : (
          <div>
            <dt>Name</dt>
            <dd>{name || "—"}</dd>
          </div>
        )}
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

/** The user's name as the card's big heading, with "Edit name" underneath. */
function NameHeading({ name, onSave }: { name: string; onSave?: (name: string) => void }) {
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
    const check = checkName(value);
    const clean = cleanName(value.replace(/[\u2018\u2019]/g, "'"));
    return (
      <form
        className="name-edit"
        onSubmit={(e) => {
          e.preventDefault();
          if (check !== "ok") return;
          onSave(clean);
          setEditing(false);
        }}
      >
        <label htmlFor="edit-name" className="sr-only">
          Your name
        </label>
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
          placeholder="Your name or nickname"
          aria-invalid={check === "blocked" || check === "chars"}
          onKeyDown={(e) => {
            if (e.key !== "Escape") return;
            // Cancel the edit without closing the whole panel.
            e.preventDefault();
            e.stopPropagation();
            setEditing(false);
          }}
        />
        {(check === "blocked" || check === "chars") && (
          <p className="name-error" role="alert">
            {NAME_MESSAGES[check]}
          </p>
        )}
        <p className="name-note">
          This site is public. Your name will be visible to others in the house, so feel free to use a nickname.
        </p>
        <div className="name-edit-actions">
          <button type="button" className="btn btn-sm" onClick={() => setEditing(false)}>
            Cancel
          </button>
          <button type="submit" className="btn btn-sm btn-primary" disabled={check !== "ok"}>
            Save
          </button>
        </div>
      </form>
    );
  }

  return (
    <div className="profile-who">
      <h3 className="profile-name">{name || "Guest"}</h3>
      {onSave && (
        <button
          ref={editRef}
          type="button"
          className="edit-name-btn"
          aria-label="Edit name"
          title="Edit name"
          onClick={() => {
            setValue(name);
            setEditing(true);
          }}
        >
          <PencilIcon />
        </button>
      )}
    </div>
  );
}

// Pixel pencil, drawn row by row: # = solid, + = light (the metal band and the wooden cone).
const PENCIL_ROWS = [
  ".........###.",
  "........####.",
  ".......++++..",
  "......#..#...",
  ".....#..#....",
  "....#..#.....",
  "...#..#......",
  "..####.......",
  ".+++.........",
  ".++..........",
  "##...........",
];

function PencilIcon() {
  return (
    <svg viewBox="0 0 13 11" width="26" height="22" aria-hidden="true" shapeRendering="crispEdges">
      {PENCIL_ROWS.flatMap((row, y) =>
        [...row].map((c, x) =>
          c === "." ? null : <rect key={`${x}-${y}`} x={x} y={y} width="1" height="1" fill="currentColor" opacity={c === "+" ? 0.45 : 1} />,
        ),
      )}
    </svg>
  );
}
