import { NextResponse } from "next/server";
import { analyzeMatch } from "@/lib/gemini";
import { findJob, MOCK_MODE } from "@/lib/jobs";
import { MOCK_MATCH } from "@/lib/mock";
import { underDailyLimit } from "@/lib/redis";
import { fetchDescription } from "@/lib/sources";

export const runtime = "nodejs";
export const maxDuration = 60;

const DAILY_LIMIT = Number(process.env.MATCH_DAILY_LIMIT || 25);

export async function POST(req: Request) {
  const { jobId, resume } = (await req.json().catch(() => ({}))) as { jobId?: string; resume?: string };
  if (!jobId || !resume || resume.length < 200)
    return NextResponse.json({ error: "Add your resume first, then check your match." }, { status: 400 });

  if (MOCK_MODE) {
    await new Promise((r) => setTimeout(r, 1200));
    return NextResponse.json(MOCK_MATCH);
  }

  const ip = (req.headers.get("x-forwarded-for") || "local").split(",")[0].trim();
  if (!(await underDailyLimit(`match:${ip}`, DAILY_LIMIT)))
    return NextResponse.json(
      { error: `You've used today's ${DAILY_LIMIT} match checks. They reset tomorrow.` },
      { status: 429 }
    );

  const job = await findJob(jobId);
  if (!job) return NextResponse.json({ error: "This role was just taken down. Refresh the list." }, { status: 404 });

  try {
    const description = await fetchDescription(job);
    if (description.length < 100)
      return NextResponse.json(
        { error: "This listing has no description we can read. Open it on the company site instead." },
        { status: 422 }
      );
    const result = await analyzeMatch(resume, { ...job, description });
    return NextResponse.json(result);
  } catch (e: any) {
    const msg = String(e?.message ?? e);
    console.error("[match]", msg);
    if (msg === "NO_KEY")
      return NextResponse.json({ error: "The AI match isn't set up yet: add GEMINI_API_KEY." }, { status: 503 });
    if (msg === "BUSY")
      return NextResponse.json(
        { error: "Google's AI is very busy right now. Wait a minute and click Try again." },
        { status: 503 }
      );
    if (msg === "RATE_LIMIT")
      return NextResponse.json(
        { error: "Lots of people are checking matches right now. Try again in a minute." },
        { status: 429 }
      );
    return NextResponse.json({ error: "The AI check didn't finish. Try again." }, { status: 502 });
  }
}
