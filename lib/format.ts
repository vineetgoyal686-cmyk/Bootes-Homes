export function formatDate(iso: string | null): string {
  if (!iso) return "TBD";
  const d = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(d.getTime())) return "TBD";
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

/** Whole months between two ISO dates (or null if the start date is unknown).
 * Used for "build duration", computed live from real dates rather than a
 * hand-typed number that would silently go stale while a project is ongoing. */
export function monthsBetween(startIso: string | null, endIso: string | null): number | null {
  if (!startIso) return null;
  const start = new Date(`${startIso}T00:00:00`);
  const end = endIso ? new Date(`${endIso}T00:00:00`) : new Date();
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return null;
  const months = (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth());
  return Math.max(0, months);
}
