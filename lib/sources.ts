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
import { SOURCE_LABELS, type JobWithDetail, type Level, type SourceId } from "./types";

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

const ATS_SOURCES: SourceId[] = ["greenhouse", "lever", "ashby", "workable", "smartrecruiters", "keka", "workday"];
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
  /** Set when the source states the job type (e.g. "Internship"). */
  level?: Level;
  /** Where the apply link goes, e.g. "Internshala" (default: the source's name). */
  sourceLabel?: string;
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
    level: input.level ?? levelFor(title),
    source: input.source,
    sourceLabel: input.sourceLabel ?? (isAts(input.source) ? `${input.company} careers` : SOURCE_LABELS[input.source]),
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

// Workday: used by many large companies (Walmart, Adobe, Salesforce...).
// Their careers sites load jobs from a public JSON search at
// {tenant}.{wdN}.myworkdayjobs.com/wday/cxs/{tenant}/{site}/jobs.
// The board is written "tenant|wdN|site", e.g. "walmart|wd5|WalmartExternal".
const WORKDAY_SEARCHES = ["product manager", "associate product manager", "product intern", "product owner", "product management"];

async function postJson(url: string, body: unknown) {
  const res = await fetch(url, {
    method: "POST",
    headers: { Accept: "application/json", "Content-Type": "application/json", "User-Agent": "PMRadar/1.0 (job aggregator)" },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(15_000),
    cache: "no-store",
  });
  if (!res.ok) throw Object.assign(new Error(`${res.status} ${url}`), { status: res.status });
  return res.json();
}

/** "Posted Today" / "Posted Yesterday" / "Posted 3 Days Ago" / "Posted 30+ Days Ago" -> ms */
function workdayPosted(text: string, now = Date.now()): number | null {
  const t = (text || "").toLowerCase();
  if (t.includes("today")) return now;
  if (t.includes("yesterday")) return now - 24 * 3_600_000;
  if (t.includes("+")) return null; // 30+ days: too old
  const n = t.match(/(\d+)\s+day/);
  return n ? now - Number(n[1]) * 24 * 3_600_000 : null;
}

async function fromWorkday(c: AtsCompany, o: FetchOpts): Promise<BoardResult> {
  void o;
  const [tenant, wd, site] = c.board.split("|");
  const host = `https://${tenant}.${wd}.myworkdayjobs.com`;
  const api = `${host}/wday/cxs/${tenant}/${site}`;
  const postings = new Map<string, any>();
  let total = 0;
  for (const q of WORKDAY_SEARCHES) {
    // Workday returns at most 20 per page; read up to 3 pages for the main search.
    for (let offset = 0; offset < (q === "product manager" ? 60 : 20); offset += 20) {
      const d = await postJson(`${api}/jobs`, { appliedFacets: {}, limit: 20, offset, searchText: q });
      if (offset === 0) total = Math.max(total, d.total ?? 0);
      const list: any[] = d.jobPostings ?? [];
      for (const p of list) if (p.externalPath) postings.set(p.externalPath, p);
      if (list.length < 20 || offset + 20 >= (d.total ?? 0)) break;
    }
  }

  // Only open the product roles from the last 30 days.
  const candidates = [...postings.values()].filter(
    (p) => isProductRole(decodeEntities(p.title ?? "")) && isRecent(workdayPosted(p.postedOn))
  );
  const jobs = await pool(candidates, 4, async (p) => {
    try {
      const d = await getJson(`${api}${p.externalPath}`, { fresh: true });
      const info = d.jobPostingInfo ?? {};
      const location = [info.location ?? p.locationsText, ...(info.additionalLocations ?? [])].filter(Boolean).join("; ");
      return makeJob({
        source: "workday",
        board: c.board,
        rawId: info.jobReqId ?? info.id ?? p.externalPath,
        title: info.title ?? p.title,
        company: c.name || prettyName(tenant),
        location,
        isRemote: /remote/i.test(`${info.remoteType ?? ""} ${location}`),
        url: info.externalUrl ?? `${host}/${site}${p.externalPath}`,
        postedAt: info.startDate ?? workdayPosted(p.postedOn),
        description: htmlToText(info.jobDescription ?? ""),
      });
    } catch {
      return null;
    }
  });
  return { total, jobs };
}

