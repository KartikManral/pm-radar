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

export type Bucket = "today" | "week" | "earlier";

export function bucketFor(ms: number | null, now: number): Bucket {
  if (!ms) return "earlier";
  const diff = now - ms;
  if (diff < DAY) return "today";
  if (diff < 7 * DAY) return "week";
  return "earlier";
}

export const BUCKET_LABEL: Record<Bucket, string> = {
  today: "Today",
  week: "This week",
  earlier: "Earlier",
};
