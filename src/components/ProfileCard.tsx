import type { Answers, Professor } from "../types";
import { interestOption, programOption, yearOption } from "../lib/data";
import { Avatar } from "./Avatar";

export function ProfileCard({ answers, professor }: { answers: Answers; professor: Professor }) {
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
