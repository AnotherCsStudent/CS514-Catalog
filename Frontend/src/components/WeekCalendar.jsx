import { ALL_DAYS, DAY_NAMES, WEEKDAYS, formatTime, meetingsOverlap } from "../lib/time";

// Give overlapping blocks side-by-side lanes within a day column.
function layoutDay(blocks) {
  const sorted = [...blocks].sort((a, b) => a.start - b.start || b.end - a.end);
  const placed = [];
  let cluster = [];
  let clusterEnd = -1;

  function closeCluster() {
    const lanes = Math.max(0, ...cluster.map((block) => block.lane)) + 1;
    cluster.forEach((block) => placed.push({ ...block, lanes }));
    cluster = [];
  }

  for (const block of sorted) {
    if (block.start >= clusterEnd && cluster.length) closeCluster();
    const laneEnds = [];
    cluster.forEach((other) => {
      laneEnds[other.lane] = Math.max(laneEnds[other.lane] ?? 0, other.end);
    });
    let lane = laneEnds.findIndex((end) => end <= block.start);
    if (lane === -1) lane = laneEnds.length;
    cluster.push({ ...block, lane });
    clusterEnd = Math.max(clusterEnd, block.end);
  }
  if (cluster.length) closeCluster();

  return placed;
}

export default function WeekCalendar({ items, compact = false }) {
  // One block per meeting; a section can have several (lecture, lab, ...).
  const blocks = items.flatMap((item, index) =>
    (item.section?.meetings ?? []).map((meeting, meetingIndex) => ({
      key: `${item.code}-${meetingIndex}`,
      code: item.code,
      color: index % 8,
      meeting,
    }))
  );

  const days = ALL_DAYS.filter(
    (day) =>
      WEEKDAYS.includes(day) ||
      blocks.some((block) => block.meeting.days.includes(day))
  );
  const firstHour = Math.min(
    8,
    ...blocks.map((block) => Math.floor(block.meeting.start / 60))
  );
  const lastHour = Math.max(
    18,
    ...blocks.map((block) => Math.ceil(block.meeting.end / 60))
  );
  const hours = Array.from(
    { length: lastHour - firstHour },
    (_, i) => firstHour + i
  );
  const hourHeight = compact ? 34 : 56;
  const top = (minutes) => ((minutes - firstHour * 60) / 60) * hourHeight;

  return (
    <div
      className={`week-calendar ${compact ? "compact" : ""}`}
      style={{
        "--hour-height": `${hourHeight}px`,
        gridTemplateColumns: `44px repeat(${days.length}, minmax(0, 1fr))`,
      }}
    >
      <div className="calendar-corner" />
      {days.map((day) => (
        <div key={day} className="calendar-day-head">
          {DAY_NAMES[day]}
        </div>
      ))}

      <div className="calendar-hours" style={{ height: hours.length * hourHeight }}>
        {hours.map((hour) => (
          <span key={hour} style={{ top: (hour - firstHour) * hourHeight }}>
            {formatTime(hour * 60).replace(":00", "")}
          </span>
        ))}
      </div>

      {days.map((day) => {
        const dayBlocks = blocks
          .filter((block) => block.meeting.days.includes(day))
          .map((block) => ({
            ...block,
            start: block.meeting.start,
            end: block.meeting.end,
          }));

        return (
          <div
            key={day}
            className="calendar-day"
            style={{ height: hours.length * hourHeight }}
          >
            {layoutDay(dayBlocks).map((block) => {
              const { meeting, start, end, lane, lanes } = block;
              const clashing = blocks.some(
                (other) =>
                  other.code !== block.code &&
                  meetingsOverlap(other.meeting, meeting)
              );
              return (
                <div
                  key={block.key}
                  className={`calendar-block color-${block.color} ${clashing ? "clash" : ""}`}
                  style={{
                    top: top(start),
                    height: top(end) - top(start),
                    left: `calc(${(lane / lanes) * 100}% + 2px)`,
                    width: `calc(${100 / lanes}% - 4px)`,
                  }}
                  title={`${block.code} ${meeting.component} · ${formatTime(start)}–${formatTime(end)} · ${meeting.room}${clashing ? " · TIME CONFLICT" : ""}`}
                >
                  <strong>{block.code}</strong>
                  {!compact && (
                    <span>
                      {formatTime(start)}–{formatTime(end)}
                    </span>
                  )}
                  {!compact && (
                    <span>
                      {meeting.component} · {meeting.room}
                    </span>
                  )}
                  {clashing && <span className="clash-label">Conflict</span>}
                </div>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}
