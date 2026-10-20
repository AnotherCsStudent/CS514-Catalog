import { STATUS_LABELS } from "../lib/prereqs";

export default function EligibilityBadge({ status, completed }) {
  if (completed) return <span className="badge badge-done">Completed</span>;
  return (
    <span className={`badge badge-${status}`}>{STATUS_LABELS[status]}</span>
  );
}
