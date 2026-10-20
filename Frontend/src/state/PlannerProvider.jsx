import { useEffect, useMemo, useReducer } from "react";
import { PlannerContext } from "./PlannerContext";
import { loadState, plannerReducer, saveState } from "./plannerReducer";
import { conflictsFor, findConflicts, resolveItems } from "../lib/schedule";
import { evaluatePrereqs } from "../lib/prereqs";

export default function PlannerProvider({ children }) {
  const [state, dispatch] = useReducer(plannerReducer, undefined, loadState);

  useEffect(() => saveState(state), [state]);

  const value = useMemo(() => {
    const activeSchedule = state.schedules.find(
      (schedule) => schedule.id === state.activeId
    );
    const items = resolveItems(activeSchedule);
    const completed = new Set(state.completed);
    const planned = new Set(items.map((item) => item.code));
    const conflicts = findConflicts(items);

    return {
      state,
      dispatch,
      activeSchedule,
      items,
      completed,
      planned,
      conflicts,
      conflictCodes: new Set(conflicts.flat().map((item) => item.code)),
      eligibility: (code) => evaluatePrereqs(code, completed, planned),
      conflictsFor: (section) => conflictsFor(section, items),
    };
  }, [state]);

  return (
    <PlannerContext.Provider value={value}>{children}</PlannerContext.Provider>
  );
}
