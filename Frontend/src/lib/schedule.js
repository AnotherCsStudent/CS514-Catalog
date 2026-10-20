import { courseByCode } from "../data/courses";
import { sectionById, sectionsByCourse } from "../data/sections";
import { sectionsOverlap } from "./time";

// Expand stored schedule items ({ code, sectionId, units }) with their data.
export function resolveItems(schedule) {
  return schedule.items
    .filter((item) => courseByCode[item.code])
    .map((item) => ({
      ...item,
      course: courseByCode[item.code],
      section: item.sectionId ? sectionById[item.sectionId] ?? null : null,
      sections: sectionsByCourse[item.code] ?? [],
    }));
}

export function totalUnits(items) {
  return items.reduce((sum, item) => sum + item.units, 0);
}

export function findConflicts(items) {
  const scheduled = items.filter((item) => item.section);
  const conflicts = [];

  for (let i = 0; i < scheduled.length; i++) {
    for (let j = i + 1; j < scheduled.length; j++) {
      if (sectionsOverlap(scheduled[i].section, scheduled[j].section)) {
        conflicts.push([scheduled[i], scheduled[j]]);
      }
    }
  }

  return conflicts;
}

// Codes of the other scheduled items that `section` would overlap.
export function conflictsFor(section, items, ownCode = section.courseCode) {
  return items
    .filter(
      (item) =>
        item.code !== ownCode &&
        item.section &&
        sectionsOverlap(item.section, section)
    )
    .map((item) => item.code);
}

/**
 * Choose a section for every item that has sections so that nothing overlaps.
 * Keeps current choices when possible and prefers sections with open seats.
 * Returns { code: sectionId } or null when no conflict-free arrangement exists.
 */
export function autoArrange(items) {
  const candidates = items
    .filter((item) => item.sections.length)
    .map((item) => ({
      code: item.code,
      options: [...item.sections].sort(
        (a, b) =>
          (b.id === item.sectionId) - (a.id === item.sectionId) ||
          (b.seatsOpen > 0) - (a.seatsOpen > 0)
      ),
    }))
    // Most constrained first keeps the search small.
    .sort((a, b) => a.options.length - b.options.length);

  const chosen = [];

  function search(index) {
    if (index === candidates.length) return true;
    for (const option of candidates[index].options) {
      if (chosen.every((picked) => !sectionsOverlap(picked, option))) {
        chosen.push(option);
        if (search(index + 1)) return true;
        chosen.pop();
      }
    }
    return false;
  }

  if (!search(0)) return null;
  return Object.fromEntries(
    chosen.map((section) => [section.courseCode, section.id])
  );
}

export function summarize(items) {
  const meetings = items.flatMap((item) => item.section?.meetings ?? []);

  return {
    courses: items.length,
    units: totalUnits(items),
    conflicts: findConflicts(items).length,
    unscheduled: items.filter((item) => item.sections.length && !item.section)
      .length,
    campusDays: new Set(meetings.flatMap((meeting) => meeting.days)).size,
    earliest: meetings.length
      ? Math.min(...meetings.map((meeting) => meeting.start))
      : null,
    latest: meetings.length
      ? Math.max(...meetings.map((meeting) => meeting.end))
      : null,
    online: items.filter((item) => item.section && !item.section.meetings.length)
      .length,
  };
}
