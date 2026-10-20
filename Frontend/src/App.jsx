import { Navigate, Route, Routes } from "react-router-dom";
import Navbar from "./components/Navbar";
import Planner from "./pages/Planner";
import Schedule from "./pages/Schedule";
import Compare from "./pages/Compare";
import Progress from "./pages/Progress";
import Shared from "./pages/Shared";
import Overview from "./pages/Overview";
import About from "./pages/About";
import Blog from "./pages/Blog";
import ProjectFiles from "./pages/ProjectFiles";
import "./App.css";

export default function App({ loadError, curriculumError }) {
  return (
    <div className="app">
      <a href="#main-content" className="skip-link">
        Skip to content
      </a>
      <Navbar />
      <main id="main-content" className="main-content">
        {loadError && (
          <p className="callout callout-danger" role="alert">
            The class schedule could not be loaded, so sections are
            unavailable. Showing the CS curriculum only.
          </p>
        )}
        {curriculumError && (
          <p className="callout callout-danger" role="alert">
            The course database could not be loaded, so requirement groups
            and prerequisite text are unavailable.
          </p>
        )}
        <Routes>
          <Route path="/" element={<Planner />} />
          <Route path="/schedule" element={<Schedule />} />
          <Route path="/compare" element={<Compare />} />
          <Route path="/progress" element={<Progress />} />
          <Route path="/shared" element={<Shared />} />
          <Route path="/overview" element={<Overview />} />
          <Route path="/about" element={<About />} />
          <Route path="/blog" element={<Blog />} />
          <Route path="/files" element={<ProjectFiles />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  );
}
