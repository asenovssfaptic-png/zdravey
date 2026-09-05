/** Local-date key "YYYY-MM-DD" — same format the web app stores in
 * daysPlayed / wodDate, so a migrated save keeps its day count. */
export function todayKey(d: Date = new Date()): string {
  const m = d.getMonth() + 1;
  const day = d.getDate();
  return `${d.getFullYear()}-${m < 10 ? "0" : ""}${m}-${day < 10 ? "0" : ""}${day}`;
}
