import { createContext, useContext } from "react";

export const PlannerContext = createContext(null);

export function usePlanner() {
  const planner = useContext(PlannerContext);
  if (!planner) throw new Error("usePlanner must be used inside PlannerProvider");
  return planner;
}
