import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { courses, requirementGroups, subjects } from "../data/courses";
import { TERM, sectionsByCourse } from "../data/sections";
import { usePlanner } from "../state/PlannerContext";
import { totalUnits } from "../lib/schedule";
import { canTake } from "../lib/prereqs";
import { DAY_NAMES, WEEKDAYS, formatTime, parseDays } from "../lib/time";
import CourseCard from "../components/CourseCard";
import SchedulePanel from "../components/SchedulePanel";

const LEVELS = {
  lower: "Lower division (100–299)",
  upper: "Upper division (300–499)",
  500: "500-level",
  grad: "Graduate (600+)",
};

const PAGE_SIZE = 40;

const MODES = {
  inperson: { label: "In person", test: (s) => s.modality === "In person" },
  hybrid: { label: "Hybrid", test: (s) => s.modality === "Hybrid" },
  online: { label: "Online", test: (s) => s.modality.startsWith("Online") },
};

const HOURS = Array.from({ length: 15 }, (_, i) => (7 + i) * 60);

// Filters that narrow sections (a course must have one matching section).
const SECTION_FILTERS = ["days", "after", "before", "mode", "open", "fits"];

function useFilters() {
  const [params, setParams] = useSearchParams();

  const filters = {
    q: params.get("q") ?? "",
    subject: params.get("subject") ?? "",
    group: params.get("group") ?? "",
    level: params.get("level") ?? "",
    eligible: params.has("eligible"),
    hideDone: params.has("hideDone"),
    hideAdded: params.has("hideAdded"),
    days: params.has("days") ? parseDays(params.get("days")) : null,
    after: params.has("after") ? Number(params.get("after")) : null,
    before: params.has("before") ? Number(params.get("before")) : null,
    mode: params.get("mode") ?? "",
    open: params.has("open"),
    fits: params.has("fits"),
  };

  function set(key, value) {
    setParams(
      (current) => {
        const next = new URLSearchParams(current);
        if (value === "" || value === false || value == null) next.delete(key);
        else next.set(key, value === true ? "1" : value);
        return next;
      },
      { replace: true }
    );
  }

  const sectionFilterCount = SECTION_FILTERS.filter((key) => params.has(key))
    .length;

  return {
    filters,
    set,
    clear: () => setParams({}, { replace: true }),
    activeCount: [...params.keys()].length,
    sectionFilterCount,
  };
}

function SectionFilters({ filters, set }) {
  const allowedDays = filters.days ?? WEEKDAYS;

  function toggleDay(day) {
    const next = allowedDays.includes(day)
      ? allowedDays.filter((d) => d !== day)
      : WEEKDAYS.filter((d) => d === day || allowedDays.includes(d));
    set("days", next.length === WEEKDAYS.length ? "" : next.join("") || "none");
  }

  return (
    <div className="filter-grid">
      <fieldset className="day-chips">
        <legend>Days I can be on campus</legend>
        {WEEKDAYS.map((day) => (
          <label key={day} className="chip">
            <input
              type="checkbox"
              checked={allowedDays.includes(day)}
              onChange={() => toggleDay(day)}
            />
            <span>{DAY_NAMES[day]}</span>
          </label>
        ))}
      </fieldset>

      <label>
        Starts at or after
        <select
          value={filters.after ?? ""}
          onChange={(event) => set("after", event.target.value)}
        >
          <option value="">Any time</option>
          {HOURS.map((minutes) => (
            <option key={minutes} value={minutes}>
              {formatTime(minutes)}
            </option>
          ))}
        </select>
      </label>

      <label>
        Ends by
        <select
          value={filters.before ?? ""}
          onChange={(event) => set("before", event.target.value)}
        >
          <option value="">Any time</option>
          {HOURS.map((minutes) => (
            <option key={minutes} value={minutes}>
              {formatTime(minutes)}
            </option>
          ))}
        </select>
      </label>

      <label>
        Format
        <select
          value={filters.mode}
          onChange={(event) => set("mode", event.target.value)}
        >
          <option value="">Any format</option>
          {Object.entries(MODES).map(([key, mode]) => (
            <option key={key} value={key}>
              {mode.label}
            </option>
          ))}
        </select>
      </label>

      <label className="check">
        <input
          type="checkbox"
          checked={filters.open}
          onChange={(event) => set("open", event.target.checked)}
        />
        Open seats only
      </label>

      <label className="check">
        <input
          type="checkbox"
          checked={filters.fits}
          onChange={(event) => set("fits", event.target.checked)}
        />
        Fits around my chosen sections
      </label>
    </div>
  );
}

export function TermSourceTag() {
  if (!TERM.scrapedTo) return null;
  const updated = new Date(TERM.scrapedTo).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  return (
    <span
      className="source-tag"
      title="Seats change daily. Confirm on my.SDSU before registering."
    >
      SDSU class schedule · seats as of {updated}
    </span>
  );
}