const FETCHERS: Record<AtsName, (c: AtsCompany, o: FetchOpts) => Promise<BoardResult>> = {
  greenhouse: fromGreenhouse,
  lever: fromLever,
  ashby: fromAshby,
  workable: fromWorkable,
  smartrecruiters: fromSmartRecruiters,
  keka: fromKeka,
  workday: fromWorkday,
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

// ---------- More remote boards ----------

async function getText(url: string, o: FetchOpts) {
  const res = await fetch(url, {
    headers: { "User-Agent": "PMRadar/1.0 (job aggregator)" },
    signal: AbortSignal.timeout(12_000),
    ...(o.fresh ? { cache: "no-store" as const } : { next: { revalidate: JOBS_REVALIDATE_SECONDS } }),
  });
  if (!res.ok) throw new Error(`${res.status} ${url}`);
  return res.text();
}

const xmlTag = (item: string, tag: string) => {
  const m = item.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, "i"));
  return m ? decodeEntities(m[1].replace(/^<!\[CDATA\[|\]\]>$/g, "")).trim() : "";
};

// We Work Remotely: public RSS feed of product jobs. Titles look like "Company: Role".
async function fromWeWorkRemotely(o: FetchOpts) {
  const xml = await getText("https://weworkremotely.com/categories/remote-product-jobs.rss", o);
  const items = xml.match(/<item>[\s\S]*?<\/item>/gi) ?? [];
  return items.map((it) => {
    const full = xmlTag(it, "title");
    const i = full.indexOf(":");
    const company = i > 0 ? full.slice(0, i).trim() : "Company not listed";
    const title = i > 0 ? full.slice(i + 1).trim() : full;
    const link = xmlTag(it, "link") || xmlTag(it, "guid");
    return makeJob({
      source: "weworkremotely",
      rawId: link,
      title,
      company,
      location: xmlTag(it, "region") || "Remote",
      isRemote: true,
      url: link,
      postedAt: xmlTag(it, "pubDate"),
      description: htmlToText(xmlTag(it, "description")),
    });
  });
}

// Jobicy: public remote jobs API (asks for a link back, which every listing has).
async function fromJobicy(o: FetchOpts) {
  const data = await getJson("https://jobicy.com/api/v2/remote-jobs?count=100&tag=product%20manager", o);
  return (data.jobs ?? []).map((j: any) =>
    makeJob({
      source: "jobicy",
      rawId: j.id,
      title: j.jobTitle,
      company: j.companyName,
      location: Array.isArray(j.jobGeo) ? j.jobGeo.join(", ") : j.jobGeo || "Anywhere",
      isRemote: true,
      url: j.url,
      postedAt: j.pubDate,
      description: htmlToText(j.jobDescription ?? j.jobExcerpt ?? ""),
    })
  );
}

// Working Nomads: public remote jobs feed.
async function fromWorkingNomads(o: FetchOpts) {
  const data = await getJson("https://www.workingnomads.com/api/exposed_jobs/", o);
  return (Array.isArray(data) ? data : []).map((j: any) =>
    makeJob({
      source: "workingnomads",
      rawId: j.url,
      title: j.title,
      company: j.company_name,
      location: j.location || "Anywhere",
      isRemote: true,
      url: j.url,
      postedAt: j.pub_date,
      description: htmlToText(j.description ?? ""),
    })
  );
}

// ---------- Hacker News "Who is hiring?" ----------
// Each month hundreds of startups post in one thread. We read PM roles from it,
// and collect links to company job boards so the crawler can check them too.

const HN_ROLE =
  /\b((?:senior|sr\.?|lead|principal|staff|group|associate|founding|technical|ai|growth|platform)\s+)*(?:product\s+manager|product\s+lead|product\s+owner|head\s+of\s+product)\b/i;

const BOARD_LINKS: { ats: AtsName; re: RegExp }[] = [
  { ats: "greenhouse", re: /(?:boards|job-boards)\.greenhouse\.io\/(?:embed\/job_board\?for=)?([a-z0-9_-]+)/gi },
  { ats: "lever", re: /jobs\.lever\.co\/([a-z0-9_.-]+)/gi },
  { ats: "ashby", re: /jobs\.ashbyhq\.com\/([a-z0-9_.%-]+)/gi },
  { ats: "workable", re: /apply\.workable\.com\/([a-z0-9_-]+)/gi },
  { ats: "keka", re: /([a-z0-9-]+)\.keka\.com\/careers/gi },
];

export type HnResult = { jobs: (JobWithDetail | null)[]; boards: AtsCompany[] };

