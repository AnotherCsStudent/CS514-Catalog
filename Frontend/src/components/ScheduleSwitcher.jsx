import { useState } from "react";
import { usePlanner } from "../state/PlannerContext";

export default function ScheduleSwitcher() {
  const { state, dispatch, activeSchedule } = usePlanner();
  const [renaming, setRenaming] = useState(false);
  const [name, setName] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);

  function startRename() {
    setName(activeSchedule.name);
    setRenaming(true);
  }

  function saveRename(event) {
    event.preventDefault();
    const trimmed = name.trim();
    if (trimmed) {
      dispatch({ type: "renameSchedule", id: activeSchedule.id, name: trimmed });
    }
    setRenaming(false);
  }

  function remove() {
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    dispatch({ type: "deleteSchedule", id: activeSchedule.id });
    setConfirmDelete(false);
  }

  if (renaming) {
    return (
      <form className="schedule-switcher" onSubmit={saveRename}>
        <input
          aria-label="Schedule name"
          value={name}
          maxLength={40}
          autoFocus
          onChange={(event) => setName(event.target.value)}
        />
        <button type="submit" className="button button-primary button-sm">
          Save
        </button>
        <button
          type="button"
          className="button button-ghost button-sm"
          onClick={() => setRenaming(false)}
        >
          Cancel
        </button>
      </form>
    );
  }

  return (
    <div className="schedule-switcher">
      <select
        aria-label="Active schedule"
        value={state.activeId}
        onChange={(event) => {
          setConfirmDelete(false);
          dispatch({ type: "setActive", id: event.target.value });
        }}
      >
        {state.schedules.map((schedule) => (
          <option key={schedule.id} value={schedule.id}>
            {schedule.name} ({schedule.items.length})
          </option>
        ))}
      </select>
      <div className="button-row">
        <button
          type="button"
          className="button button-ghost button-sm"
          onClick={() => dispatch({ type: "createSchedule" })}
        >
          New
        </button>
        <button
          type="button"
          className="button button-ghost button-sm"
          onClick={() =>
            dispatch({ type: "duplicateSchedule", id: activeSchedule.id })
          }
        >
          Duplicate
        </button>
        <button
          type="button"
          className="button button-ghost button-sm"
          onClick={startRename}
        >
          Rename
        </button>
        <button
          type="button"
          className={`button button-sm ${confirmDelete ? "button-danger" : "button-ghost"}`}
          onClick={remove}
          onBlur={() => setConfirmDelete(false)}
        >
          {confirmDelete ? "Confirm delete" : "Delete"}
        </button>
      </div>
    </div>
  );
}
