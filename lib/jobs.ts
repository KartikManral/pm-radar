import { unstable_cache } from "next/cache";
import { JOBS_REVALIDATE_SECONDS } from "./config";
import { mockJobs } from "./mock";
import { fetchAllSources } from "./sources";
import type { Job, JobWithDetail } from "./types";

export const MOCK_MODE = process.env.MOCK_JOBS === "1";

async function load(fresh: boolean) {
  if (MOCK_MODE) return { jobs: mockJobs(), report: [], fetchedAt: Date.now() };
  const { jobs, report } = await fetchAllSources({ fresh });
  return { jobs, report, fetchedAt: Date.now() };
}

/** Cached list (refreshes about once an hour). */
export const getJobsCached = unstable_cache(() => load(false), ["all-jobs-v1"], {
  revalidate: JOBS_REVALIDATE_SECONDS,
});

/** Always fetches fresh data; used by the daily email. */
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
