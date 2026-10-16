import {
  ADZUNA_REVALIDATE_SECONDS,
  ADZUNA_SEARCHES,
  COMPANIES,
  JOBS_REVALIDATE_SECONDS,
  REMOTE_BOARDS,
  type AtsCompany,
  type AtsName,
} from "./config";
import {
  decodeEntities,
  experienceFor,
  htmlToText,
  isProductRole,
  isRecent,
  levelFor,
  regionFor,
  remoteIsRestricted,
  toMs,
} from "./classify";
import { SOURCE_LABELS, type JobWithDetail, type SourceId } from "./types";

type FetchOpts = { fresh?: boolean; revalidate?: number };

async function getJson(url: string, opts: FetchOpts = {}, headers: Record<string, string> = {}) {
  const res = await fetch(url, {
    headers: { Accept: "application/json", "User-Agent": "PMRadar/1.0 (job aggregator)", ...headers },
    signal: AbortSignal.timeout(12_000),
    ...(opts.fresh ? { cache: "no-store" as const } : { next: { revalidate: opts.revalidate ?? JOBS_REVALIDATE_SECONDS } }),
  });
  if (!res.ok) throw Object.assign(new Error(`${res.status} ${url.split("?")[0]}`), { status: res.status });
  return res.json();
}

const ATS_SOURCES: SourceId[] = ["greenhouse", "lever", "ashby", "workable", "smartrecruiters", "keka"];
const isAts = (s: SourceId) => ATS_SOURCES.includes(s);

