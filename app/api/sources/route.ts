import { NextResponse } from "next/server";
import { getJobsCached } from "@/lib/jobs";

// Health check for job sources. Open /api/sources in the browser.
export async function GET() {
  const { jobs, report, fetchedAt, meta, from } = await getJobsCached();
  const byRegion = jobs.reduce<Record<string, number>>((acc, j) => {
    acc[j.region] = (acc[j.region] ?? 0) + 1;
    return acc;
  }, {});
  return NextResponse.json({
    dataFrom: from === "crawler" ? "crawler (GitHub Actions)" : from === "live" ? "live fetch (crawler hasn't run yet)" : "sample data",
    updatedAt: new Date(fetchedAt).toISOString(),
    totalRoles: jobs.length,
    byRegion,
    crawler: meta
      ? {
          boardsChecked: meta.boardsChecked,
          boardsWorking: meta.boardsWorking,
          boardsWithRoles: meta.boardsWithRoles,
          discoveredIndianBoards: meta.discoveredIndianBoards,
          tookSeconds: meta.tookSeconds,
        }
      : null,
    adzunaConnected: Boolean(process.env.ADZUNA_APP_ID && process.env.ADZUNA_APP_KEY),
    sources: [...report].sort((a, b) => b.count - a.count),
  });
}
