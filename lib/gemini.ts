import type { MatchResult } from "./types";

// "gemini-flash-latest" always points at Google's current Flash model,
// which is on the free tier. Override with GEMINI_MODEL if you want.
const MODEL = process.env.GEMINI_MODEL || "gemini-flash-latest";

const schema = {
  type: "OBJECT",
  properties: {
    score: { type: "INTEGER", description: "Fit score 0-100" },
    verdict: { type: "STRING", enum: ["Strong match", "Good match", "Stretch", "Long shot"] },
    summary: { type: "STRING" },
    strengths: { type: "ARRAY", items: { type: "STRING" } },
    gaps: { type: "ARRAY", items: { type: "STRING" } },
    actions: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: { title: { type: "STRING" }, detail: { type: "STRING" } },
        required: ["title", "detail"],
      },
    },
    resumeTweaks: { type: "ARRAY", items: { type: "STRING" } },
    missingKeywords: { type: "ARRAY", items: { type: "STRING" } },
  },
  required: ["score", "verdict", "summary", "strengths", "gaps", "actions", "resumeTweaks", "missingKeywords"],
};

function buildPrompt(resume: string, job: { title: string; company: string; location: string; description: string }) {
  return `You are an experienced product management hiring manager reviewing a candidate for one specific role.
Be honest and specific. Do not flatter. Base everything only on the resume and job description below.

Scoring rubric for "score" (how well the resume fits THIS role, not a probability of being hired):
- 80-100 Strong match: meets nearly all must-haves, with evidence
- 60-79 Good match: meets most must-haves, a few clear gaps
- 40-59 Stretch: meets some, missing important requirements
- 0-39 Long shot: misses most requirements or wrong seniority
The verdict must agree with the score band. Weigh seniority/years of experience heavily.

Rules for the other fields:
- summary: 1-2 sentences, plain language, addressed to the candidate as "you".
- strengths: up to 4, each tied to evidence in the resume and a need in the job.
- gaps: up to 4, the most important missing requirements for this job.
- actions: up to 4 concrete things the candidate can do before applying to THIS role, each doable within 2 weeks. Title is short; detail is one or two sentences.
- resumeTweaks: up to 3 rewritten resume bullets using only facts in the resume; use placeholders like [X users] where a number is missing instead of inventing numbers.
- missingKeywords: up to 8 skills or terms from the job description not found in the resume.

JOB
Title: ${job.title}
Company: ${job.company}
Location: ${job.location}
Description:
${job.description.slice(0, 7000)}

RESUME / PORTFOLIO
${resume.slice(0, 12000)}`;
}

export async function analyzeMatch(
  resume: string,
  job: { title: string; company: string; location: string; description: string }
): Promise<MatchResult> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error("NO_KEY");

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": key },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: buildPrompt(resume, job) }] }],
        generationConfig: {
          temperature: 0.3,
          responseMimeType: "application/json",
          responseSchema: schema,
        },
      }),
      signal: AbortSignal.timeout(55_000),
    }
  );

  if (res.status === 429) throw new Error("RATE_LIMIT");
  if (!res.ok) throw new Error(`Gemini ${res.status}: ${(await res.text()).slice(0, 300)}`);

  const data = await res.json();
  const text: string =
    data.candidates?.[0]?.content?.parts?.map((p: any) => p.text ?? "").join("") ?? "";
  const parsed = JSON.parse(text) as MatchResult;

  // Keep the output tidy even if the model over-delivers.
  parsed.score = Math.max(0, Math.min(100, Math.round(parsed.score)));
  parsed.strengths = parsed.strengths.slice(0, 4);
  parsed.gaps = parsed.gaps.slice(0, 4);
  parsed.actions = parsed.actions.slice(0, 4);
  parsed.resumeTweaks = parsed.resumeTweaks.slice(0, 3);
  parsed.missingKeywords = parsed.missingKeywords.slice(0, 8);
  return parsed;
}
