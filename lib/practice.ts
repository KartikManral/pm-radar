import { PRODUCT_REPS_URL } from "./config";
import type { Level } from "./types";

// Links into Product Reps (Kartik's PM interview-prep app).
// Product Reps reads these query parameters:
//   ?prep=<company>&level=<level>&role=<title>   tailored questions for one role
//   ?type=<question type>                         practise one question type
//   &ref=...                                       where the visit came from

const base = PRODUCT_REPS_URL.replace(/\/?$/, "/");

export function prepUrl(job: { company: string; level: Level; title: string }) {
  const p = new URLSearchParams({ prep: job.company, level: job.level, role: job.title, ref: "pm-radar" });
  return `${base}?${p}`;
}

export type PracticeType = "product" | "metrics" | "rca" | "guess" | "strategy" | "execution" | "behavioral";

export const PRACTICE_LABELS: Record<PracticeType, string> = {
  product: "product sense",
  metrics: "metrics",
  rca: "root-cause",
  guess: "estimation",
  strategy: "strategy",
  execution: "prioritisation",
  behavioral: "behavioral",
};

export function practiceUrl(type: PracticeType) {
  return `${base}?${new URLSearchParams({ type, ref: "pm-radar-match" })}`;
}

// Which interview question types help close a resume gap. Keyword rules,
// checked in order; a gap can map to more than one type.
const RULES: [RegExp, PracticeType][] = [
  [/metric|kpi|okr|north.?star|a\/b|experiment|analytic|data|sql|insight|measure|funnel|retention|growth/i, "metrics"],
  [/root.?cause|debug|diagnos|investigat|troubleshoot|drop|decline/i, "rca"],
  [/user research|customer|user need|ux|design|usability|discovery|empathy|product sense|feature|journey/i, "product"],
  [/strateg|market|go.?to.?market|gtm|competit|business|monetis|monetiz|pricing|revenue|vision/i, "strategy"],
  [/priorit|roadmap|execution|deliver|agile|scrum|sprint|stakeholder|cross.?functional|requirement|prd|launch|ship/i, "execution"],
  [/estimat|sizing|market size|guesstimate/i, "guess"],
  [/leader|communicat|influence|collaborat|ownership|team|mentor|conflict/i, "behavioral"],
];

export function practiceTypesFor(gaps: string[], max = 3): PracticeType[] {
  const found: PracticeType[] = [];
  for (const gap of gaps)
    for (const [re, type] of RULES)
      if (re.test(gap) && !found.includes(type)) found.push(type);
  return found.slice(0, max);
}

export type TodayQuestion = {
  question: string;
  categoryLabel: string;
  difficulty: string;
  minutes: number;
  url: string;
};

// Today's practice question from Product Reps, for the daily email.
// Returns null if Product Reps doesn't answer quickly; the email then goes out without it.
export async function fetchTodayQuestion(): Promise<TodayQuestion | null> {
  try {
    const r = await fetch(`${base}api/today`, { signal: AbortSignal.timeout(5000), cache: "no-store" });
    if (!r.ok) return null;
    const j = await r.json();
    if (typeof j?.question !== "string" || typeof j?.url !== "string") return null;
    return {
      question: j.question.slice(0, 300),
      categoryLabel: String(j.categoryLabel || "PM"),
      difficulty: String(j.difficulty || ""),
      minutes: Number(j.minutes) || 15,
      url: j.url,
    };
  } catch {
    return null;
  }
}