export async function fetchHackerNews(o: FetchOpts = {}): Promise<HnResult> {
  const search = await getJson(
    "https://hn.algolia.com/api/v1/search_by_date?tags=story,author_whoishiring&hitsPerPage=6",
    o
  );
  const thread = (search.hits ?? []).find((h: any) => /who is hiring/i.test(h.title ?? ""));
  if (!thread) return { jobs: [], boards: [] };
  const data = await getJson(`https://hn.algolia.com/api/v1/items/${thread.objectID}`, o);
  const jobs: (JobWithDetail | null)[] = [];
  const boards = new Map<string, AtsCompany>();

  for (const c of data.children ?? []) {
    const html: string = c.text ?? "";
    if (!html) continue;
    const text = htmlToText(html, 12000);
    const firstLine = text.split("\n")[0] ?? "";
    const company = (firstLine.split("|")[0] ?? "").replace(/\(YC [^)]*\)/i, "").trim().slice(0, 60);

    // Job board links (decoded from the comment's HTML).
    const raw = decodeEntities(html);
    for (const { ats, re } of BOARD_LINKS) {
      for (const m of raw.matchAll(re)) {
        const board = m[1].toLowerCase().replace(/\/$/, "");
        if (!board || ["embed", "www", "jobs", "careers"].includes(board)) continue;
        const key = `${ats}:${board}`;
        if (!boards.has(key)) boards.set(key, { ats, board, name: company || prettyName(board) });
      }
    }

    const role = text.match(HN_ROLE);
    if (!role || !company) continue;
    const title = role[0].replace(/\s+/g, " ").replace(/\b\w/g, (ch) => ch.toUpperCase());
    const remote = /\bremote\b/i.test(firstLine);
    const link = raw.match(/href="(https?:\/\/[^"]+)"/i)?.[1];
    jobs.push(
      makeJob({
        source: "hackernews",
        rawId: c.id,
        title,
        company,
        location: firstLine.split("|").slice(1).join(" | ").trim().slice(0, 120) || (remote ? "Remote" : ""),
        isRemote: remote,
        url: link || `https://news.ycombinator.com/item?id=${c.id}`,
        postedAt: c.created_at,
        description: text,
      })
    );
  }
  return { jobs, boards: [...boards.values()] };
}

