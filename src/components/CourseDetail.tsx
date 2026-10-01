import type { Answers, Course, Room } from "../types";
import { professors } from "../lib/data";

const TERM = { F: "Fall", S: "Spring" } as const;

/**
 * One class's details. Shows only what the course data has: classes without details
 * just show their code, title, and term.
 */
export function CourseDetail({ course, answers }: { course: Course; room: Room; answers: Answers }) {
  const teacher = professors.find((p) => p.courses.includes(course.id));
  const match = course.active && course.interests.includes(answers.interest);
  const facts = [
    course.term && { label: "Term", value: TERM[course.term] },
    course.credits !== undefined && { label: "Credits", value: course.credits === "varies" ? "Vary" : String(course.credits) },
    course.prerequisites && { label: "Prerequisites", value: course.prerequisites },
    teacher && { label: "Professor", value: teacher.name },
  ].filter(Boolean) as { label: string; value: string }[];

  return (
    <article className="course-detail">
      <h3 className="course-heading">
        <span className="course-code">{course.code}</span>
        <span className="course-title">{course.title}</span>
      </h3>

      {(!course.active || match) && (
        <div className="chips">
          {!course.active && <span className="tag tag-inactive">Not currently offered</span>}
          {match && <span className="tag tag-match">★ Matches your interest</span>}
        </div>
      )}

      {facts.length > 0 && (
        <dl className="facts">
          {facts.map((f) => (
            <div key={f.label}>
              <dt>{f.label}</dt>
              <dd>{f.value}</dd>
            </div>
          ))}
        </dl>
      )}

      {course.description && <p className="course-desc">{course.description}</p>}

      {course.hubAreas && course.hubAreas.length > 0 && (
        <section className="course-hub" aria-label="BU Hub areas">
          <h4>BU Hub</h4>
          <ul>
            {course.hubAreas.map((h) => (
              <li key={h} className="tag tag-hub">{h}</li>
            ))}
          </ul>
        </section>
      )}

      {course.note && <p className="course-note">{course.note}</p>}
    </article>
  );
}
