export default function Overview() {
  return (
    <section className="text-page">
      <h1>Overview & Instructions</h1>

      <div className="card">
        <h2>What is this project?</h2>
        <p>
          A course planner for SDSU students. Browse every course offered
          next semester, check eligibility for CS curriculum courses, and
          build a conflict-free schedule.
        </p>
      </div>

      <div className="card">
        <h2>How to plan your semester</h2>
        <ol className="steps">
          <li>
            Open <strong>My Courses</strong> and check off the courses you have
            completed. Add courses from other departments (such as MATH 141)
            by code.
          </li>
          <li>
            On <strong>Find Courses</strong>, search by code or title and
            filter by subject, CS requirement, level, or “Only courses I can
            take”. Use
            “Time & day filters” to limit days, times, format, or open seats.
          </li>
          <li>
            Select “Add to schedule”. Open “Details, prerequisites &
            sections” on a course to see missing prerequisites and pick a
            class option. An option can bundle several classes, such as a
            lecture and its lab.
          </li>
          <li>
            Open <strong>My Schedule</strong> to see the weekly calendar.
            Choose sections, or select “Auto-arrange sections” to find a
            combination with no time conflicts.
          </li>
          <li>
            Use New or Duplicate to build alternative plans, then compare them
            on <strong>Compare</strong>.
          </li>
          <li>
            Export your schedule to a calendar app (.ics), copy a share link,
            or print it.
          </li>
        </ol>
      </div>

      <div className="card">
        <h2>Current limitations</h2>
        <ul>
          <li>
            Class times, rooms, instructors, and seats come from SDSU’s
            public class search and are refreshed when we re-run our
            scraper. Seat counts change daily, so confirm on my.SDSU before
            registering.
          </li>
          <li>
            Prerequisites are only checked for CS curriculum courses, based on
            our reading of the catalog text. Grades, GPA, instructor consent,
            and graduate standing are not checked. Always confirm with the
            official catalog.
          </li>
          <li>
            Schedules and completed courses are saved in this browser only.
            There are no accounts yet.
          </li>
          <li>
            The catalog only includes the records we have scraped so far and
            is not a complete list of graduation requirements.
          </li>
        </ul>
      </div>
    </section>
  );
}