export default function Planner() {
  const { filters, set, clear, activeCount, sectionFilterCount } = useFilters();
  const { items, completed, planned, eligibility, conflictsFor, state } =
    usePlanner();
  const [moreOpen, setMoreOpen] = useState(sectionFilterCount > 0);
  const [sheetOpen, setSheetOpen] = useState(false);
  // Paging restarts whenever the filters change.
  const [paging, setPaging] = useState({ filters: "", count: PAGE_SIZE });

  const query = filters.q.trim().toLowerCase();
  const filterKey = JSON.stringify(filters);
  const shown = paging.filters === filterKey ? paging.count : PAGE_SIZE;

  function sectionMatches(section) {
    const { meetings } = section;
    if (
      filters.days &&
      !meetings.every((m) => m.days.every((d) => filters.days.includes(d)))
    )
      return false;
    if (filters.after != null && meetings.some((m) => m.start < filters.after))
      return false;
    if (filters.before != null && meetings.some((m) => m.end > filters.before))
      return false;
    if (filters.mode && !MODES[filters.mode].test(section)) return false;
    if (filters.open && section.seatsOpen === 0) return false;
    if (filters.fits && conflictsFor(section).length) return false;
    return true;
  }

  const results = courses
    .filter((course) => {
      const code = course.course_code;
      if (
        query &&
        !`${code} ${course.course_title}`.toLowerCase().includes(query)
      )
        return false;
      if (filters.subject && course.subject !== filters.subject) return false;
      if (filters.group && course.group !== filters.group) return false;
      if (filters.level && course.level !== filters.level) return false;
      if (filters.hideDone && completed.has(code)) return false;
      if (filters.hideAdded && planned.has(code)) return false;
      if (filters.eligible) {
        if (!canTake(eligibility(code).status) || completed.has(code))
          return false;
      }
      return true;
    })
    .map((course) => ({
      course,
      matching: sectionFilterCount
        ? (sectionsByCourse[course.course_code] ?? []).filter(sectionMatches)
            .length
        : null,
    }))
    .filter(({ matching }) => matching == null || matching > 0);

  return (
    <div className="planner">
      <section className="planner-main">
        <div className="page-heading">
          <p className="eyebrow">
            {TERM.name}
            <TermSourceTag />
          </p>
          <h1>Find courses</h1>
          <p className="lede">
            Search every SDSU course offered this term, then add courses and
            pick sections to build next semester’s schedule.
          </p>
        </div>

        <div className="filters">
          <div className="filter-row">
            <label className="search-field">
              <span className="sr-only">Search courses</span>
              <input
                type="search"
                placeholder="Search by code or title, e.g. CS 210 or Data Structures"
                value={filters.q}
                onChange={(event) => set("q", event.target.value)}
              />
            </label>

            <label>
              <span className="sr-only">Subject</span>
              <select
                value={filters.subject}
                onChange={(event) => set("subject", event.target.value)}
              >
                <option value="">All subjects</option>
                {subjects.map((subject) => (
                  <option key={subject.code} value={subject.code}>
                    {subject.code} – {subject.name}
                  </option>
                ))}
              </select>
            </label>

            <label>
              <span className="sr-only">CS major requirement</span>
              <select
                value={filters.group}
                onChange={(event) => set("group", event.target.value)}
              >
                <option value="">Any CS requirement</option>
                {requirementGroups.map((group) => (
                  <option key={group} value={group}>
                    {group}
                  </option>
                ))}
              </select>
            </label>

            <label>
              <span className="sr-only">Level</span>
              <select
                value={filters.level}
                onChange={(event) => set("level", event.target.value)}
              >
                <option value="">All levels</option>
                {Object.entries(LEVELS).map(([key, label]) => (
                  <option key={key} value={key}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="filter-row filter-toggles">
            <label className="check">
              <input
                type="checkbox"
                checked={filters.eligible}
                onChange={(event) => set("eligible", event.target.checked)}
              />
              Only courses I can take
            </label>
            <label className="check">
              <input
                type="checkbox"
                checked={filters.hideDone}
                onChange={(event) => set("hideDone", event.target.checked)}
              />
              Hide completed
            </label>
            <label className="check">
              <input
                type="checkbox"
                checked={filters.hideAdded}
                onChange={(event) => set("hideAdded", event.target.checked)}
              />
              Hide courses in my schedule
            </label>

            <button
              type="button"
              className="button button-ghost button-sm"
              aria-expanded={moreOpen}
              onClick={() => setMoreOpen(!moreOpen)}
            >
              {moreOpen ? "Fewer filters" : "Time & day filters"}
              {sectionFilterCount > 0 && ` (${sectionFilterCount})`}
            </button>
            {activeCount > 0 && (
              <button
                type="button"
                className="button button-ghost button-sm"
                onClick={clear}
              >
                Clear all
              </button>
            )}
          </div>

          {moreOpen && <SectionFilters filters={filters} set={set} />}
        </div>

        <p className="result-count" role="status">
          Showing {results.length} of {courses.length} courses
          {filters.eligible && completed.size === 0 && (
            <span className="muted">
              {" "}· tip: mark courses you’ve finished on My Courses to see
              what you’re eligible for
            </span>
          )}
        </p>

        {results.length === 0 ? (
          <div className="card empty-state">
            <h2>No courses found</h2>
            <p>Try another search or clear your filters.</p>
          </div>
        ) : (
          <>
            <div className="course-list">
              {results.slice(0, shown).map(({ course, matching }) => (
                <CourseCard
                  key={course.course_code}
                  course={course}
                  matchingSections={matching}
                />
              ))}
            </div>
            {results.length > shown && (
              <button
                type="button"
                className="button button-secondary show-more"
                onClick={() =>
                  setPaging({ filters: filterKey, count: shown + PAGE_SIZE })
                }
              >
                Show more ({results.length - shown} remaining)
              </button>
            )}
          </>
        )}
      </section>

      <div className={`planner-side ${sheetOpen ? "open" : ""}`}>
        <SchedulePanel onClose={sheetOpen ? () => setSheetOpen(false) : null} />
      </div>
      {sheetOpen && (
        <div className="sheet-backdrop" onClick={() => setSheetOpen(false)} />
      )}

      <button
        type="button"
        className="schedule-fab"
        onClick={() => setSheetOpen(true)}
      >
        <span>Schedule</span>
        <strong>
          {items.length} course{items.length === 1 ? "" : "s"} ·{" "}
          {totalUnits(items)}/{state.unitLimit} units
        </strong>
      </button>
    </div>
  );
}
