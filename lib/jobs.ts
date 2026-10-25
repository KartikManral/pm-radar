import { unstable_cache } from "next/cache";
import { mockJobs } from "./mock";
import { redis } from "./redis";
import { AGGREGATOR_SOURCES, isFresh, normCompany } from "./classify";
import { BLOCKED_COMPANIES } from "../data/blocked-companies";
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

async function loadRaw(fresh: boolean): Promise<Loaded> {
  if (MOCK_MODE) return { jobs: mockJobs(), report: [], fetchedAt: Date.now(), from: "mock" };

  // Normal case: the crawler (GitHub Actions) has saved the list to Redis.
  if (redis) {
    try {
      const [list, meta] = await Promise.all([
        redis.get<JobWithDetail[]>("jobs:list"),
        redis.get<CrawlMeta>("jobs:meta"),
      ]);
      if (list && list.length) {
        // Roles can cross the 30-day (internships 60-day) line between crawls.
        const fresh = list.filter((j) => isFresh(j));
        return { jobs: fresh, report: meta?.report ?? [], fetchedAt: meta?.crawledAt ?? Date.now(), meta, from: "crawler" };
      }
    } catch (e) {
      console.warn("[jobs] Redis read failed, fetching live:", String(e).slice(0, 160));
    }
  }

  // Before the crawler's first run: fetch the small built-in list live.
  const { jobs, report } = await fetchAllSources({ fresh });
  return { jobs, report, fetchedAt: Date.now(), from: "live" };
}

/**
 * Hides listings people reported (and the ones that were reported as asking for
 * money), plus companies on the blocklist. A blocked company only loses its
 * listings from job search sites; its own career-page roles always stay.
 */
async function applyBlocks(jobs: JobWithDetail[]): Promise<JobWithDetail[]> {
  let blockedJobs = new Set<string>();
  const blockedCompanies = new Set(BLOCKED_COMPANIES.map(normCompany).filter(Boolean));
  if (redis) {
    try {
      const [ids, companies] = await Promise.all([
        redis.smembers("blocked:jobs") as Promise<string[]>,
        redis.smembers("blocked:companies") as Promise<string[]>,
      ]);
      blockedJobs = new Set(ids);
      for (const c of companies) blockedCompanies.add(c);
    } catch (e) {
      console.warn("[jobs] Couldn't read the blocked lists:", String(e).slice(0, 160));
    }
  }
  if (!blockedJobs.size && !blockedCompanies.size) return jobs;
  return jobs.filter(
    (j) => !blockedJobs.has(j.id) && !(AGGREGATOR_SOURCES.has(j.source) && blockedCompanies.has(normCompany(j.company)))
  );
}

async function load(fresh: boolean): Promise<Loaded> {
  const r = await loadRaw(fresh);
  return MOCK_MODE ? r : { ...r, jobs: await applyBlocks(r.jobs) };
}

/** Cached list; picks up a new crawl within about 10 minutes, or right away after a report. */
export const getJobsCached = unstable_cache(() => load(false), ["all-jobs-v3"], { revalidate: 600, tags: ["jobs"] });

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