let hnCache: Promise<HnResult> | null = null;
/** One fetch per crawl, shared by the job list and board discovery. */
export function hackerNewsOnce(o: FetchOpts = {}) {
  hnCache ??= fetchHackerNews(o).catch(() => ({ jobs: [], boards: [] }));
  return hnCache;
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

// ---------- Job search engines (real internships from Indian job sites) ----------
// Internshala, LinkedIn, Naukri and Unstop can't be copied directly, but
// Google Jobs and Jooble index them. Both state the job type, so a role is
// marked Internship only when the listing itself says it is one.

/** Short stable id from a long string. */
function shortHash(s: string) {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0;
  return (h >>> 0).toString(36);
}

/** "3 days ago", "21 hours ago", "1 week ago" -> ms; "30+ days ago" / months -> null */
export function agoToMs(text: string, now = Date.now()): number | null {
  const t = (text || "").toLowerCase();
  if (!t || t.includes("+") || /month|year/.test(t)) return null;
  if (/just|today|now/.test(t)) return now;
  const m = t.match(/(\d+)\s*(minute|hour|day|week)/);
  if (!m) return null;
  const unit = { minute: 60_000, hour: 3_600_000, day: 86_400_000, week: 7 * 86_400_000 }[m[2] as "day"];
  return now - Number(m[1]) * unit;
}

const isInternshipType = (s: unknown) => /intern/i.test(String(s ?? ""));

export const GOOGLE_JOBS_SEARCHES = ["product management intern", "product manager intern", "associate product manager"];

/**
 * Google Jobs through SerpApi (free plan: about 100 searches a month, so the
 * crawler runs this once a day: 3 searches a day). Key: SERPAPI_KEY.
 */
export async function fromGoogleJobs(): Promise<JobWithDetail[]> {
  const key = process.env.SERPAPI_KEY;
  if (!key) return [];
  const out: JobWithDetail[] = [];
  for (const q of GOOGLE_JOBS_SEARCHES) {
    const params = new URLSearchParams({ engine: "google_jobs", q, location: "India", gl: "in", hl: "en", api_key: key });
    let data: any;
    try {
      data = await getJson(`https://serpapi.com/search.json?${params}`, { fresh: true });
    } catch (e) {
      console.warn("[jobs] Google Jobs search failed:", String(e).replace(key, "***").slice(0, 160));
      continue;
    }
    for (const j of data.jobs_results ?? []) {
      const ext = j.detected_extensions ?? {};
      const apply = (j.apply_options ?? [])[0];
      const job = makeJob({
        source: "googlejobs",
        rawId: shortHash(String(j.job_id ?? `${j.title}${j.company_name}`)),
        title: j.title,
        company: j.company_name || "Company not listed",
        location: j.location || "India",
        isRemote: ext.work_from_home === true,
        url: apply?.link ?? j.share_link,
        postedAt: agoToMs(ext.posted_at ?? (j.extensions ?? []).find((x: string) => /ago/i.test(x)) ?? ""),
        description: String(j.description ?? "").slice(0, 8000),
        level: isInternshipType(ext.schedule_type) ? "intern" : undefined,
        sourceLabel: apply?.title ? String(apply.title).replace(/^apply (on|via)\s+/i, "") : j.via?.replace(/^via\s+/i, ""),
      });
      if (job) out.push(job);
    }
  }
  return out;
}

// Search -> how many result pages to read. Weighted towards internships and
// entry-level roles, which are rare on company job boards.
export const JOOBLE_SEARCHES: [string, number][] = [
  ["product management intern", 3],
  ["product management internship", 2],
  ["product manager intern", 2],
  ["product intern", 2],
  ["apm intern", 1],
  ["product management trainee", 1],
  ["product owner intern", 1],
  ["associate product manager", 3],
  ["junior product manager", 1],
  ["product associate", 1],
  ["product manager fresher", 1],
  ["product manager", 3],
  ["product owner", 1],
];

/** Jooble job search API (free key from https://jooble.org/api/about). Key: JOOBLE_API_KEY. */
export async function fromJooble(): Promise<JobWithDetail[]> {
  const key = process.env.JOOBLE_API_KEY;
  if (!key) return [];
  const out: JobWithDetail[] = [];
  let blocked = false;
  for (const [keywords, pages] of JOOBLE_SEARCHES) {
    for (let page = 1; page <= pages && !blocked; page++) {
      let data: any;
      try {
        const res = await fetch(`https://jooble.org/api/${key}`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Accept: "application/json" },
          body: JSON.stringify({ keywords, location: "India", page: String(page) }),
          signal: AbortSignal.timeout(15_000),
          cache: "no-store",
        });
        // Over the key's limit: stop searching and keep what we have.
        if (res.status === 403 || res.status === 429) {
          blocked = true;
          console.warn(`[jobs] Jooble limit reached after "${keywords}" page ${page}.`);
          break;
        }
        if (!res.ok) throw new Error(String(res.status));
        data = await res.json();
      } catch (e) {
        console.warn("[jobs] Jooble search failed:", String(e).replace(key, "***").slice(0, 160));
        break;
      }
      const list: any[] = data.jobs ?? [];
      for (const j of list) {
        const loc = String(j.location ?? "India");
        const job = makeJob({
          source: "jooble",
          rawId: String(j.id ?? shortHash(String(j.link))),
          title: htmlToText(String(j.title ?? ""), 200),
          company: j.company || "Company not listed",
          location: /remote/i.test(loc) || /india/i.test(loc) ? loc : `${loc}, India`,
          url: j.link,
          postedAt: j.updated,
          description: htmlToText(String(j.snippet ?? "")),
          level: isInternshipType(j.type) ? "intern" : undefined,
          sourceLabel: j.source || "Jooble",
        });
        if (job) out.push(job);
      }
      if (list.length === 0) break; // no more pages for this search
    }
  }
  // The same posting often comes back from several searches.
  const seen = new Set<string>();
  return out.filter((j) => (seen.has(j.id) ? false : (seen.add(j.id), true)));
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
  if (REMOTE_BOARDS.weworkremotely) tasks.push({ name: "We Work Remotely", run: () => fromWeWorkRemotely(opts) });
  if (REMOTE_BOARDS.jobicy) tasks.push({ name: "Jobicy", run: () => fromJobicy(opts) });
  if (REMOTE_BOARDS.workingnomads) tasks.push({ name: "Working Nomads", run: () => fromWorkingNomads(opts) });
  if (REMOTE_BOARDS.hackernews)
    tasks.push({ name: "Hacker News (Who is hiring)", run: async () => (await hackerNewsOnce(opts)).jobs });
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
