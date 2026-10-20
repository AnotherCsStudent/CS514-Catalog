// A schedule is shared as compact base64url JSON in the link itself, so no
// backend is needed: { n: name, i: [[code, sectionId, units], ...] }.

export function encodeSchedule(schedule) {
  const payload = {
    n: schedule.name,
    i: schedule.items.map((item) => [item.code, item.sectionId, item.units]),
  };
  const bytes = new TextEncoder().encode(JSON.stringify(payload));
  return btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

export function decodeSchedule(encoded) {
  try {
    const base64 = encoded.replace(/-/g, "+").replace(/_/g, "/");
    const bytes = Uint8Array.from(atob(base64), (char) => char.charCodeAt(0));
    const payload = JSON.parse(new TextDecoder().decode(bytes));

    return {
      name: String(payload.n || "Shared schedule"),
      items: payload.i.map(([code, sectionId, units]) => ({
        code: String(code),
        sectionId: sectionId ? String(sectionId) : null,
        units: Number(units) || 0,
      })),
    };
  } catch {
    return null;
  }
}

export function shareUrl(schedule) {
  return `${window.location.origin}/shared?s=${encodeSchedule(schedule)}`;
}
