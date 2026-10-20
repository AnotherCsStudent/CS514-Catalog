import { prerequisites } from "../data/prerequisites";

/**
 * Status values:
 *  - "none":    no prerequisites
 *  - "met":     every course requirement is satisfied
 *  - "coreq":   only concurrent requirements remain (add them this semester)
 *  - "missing": at least one requirement group is unsatisfied
 *  - "review":  only uncheckable conditions (consent, incomplete data)
 *  - "unknown": course is outside the CS curriculum we have prerequisites for
 */
export function evaluatePrereqs(code, completed, planned = new Set()) {
  const rule = prerequisites[code];
  if (!rule) {
    return { status: "unknown", missing: [], notes: [], alternative: null };
  }
  const notes = rule.notes ?? [];

  const missing = rule.all.filter(
    (group) =>
      !group.anyOf.some(
        (option) =>
          completed.has(option) || (group.concurrent && planned.has(option))
      )
  );

  let status;
  if (rule.all.length === 0) status = notes.length ? "review" : "none";
  else if (!missing.length) status = "met";
  else status = missing.every((group) => group.concurrent) ? "coreq" : "missing";

  return { status, missing, notes, alternative: rule.alternative ?? null };
}

export function describeGroup(group) {
  const options =
    group.anyOf.length > 2
      ? `one of ${group.anyOf.join(", ")}`
      : group.anyOf.join(" or ");
  return group.concurrent ? `${options} (can be taken concurrently)` : options;
}

export const STATUS_LABELS = {
  none: "No prerequisites",
  met: "Prerequisites met",
  coreq: "Needs co-requisite",
  missing: "Missing prerequisites",
  review: "Check requirements",
  unknown: "Prereqs not checked",
};

// Statuses that let a student register this semester.
export const canTake = (status) => status !== "missing";
