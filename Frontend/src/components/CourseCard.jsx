import { usePlanner } from "../state/PlannerContext";
import { sectionsByCourse } from "../data/sections";
import { describeGroup } from "../lib/prereqs";
import { formatMeetingTime } from "../lib/time";
import EligibilityBadge from "./EligibilityBadge";

function PrereqChecklist({ code }) {
  const { eligibility } = usePlanner();
  const { missing, notes, alternative } = eligibility(code);

  return (
    <>
      {missing.length > 0 && (
        <div className="callout callout-warning">
          <strong>
            {missing.every((group) => group.concurrent)
              ? "Take at the same time (or before):"
              : "Still needed:"}
          </strong>
          <ul>
            {missing.map((group) => (
              <li key={group.anyOf.join()}>{describeGroup(group)}</li>
            ))}
          </ul>
          {alternative && <p className="small">Or: {alternative}</p>}
        </div>
      )}
      {notes.length > 0 && (
        <ul className="note-list">
          {notes.map((note) => (
            <li key={note}>{note}</li>
          ))}
        </ul>
      )}
    </>
  );
}

function SectionTable({ code, inSchedule, selectedId }) {
  const { dispatch, conflictsFor } = usePlanner();
  const sections = sectionsByCourse[code] ?? [];

  if (!sections.length) {
    return <p className="muted small">No sections in this term's schedule.</p>;
  }

  function choose(section) {
    if (!inSchedule) dispatch({ type: "addCourse", code });
    dispatch({ type: "setSection", code, sectionId: section.id });
  }

  return (
    <div className="table-wrap">
      <table className="section-table">
        <thead>
          <tr>
            <th scope="col">Opt</th>
            <th scope="col">Class</th>
            <th scope="col">When</th>
            <th scope="col">Where · Instructor</th>
            <th scope="col">Seats</th>
            <th scope="col">
              <span className="sr-only">Action</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {sections.map((section) => {
            const clashes = conflictsFor(section);
            const selected = section.id === selectedId;
            return (
              <tr key={section.id} className={selected ? "selected" : ""}>
                <td>{section.section}</td>
                <td>
                  {section.classes.map((entry) => (
                    <span key={entry.classNbr} className="block">
                      {entry.component} #{entry.classNbr}
                    </span>
                  ))}
                </td>
                <td>
                  {section.classes.map((entry) => (
                    <span key={entry.classNbr} className="block">
                      {entry.meetings.length
                        ? entry.meetings.map(formatMeetingTime).join(", ")
                        : entry.scheduleText || "TBA"}
                    </span>
                  ))}
                  {clashes.length > 0 && (
                    <span className="clash-inline">
                      Conflicts with {clashes.join(", ")}
                    </span>
                  )}
                </td>
                <td>
                  {section.classes.map((entry) => (
                    <span key={entry.classNbr} className="block">
                      {entry.room} · {entry.instructor}
                    </span>
                  ))}
                  <span className="muted small block">{section.modality}</span>
                </td>
                <td className={section.seatsOpen ? "" : "warning-text"}>
                  {section.seatsOpen
                    ? `${section.seatsOpen}/${section.seatsTotal}`
                    : section.status}
                </td>
                <td>
                  {selected ? (
                    <span className="badge badge-met">Selected</span>
                  ) : (
                    <button
                      type="button"
                      className="button button-ghost button-sm"
                      onClick={() => choose(section)}
                    >
                      {inSchedule ? "Choose" : "Add"}
                    </button>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export default function CourseCard({ course, matchingSections }) {
  const { dispatch, items, completed, eligibility } = usePlanner();
  const code = course.course_code;
  const item = items.find((entry) => entry.code === code);
  const isCompleted = completed.has(code);
  const { status } = eligibility(code);
  const sections = sectionsByCourse[code] ?? [];
  const openSections = sections.filter((section) => section.seatsOpen > 0);

  return (
    <article className={`course-card ${item ? "in-schedule" : ""}`}>
      <div className="course-card-main">
        <div className="course-card-top">
          <span className="course-code">{code}</span>
          <span className="badge">
            {course.units} {course.units === "1" ? "unit" : "units"}
          </span>
          <EligibilityBadge status={status} completed={isCompleted} />
        </div>

        <h2>{course.course_title}</h2>
        <p className="muted small">
          {course.group ?? course.subjectName}
          {course.career === "Graduate" && " · Graduate"}
          {" · "}
          {sections.length
            ? `${sections.length} section${sections.length > 1 ? "s" : ""}, ${openSections.length} with open seats`
            : "Not offered this term"}
          {matchingSections != null &&
            matchingSections < sections.length &&
            ` · ${matchingSections} match your filters`}
        </p>
      </div>

      <div className="course-card-actions">
        <button
          type="button"
          className={`button ${item ? "button-secondary" : "button-primary"}`}
          aria-pressed={Boolean(item)}
          onClick={() =>
            dispatch({ type: item ? "removeCourse" : "addCourse", code })
          }
        >
          {item ? "Remove" : "Add to schedule"}
        </button>
        <button
          type="button"
          className="button button-ghost button-sm"
          aria-pressed={isCompleted}
          onClick={() => dispatch({ type: "toggleCompleted", code })}
        >
          {isCompleted ? "Unmark completed" : "Mark completed"}
        </button>
      </div>

      <details className="course-details">
        <summary>
          Details, prerequisites & sections
          <span className="sr-only"> for {code}</span>
        </summary>

        <div className="course-details-body">
          <h3>Description</h3>
          <p>{course.description || "No description provided in the dataset."}</p>

          <h3>Prerequisites</h3>
          <p>
            {course.prerequisites ||
              (course.group
                ? "No prerequisite information provided in the dataset."
                : "We only have prerequisite data for CS curriculum courses. Check the SDSU catalog.")}
          </p>
          <PrereqChecklist code={code} />

          <h3>Sections</h3>
          <SectionTable
            code={code}
            inSchedule={Boolean(item)}
            selectedId={item?.sectionId}
          />

          {course.catalog_url && (
            <a href={course.catalog_url} target="_blank" rel="noopener noreferrer">
              View catalog entry ↗
            </a>
          )}
        </div>
      </details>
    </article>
  );
}
