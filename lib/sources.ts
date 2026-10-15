import { COMPANIES, JOBS_REVALIDATE_SECONDS, REMOTE_BOARDS, type AtsCompany } from "./config";
import { decodeEntities, htmlToText, isProductRole, levelFor, regionFor, toMs } from "./classify";
import { SOURCE_LABELS, type JobWithDetail, type SourceId } from "./types";

type FetchOpts = { fresh?: boolean };

async function getJson(url: string, opts: FetchOpts = {}, headers: Record<string, string> = {}) {
  const res = await fetch(url, {
    headers: { Accept: "application/json", "User-Agent": "PMRadar/1.0 (job aggregator)", ...headers },
    signal: AbortSignal.timeout(12_000),
    ...(opts.fresh ? { cache: "no-store" as const } : { next: { revalidate: JOBS_REVALIDATE_SECONDS } }),
  });
  if (!res.ok) throw new Error(`${res.status} ${url}`);
  return res.json();
}

const isAts = (s: SourceId) => s === "greenhouse" || s === "lever" || s === "ashby";

/** Builds a job if it's a product role in India or remote; otherwise null. */
function makeJob(input: {
  source: SourceId;
  rawId: string | number;
  board?: string;
  title: string;
  company: string;
  location: string;
  isRemote?: boolean;
  url: string;
  postedAt: unknown;
  description?: string;
}): JobWithDetail | null {
  const title = decodeEntities(String(input.title || "")).trim();
  if (!title || !input.url || !isProductRole(title)) return null;
  const location = decodeEntities(input.location || "").trim();
  const region = regionFor(location, input.isRemote);
  if (!region) return null;
  return {
    id: [input.source, input.board, input.rawId].filter(Boolean).join("~"),
    rawId: String(input.rawId),
    board: input.board,
    title,
    company: input.company,
    location: location || "Remote",
    region,
    level: levelFor(title),
    source: input.source,
    sourceLabel: isAts(input.source) ? `${input.company} careers` : SOURCE_LABELS[input.source],
    url: input.url,
    postedAt: toMs(input.postedAt),
    // Kept short so the cached list stays small.
    description: input.description?.slice(0, 4000),
  };
}

// ---------- Company job boards (ATS) ----------

async function fromGreenhouse(c: AtsCompany, o: FetchOpts) {
  const data = await getJson(`https://boards-api.greenhouse.io/v1/boards/${c.board}/jobs`, o);
  return (data.jobs ?? []).map((j: any) =>
    makeJob({
      source: "greenhouse",
      board: c.board,
      rawId: j.id,
      title: j.title,
      company: c.name,
      location: j.location?.name ?? "",
      url: j.absolute_url,
      postedAt: j.first_published ?? j.updated_at,
    })
  );
}

async function fromLever(c: AtsCompany, o: FetchOpts) {
  const data = await getJson(`https://api.lever.co/v0/postings/${c.board}?mode=json`, o);
  return (Array.isArray(data) ? data : []).map((j: any) => {
    const locs: string[] = j.categories?.allLocations ?? [j.categories?.location].filter(Boolean);
    return makeJob({
      source: "lever",
      board: c.board,
      rawId: j.id,
      title: j.text,
      company: c.name,
      location: locs.join(", "),
      isRemote: j.workplaceType === "remote",
      url: j.hostedUrl,
      postedAt: j.createdAt,
      description: [j.descriptionPlain, ...(j.lists ?? []).map((l: any) => `${l.text}\n${htmlToText(l.content ?? "")}`), j.additionalPlain]
        .filter(Boolean)
        .join("\n\n")
        .slice(0, 8000),
    });
  });
}

async function fromAshby(c: AtsCompany, o: FetchOpts) {
  const data = await getJson(`https://api.ashbyhq.com/posting-api/job-board/${c.board}`, o);
  return (data.jobs ?? [])
    .filter((j: any) => j.isListed !== false)
    .map((j: any) =>
      makeJob({
        source: "ashby",
        board: c.board,
        rawId: j.id,
        title: j.title,
        company: c.name,
        location: [j.location, ...(j.secondaryLocations ?? []).map((s: any) => s.location)].filter(Boolean).join(", "),
        isRemote: j.isRemote === true || j.workplaceType === "Remote",
        url: j.jobUrl,
        postedAt: j.publishedAt,
        description: (j.descriptionPlain ?? "").slice(0, 8000),
      })
    );
}

