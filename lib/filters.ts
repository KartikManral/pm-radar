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
