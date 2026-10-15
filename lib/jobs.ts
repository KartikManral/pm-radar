import { unstable_cache } from "next/cache";
import { mockJobs } from "./mock";
import { redis } from "./redis";
import { fetchAllSources, fetchDescription, type SourceReport } from "./sources";
import type { Job, JobWithDetail } from "./types";

export const MOCK_MODE = process.env.MOCK_JOBS === "1";

export type CrawlMeta = {
  crawledAt: number;
  roles: number;
  boardsChecked: number;
  boardsWorking: number;
  boardsWithRoles: number;
  discoveredIndianBoards: number;
  report: SourceReport[];
  [k: string]: unknown;
};

type Loaded = {
  jobs: JobWithDetail[];
  report: SourceReport[];
  fetchedAt: number;
  meta?: CrawlMeta | null;
  from: "crawler" | "live" | "mock";
};

async function load(fresh: boolean): Promise<Loaded> {
  if (MOCK_MODE) return { jobs: mockJobs(), report: [], fetchedAt: Date.now(), from: "mock" };

  // Normal case: the crawler (GitHub Actions) has saved the list to Redis.
  if (redis) {
    try {
      const [list, meta] = await Promise.all([
        redis.get<JobWithDetail[]>("jobs:list"),
        redis.get<CrawlMeta>("jobs:meta"),
      ]);
      if (list && list.length) {
        return { jobs: list, report: meta?.report ?? [], fetchedAt: meta?.crawledAt ?? Date.now(), meta, from: "crawler" };
      }
    } catch (e) {
      console.warn("[jobs] Redis read failed, fetching live:", String(e).slice(0, 160));
    }
  }

  // Before the crawler's first run: fetch the small built-in list live.
  const { jobs, report } = await fetchAllSources({ fresh });
  return { jobs, report, fetchedAt: Date.now(), from: "live" };
}

/** Cached list; picks up a new crawl within about 10 minutes. */
export const getJobsCached = unstable_cache(() => load(false), ["all-jobs-v2"], { revalidate: 600 });

/** Uncached; used by the daily email. */
export const getJobsFresh = () => load(true);

/** Drops server-only fields before sending to the browser. */
export function toPublic(j: JobWithDetail): Job {
  const { description: _d, board: _b, rawId: _r, ...rest } = j;
  return rest;
}

export async function findJob(id: string): Promise<JobWithDetail | undefined> {
  const { jobs } = await getJobsCached();
  return jobs.find((j) => j.id === id);
}

/** Job description for the AI match: saved by the crawler, or fetched live. */
export async function getDescription(job: JobWithDetail): Promise<string> {
  if (job.description && job.description.length > 200) return job.description;
  if (redis) {
    try {
      const saved = await redis.hget<string>("jobs:desc", job.id);
      if (typeof saved === "string" && saved.length > 100) return saved;
    } catch {
      /* fall through to a live fetch */
    }
  }
  return fetchDescription(job);
}
