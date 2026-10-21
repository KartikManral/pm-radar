import { NextResponse } from "next/server";
import { SITE_NAME, SITE_URL } from "@/lib/config";
import { digestHtml, digestText, FROM, mailer } from "@/lib/email";
import { ALL_LEVELS, ALL_REGIONS, matchesPrefs, parseList } from "@/lib/filters";
import { getJobsFresh, toPublic } from "@/lib/jobs";
import { fetchTodayQuestion } from "@/lib/practice";
import { redis, type Subscriber } from "@/lib/redis";

export const runtime = "nodejs";
export const maxDuration = 300;

const MAX_PER_EMAIL = 30;

// Vercel Cron calls this once a day (see vercel.json).
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!redis) return NextResponse.json({ error: "Redis not configured" }, { status: 503 });
  const t = mailer();
  if (!t) return NextResponse.json({ error: "SMTP not configured" }, { status: 503 });

  const now = Date.now();
  const jobs = (await getJobsFresh()).jobs.map(toPublic);

  // Remember when we first saw each job, so "new" means new to us,
  // even when a company posts with an old date.
  const seen = (await redis.hgetall<Record<string, number>>("jobs:seen")) ?? {};
  // On the very first run everything counts as already seen; the welcome
  // email has covered existing roles.
  const firstRun = Object.keys(seen).length === 0;
  const firstSeen: Record<string, number> = {};
  for (const j of jobs) firstSeen[j.id] = Number(seen[j.id]) || (firstRun ? 1 : now);
  // Forget jobs gone for 30+ days (a source being down for a day won't re-send them).
  const monthAgo = now - 30 * 24 * 3_600_000;
  const stale = Object.keys(seen).filter((id) => !(id in firstSeen) && Number(seen[id]) < monthAgo);
  if (Object.keys(firstSeen).length) await redis.hset("jobs:seen", firstSeen);
  if (stale.length) await redis.hdel("jobs:seen", ...stale);

  // One practice question from Product Reps, the same for every subscriber today.
  const practice = await fetchTodayQuestion();

  const emails = (await redis.smembers("subs")) as string[];
  let sent = 0;
  let skipped = 0;
  const failed: string[] = [];

  for (const email of emails) {
    const sub = await redis.hgetall<Subscriber>(`sub:${email}`);
    if (!sub) continue;
    const prefs = {
      regions: parseList(sub.regions, ALL_REGIONS, ["india", "remote"]),
      levels: parseList(sub.levels, ALL_LEVELS),
    };
    const since = Number(sub.lastSentAt) || 0;
    const fresh = jobs.filter((j) => matchesPrefs(j, prefs) && firstSeen[j.id] > since);
    if (!fresh.length) {
      skipped++;
      continue;
    }

    const picks = fresh.slice(0, MAX_PER_EMAIL);
    const more = fresh.length - picks.length;
    const intro = `${fresh.length} new product ${fresh.length === 1 ? "role" : "roles"} since your last update${
      more > 0 ? ` (showing ${picks.length}, see the rest on the site)` : ""
    }.`;
    const unsubUrl = `${SITE_URL}/api/unsubscribe?token=${sub.token}`;
    try {
      await t.sendMail({
        from: FROM(),
        to: email,
        subject: `${fresh.length} new PM ${fresh.length === 1 ? "role" : "roles"} today | ${SITE_NAME}`,
        html: digestHtml(picks, sub.token, intro, practice),
        text: digestText(picks, sub.token, intro, practice),
        headers: { "List-Unsubscribe": `<${unsubUrl}>`, "List-Unsubscribe-Post": "List-Unsubscribe=One-Click" },
      });
      await redis.hset(`sub:${email}`, { lastSentAt: now });
      sent++;
    } catch (e) {
      console.error("[digest] failed for one subscriber", e);
      failed.push(email.replace(/(.).+@/, "$1***@"));
    }
  }

  return NextResponse.json({ jobs: jobs.length, subscribers: emails.length, sent, skipped, failed });
}
