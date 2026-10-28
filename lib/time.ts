const HOUR = 3_600_000;
const DAY = 24 * HOUR;

export function ago(ms: number | null, now: number) {
  if (!ms) return "Date not listed";
  const diff = Math.max(0, now - ms);
  if (diff < HOUR) return "Just posted";
  if (diff < DAY) return `${Math.floor(diff / HOUR)}h ago`;
  const d = Math.floor(diff / DAY);
  if (d < 30) return `${d}d ago`;
  const m = Math.floor(d / 30);
  return `${m} mo ago`;
}

/** "Date not listed, first seen 3d ago" for roles with no posting date. */
export function whenLabel(postedAt: number | null, firstSeenAt: number | undefined, now: number) {
  if (postedAt) return ago(postedAt, now);
  if (!firstSeenAt || firstSeenAt <= 1) return "Date not listed";
  const diff = Math.max(0, now - firstSeenAt);
  const d = Math.floor(diff / DAY);
  return d < 1 ? "Date not listed · first seen today" : `Date not listed · first seen ${d}d ago`;
}

export type Bucket = "today" | "week" | "earlier" | "undated";

export function bucketFor(ms: number | null, now: number): Bucket {
  if (!ms) return "undated";
  const diff = now - ms;
  if (diff < DAY) return "today";
  if (diff < 7 * DAY) return "week";
  return "earlier";
}

export const BUCKET_LABEL: Record<Bucket, string> = {
  today: "Today",
  week: "This week",
  earlier: "Earlier",
  undated: "Date not listed",
};
