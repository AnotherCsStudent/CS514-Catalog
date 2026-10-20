import { useState } from "react";
import { usePlanner } from "../state/PlannerContext";
import { resolveItems, summarize } from "../lib/schedule";
import { formatTime } from "../lib/time";
import WeekCalendar from "../components/WeekCalendar";

const ROWS = [
  ["Courses", (s) => s.courses],
  ["Units", (s) => s.units],
  ["Time conflicts", (s) => s.conflicts],
  ["Courses without a section", (s) => s.unscheduled],
  ["Days on campus", (s) => s.campusDays],
  ["Earliest class", (s) => (s.earliest == null ? "—" : formatTime(s.earliest))],
  ["Latest class ends", (s) => (s.latest == null ? "—" : formatTime(s.latest))],
  ["Online / no set time", (s) => s.online],
];

export default function Compare() {
  const { state, dispatch } = usePlanner();
  const { schedules } = state;
  const [leftId, setLeftId] = useState(null);
  const [rightId, setRightId] = useState(null);

  if (schedules.length < 2) {
    return (
      <section>
        <div className="page-heading">
          <h1>Compare schedules</h1>
          <p className="lede">
            Build two or more plans to compare them side by side.
          </p>
        </div>
        <div className="card empty-state">
          <h2>You only have one schedule</h2>
          <p>Duplicate it, then swap a few sections or courses.</p>
          <button
            type="button"
            className="button button-primary"
            onClick={() =>
              dispatch({ type: "duplicateSchedule", id: schedules[0].id })
            }
          >
            Duplicate “{schedules[0].name}”
          </button>
        </div>
      </section>
    );
  }

  // Default to the first two schedules until the user picks.
  const picks = [leftId, rightId].map(
    (id, index) =>
      schedules.find((schedule) => schedule.id === id) ?? schedules[index]
  );
  const resolved = picks.map((schedule) => resolveItems(schedule));
  const summaries = resolved.map(summarize);

  return (
    <section>
      <div className="page-heading">
        <h1>Compare schedules</h1>
        <p className="lede">See how your plans stack up before you register.</p>
      </div>

      <div className="compare-pickers">
        {[setLeftId, setRightId].map((setValue, index) => (
          <label key={index}>
            {index === 0 ? "Schedule A" : "Schedule B"}
            <select value={picks[index].id} onChange={(event) => setValue(event.target.value)}>
              {schedules.map((schedule) => (
                <option key={schedule.id} value={schedule.id}>
                  {schedule.name}
                </option>
              ))}
            </select>
          </label>
        ))}
      </div>

      <div className="table-wrap card">
        <table className="compare-table">
          <thead>
            <tr>
              <th scope="col">
                <span className="sr-only">Metric</span>
              </th>
              {picks.map((schedule, index) => (
                <th key={index} scope="col">
                  {schedule.name}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {ROWS.map(([label, read]) => (
              <tr key={label}>
                <th scope="row">{label}</th>
                {summaries.map((summary, index) => (
                  <td key={index}>{read(summary)}</td>
                ))}
              </tr>
            ))}
            <tr>
              <th scope="row">Course list</th>
              {resolved.map((items, index) => (
                <td key={index}>
                  {items.map((item) => item.code).join(", ") || "—"}
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>

      <div className="compare-calendars">
        {picks.map((schedule, index) => (
          <div key={index} className="card">
            <h2>{schedule.name}</h2>
            <WeekCalendar items={resolved[index]} compact />
          </div>
        ))}
      </div>
    </section>
  );
}
