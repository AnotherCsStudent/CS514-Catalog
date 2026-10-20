import { useRef } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { usePlanner } from "../state/PlannerContext";

const primary = [
  { to: "/", label: "Find Courses", end: true },
  { to: "/schedule", label: "My Schedule", showCount: true },
  { to: "/compare", label: "Compare" },
  { to: "/progress", label: "My Courses" },
];

const project = [
  { to: "/overview", label: "Overview & Instructions" },
  { to: "/about", label: "About" },
  { to: "/blog", label: "Blog" },
  { to: "/files", label: "Project Files" },
];

export default function Navbar() {
  const { items } = usePlanner();
  const menu = useRef(null);
  const { pathname } = useLocation();
  const inProject = project.some((link) => link.to === pathname);

  const closeMenu = () => menu.current?.removeAttribute("open");

  return (
    <header className="site-header">
      <div className="header-content">
        <NavLink to="/" className="brand" onClick={closeMenu}>
          <span className="brand-mark" aria-hidden="true">CS</span>
          <span>
            <strong>Course Planner</strong>
            <span>SDSU Computer Science</span>
          </span>
        </NavLink>

        <nav aria-label="Main navigation" className="main-nav">
          {primary.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.end}
              onClick={closeMenu}
            >
              {link.label}
              {link.showCount && items.length > 0 && (
                <span className="nav-count" aria-label={`${items.length} courses`}>
                  {items.length}
                </span>
              )}
            </NavLink>
          ))}

          <details className="nav-menu" ref={menu}>
            <summary className={inProject ? "active" : ""}>Project</summary>
            <div className="nav-menu-list">
              {project.map((link) => (
                <NavLink key={link.to} to={link.to} onClick={closeMenu}>
                  {link.label}
                </NavLink>
              ))}
            </div>
          </details>
        </nav>
      </div>
    </header>
  );
}
