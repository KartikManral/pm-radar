// Sample data so you can run the site locally without internet (MOCK_JOBS=1).
import type { JobWithDetail, MatchResult } from "./types";
import { isProductRole, levelFor, regionFor } from "./classify";
import { SOURCE_LABELS, type SourceId } from "./types";

const H = 60 * 60 * 1000;

const rows: [string, string, string, SourceId, number][] = [
  ["Associate Product Manager", "Groww", "Bengaluru, India", "greenhouse", 3],
  ["Product Management Intern", "CRED", "Bangalore", "lever", 7],
  ["Product Manager, Payments", "Stripe", "Bengaluru, India", "greenhouse", 20],
  ["Product Analyst II", "InMobi", "Bangalore", "greenhouse", 30],
  ["Senior Product Manager", "Druva", "Pune, Maharashtra, India", "greenhouse", 40],
  ["Product Manager - Growth", "Meesho", "Bangalore", "lever", 52],
  ["Product Manager, AI Platform", "Atlan", "Remote - India", "ashby", 70],
  ["Associate Product Manager Intern", "Coinbase", "Remote - Worldwide", "greenhouse", 90],
  ["Product Manager", "Doist", "Worldwide", "remotive", 100],
  ["Technical Product Manager", "Hotjar", "Remote", "remoteok", 120],
  ["Product Owner, Mobile", "Toggl", "Anywhere", "himalayas", 150],
  ["Group Product Manager, Compliance", "Coinbase", "Remote - USA", "greenhouse", 160],
  ["Senior Product Manager-Identity Resilience", "Rubrik", "Bangalore, India", "greenhouse", 200],
  ["Product Operations Manager", "Ramp", "Remote (APAC)", "ashby", 260],
  ["Product Manager, Merchant Experience", "Zeta", "Hyderabad", "lever", 300],
  ["Head of Product", "Supabase", "Remote, Worldwide", "ashby", 400],
];

export function mockJobs(): JobWithDetail[] {
  const now = Date.now();
  return rows
    .filter(([t]) => isProductRole(t))
    .map(([title, company, location, source, hoursAgo], i) => ({
      id: `${source}~mock~${i}`,
      title,
      company,
      location,
      region: regionFor(location, ["remotive", "remoteok", "himalayas"].includes(source))!,
      level: levelFor(title),
      source,
      sourceLabel: ["greenhouse", "lever", "ashby"].includes(source) ? `${company} careers` : SOURCE_LABELS[source],
      url: "https://example.com/job/" + i,
      postedAt: now - hoursAgo * H,
      description:
        "We're looking for a product manager to own discovery and delivery for a core product area. You'll talk to users, write PRDs, prioritise the roadmap with engineering and design, define success metrics, and run A/B tests. Requirements: 0-2 years in product or a related role, strong analytical skills (SQL a plus), clear writing, and a track record of shipping.",
    }))
    .filter((j) => j.region);
}

export const MOCK_MATCH: MatchResult = {
  score: 68,
  verdict: "Good match",
  summary:
    "You have hands-on building experience and clear product writing, which this APM role values. The main gap is evidence of measuring impact with data.",
  strengths: [
    "Shipped a live AI product end to end, which shows ownership",
    "Has written PRDs and case studies, matching the role's writing focus",
    "Technical background (B.Tech, React) helps working with engineers",
  ],
  gaps: [
    "No metrics on your projects: users, retention or impact numbers",
    "SQL and A/B testing are listed in the role but missing from your resume",
    "No direct user research examples",
  ],
  actions: [
    { title: "Add one impact number to each project", detail: "Even small numbers work: '40 users in 2 weeks', 'cut triage time by 30% in testing'." },
    { title: "Show SQL in 1 weekend", detail: "Analyse a public dataset in SQL and add the write-up as a portfolio piece." },
    { title: "Run 5 user interviews", detail: "Interview target users of your project and add one insight that changed what you built." },
  ],
  resumeTweaks: [
    "Built and launched an AI support-ticket triage tool; onboarded 5 teams and routed 1,000+ tickets with 85% accuracy",
    "Wrote PRD and prioritised v1 scope from 8 user interviews, cutting 3 features to ship in 4 weeks",
  ],
  missingKeywords: ["SQL", "A/B testing", "user research", "roadmap", "stakeholders"],
};
