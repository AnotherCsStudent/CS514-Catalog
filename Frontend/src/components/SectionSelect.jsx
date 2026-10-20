import { usePlanner } from "../state/PlannerContext";
import { sectionLabel } from "../lib/time";

export default function SectionSelect({ item }) {
  const { dispatch, conflictsFor } = usePlanner();

  if (!item.sections.length) {
    return <p className="muted small">Not offered in this term's schedule</p>;
  }

  return (
    <select
      className="section-select"
      aria-label={`Section for ${item.code}`}
      value={item.sectionId ?? ""}
      onChange={(event) =>
        dispatch({
          type: "setSection",
          code: item.code,
          sectionId: event.target.value || null,
        })
      }
    >
      <option value="">Choose a section…</option>
      {item.sections.map((section) => {
        const clashes = conflictsFor(section);
        return (
          <option key={section.id} value={section.id}>
            {sectionLabel(section)}
            {clashes.length ? ` · conflicts with ${clashes.join(", ")}` : ""}
          </option>
        );
      })}
    </select>
  );
}
