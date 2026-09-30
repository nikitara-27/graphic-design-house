import type { Answers, Course, Room } from "../types";
import { interestOption, professors } from "../lib/data";

const TERM = { F: "Fall", S: "Spring" } as const;

export function CourseDetail({ course, room, answers }: { course: Course; room: Room; answers: Answers }) {
  const teacher = professors.find((p) => p.courses.includes(course.id));
  const match = course.active && course.interests.includes(answers.interest);
  return (
    <div className="course-detail">
      <p className="course-code">{course.code}</p>
      <p className="course-title">{course.title}</p>
      <div className="chips">
        {!course.active && <span className="tag tag-inactive">Not currently offered</span>}
        {match && <span className="tag tag-match">★ Matches your interest</span>}
        {course.interests.map((i) => (
          <span key={i} className="tag">{interestOption(i)?.label}</span>
        ))}
      </div>
      <dl className="facts">
        {course.term && <div><dt>Term</dt><dd>{TERM[course.term]}</dd></div>}
        <div><dt>Room</dt><dd>{room.name} · {room.subtitle}</dd></div>
        <div><dt>Professor</dt><dd>{teacher ? teacher.name : "To be announced"}</dd></div>
      </dl>
      <p className="course-desc">{course.description || "Course description coming soon."}</p>
    </div>
  );
}
