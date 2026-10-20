// Class sections come from the scraped SDSU class schedule
// (Backend/scraper → public/data/schedule-<term>.json), loaded in data/load.js.
//
// A "section" here is one SDSU class option: the set of classes a student
// enrolls in together (e.g. a lecture plus one lab). Each class has its own
// meetings, room and seats.

// Filled by initSections() before the app renders.
export let TERM = { code: "", name: "", start: null, end: null };
export let sections = [];
export let sectionById = {};
export let sectionsByCourse = {};

const unique = (values) => [...new Set(values.filter(Boolean))];

function toSection(course, option) {
  const classes = option.classes.map((entry) => ({
    ...entry,
    // Waitlist-only classes report no open seat count.
    seatsOpen: entry.seatsOpen ?? 0,
    seatsTotal: entry.seatsTotal ?? 0,
  }));
  const limiting = classes.reduce(
    (min, entry) => (!min || entry.seatsOpen < min.seatsOpen ? entry : min),
    null
  );

  return {
    id: `${course.code}#${option.id}`,
    courseCode: course.code,
    section: option.option,
    status: option.status,
    modality: option.modality,
    classes,
    classNumbers: classes.map((entry) => entry.classNbr),
    meetings: classes.flatMap((entry) =>
      entry.meetings
        .filter((meeting) => meeting.days.length)
        .map((meeting) => ({
          ...meeting,
          component: entry.component,
          room: entry.room,
          classNbr: entry.classNbr,
        }))
    ),
    scheduleNote: unique(classes.map((entry) => entry.scheduleText)).join(" / "),
    location: unique(classes.map((entry) => entry.room)).join(", ") || "TBA",
    instructor: unique(classes.map((entry) => entry.instructor)).join(", ") || "Staff",
    seatsOpen: limiting?.seatsOpen ?? 0,
    seatsTotal: limiting?.seatsTotal ?? 0,
  };
}

export function initSections(dataset) {
  TERM = dataset.term;
  sections = dataset.courses.flatMap((course) =>
    course.options.map((option) => toSection(course, option))
  );
  sectionById = Object.fromEntries(
    sections.map((section) => [section.id, section])
  );
  sectionsByCourse = sections.reduce((map, section) => {
    (map[section.courseCode] ??= []).push(section);
    return map;
  }, {});
}
