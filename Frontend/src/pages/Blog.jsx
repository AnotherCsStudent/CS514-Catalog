import { team } from "../data/team";

const blogPosts = {
  Rafael: `Our project is a site that would allow SDSU students to quickly look at class catalogs for their
respective major and see what classes they need to take, as well as the prerequisites for those classes.
What makes our approach unique is bringing course information, prerequisites, and curriculum sections
together in a searchable layout. Students can search for a specific class or filter by curriculum section
to find the information they need more easily. My role in the project is working on the frontend, including
the page navigation, course search, curriculum filters, and displaying class information.`,
  Gian: ``,
  Bradley: `The SDSU Catalog site is designed to optimize the speed that the SDSU Catalog information can be gathered. 
The current SDSU Catalog site is very slow for simple queries, and even slower when looking up complex queries.
Our site solves this by using modern technology and SQL Databases with quicker queries to make gathering information bearable.`,
  Ajay: `The SDSU Course Catalog is a student-built website that makes it easier to explore SDSU’s course offerings.
It pulls course data from the official university catalog into its own database. Students can then search for
classes faster and more accurately than on the official site, by course code, title, or topic.`,
  Mateo: `Our project is a student-built SDSU course catalog platform designed to make finding course information
faster and easier. The website organizes course descriptions, prerequisites, and major requirements in one
searchable location. Instead of navigating through the slower official catalog, students can search for classes
by course code, title, or topic and quickly see which courses they need and what prerequisites are required.
By storing the catalog information in a SQL database, our platform can process searches more efficiently and
provide students with a simpler way to plan and understand their degree requirements.`,
};

export default function Blog() {
  return (
    <section className="text-page">
      <h1>Team Blog</h1>

      <p>
        Each team member describes the project, its purpose, and what
        makes it unique.
      </p>

      {team.map((member) => {
        const paragraph = blogPosts[member.name];

        return (
          <article className="card" key={member.name}>
            <h2>{member.name} - {member.role}</h2>
            {paragraph ? (
              <p>{paragraph}</p>
            ) : (
              <p className="placeholder">
                {member.name}’s paragraph
              </p>
            )}
          </article>
        );
      })}
    </section>
  );
}