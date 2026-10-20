# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

SDSU Computer Science course catalog (CS 514 team project). Deployed on Netlify: https://theteamwiththenamesdsucatalog.netlify.app/. A user guide PDF lives at the repo root.

The repo has two independent halves that are **not currently wired together**:

- `Frontend/` — React 19 + Vite SPA. This is what is deployed.
- `Backend/` — Python (README specifies Python 3.14.6) scripts for loading course data into SQLite. `main.py` is a placeholder. There is no server: the frontend downloads the SQLite file and queries it in the browser with sql.js.

## Commands

Frontend (run from `Frontend/`):

```bash
npm install
npm run dev       # Vite dev server
npm run build     # production build to dist/
npm run lint      # ESLint (flat config in eslint.config.js)
npm run preview
```

There is no test suite in either half.

Backend (requires `pandas`; rebuilds `Backend/data/data.db` from the curriculum CSV and copies it to `Frontend/public/data/data.db`, which the site loads):

```bash
python3 Backend/src/csv_to_db.py            # defaults to Frontend/src/data/sdsu_cs_curriculum.csv
```

Class schedule scraper (run from `Backend/`; scrapes SDSU's public guest class search with Playwright):

```bash
python3 -m venv .venv && .venv/bin/pip install -r scraper/requirements.txt && .venv/bin/python -m playwright install chromium
.venv/bin/python scraper/scrape_schedule.py --subjects CS     # one subject; omit --subjects for all (several hours)
.venv/bin/python scraper/build_dataset.py                     # -> Frontend/public/data/schedule-2273.json
```

The scraper is resumable (finished courses in `data/schedule/2273/courses/` are skipped; subjects in `subjects_done.txt` are skipped) and writes validation issues to `problems.jsonl`. Raw pages (`raw/*.html.gz`) can be re-parsed with `scraper/parse_course.py`. Site quirks it depends on: searches cap at 75 courses (it splits by catalog-number prefix, e.g. `CS 1`), the "Open Classes" filter is on by default and is unticked, and course pages only load after a search in the same session. Spring 2027 = term code `2273`, institution `SDCMP`.

Note: `csv_to_db.py` drops and recreates the `Courses` and `CoursePrereq` tables. After editing the CSV, rerun it; the frontend no longer reads the CSV directly.

## Architecture

The frontend is a client-only course planner (no backend calls). All user state lives in the browser. `main.jsx` awaits `loadSchedule()` (`data/load.js`, fetches `public/data/schedule-2273.json` and queries `public/data/data.db` with sql.js) before rendering; `data/courses.js` and `data/sections.js` export `let` bindings filled by `initCourses`/`initSections`, so read them at call time, never at module load.

**Data (`Frontend/src/data/`):**
- `courses.js`: every course in the scraped schedule (all SDSU subjects), overlaid with the curriculum from the SQLite database (requirement `group`, catalog `prerequisites` text, `catalog_url`; filled by `initCurriculum`, query in `load.js` aliases columns back to the CSV's snake_case names) for the 57 CS curriculum courses; curriculum courses with no sections this term are added with `offered: false`. Course objects use the CSV's snake_case names (`course_code`, `course_title`, ...) plus `unitsMin`/`unitsMax`, `subject`, `level` (`lower`/`upper`/`500`/`grad`), `career`. `group` is `null` outside the curriculum.
- `sections.js`: a "section" is one SDSU class **option** (the classes enrolled together, e.g. lecture + lab). Id is `"<course code>#<class numbers joined by ->"`. It has `classes[]` (each with its own meetings, room, instructor, seats) and a flattened `meetings[]` (`{days, start, end, component, room, classNbr}`, minutes since midnight). All time logic (overlap, calendar, filters, .ics) works on `meetings`. `TERM` comes from the dataset (`start`/`end`, `scrapedTo`).
- `prerequisites.js`: hand-structured version of the free-text prerequisites column, keyed by course code. Each course has `all` groups (AND) of `anyOf` options (OR), optional `concurrent` groups, uncheckable `notes`, and a non-course `alternative`. Must be kept in sync by hand when the CSV changes; every catalog course needs an entry.

**Logic (`Frontend/src/lib/`, pure functions):** `time.js` (day parsing, minutes, overlap), `schedule.js` (resolve stored items, conflicts, `autoArrange` backtracking search for a conflict-free section assignment, `summarize`), `prereqs.js` (`evaluatePrereqs` → status `none`/`met`/`coreq`/`missing`/`review`, or `unknown` for courses outside the curriculum; `canTake`), `ics.js` (weekly recurring calendar export), `share.js` (schedule encoded as base64url JSON in the `/shared?s=` link).

**State (`Frontend/src/state/`):** `plannerReducer.js` holds the reducer and `localStorage` persistence (key `cs-course-planner:v1`). State: `schedules[]` (each `{id, name, items: [{code, sectionId, units}]}`), `activeId`, `completed[]` (course codes, may include non-catalog codes like `MATH 141`), `unitLimit`. `PlannerProvider.jsx` derives `items` (resolved active schedule), `conflicts`, `eligibility(code)` and `conflictsFor(section)`; consume it with `usePlanner()` from `PlannerContext.js`.

**Routing:** `react-router-dom` `BrowserRouter` (`main.jsx`), routes in `App.jsx`: `/` planner (filters live in URL search params), `/schedule`, `/compare`, `/progress` (completed courses), `/shared`, plus project pages (`/overview`, `/about`, `/blog`, `/files`). `public/_redirects` provides the Netlify SPA fallback.

**Styling:** plain CSS. Design tokens (light + dark via `prefers-color-scheme`) in `index.css`; component styles in `App.css`. Course colors are `.color-0`…`.color-7` setting `--item-color`.

**Backend schema (SQLite, `Backend/data/data.db`, committed, copied to `Frontend/public/data/data.db`):** `Courses(courseCode PK, courseTitle, courseDescription, units TEXT (e.g. `1-3`), curriculumSection, catalogUrl)` and `CoursePrereq(courseCode, prereq)` where `prereq` is the raw prerequisite text from the CSV (not parsed into individual course codes).
