import JobBoard from "@/components/JobBoard";
import { COMPANIES, EXTERNAL_SEARCHES } from "@/lib/config";
import { getJobsCached, toPublic } from "@/lib/jobs";

// Rebuild the page at most once an hour.
export const revalidate = 3600;

export default async function Home() {
  const { jobs, fetchedAt, report } = await getJobsCached();
  const live = report.filter((r) => r.ok).length;
  return (
    <JobBoard
      jobs={jobs.map(toPublic)}
      fetchedAt={fetchedAt}
      sourceCount={live || COMPANIES.length + 3}
      externalSearches={EXTERNAL_SEARCHES}
    />
  );
}
