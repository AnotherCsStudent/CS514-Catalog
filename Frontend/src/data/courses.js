// The CS curriculum (requirement groups, catalog prerequisites text, catalog
// links) comes from the SQLite database (public/data/data.db, built by
// Backend/src/csv_to_db.py) and is an overlay on top of the full SDSU course
// list scraped from the class schedule (see data/load.js).

// "Major > Upper Division Major Electives > A. Computer Systems" -> "Electives: A. Computer Systems"
function requirementGroup(section = "") {
  if (section === "Preparation for the Major") return "Major Prerequisites";
  const parts = section.split(">").map((part) => part.trim());
  if (parts.length > 1) return `Electives: ${parts[parts.length - 1]}`;
  if (section === "Major") return "Major Core";
  return section || "Other";
}

function parseUnits(units = "") {
  const [min, max] = String(units).split("-").map(Number);
  return { unitsMin: min || 0, unitsMax: max || min || 0 };
}

function formatUnits(min, max) {
  const trim = (n) => String(Number(n.toFixed(1)));
  return min === max ? trim(min) : `${trim(min)}-${trim(max)}`;
}

function courseLevel(code) {
  const number = parseInt(code.replace(/^\D+/, ""), 10);
  if (number < 300) return "lower";
  if (number < 500) return "upper";
  if (number < 600) return "500";
  return "grad";
}

const groupOrder = ["Major Prerequisites", "Major Core"];

// Filled by initCurriculum() and initCourses() before the app renders.
export let curriculum = {};
export let requirementGroups = [];
export let courses = [];
export let courseByCode = {};
export let subjects = [];

function fromSchedule(scraped, subjectNames) {
  const csv = curriculum[scraped.code];
  return {
    course_code: scraped.code,
    course_title: scraped.title || csv?.course_title || "",
    description: scraped.description || csv?.description || "",
    prerequisites: csv?.prerequisites ?? "",
    catalog_url: csv?.catalog_url ?? "",
    units: formatUnits(scraped.unitsMin, scraped.unitsMax),
    unitsMin: scraped.unitsMin,
    unitsMax: scraped.unitsMax,
    subject: scraped.subject,
    subjectName: subjectNames[scraped.subject] ?? scraped.subject,
    career: scraped.career,
    components: scraped.components,
    group: csv?.group ?? null,
    level: courseLevel(scraped.code),
    offered: true,
  };
}

// Curriculum courses that have no sections this term.
function fromCurriculum(csv) {
  const subject = csv.course_code.replace(/\s*\d.*$/, "");
  return {
    ...csv,
    units: formatUnits(csv.unitsMin, csv.unitsMax),
    subject,
    subjectName: subject,
    career: "",
    components: "",
    level: courseLevel(csv.course_code),
    offered: false,
  };
}

// rows: curriculum courses queried from the database, with the CSV's
// snake_case column names (see data/load.js).
export function initCurriculum(rows) {
  curriculum = Object.fromEntries(
    rows.map((row) => [
      row.course_code,
      {
        ...row,
        ...parseUnits(row.units),
        group: requirementGroup(row.curriculum_section),
      },
    ])
  );
  requirementGroups = [
    ...groupOrder,
    ...[...new Set(Object.values(curriculum).map((course) => course.group))]
      .filter((group) => !groupOrder.includes(group))
      .sort((a, b) => a.localeCompare(b)),
  ];
}

export function initCourses(dataset) {
  const subjectNames = Object.fromEntries(
    dataset.subjects.map((subject) => [subject.code, subject.name])
  );
  const scraped = dataset.courses.map((course) => fromSchedule(course, subjectNames));
  const scrapedCodes = new Set(scraped.map((course) => course.course_code));
  const missing = Object.values(curriculum)
    .filter((csv) => !scrapedCodes.has(csv.course_code))
    .map(fromCurriculum);

  courses = [...scraped, ...missing].sort(
    (a, b) =>
      a.subject.localeCompare(b.subject) ||
      parseInt(a.course_code.replace(/^\D+/, ""), 10) -
        parseInt(b.course_code.replace(/^\D+/, ""), 10) ||
      a.course_code.localeCompare(b.course_code)
  );
  courseByCode = Object.fromEntries(
    courses.map((course) => [course.course_code, course])
  );
  subjects = dataset.subjects.filter((subject) =>
    courses.some((course) => course.subject === subject.code)
  );
}
