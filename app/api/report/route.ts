import { createHash } from "node:crypto";
import { revalidatePath, revalidateTag } from "next/cache";
import { NextResponse } from "next/server";
import { AGGREGATOR_SOURCES, normCompany } from "@/lib/classify";
import { findJob } from "@/lib/jobs";
import { redis, underDailyLimit } from "@/lib/redis";

export const runtime = "nodejs";

// How many different visitors must report a listing before it is hidden for
// everyone. 2 stops one person from wiping the list; set REPORT_THRESHOLD=1 on
// Vercel if you want a single report to hide it.
const THRESHOLD = Math.max(1, Number(process.env.REPORT_THRESHOLD || 2));
const REASONS = new Set(["fee", "not-pm", "expired"]);

export async function POST(req: Request) {
  const { jobId, reason } = (await req.json().catch(() => ({}))) as { jobId?: unknown; reason?: unknown };
  if (typeof jobId !== "string" || jobId.length > 200 || typeof reason !== "string" || !REASONS.has(reason))
    return NextResponse.json({ error: "Bad report." }, { status: 400 });

  // Without Redis there is nowhere to count reports; the visitor's own hiding still works.
  if (!redis) return NextResponse.json({ ok: true, hidden: false });

  const ip = (req.headers.get("x-forwarded-for") || "local").split(",")[0].trim();
  if (!(await underDailyLimit(`report:${ip}`, 20)))
    return NextResponse.json({ error: "You've sent a lot of reports today. Thanks, try again tomorrow." }, { status: 429 });

  const job = await findJob(jobId);
  if (!job) return NextResponse.json({ ok: true, hidden: false }); // already gone

  const who = createHash("sha256").update(`${ip}|${process.env.CRON_SECRET || "pmradar"}`).digest("hex").slice(0, 16);
  const reportersKey = `report:job:${jobId}`;
  const reasonsKey = `report:reasons:${jobId}`;
  const added = await redis.sadd(reportersKey, who);
  let closedChanged = false;
  if (added) {
    await redis.hincrby(reasonsKey, reason, 1); // the same visitor can't count twice
    if (reason === "expired") {
      await redis.hincrby("reports:closed", jobId, 1); // shown on the listing as "Reported closed"
      closedChanged = true;
    }
  }
  await redis.expire(reportersKey, 60 * 60 * 24 * 60);
  await redis.expire(reasonsKey, 60 * 60 * 24 * 60);
  const count = await redis.scard(reportersKey);

  // A short log you can read in the Upstash data browser (key: reports:log).
  await redis.lpush(
    "reports:log",
    JSON.stringify({ at: Date.now(), id: job.id, title: job.title, company: job.company, source: job.source, url: job.url, reason, reports: count })
  );
  await redis.ltrim("reports:log", 0, 199);

  let hidden = false;
  if (count >= THRESHOLD) {
    hidden = true;
    await redis.sadd("blocked:jobs", jobId);
    // When most reports say "asks for money", remember the company too. Only its
    // job-search-site listings are hidden; its own career-page roles never are.
    const reasons = ((await redis.hgetall<Record<string, number>>(reasonsKey)) ?? {}) as Record<string, number>;
    const feeVotes = Number(reasons.fee) || 0;
    const company = normCompany(job.company);
    if (feeVotes >= THRESHOLD && AGGREGATOR_SOURCES.has(job.source) && company && company !== "companynotlisted")
      await redis.sadd("blocked:companies", company);
  }
  if (hidden || closedChanged) {
    revalidateTag("jobs");
    revalidatePath("/");
  }
  return NextResponse.json({ ok: true, hidden });
}
