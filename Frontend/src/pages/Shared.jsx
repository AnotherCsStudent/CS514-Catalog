import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { usePlanner } from "../state/PlannerContext";
import { decodeSchedule } from "../lib/share";
import { resolveItems, summarize } from "../lib/schedule";
import { formatMeeting } from "../lib/time";
import WeekCalendar from "../components/WeekCalendar";
import { ScheduleStats, UnscheduledList } from "./Schedule";

export default function Shared() {
  const [params] = useSearchParams();
  const { dispatch } = usePlanner();
  const navigate = useNavigate();
  const schedule = decodeSchedule(params.get("s") ?? "");

  if (!schedule) {
    return (
      <div className="card empty-state">
        <h1>This share link doesn’t work</h1>
        <p>
          It may be incomplete. <Link to="/">Go to the planner</Link>.
        </p>
      </div>
    );
  }

  const items = resolveItems(schedule);

  function save() {
    dispatch({ type: "importSchedule", schedule });
    navigate("/schedule");
  }

  return (
    <section>
      <div className="page-heading row">
        <div>
          <p className="eyebrow">Shared schedule</p>
          <h1>{schedule.name}</h1>
        </div>
        <button type="button" className="button button-primary" onClick={save}>
          Save a copy to my schedules
        </button>
      </div>

      <ScheduleStats summary={summarize(items)} />

      <div className="schedule-layout">
        <div className="schedule-calendar">
          <WeekCalendar items={items} />
          <UnscheduledList items={items} />
        </div>
        <ul className="schedule-list">
          {items.map((item, index) => (
            <li key={item.code} className={`schedule-item color-${index % 8}`}>
              <div className="schedule-item-head">
                <span className="swatch" aria-hidden="true" />
                <div className="schedule-item-title">
                  <strong>{item.code}</strong>
                  <span className="muted small">{item.course.course_title}</span>
                </div>
                <span className="muted small">{item.units} u</span>
              </div>
              <p className="muted small">
                {item.section
                  ? `Option ${item.section.section} · ${formatMeeting(item.section)}`
                  : "No section chosen"}
              </p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
