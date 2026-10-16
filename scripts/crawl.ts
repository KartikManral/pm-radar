// PM Radar job crawler.
// Runs on GitHub Actions every few hours (see .github/workflows/crawl.yml).
// 1. Once a week: looks for Indian companies' job boards (discovery).
// 2. Every run: checks every known board, keeps product roles in India or
//    remote, and saves them to Upstash Redis for the website to read.
// Run it yourself with: npx tsx scripts/crawl.ts  (needs the KV_* env vars)

import { COMPANIES, type AtsCompany, type AtsName } from "../lib/config";
import { redis } from "../lib/redis";
import { dedupe, enrichJobs, fetchBoard, fetchExtraSources, pool, type BoardOutcome } from "../lib/sources";
import type { JobWithDetail } from "../lib/types";
import { KNOWN_BOARDS } from "../data/known-boards";
import { INDIA_COMPANIES, slugVariants } from "../data/india-companies";

const DAY = 24 * 60 * 60 * 1000;
const ALL_ATS: AtsName[] = ["greenhouse", "lever", "ashby", "workable", "smartrecruiters"];
const WORKERS = 20;

type Health = { fails: number; skipUntil: number };

const keyOf = (b: AtsCompany) => `${b.ats}:${b.board}`;
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

async function discover(now: number) {
  console.log("Discovery: looking for Indian companies' job boards...");
  const probes: AtsCompany[] = [];
  const seen = new Set<string>();
  for (const c of INDIA_COMPANIES) {
    for (const slug of slugVariants(c)) {
      for (const ats of ALL_ATS) {
        // SmartRecruiters company IDs are case sensitive ("Freshworks").
        const boards = ats === "smartrecruiters" ? [cap(slug.replace(/-/g, ""))] : [slug];
        for (const board of boards) {
          const p = { ats, board, name: c.name };
          if (seen.has(keyOf(p))) continue;
          seen.add(keyOf(p));
          probes.push(p);
        }
      }
    }
  }
  const results = await pool(probes, 25, (p) => fetchBoard(p));
  const found: Record<string, string> = {};
  results.forEach((r, i) => {
    if (r.ok && r.total > 0) found[r.key] = probes[i].name ?? probes[i].board;
  });

  // Keep boards found earlier unless this run says they're gone (404).
  const previous = ((await redis!.hgetall<Record<string, string>>("boards:found")) ?? {}) as Record<string, string>;
  const gone = new Set(results.filter((r) => !r.ok && r.status === 404).map((r) => r.key));
  for (const [k, name] of Object.entries(previous)) if (!(k in found) && !gone.has(k)) found[k] = name;

  await redis!.del("boards:found");
  if (Object.keys(found).length) await redis!.hset("boards:found", found);
  await redis!.set("crawl:discoveredAt", now);
  console.log(`Discovery: tried ${probes.length} addresses, found ${Object.keys(found).length} live boards.`);
  return found;
}

