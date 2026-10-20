import initSqlJs from "sql.js";
import sqlWasmUrl from "sql.js/dist/sql-wasm.wasm?url";
import { initCourses, initCurriculum } from "./courses";
import { initSections } from "./sections";

export const SCHEDULE_URL = "/data/schedule-2273.json";
export const DATABASE_URL = "/data/data.db";

const EMPTY = {
  term: { code: "", name: "", start: null, end: null },
  subjects: [],
  courses: [],
};

// Column names are aliased to the CSV's snake_case names that the rest of the
// app uses.
const CURRICULUM_QUERY = `
  SELECT c.courseCode         AS course_code,
         c.courseTitle        AS course_title,
         c.courseDescription  AS description,
         COALESCE(p.prereq, '') AS prerequisites,
         c.units              AS units,
         c.curriculumSection  AS curriculum_section,
         c.catalogUrl         AS catalog_url
  FROM Courses c
  LEFT JOIN CoursePrereq p ON p.courseCode = c.courseCode
  ORDER BY c.rowid`;

// Download the SQLite database and query it in the browser with sql.js.
async function loadCurriculum() {
  const [SQL, response] = await Promise.all([
    initSqlJs({ locateFile: () => sqlWasmUrl }),
    fetch(DATABASE_URL),
  ]);
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const db = new SQL.Database(new Uint8Array(await response.arrayBuffer()));
  try {
    const statement = db.prepare(CURRICULUM_QUERY);
    const rows = [];
    while (statement.step()) rows.push(statement.getAsObject());
    statement.free();
    return rows;
  } finally {
    db.close();
  }
}

async function loadDataset() {
  const response = await fetch(SCHEDULE_URL);
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.json();
}

// Load the course database and the scraped class schedule. On failure of
// either, the app still runs with whatever loaded, and the errors are returned
// for display.
export async function loadSchedule() {
  const [curriculumResult, datasetResult] = await Promise.allSettled([
    loadCurriculum(),
    loadDataset(),
  ]);

  let curriculumError = null;
  if (curriculumResult.status === "fulfilled") {
    initCurriculum(curriculumResult.value);
  } else {
    console.error("Could not load course database:", curriculumResult.reason);
    curriculumError = curriculumResult.reason;
    initCurriculum([]);
  }

  let error = null;
  let dataset = EMPTY;
  if (datasetResult.status === "fulfilled") {
    dataset = datasetResult.value;
  } else {
    console.error("Could not load class schedule:", datasetResult.reason);
    error = datasetResult.reason;
  }

  initCourses(dataset);
  initSections(dataset);
  return { error, curriculumError };
}