// ---------- Remote job boards ----------

async function fromRemotive(o: FetchOpts) {
  const data = await getJson("https://remotive.com/api/remote-jobs?category=product", o);
  return (data.jobs ?? []).map((j: any) =>
    makeJob({
      source: "remotive",
      rawId: j.id,
      title: j.title,
      company: j.company_name,
      location: j.candidate_required_location || "Worldwide",
      isRemote: true,
      url: j.url,
      postedAt: j.publication_date,
      description: htmlToText(j.description ?? ""),
    })
  );
}

async function fromRemoteOk(o: FetchOpts) {
  const data = await getJson("https://remoteok.com/api?tag=product", o);
  return (Array.isArray(data) ? data : [])
    .filter((j: any) => j.id && j.position)
    .map((j: any) =>
      makeJob({
        source: "remoteok",
        rawId: j.id,
        title: j.position,
        company: j.company,
        location: j.location || "Remote",
        isRemote: true,
        url: j.url,
        postedAt: j.epoch ?? j.date,
        description: htmlToText(j.description ?? ""),
      })
    );
}

async function fromHimalayas(o: FetchOpts) {
  const data = await getJson("https://himalayas.app/jobs/api/search?q=product%20manager", o);
  return (data.jobs ?? []).map((j: any) => {
    const restrictions = (j.locationRestrictions ?? [])
      .map((r: any) => (typeof r === "string" ? r : r?.name ?? r?.country ?? ""))
      .filter(Boolean);
    return makeJob({
      source: "himalayas",
      rawId: j.guid ?? j.applicationLink,
      title: j.title,
      company: j.companyName,
      location: restrictions.length ? restrictions.join(", ") : "Worldwide",
      isRemote: true,
      url: j.applicationLink ?? j.guid,
      postedAt: j.pubDate,
      description: htmlToText(j.description ?? j.excerpt ?? ""),
    });
  });
}

// ---------- Run everything ----------

export type SourceReport = { name: string; ok: boolean; count: number };

export async function fetchAllSources(opts: FetchOpts = {}) {
  const tasks: { name: string; run: () => Promise<(JobWithDetail | null)[]> }[] = [
    ...COMPANIES.map((c) => ({
      name: c.name,
      run: () =>
        c.ats === "greenhouse" ? fromGreenhouse(c, opts) : c.ats === "lever" ? fromLever(c, opts) : fromAshby(c, opts),
    })),
  ];
  if (REMOTE_BOARDS.remotive) tasks.push({ name: "Remotive", run: () => fromRemotive(opts) });
  if (REMOTE_BOARDS.remoteok) tasks.push({ name: "Remote OK", run: () => fromRemoteOk(opts) });
  if (REMOTE_BOARDS.himalayas) tasks.push({ name: "Himalayas", run: () => fromHimalayas(opts) });

  const settled = await Promise.allSettled(tasks.map((t) => t.run()));
  const jobs: JobWithDetail[] = [];
  const report: SourceReport[] = [];
  const seen = new Set<string>();

  settled.forEach((r, i) => {
    if (r.status === "rejected") {
      console.warn(`[jobs] ${tasks[i].name} failed:`, String(r.reason).slice(0, 160));
      report.push({ name: tasks[i].name, ok: false, count: 0 });
      return;
    }
    let count = 0;
    for (const j of r.value) {
      if (!j) continue;
      // The same role is often on several remote boards: keep the first.
      const key = `${j.company}|${j.title}`.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      jobs.push(j);
      count++;
    }
    report.push({ name: tasks[i].name, ok: true, count });
  });

  jobs.sort((a, b) => (b.postedAt ?? 0) - (a.postedAt ?? 0));
  return { jobs, report };
}

/** Full description for one job, used by the AI match. */
export async function fetchDescription(job: JobWithDetail): Promise<string> {
  if (job.description && job.description.length > 200) return job.description;
  if (job.source === "greenhouse" && job.board && job.rawId) {
    const d = await getJson(`https://boards-api.greenhouse.io/v1/boards/${job.board}/jobs/${job.rawId}`);
    return htmlToText(decodeEntities(d.content ?? ""));
  }
  return job.description ?? "";
}