async function main() {
  if (!redis) throw new Error("Set KV_REST_API_URL and KV_REST_API_TOKEN (or UPSTASH_REDIS_REST_*).");
  const started = Date.now();
  const now = started;

  // 1. Discovery, weekly (or when FORCE_DISCOVERY=1).
  const lastDiscovery = Number(await redis.get("crawl:discoveredAt")) || 0;
  const found =
    process.env.FORCE_DISCOVERY === "1" || now - lastDiscovery > 7 * DAY
      ? await discover(now)
      : (((await redis.hgetall<Record<string, string>>("boards:found")) ?? {}) as Record<string, string>);

  // 2. Every board to check: built-in list, discovered Indian boards, known list.
  const discovered: AtsCompany[] = Object.entries(found).map(([k, name]) => {
    const [ats, ...rest] = k.split(":");
    return { ats: ats as AtsName, board: rest.join(":"), name };
  });
  const byKey = new Map<string, AtsCompany>();
  for (const b of [...COMPANIES, ...discovered, ...KNOWN_BOARDS]) if (!byKey.has(keyOf(b))) byKey.set(keyOf(b), b);
  const boards = [...byKey.values()];

  // 3. Skip boards that keep failing (checked again later).
  const health = ((await redis.hgetall<Record<string, Health>>("boards:health")) ?? {}) as Record<string, Health>;
  const active = boards.filter((b) => (health[keyOf(b)]?.skipUntil ?? 0) < now);
  console.log(`Checking ${active.length} of ${boards.length} boards (${boards.length - active.length} skipped)...`);

  const results: BoardOutcome[] = await pool(active, WORKERS, (b) => fetchBoard(b));

  // 4. Update board health.
  const updates: Record<string, Health> = {};
  for (const r of results) {
    const prev = health[r.key] ?? { fails: 0, skipUntil: 0 };
    if (r.ok) {
      if (prev.fails || prev.skipUntil) updates[r.key] = { fails: 0, skipUntil: 0 };
      continue;
    }
    const fails = prev.fails + 1;
    // Missing board: check again in a week. Other errors: retry next run,
    // but back off for a day after three failures in a row.
    const skipUntil = r.status === 404 ? now + 7 * DAY : fails >= 3 ? now + DAY : 0;
    updates[r.key] = { fails, skipUntil };
  }
  if (Object.keys(updates).length) await redis.hset("boards:health", updates);

  // 5. Remote job boards (and Adzuna if keys are set).
  const extra = await fetchExtraSources({});

  const jobs: JobWithDetail[] = dedupe([...results.map((r) => r.jobs), ...extra.lists]);

  // 5b. Fetch descriptions the board lists don't include, to read the
  // experience asked for and spot remote roles limited to other countries.
  const missing = jobs.filter((j) => !j.description || j.description.length < 200).length;
  await enrichJobs(jobs, 12);
  console.log(`Fetched ${missing} job descriptions.`);

  // Safety: if almost nothing came back, the network probably failed.
  const previousCount = ((await redis.get<unknown[]>("jobs:list")) ?? []).length;
  if (jobs.length < 5 && previousCount > 30) {
    console.error(`Only ${jobs.length} roles found (last run had ${previousCount}). Keeping the old list.`);
    process.exitCode = 1;
    return;
  }

  // 6. Save: the list (no descriptions) and descriptions separately.
  const list = jobs.map(({ description: _d, ...rest }) => rest);
  await redis.set("jobs:list", list);

  const descs = jobs.filter((j) => j.description && j.description.length > 100);
  await redis.del("jobs:desc:next");
  for (let i = 0; i < descs.length; i += 100) {
    const chunk: Record<string, string> = {};
    for (const j of descs.slice(i, i + 100)) chunk[j.id] = j.description!;
    await redis.hset("jobs:desc:next", chunk);
  }
  if (descs.length) await redis.rename("jobs:desc:next", "jobs:desc");

  const okBoards = results.filter((r) => r.ok);
  const withRoles = results.filter((r) => r.jobs.length > 0).sort((a, b) => b.jobs.length - a.jobs.length);
  const withExp = jobs.filter((j) => j.expMin !== null).length;
  const byRegion = jobs.reduce<Record<string, number>>((acc, j) => ((acc[j.region] = (acc[j.region] ?? 0) + 1), acc), {});
  const meta = {
    crawledAt: now,
    tookSeconds: Math.round((Date.now() - started) / 1000),
    roles: jobs.length,
    byRegion,
    withExperience: withExp,
    boardsTotal: boards.length,
    boardsChecked: results.length,
    boardsWorking: okBoards.length,
    boardsWithRoles: withRoles.length,
    discoveredIndianBoards: discovered.length,
    lastDiscovery: Number(await redis.get("crawl:discoveredAt")) || null,
    report: [
      ...withRoles.map((r) => ({ name: byKey.get(r.key)?.name ?? r.key, ok: true, count: r.jobs.length })),
      ...extra.report,
    ],
  };
  await redis.set("jobs:meta", meta);

  console.log(
    `Done in ${meta.tookSeconds}s: ${jobs.length} roles from the last 30 days (${JSON.stringify(byRegion)}), ` +
      `${withExp} with experience listed, from ` +
      `${withRoles.length} boards with roles; ${okBoards.length}/${results.length} boards responded.`
  );
  console.log("Top boards:", withRoles.slice(0, 15).map((r) => `${r.key}=${r.jobs.length}`).join(", "));
  console.log("Other sources:", extra.report.map((r) => `${r.name}=${r.ok ? r.count : "failed"}`).join(", "));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