/** "grafanalabs" -> "Grafanalabs", "urban-company" -> "Urban Company" */
export function prettyName(slug: string) {
  return slug
    .split(/[-_.]+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

/** Builds a job if it's a product role in India or remote; otherwise null. */
function makeJob(input: {
  source: SourceId;
  rawId: string | number;
  board?: string;
  title: string;
  company: string;
  location: string;
  isRemote?: boolean;
  /** Skip location checks: the source only returns jobs in this region. */
  region?: "india";
  url: string;
  postedAt: unknown;
  description?: string;
}): JobWithDetail | null {
  const title = decodeEntities(String(input.title || "")).trim();
  if (!title || !input.url || !isProductRole(title)) return null;
  const location = decodeEntities(input.location || "").trim();
  const region = input.region ?? regionFor(location, input.isRemote);
  if (!region) return null;
  const postedAt = toMs(input.postedAt);
  if (!isRecent(postedAt)) return null;
  const job: JobWithDetail = {
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
    postedAt,
    expMin: null,
    expMax: null,
  };
  return withDescription(job, input.description ?? "");
}

/**
 * Reads experience and country limits from a description and stores a short
 * copy of it on the job (for the AI match).
 */
export function withDescription(job: JobWithDetail, description: string): JobWithDetail {
  const exp = experienceFor(job.title, description);
  job.expMin = exp?.min ?? null;
  job.expMax = exp?.max ?? null;
  if (job.region === "remote" && remoteIsRestricted(description)) job.region = "remote-restricted";
  if (description) job.description = description.slice(0, 4000);
  return job;
}

/** Fetches the full description for jobs whose board list doesn't include it. */
export async function fetchDescription(job: JobWithDetail): Promise<string> {
  if (job.description && job.description.length > 200) return job.description;
  if (job.source === "greenhouse" && job.board && job.rawId) {
    const d = await getJson(`https://boards-api.greenhouse.io/v1/boards/${job.board}/jobs/${job.rawId}`, { fresh: true });
    return htmlToText(decodeEntities(d.content ?? ""), 12000);
  }
  if (job.source === "smartrecruiters" && job.board && job.rawId) {
    const d = await getJson(`https://api.smartrecruiters.com/v1/companies/${job.board}/postings/${job.rawId}`, { fresh: true });
    const sec = d.jobAd?.sections ?? {};
    return htmlToText(
      [sec.jobDescription?.text, sec.qualifications?.text, sec.additionalInformation?.text].filter(Boolean).join("\n"),
      12000
    );
  }
  return job.description ?? "";
}

/** Adds descriptions (and so experience and country limits) to jobs that lack them. */
export async function enrichJobs(jobs: JobWithDetail[], workers = 12): Promise<JobWithDetail[]> {
  const needs = jobs.filter((j) => !j.description || j.description.length < 200);
  await pool(needs, workers, async (j) => {
    try {
      withDescription(j, await fetchDescription(j));
    } catch {
      /* keep the job without a description */
    }
  });
  return jobs;
}

// ---------- Company job boards (ATS) ----------
// Every function returns the product roles found plus how many postings the
// board had in total (0 means the board exists but is empty).

type BoardResult = { jobs: (JobWithDetail | null)[]; total: number };

async function fromGreenhouse(c: AtsCompany, o: FetchOpts): Promise<BoardResult> {
  const data = await getJson(`https://boards-api.greenhouse.io/v1/boards/${c.board}/jobs`, o);
  const list = data.jobs ?? [];
  return {
    total: list.length,
    jobs: list.map((j: any) =>
      makeJob({
        source: "greenhouse",
        board: c.board,
        rawId: j.id,
        title: j.title,
        company: c.name || j.company_name || prettyName(c.board),
        location: j.location?.name ?? "",
        url: j.absolute_url,
        postedAt: j.first_published ?? j.updated_at,
      })
    ),
  };
}

async function fromLever(c: AtsCompany, o: FetchOpts): Promise<BoardResult> {
  const data = await getJson(`https://api.lever.co/v0/postings/${c.board}?mode=json`, o);
  const list = Array.isArray(data) ? data : [];
  return {
    total: list.length,
    jobs: list.map((j: any) => {
      const locs: string[] = j.categories?.allLocations ?? [j.categories?.location].filter(Boolean);
      return makeJob({
        source: "lever",
        board: c.board,
        rawId: j.id,
        title: j.text,
        company: c.name || prettyName(c.board),
        location: locs.join(", "),
        isRemote: j.workplaceType === "remote",
        url: j.hostedUrl,
        postedAt: j.createdAt,
        description: [
          j.descriptionPlain,
          ...(j.lists ?? []).map((l: any) => `${l.text}\n${htmlToText(l.content ?? "")}`),
          j.additionalPlain,
        ]
          .filter(Boolean)
          .join("\n\n")
          .slice(0, 8000),
      });
    }),
  };
}

async function fromAshby(c: AtsCompany, o: FetchOpts): Promise<BoardResult> {
  const data = await getJson(`https://api.ashbyhq.com/posting-api/job-board/${c.board}`, o);
  const list = (data.jobs ?? []).filter((j: any) => j.isListed !== false);
  return {
    total: list.length,
    jobs: list.map((j: any) =>
      makeJob({
        source: "ashby",
        board: c.board,
        rawId: j.id,
        title: j.title,
        company: c.name || prettyName(c.board),
        location: [j.location, ...(j.secondaryLocations ?? []).map((s: any) => s.location)].filter(Boolean).join(", "),
        isRemote: j.isRemote === true || j.workplaceType === "Remote",
        url: j.jobUrl,
        postedAt: j.publishedAt,
        description: (j.descriptionPlain ?? "").slice(0, 8000),
      })
    ),
  };
}

async function fromWorkable(c: AtsCompany, o: FetchOpts): Promise<BoardResult> {
  const data = await getJson(`https://apply.workable.com/api/v1/widget/accounts/${c.board}?details=true`, o);
  const list = data.jobs ?? [];
  return {
    total: list.length,
    jobs: list.map((j: any) =>
      makeJob({
        source: "workable",
        board: c.board,
        rawId: j.shortcode ?? j.id,
        title: j.title,
        company: c.name || data.name || prettyName(c.board),
        location: [j.city, j.state, j.country].filter(Boolean).join(", "),
        isRemote: j.telecommuting === true,
        url: j.url ?? j.application_url,
        postedAt: j.published_on ?? j.created_at,
        description: htmlToText(j.description ?? ""),
      })
    ),
  };
}

async function fromSmartRecruiters(c: AtsCompany, o: FetchOpts): Promise<BoardResult> {
  const data = await getJson(`https://api.smartrecruiters.com/v1/companies/${c.board}/postings?limit=100`, o);
  const list = data.content ?? [];
  return {
    total: list.length,
    jobs: list.map((j: any) => {
      const loc = j.location ?? {};
      return makeJob({
        source: "smartrecruiters",
        board: c.board,
        rawId: j.id,
        title: j.name,
        company: c.name || j.company?.name || prettyName(c.board),
        location: [loc.city, loc.region, loc.country === "in" ? "India" : loc.country].filter(Boolean).join(", "),
        isRemote: loc.remote === true,
        url: j.postingUrl ?? `https://jobs.smartrecruiters.com/${c.board}/${j.id}`,
        postedAt: j.releasedDate,
      });
    }),
  };
}

// Keka: HR software used by many Indian startups. Its careers pages publish
// open jobs as JSON at {company}.keka.com/careers/api/jobs/default/active.
async function fromKeka(c: AtsCompany, o: FetchOpts): Promise<BoardResult> {
  const data = await getJson(`https://${c.board}.keka.com/careers/api/jobs/default/active`, o);
  const list = Array.isArray(data) ? data : [];
  return {
    total: list.length,
    jobs: list.map((j: any) => {
      const locs: any[] = j.jobLocations ?? [];
      const location = locs
        .map((l) => [l.city || l.name, l.countryName].filter(Boolean).join(", "))
        .filter(Boolean)
        .join("; ");
      const job = makeJob({
        source: "keka",
        board: c.board,
        rawId: j.id,
        title: j.title,
        company: c.name || prettyName(c.board),
        location: location || "India",
        isRemote: /remote/i.test(location) || /remote/i.test(j.title ?? ""),
        url: `https://${c.board}.keka.com/careers/jobdetails/${j.id}`,
        postedAt: j.publishedOn,
        description: htmlToText(j.description ?? j.excerpt ?? ""),
      });
      // Keka has its own experience field, e.g. "2-5", "6–8 years", "2 7".
      const nums = String(j.experience ?? "").match(/\d{1,2}/g)?.map(Number) ?? [];
      if (job && nums.length && nums[0] <= 25) {
        job.expMin = nums[0];
        job.expMax = nums[1] !== undefined && nums[1] >= nums[0] ? nums[1] : null;
      }
      return job;
    }),
  };
}

const FETCHERS: Record<AtsName, (c: AtsCompany, o: FetchOpts) => Promise<BoardResult>> = {
  greenhouse: fromGreenhouse,
  lever: fromLever,
  ashby: fromAshby,
  workable: fromWorkable,
  smartrecruiters: fromSmartRecruiters,
  keka: fromKeka,
};

export type BoardOutcome = {
  key: string; // "lever:cred"
  ok: boolean;
  status?: number; // HTTP status when it failed
  total: number; // postings on the board
  jobs: JobWithDetail[];
};

/** Fetches one company's board; never throws. */
export async function fetchBoard(c: AtsCompany, o: FetchOpts = {}): Promise<BoardOutcome> {
  const key = `${c.ats}:${c.board}`;
  try {
    const r = await FETCHERS[c.ats](c, o);
    return { key, ok: true, total: r.total, jobs: r.jobs.filter((j): j is JobWithDetail => Boolean(j)) };
  } catch (e: any) {
    return { key, ok: false, status: e?.status, total: 0, jobs: [] };
  }
}

/** Runs async work over a list with a fixed number of parallel workers. */
export async function pool<T, R>(items: T[], workers: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let next = 0;
  await Promise.all(
    Array.from({ length: Math.min(workers, items.length) }, async () => {
      while (next < items.length) {
        const i = next++;
        out[i] = await fn(items[i]);
      }
    })
  );
  return out;
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

// ---------- Adzuna (India job sites) ----------

// Adzuna categories that are not product management in India (pharma and
// FMCG "product managers" are brand or sales roles).
const ADZUNA_SKIP_CATEGORY = /sales|healthcare|nursing|retail|manufacturing|pharma|logistics|trade|construction|hospitality|teaching/i;
const ADZUNA_SKIP_TITLE = /pharma|medical|sales|insurance|loan|mutual fund|brand manager|area manager|regional|territory/i;

async function fromAdzuna(o: FetchOpts) {
  const id = process.env.ADZUNA_APP_ID;
  const key = process.env.ADZUNA_APP_KEY;
  if (!id || !key) return [];
  const calls: Promise<any>[] = [];
  for (const s of ADZUNA_SEARCHES) {
    for (let page = 1; page <= s.pages; page++) {
      const q = new URLSearchParams({
        app_id: id,
        app_key: key,
        results_per_page: "50",
        title_only: s.title,
        max_days_old: "30",
        sort_by: "date",
        "content-type": "application/json",
      });
      calls.push(
        getJson(`https://api.adzuna.com/v1/api/jobs/in/search/${page}?${q}`, {
          ...o,
          revalidate: ADZUNA_REVALIDATE_SECONDS,
        }).catch((e) => {
          console.warn("[jobs] Adzuna search failed:", String(e).replace(key, "***").slice(0, 160));
          return { results: [] };
        })
      );
    }
  }
  const pages = await Promise.all(calls);
  return pages
    .flatMap((p) => p.results ?? [])
    .filter((j: any) => !ADZUNA_SKIP_CATEGORY.test(j.category?.label ?? "") && !ADZUNA_SKIP_TITLE.test(j.title ?? ""))
    .map((j: any) => {
      const loc = String(j.location?.display_name ?? "India");
      return makeJob({
        source: "adzuna",
        rawId: j.id,
        title: htmlToText(String(j.title ?? ""), 200),
        company: j.company?.display_name || "Company not listed",
        location: /india/i.test(loc) ? loc : `${loc}, India`,
        region: "india",
        url: j.redirect_url,
        postedAt: j.created,
        description: htmlToText(String(j.description ?? "")),
      });
    });
}

// ---------- Run everything ----------

export type SourceReport = { name: string; ok: boolean; count: number };

/** Removes repeats (the same role on several boards) and sorts newest first. */
export function dedupe(lists: JobWithDetail[][]) {
  const seen = new Set<string>();
  const out: JobWithDetail[] = [];
  for (const list of lists)
    for (const j of list) {
      const key = `${j.company}|${j.title}|${j.location}`.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(j);
    }
  return out.sort((a, b) => (b.postedAt ?? 0) - (a.postedAt ?? 0));
}

/** Remote job boards plus Adzuna (if keys are set). */
export async function fetchExtraSources(opts: FetchOpts = {}) {
  const tasks: { name: string; run: () => Promise<(JobWithDetail | null)[]> }[] = [];
  if (REMOTE_BOARDS.remotive) tasks.push({ name: "Remotive", run: () => fromRemotive(opts) });
  if (REMOTE_BOARDS.remoteok) tasks.push({ name: "Remote OK", run: () => fromRemoteOk(opts) });
  if (REMOTE_BOARDS.himalayas) tasks.push({ name: "Himalayas", run: () => fromHimalayas(opts) });
  tasks.push({ name: "Adzuna (India job sites)", run: () => fromAdzuna(opts) });

  const settled = await Promise.allSettled(tasks.map((t) => t.run()));
  const lists: JobWithDetail[][] = [];
  const report: SourceReport[] = [];
  settled.forEach((r, i) => {
    if (r.status === "rejected") {
      console.warn(`[jobs] ${tasks[i].name} failed:`, String(r.reason).slice(0, 160));
      report.push({ name: tasks[i].name, ok: false, count: 0 });
      return;
    }
    const jobs = r.value.filter((j): j is JobWithDetail => Boolean(j));
    lists.push(jobs);
    report.push({ name: tasks[i].name, ok: true, count: jobs.length });
  });
  return { lists, report };
}

/** Live fetch of the small built-in company list. Used before the crawler has run. */
export async function fetchAllSources(opts: FetchOpts = {}) {
  const [boards, extra] = await Promise.all([
    pool(COMPANIES, 12, (c) => fetchBoard(c, opts)),
    fetchExtraSources(opts),
  ]);
  const report: SourceReport[] = [
    ...boards.map((b, i) => ({ name: COMPANIES[i].name ?? COMPANIES[i].board, ok: b.ok, count: b.jobs.length })),
    ...extra.report,
  ];
  return { jobs: dedupe([...boards.map((b) => b.jobs), ...extra.lists]), report };
}
