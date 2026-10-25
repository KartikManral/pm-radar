import { INTERN_MAX_AGE_DAYS } from "./classify";
import type { Job, Level, Region } from "./types";

export type Prefs = { regions: Region[]; levels: Level[] };

export function matchesPrefs(j: Job, p: Prefs) {
  return p.regions.includes(j.region) && p.levels.includes(j.level);
}

export const ALL_LEVELS: Level[] = ["intern", "entry", "pm", "senior"];
export const ALL_REGIONS: Region[] = ["india", "remote", "remote-restricted"];

export function parseList<T extends string>(raw: unknown, allowed: T[], fallback: T[] = allowed): T[] {
  const items = Array.isArray(raw) ? raw : String(raw || "").split(",");
  const out = items
    .map((s) => String(s).trim())
    .filter((s): s is T => (allowed as string[]).includes(s));
  return out.length ? [...new Set(out)] : fallback;
}

// ---------- Experience and recency filters (job list) ----------

export type ExpBucket = "any" | "0-2" | "2-4" | "4-6" | "6-8" | "8-12" | "12+";

export const EXP_BUCKETS: { id: ExpBucket; label: string; lo: number; hi: number }[] = [
  { id: "any", label: "Any experience", lo: 0, hi: 99 },
  { id: "0-2", label: "0–2 years", lo: 0, hi: 2 },
  { id: "2-4", label: "2–4 years", lo: 2, hi: 4 },
  { id: "4-6", label: "4–6 years", lo: 4, hi: 6 },
  { id: "6-8", label: "6–8 years", lo: 6, hi: 8 },
  { id: "8-12", label: "8–12 years", lo: 8, hi: 12 },
  { id: "12+", label: "12+ years", lo: 12, hi: 99 },
];

/** Does a job's experience range overlap the chosen bucket? Unknown never matches a bucket. */
export function matchesExperience(j: Job, bucket: ExpBucket) {
  if (bucket === "any") return true;
  const min = j.expMin ?? null;
  if (min === null) return false;
  const max = j.expMax ?? min + 3;
  const b = EXP_BUCKETS.find((x) => x.id === bucket)!;
  return min < b.hi && max >= b.lo;
}

export function expLabel(j: Job): string | null {
  const min = j.expMin ?? null;
  if (min === null) return null;
  if (j.expMax != null) return `${min}–${j.expMax} yrs`;
  return min === 0 ? "No experience needed" : `${min}+ yrs`;
}

export type Recency = "30" | "1" | "3" | "7" | "14";

export const RECENCY: { id: Recency; label: string }[] = [
  { id: "30", label: "Last 30 days (internships 60)" },
  { id: "14", label: "Last 2 weeks" },
  { id: "7", label: "Last 7 days" },
  { id: "3", label: "Last 3 days" },
  { id: "1", label: "Last 24 hours" },
];

/**
 * Is the role inside the chosen window? The widest window gives internships 60
 * days. Roles with no posting date only show in the widest window, because we
 * can't tell how old they are.
 */
export function withinDays(j: Job, days: number, now: number) {
  if (j.postedAt == null) return days >= 30;
  const limit = j.level === "intern" && days >= 30 ? INTERN_MAX_AGE_DAYS : days;
  return now - j.postedAt < limit * 24 * 3_600_000;
}

/** Posted, or (for roles with no posting date) first seen, in the last 24 hours. */
export function isNewToday(j: Job, now: number) {
  const DAY = 24 * 3_600_000;
  if (j.postedAt != null) return now - j.postedAt < DAY && now - j.postedAt > -2 * DAY;
  return j.firstSeenAt != null && now - j.firstSeenAt < DAY;
}
