import { TERM } from "../data/sections";

const ICS_DAYS = { M: "MO", T: "TU", W: "WE", Th: "TH", F: "FR", Sa: "SA", Su: "SU" };
const JS_DAYS = { Su: 0, M: 1, T: 2, W: 3, Th: 4, F: 5, Sa: 6 };

const pad = (value) => String(value).padStart(2, "0");

function localStamp(date, minutes) {
  return (
    `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}` +
    `T${pad(Math.floor(minutes / 60))}${pad(minutes % 60)}00`
  );
}

function escapeText(text) {
  return text.replace(/[\\;,]/g, (match) => `\\${match}`);
}

// First date on/after the term start that falls on one of the meeting's days.
function firstMeeting(days) {
  const date = new Date(`${TERM.start}T00:00:00`);
  const wanted = days.map((day) => JS_DAYS[day]);
  while (!wanted.includes(date.getDay())) date.setDate(date.getDate() + 1);
  return date;
}

// Weekly recurring events (floating local time) for every scheduled meeting.
export function buildIcs(items, scheduleName) {
  const until = TERM.end.replaceAll("-", "") + "T235959";
  const stamp = new Date().toISOString().replace(/[-:]/g, "").slice(0, 15) + "Z";

  const events = items.flatMap(({ course, section }) =>
    (section?.meetings ?? []).map((meeting, index) => {
      const start = firstMeeting(meeting.days);
      return [
        "BEGIN:VEVENT",
        `UID:${meeting.classNbr}-${index}-${TERM.code}@cs-course-planner`,
        `DTSTAMP:${stamp}`,
        `DTSTART:${localStamp(start, meeting.start)}`,
        `DTEND:${localStamp(start, meeting.end)}`,
        `RRULE:FREQ=WEEKLY;BYDAY=${meeting.days.map((day) => ICS_DAYS[day]).join(",")};UNTIL=${until}`,
        `SUMMARY:${escapeText(`${course.course_code} ${meeting.component} – ${course.course_title}`)}`,
        `LOCATION:${escapeText(meeting.room)}`,
        `DESCRIPTION:${escapeText(`Class #${meeting.classNbr} · ${section.instructor} · ${section.modality}`)}`,
        "END:VEVENT",
      ].join("\r\n");
    })
  );

  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//CS 514//Course Planner//EN",
    `X-WR-CALNAME:${escapeText(scheduleName)}`,
    ...events,
    "END:VCALENDAR",
  ].join("\r\n");
}

export function downloadFile(filename, contents, type) {
  const url = URL.createObjectURL(new Blob([contents], { type }));
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
