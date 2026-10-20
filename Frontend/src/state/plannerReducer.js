import { courseByCode } from "../data/courses";
import { sectionsByCourse } from "../data/sections";

export const STORAGE_KEY = "cs-course-planner:v1";
export const DEFAULT_UNIT_LIMIT = 18;

const newId = () => Math.random().toString(36).slice(2, 10);

const emptySchedule = (name) => ({ id: newId(), name, items: [] });

export function initialState() {
  const first = emptySchedule("Plan A");
  return {
    schedules: [first],
    activeId: first.id,
    completed: [],
    unitLimit: DEFAULT_UNIT_LIMIT,
  };
}

export function loadState() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (saved?.schedules?.length) {
      return {
        ...initialState(),
        ...saved,
        activeId: saved.schedules.some((s) => s.id === saved.activeId)
          ? saved.activeId
          : saved.schedules[0].id,
      };
    }
  } catch {
    // Storage unavailable or corrupt: start fresh.
  }
  return initialState();
}

export function saveState(state) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Storage unavailable (private mode): planner still works for the session.
  }
}

function newItem(code) {
  const course = courseByCode[code];
  const sections = sectionsByCourse[code] ?? [];
  return {
    code,
    // A course with a single section has nothing to choose.
    sectionId: sections.length === 1 ? sections[0].id : null,
    units: course.unitsMin,
  };
}

function updateActive(state, update) {
  return {
    ...state,
    schedules: state.schedules.map((schedule) =>
      schedule.id === state.activeId ? update(schedule) : schedule
    ),
  };
}

function updateItem(state, code, changes) {
  return updateActive(state, (schedule) => ({
    ...schedule,
    items: schedule.items.map((item) =>
      item.code === code ? { ...item, ...changes } : item
    ),
  }));
}

function nextPlanName(schedules) {
  const names = new Set(schedules.map((schedule) => schedule.name));
  for (let i = 0; i < 26; i++) {
    const name = `Plan ${String.fromCharCode(65 + i)}`;
    if (!names.has(name)) return name;
  }
  return `Plan ${schedules.length + 1}`;
}

export function plannerReducer(state, action) {
  switch (action.type) {
    case "addCourse":
      return updateActive(state, (schedule) =>
        schedule.items.some((item) => item.code === action.code)
          ? schedule
          : { ...schedule, items: [...schedule.items, newItem(action.code)] }
      );

    case "removeCourse":
      return updateActive(state, (schedule) => ({
        ...schedule,
        items: schedule.items.filter((item) => item.code !== action.code),
      }));

    case "setSection":
      return updateItem(state, action.code, { sectionId: action.sectionId });

    case "setUnits":
      return updateItem(state, action.code, { units: action.units });

    case "applyArrangement":
      return updateActive(state, (schedule) => ({
        ...schedule,
        items: schedule.items.map((item) =>
          item.code in action.arrangement
            ? { ...item, sectionId: action.arrangement[item.code] }
            : item
        ),
      }));

    case "clearSchedule":
      return updateActive(state, (schedule) => ({ ...schedule, items: [] }));

    case "createSchedule": {
      const schedule = emptySchedule(nextPlanName(state.schedules));
      return {
        ...state,
        schedules: [...state.schedules, schedule],
        activeId: schedule.id,
      };
    }

    case "duplicateSchedule": {
      const source = state.schedules.find((s) => s.id === action.id);
      const copy = {
        ...source,
        id: newId(),
        name: `${source.name} (copy)`,
        items: source.items.map((item) => ({ ...item })),
      };
      return {
        ...state,
        schedules: [...state.schedules, copy],
        activeId: copy.id,
      };
    }

    case "importSchedule": {
      const schedule = {
        id: newId(),
        name: action.schedule.name,
        items: action.schedule.items.filter((item) => courseByCode[item.code]),
      };
      return {
        ...state,
        schedules: [...state.schedules, schedule],
        activeId: schedule.id,
      };
    }

    case "renameSchedule":
      return {
        ...state,
        schedules: state.schedules.map((schedule) =>
          schedule.id === action.id
            ? { ...schedule, name: action.name }
            : schedule
        ),
      };

    case "deleteSchedule": {
      const remaining = state.schedules.filter((s) => s.id !== action.id);
      const schedules = remaining.length
        ? remaining
        : [emptySchedule("Plan A")];
      return {
        ...state,
        schedules,
        activeId: schedules.some((s) => s.id === state.activeId)
          ? state.activeId
          : schedules[0].id,
      };
    }

    case "setActive":
      return { ...state, activeId: action.id };

    case "toggleCompleted":
      return {
        ...state,
        completed: state.completed.includes(action.code)
          ? state.completed.filter((code) => code !== action.code)
          : [...state.completed, action.code],
      };

    case "addCompleted":
      return state.completed.includes(action.code)
        ? state
        : { ...state, completed: [...state.completed, action.code] };

    case "setUnitLimit":
      return { ...state, unitLimit: action.unitLimit };

    default:
      throw new Error(`Unknown planner action: ${action.type}`);
  }
}
