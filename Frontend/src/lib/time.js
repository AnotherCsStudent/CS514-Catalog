export const WEEKDAYS = ["M", "T", "W", "Th", "F"];
export const ALL_DAYS = [...WEEKDAYS, "Sa", "Su"];

export const DAY_NAMES = {
  M: "Mon",
  T: "Tue",
  W: "Wed",
  Th: "Thu",
  F: "Fri",
  Sa: "Sat",
  Su: "Sun",
};

// "MTWTh" -> ["M", "T", "W", "Th"]
export function parseDays(text = "") {
  return text.match(/Th|Sa|Su|M|T|W|F/g) ?? [];
}

// 870 -> "2:30 PM"
export function formatTime(minutes) {
  const hours = Math.floor(minutes / 60);
  const mins = String(minutes % 60).padStart(2, "0");
  const suffix = hours >= 12 ? "PM" : "AM";
  return `${((hours + 11) % 12) + 1}:${mins} ${suffix}`;
}

export function formatMeetingTime(meeting) {
  return `${meeting.days.join("")} ${formatTime(meeting.start)}–${formatTime(meeting.end)}`;
}

export function formatMeeting(section) {
  if (!section.meetings.length) {
    return section.scheduleNote || "No set meeting time";
  }
  return section.meetings.map(formatMeetingTime).join(" · ");
}

export function meetingsOverlap(a, b) {
  return (
    a.days.some((day) => b.days.includes(day)) &&
    a.start < b.end &&
    b.start < a.end
  );
}

export function sectionsOverlap(a, b) {
  return a.meetings.some((ma) => b.meetings.some((mb) => meetingsOverlap(ma, mb)));
}

export function sectionLabel(section) {
  const seats = section.seatsOpen > 0 ? `${section.seatsOpen} open` : section.status;
  return `#${section.classNumbers.join("+")} · ${formatMeeting(section)} · ${seats}`;
}
