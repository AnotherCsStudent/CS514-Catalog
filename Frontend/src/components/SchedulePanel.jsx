import { useState } from "react";
import { Link } from "react-router-dom";
import { usePlanner } from "../state/PlannerContext";
import { totalUnits } from "../lib/schedule";
import ScheduleSwitcher from "./ScheduleSwitcher";
import SectionSelect from "./SectionSelect";
import UnitMeter from "./UnitMeter";
import WeekCalendar from "./WeekCalendar";

export function ScheduleItemRow({ item, index }) {
  const { dispatch, conflictCodes, eligibility, completed } = usePlanner();
  const { status } = eligibility(item.code);
  const { unitsMin, unitsMax } = item.course;

  return (
    <li className={`schedule-item color-${index % 8}`}>
      <div className="schedule-item-head">
        <span className="swatch" aria-hidden="true" />
        <div className="schedule-item-title">
          <strong>{item.code}</strong>
          <span className="muted small">{item.course.course_title}</span>
        </div>
        {unitsMax > unitsMin ? (
          <select
            className="units-select"
            aria-label={`Units for ${item.code}`}
            value={item.units}
            onChange={(event) =>
              dispatch({
                type: "setUnits",
                code: item.code,
                units: Number(event.target.value),
              })
            }
          >
            {Array.from({ length: unitsMax - unitsMin + 1 }, (_, i) => (
              <option key={i} value={unitsMin + i}>
                {unitsMin + i} u
              </option>
            ))}
          </select>
        ) : (
          <span className="muted small">{item.units} u</span>
        )}
        <button
          type="button"
          className="icon-button"
          aria-label={`Remove ${item.code}`}
          onClick={() => dispatch({ type: "removeCourse", code: item.code })}
        >
          ×
        </button>
      </div>

      <SectionSelect item={item} />

      <div className="schedule-item-flags">
        {conflictCodes.has(item.code) && (
          <span className="flag flag-danger">Time conflict</span>
        )}
        {status === "missing" && (
          <span className="flag flag-warning">Missing prerequisites</span>
        )}
        {status === "coreq" && (
          <span className="flag flag-warning">Add its co-requisite</span>
        )}
        {completed.has(item.code) && (
          <span className="flag flag-warning">Already completed</span>
        )}
        {item.section?.seatsOpen === 0 && (
          <span className="flag flag-warning">Section full</span>
        )}
      </div>
    </li>
  );
}

export default function SchedulePanel({ onClose }) {
  const { state, dispatch, items, conflicts } = usePlanner();
  const [confirmClear, setConfirmClear] = useState(false);

  function clear() {
    if (!confirmClear) {
      setConfirmClear(true);
      return;
    }
    dispatch({ type: "clearSchedule" });
    setConfirmClear(false);
  }

  return (
    <aside className="schedule-panel" aria-label="Current schedule">
      <div className="panel-head">
        <h2>Your schedule</h2>
        {onClose && (
          <button
            type="button"
            className="icon-button"
            aria-label="Close schedule"
            onClick={onClose}
          >
            ×
          </button>
        )}
      </div>

      <ScheduleSwitcher />
      <UnitMeter units={totalUnits(items)} limit={state.unitLimit} />

      {conflicts.length > 0 && (
        <p className="callout callout-danger small" role="status">
          {conflicts.length} time conflict{conflicts.length > 1 ? "s" : ""}.
          Pick different sections or use Auto-arrange on My Schedule.
        </p>
      )}

      {items.length === 0 ? (
        <div className="panel-empty">
          <p>No courses yet.</p>
          <p className="muted small">
            Use “Add to schedule” on any course to start building your
            semester.
          </p>
        </div>
      ) : (
        <>
          <ul className="schedule-list">
            {items.map((item, index) => (
              <ScheduleItemRow key={item.code} item={item} index={index} />
            ))}
          </ul>
          <WeekCalendar items={items} compact />
        </>
      )}

      <div className="panel-actions">
        <Link to="/schedule" className="button button-primary" onClick={onClose}>
          Open weekly view
        </Link>
        {items.length > 0 && (
          <button
            type="button"
            className={`button ${confirmClear ? "button-danger" : "button-ghost"}`}
            onClick={clear}
            onBlur={() => setConfirmClear(false)}
          >
            {confirmClear ? "Confirm clear" : "Clear"}
          </button>
        )}
      </div>
    </aside>
  );
}
