import { useState } from "react";
import { Link } from "react-router-dom";
import { courseByCode, courses, curriculum, requirementGroups } from "../data/courses";
import { usePlanner } from "../state/PlannerContext";
import { canTake } from "../lib/prereqs";

const normalizeCode = (text) =>
  text.trim().toUpperCase().replace(/\s+/g, " ").replace(/^([A-Z ]+?)\s?(\d)/, "$1 $2");

export default function Progress() {
  const { state, dispatch, completed, eligibility } = usePlanner();
  const [other, setOther] = useState("");

  const outsideCatalog = state.completed.filter((code) => !curriculum[code]);
  const unitsDone = state.completed.reduce(
    (sum, code) => sum + (courseByCode[code]?.unitsMin ?? 0),
    0
  );
  // Eligibility is only known for CS curriculum courses.
  const available = courses.filter((course) => {
    if (!course.group) return false;
    const { status } = eligibility(course.course_code);
    return !completed.has(course.course_code) && canTake(status);
  });

  function addOther(event) {
    event.preventDefault();
    const code = normalizeCode(other);
    if (code) dispatch({ type: "addCompleted", code });
    setOther("");
  }

  return (
    <section>
      <div className="page-heading">
        <h1>My courses</h1>
        <p className="lede">
          Check off what you’ve completed. The planner uses this to show which
          courses you’re eligible for.
        </p>
      </div>

      <dl className="stats">
        <div className="stat">
          <dt>Completed</dt>
          <dd>{state.completed.length}</dd>
        </div>
        <div className="stat">
          <dt>Catalog units completed</dt>
          <dd>{unitsDone}</dd>
        </div>
        <div className="stat">
          <dt>Eligible to take</dt>
          <dd>{available.length}</dd>
        </div>
      </dl>

      <div className="card">
        <div className="card-head">
          <h2>CS courses you can take next</h2>
          <Link to="/?eligible=1&hideDone=1" className="button button-primary button-sm">
            Browse eligible courses
          </Link>
        </div>
        <p className="chip-list">
          {available.map((course) => (
            <span key={course.course_code} className="chip static">
              {course.course_code}
            </span>
          ))}
        </p>
      </div>

      <div className="card">
        <h2>Other completed courses</h2>
        <p className="muted small">
          Add courses outside the CS curriculum by code, e.g. MATH 141 or
          STAT 119. Some CS prerequisites come from other departments.
        </p>
        <form className="inline-form" onSubmit={addOther}>
          <input
            aria-label="Course code"
            list="all-course-codes"
            placeholder="e.g. MATH 141"
            value={other}
            onChange={(event) => setOther(event.target.value)}
          />
          <button type="submit" className="button button-secondary">
            Add
          </button>
          <datalist id="all-course-codes">
            {courses.map((course) => (
              <option key={course.course_code} value={course.course_code}>
                {course.course_title}
              </option>
            ))}
          </datalist>
        </form>
        {outsideCatalog.length > 0 && (
          <p className="chip-list">
            {outsideCatalog.map((code) => (
              <button
                key={code}
                type="button"
                className="chip removable"
                aria-label={`Remove ${code}`}
                onClick={() => dispatch({ type: "toggleCompleted", code })}
              >
                {code}
                {courseByCode[code] && ` · ${courseByCode[code].course_title}`} ×
              </button>
            ))}
          </p>
        )}
      </div>

      <div className="progress-groups">
        {requirementGroups.map((group) => {
          const groupCourses = courses.filter((course) => course.group === group);
          const done = groupCourses.filter((course) =>
            completed.has(course.course_code)
          ).length;
          return (
            <fieldset key={group} className="card progress-group">
              <legend>
                {group}
                <span className="muted small">
                  {" "}
                  {done}/{groupCourses.length}
                </span>
              </legend>
              {groupCourses.map((course) => (
                <label key={course.course_code} className="check">
                  <input
                    type="checkbox"
                    checked={completed.has(course.course_code)}
                    onChange={() =>
                      dispatch({ type: "toggleCompleted", code: course.course_code })
                    }
                  />
                  <span>
                    <strong>{course.course_code}</strong>{" "}
                    <span className="muted">{course.course_title}</span>
                  </span>
                </label>
              ))}
            </fieldset>
          );
        })}
      </div>
    </section>
  );
}
