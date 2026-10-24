import type { MatchResult } from "./types";

// Free-tier models to try, in order. If one is busy (503), too slow, or no
// longer offered (404), the next one is used. Put your own first with
// GEMINI_MODEL if you want. Google retired the 2.5 models for new keys, so the
// "-latest" aliases come first: they always point at the current model.
const MODELS = [
  process.env.GEMINI_MODEL,
  "gemini-flash-latest",
  "gemini-flash-lite-latest",
  "gemini-3.8-flash",
  "gemini-3.5-flash-lite",
].filter((m, i, all): m is string => Boolean(m) && all.indexOf(m) === i);

// Errors worth retrying on another model: busy, overloaded, or model not found.
const RETRYABLE = new Set([404, 429, 500, 502, 503, 504]);
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// Each model gets up to PER_MODEL_MS before we move on to the next one, and the
// whole check stops after TOTAL_BUDGET_MS. Keep that under the route's maxDuration.
const PER_MODEL_MS = 28_000;
const TOTAL_BUDGET_MS = 75_000;
const MIN_ATTEMPT_MS = 10_000; // don't start a model with less time than this left

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

  const prompt = buildPrompt(resume, job);
  // "Thinking" makes these models slow, and this task is structured extraction,
  // so ask for as little as possible. If a model rejects the setting (400), we
  // retry that same model without it.
  const bodyFor = (withThinking: boolean) =>
    JSON.stringify({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.3,
        responseMimeType: "application/json",
        responseSchema: schema,
        maxOutputTokens: 4096,
        ...(withThinking ? { thinkingConfig: { thinkingLevel: "low" } } : {}),
      },
    });

  let parsed: MatchResult | null = null;
  let lastStatus = 0;
  const started = Date.now();
  models: for (const [i, model] of MODELS.entries()) {
    if (i > 0) await sleep(500);

    for (const withThinking of [true, false]) {
      const remaining = TOTAL_BUDGET_MS - (Date.now() - started);
      if (remaining < MIN_ATTEMPT_MS) break models; // stay inside the function time limit

      let res: Response;
      try {
        res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
          method: "POST",
          headers: { "Content-Type": "application/json", "x-goog-api-key": key },
          body: bodyFor(withThinking),
          signal: AbortSignal.timeout(Math.min(PER_MODEL_MS, remaining)),
        });
      } catch (e: any) {
        // Timeout or network blip: try the next model instead of giving up.
        console.warn(`[match] ${model} failed: ${String(e?.message ?? e)}`);
        lastStatus = 504;
        continue models;
      }

      if (!res.ok) {
        lastStatus = res.status;
        const detail = (await res.text()).slice(0, 300);
        console.warn(`[match] ${model} returned ${res.status}: ${detail}`);
        if (res.status === 400 && withThinking) continue; // same model, without the thinking setting
        if (!RETRYABLE.has(res.status)) throw new Error(`Gemini ${res.status}: ${detail}`);
        continue models;
      }

      try {
        const data = await res.json();
        const text: string =
          data.candidates?.[0]?.content?.parts?.map((p: any) => p.text ?? "").join("") ?? "";
        // Some models wrap JSON in ```json fences; strip them before parsing.
        parsed = JSON.parse(text.replace(/^\s*```(?:json)?\s*|\s*```\s*$/g, "")) as MatchResult;
        break models;
      } catch (e: any) {
        // Cut-off or malformed JSON: try the next model.
        console.warn(`[match] ${model} gave unreadable output: ${String(e?.message ?? e)}`);
        lastStatus = 502;
        continue models;
      }
    }
  }

  if (!parsed) throw new Error(lastStatus === 429 ? "RATE_LIMIT" : lastStatus === 502 ? "BAD_OUTPUT" : "BUSY");

  // Keep the output tidy even if the model over-delivers.
  parsed.score = Math.max(0, Math.min(100, Math.round(parsed.score)));
  parsed.strengths = parsed.strengths.slice(0, 4);
  parsed.gaps = parsed.gaps.slice(0, 4);
  parsed.actions = parsed.actions.slice(0, 4);
  parsed.resumeTweaks = parsed.resumeTweaks.slice(0, 3);
  parsed.missingKeywords = parsed.missingKeywords.slice(0, 8);
  return parsed;
}
