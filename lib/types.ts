export type Level = "intern" | "entry" | "pm" | "senior";
export type Region = "india" | "remote" | "remote-restricted";

export type SourceId =
  | "greenhouse"
  | "lever"
  | "ashby"
  | "remotive"
  | "remoteok"
  | "himalayas"
  | "adzuna"
  | "workable"
  | "smartrecruiters"
  | "keka"
  | "workday"
  | "googlejobs"
  | "jooble"
  | "weworkremotely"
  | "jobicy"
  | "workingnomads"
  | "hackernews";

/** What the browser receives: small, no descriptions. */
export type Job = {
  id: string;
  title: string;
  company: string;
  location: string;
  region: Region;
  level: Level;
  source: SourceId;
  sourceLabel: string;
  url: string;
  postedAt: number | null; // ms timestamp
  /** Years of experience asked for, null when the post doesn't say. */
  expMin: number | null;
  expMax: number | null;
};

/** Server-side only: may carry a description for the AI match. */
export type JobWithDetail = Job & {
  description?: string;
  board?: string;
  rawId?: string;
};

export type MatchResult = {
  score: number;
  verdict: "Strong match" | "Good match" | "Stretch" | "Long shot";
  summary: string;
  strengths: string[];
  gaps: string[];
  actions: { title: string; detail: string }[];
  resumeTweaks: string[];
  missingKeywords: string[];
};

export const LEVEL_LABELS: Record<Level, string> = {
  intern: "Internship",
  entry: "APM / entry",
  pm: "PM",
  senior: "Senior & lead",
};

export const SOURCE_LABELS: Record<SourceId, string> = {
  greenhouse: "Greenhouse",
  lever: "Lever",
  ashby: "Ashby",
  remotive: "Remotive",
  remoteok: "Remote OK",
  himalayas: "Himalayas",
  adzuna: "Adzuna",
  workable: "Workable",
  smartrecruiters: "SmartRecruiters",
  keka: "Keka",
  workday: "Workday",
  googlejobs: "Google Jobs",
  jooble: "Jooble",
  weworkremotely: "We Work Remotely",
  jobicy: "Jobicy",
  workingnomads: "Working Nomads",
  hackernews: "Hacker News",
};
