import { NextResponse } from "next/server";
import { randomBytes } from "node:crypto";
import { SITE_NAME } from "@/lib/config";
import { digestHtml, digestText, FROM, mailer } from "@/lib/email";
import { ALL_LEVELS, ALL_REGIONS, matchesPrefs, parseList } from "@/lib/filters";
import { getJobsCached, toPublic } from "@/lib/jobs";
import { redis, underDailyLimit, type Subscriber } from "@/lib/redis";

export const runtime = "nodejs";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export async function POST(req: Request) {
  if (!redis)
    return NextResponse.json({ error: "Email updates aren't set up yet: connect Upstash Redis." }, { status: 503 });

  const body = (await req.json().catch(() => ({}))) as { email?: string; regions?: string[]; levels?: string[] };
  const email = String(body.email || "").trim().toLowerCase();
  if (!EMAIL.test(email) || email.length > 200)
    return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });

  const ip = (req.headers.get("x-forwarded-for") || "local").split(",")[0].trim();
  if (!(await underDailyLimit(`sub:${ip}`, 10)))
    return NextResponse.json({ error: "Too many sign-ups from this network today." }, { status: 429 });

  const regions = parseList(body.regions, ALL_REGIONS, ["india", "remote"]);
  const levels = parseList(body.levels, ALL_LEVELS);

  const existing = await redis.hgetall<Subscriber>(`sub:${email}`);
  const token = existing?.token || randomBytes(18).toString("base64url");
  const sub: Subscriber = {
    email,
    regions: regions.join(","),
    levels: levels.join(","),
    token,
    createdAt: Number(existing?.createdAt) || Date.now(),
    lastSentAt: Date.now(),
  };
  await redis.hset(`sub:${email}`, sub);
  await redis.sadd("subs", email);
  await redis.set(`unsub:${token}`, email);

  // Welcome email with today's top roles, so people see what they signed up for.
  const t = mailer();
  if (t) {
    try {
      const { jobs } = await getJobsCached();
      const picks = jobs.map(toPublic).filter((j) => matchesPrefs(j, { regions, levels })).slice(0, 10);
      const intro = existing
        ? "Your email preferences are updated. Here are the latest roles that match them."
        : `You're subscribed. Every morning we'll send new product roles that match your filters. Here are the latest ${picks.length}.`;
      await t.sendMail({
        from: FROM(),
        to: email,
        subject: existing ? `${SITE_NAME}: preferences updated` : `Welcome to ${SITE_NAME}`,
        html: digestHtml(picks, token, intro),
        text: digestText(picks, token, intro),
      });
    } catch (e) {
      console.error("[subscribe] welcome email failed", e);
    }
  }

  return NextResponse.json({ ok: true, updated: Boolean(existing) });
}
