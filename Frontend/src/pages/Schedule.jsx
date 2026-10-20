import { useState } from "react";
import { Link } from "react-router-dom";
import { usePlanner } from "../state/PlannerContext";
import { TERM } from "../data/sections";
import { autoArrange, summarize } from "../lib/schedule";
import { buildIcs, downloadFile } from "../lib/ics";
import { shareUrl } from "../lib/share";
import { formatMeeting, formatTime } from "../lib/time";
import ScheduleSwitcher from "../components/ScheduleSwitcher";
import UnitMeter from "../components/UnitMeter";
import WeekCalendar from "../components/WeekCalendar";
import { ScheduleItemRow } from "../components/SchedulePanel";
import { TermSourceTag } from "./Planner";

export function ScheduleStats({ summary }) {
  const stats = [
    ["Courses", summary.courses],
    ["Units", summary.units],
    ["Conflicts", summary.conflicts],
    ["Days on campus", summary.campusDays],
    [
      "Day span",
      summary.earliest == null
        ? "—"
        : `${formatTime(summary.earliest)}–${formatTime(summary.latest)}`,
    ],
  ];

  return (
    <dl className="stats">
      {stats.map(([label, value]) => (
        <div
          key={label}
          className={label === "Conflicts" && value > 0 ? "stat danger" : "stat"}
        >
          <dt>{label}</dt>
          <dd>{value}</dd>
        </div>
      ))}
    </dl>
  );
}

export function UnscheduledList({ items }) {
  const unscheduled = items.filter((item) => !item.section?.meetings.length);
  if (!unscheduled.length) return null;

  return (
    <div className="card unscheduled">
      <h3>Not on the calendar</h3>
      <ul>
        {unscheduled.map((item) => (
          <li key={item.code}>
            <strong>{item.code}</strong>{" "}
            <span className="muted">
              {item.section
                ? `${formatMeeting(item.section)} · ${item.section.modality}`
                : item.sections.length
                  ? "No section chosen yet"
                  : "Not offered this term"}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function Schedule() {
  const { state, dispatch, activeSchedule, items, eligibility, completed } =
    usePlanner();
  const [message, setMessage] = useState(null);
  const [link, setLink] = useState(null);
  const summary = summarize(items);

  const missingPrereqs = items.filter((item) =>
    ["missing", "coreq"].includes(eligibility(item.code).status)
  );
  const alreadyDone = items.filter((item) => completed.has(item.code));

  function arrange() {
    const arrangement = autoArrange(items);
    if (!arrangement) {
      setMessage({
        tone: "danger",
        text: "No conflict-free combination exists for these courses. Try removing one.",
      });
      return;
    }
    dispatch({ type: "applyArrangement", arrangement });
    setMessage({ tone: "success", text: "Sections arranged with no time conflicts." });
  }

  function exportIcs() {
    const name = activeSchedule.name;
    downloadFile(
      `${name.replace(/\W+/g, "-").toLowerCase()}.ics`,
      buildIcs(items, `${TERM.name} – ${name}`),
      "text/calendar"
    );
  }

  async function share() {
    const url = shareUrl(activeSchedule);
    setLink(url);
    try {
      await navigator.clipboard.writeText(url);
      setMessage({ tone: "success", text: "Share link copied to clipboard." });
    } catch {
      setMessage({ tone: "info", text: "Copy the share link below." });
    }
  }

  return (
    <section className="schedule-page">
      <div className="page-heading row">
        <div>
          <p className="eyebrow">
            {TERM.name}
            <TermSourceTag />
          </p>
          <h1>My schedule</h1>
        </div>
        <ScheduleSwitcher />
      </div>

      <div className="toolbar no-print">
        <button
          type="button"
          className="button button-primary"
          onClick={arrange}
          disabled={!items.some((item) => item.sections.length)}
        >
          Auto-arrange sections
        </button>
        <button
          type="button"
          className="button button-secondary"
          onClick={exportIcs}
          disabled={!summary.campusDays}
        >
          Export to calendar (.ics)
        </button>
        <button
          type="button"
          className="button button-secondary"
          onClick={share}
          disabled={!items.length}
        >
          Copy share link
        </button>
        <button
          type="button"
          className="button button-ghost"
          onClick={() => window.print()}
          disabled={!items.length}
        >
          Print
        </button>
      </div>

      {message && (
        <p className={`callout callout-${message.tone} no-print`} role="status">
          {message.text}
        </p>
      )}
      {link && (
        <input
          className="share-link no-print"
          readOnly
          value={link}
          aria-label="Share link"
          onFocus={(event) => event.target.select()}
        />
      )}

      <ScheduleStats summary={summary} />

      {items.length === 0 ? (
        <div className="card empty-state">
          <h2>This schedule is empty</h2>
          <p>
            <Link to="/">Find courses</Link> and add them to start planning.
          </p>
        </div>
      ) : (
        <div className="schedule-layout">
          <div className="schedule-calendar">
            <WeekCalendar items={items} />
            <UnscheduledList items={items} />
          </div>

          <div className="schedule-side">
            <UnitMeter units={summary.units} limit={state.unitLimit} />
            <label className="inline-label no-print">
              Unit limit
              <input
                type="number"
                min={1}
                max={30}
                value={state.unitLimit}
                onChange={(event) =>
                  dispatch({
                    type: "setUnitLimit",
                    unitLimit: Math.max(1, Number(event.target.value) || 1),
                  })
                }
              />
            </label>

            {(summary.unscheduled > 0 ||
              missingPrereqs.length > 0 ||
              alreadyDone.length > 0) && (
              <div className="callout callout-warning">
                <strong>Check before registering</strong>
                <ul>
                  {summary.unscheduled > 0 && (
                    <li>
                      {summary.unscheduled} course
                      {summary.unscheduled > 1 ? "s need" : " needs"} a section.
                    </li>
                  )}
                  {missingPrereqs.map((item) => (
                    <li key={item.code}>
                      {item.code}{" "}
                      {eligibility(item.code).status === "coreq"
                        ? `needs ${eligibility(item.code)
                            .missing.map((group) => group.anyOf.join(" or "))
                            .join(", ")} in the same semester.`
                        : "is missing prerequisites."}
                    </li>
                  ))}
                  {alreadyDone.map((item) => (
                    <li key={item.code}>
                      {item.code} is marked as completed.
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <ul className="schedule-list">
              {items.map((item, index) => (
                <ScheduleItemRow key={item.code} item={item} index={index} />
              ))}
            </ul>
          </div>
        </div>
      )}
    </section>
  );
}
