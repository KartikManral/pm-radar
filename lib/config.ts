// ---------------------------------------------------------------------------
// Site settings and the list of companies we pull jobs from.
// To add a company: find its careers page. If the URL looks like
//   boards.greenhouse.io/<token>      -> add { ats: "greenhouse", board: "<token>" }
//   jobs.lever.co/<token>             -> add { ats: "lever", board: "<token>" }
//   jobs.ashbyhq.com/<token>          -> add { ats: "ashby", board: "<token>" }
// A wrong token is skipped automatically, so it never breaks the site.
// ---------------------------------------------------------------------------

export const SITE_NAME = "PM Radar";
export const SITE_TAGLINE = "Product manager, APM and product internship roles in one list.";

// Used in emails for links back to the site. Set NEXT_PUBLIC_SITE_URL on Vercel.
export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ||
  (process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : "http://localhost:3000");

export type AtsCompany = {
  name: string;
  ats: "greenhouse" | "lever" | "ashby";
  board: string;
};

export const COMPANIES: AtsCompany[] = [
  // India-heavy hiring
  { name: "Groww", ats: "greenhouse", board: "groww" },
  { name: "InMobi", ats: "greenhouse", board: "inmobi" },
  { name: "Druva", ats: "greenhouse", board: "druva" },
  { name: "Rubrik", ats: "greenhouse", board: "rubrik" },
  { name: "Stripe", ats: "greenhouse", board: "stripe" },
  { name: "MongoDB", ats: "greenhouse", board: "mongodb" },
  { name: "Databricks", ats: "greenhouse", board: "databricks" },
  { name: "CRED", ats: "lever", board: "cred" },
  { name: "Meesho", ats: "lever", board: "meesho" },
  { name: "Zeta", ats: "lever", board: "zeta" },
  { name: "Atlan", ats: "ashby", board: "atlan" },

  // Global companies that often hire remote or in India
  { name: "Coinbase", ats: "greenhouse", board: "coinbase" },
  { name: "Airbnb", ats: "greenhouse", board: "airbnb" },
  { name: "GitLab", ats: "greenhouse", board: "gitlab" },
  { name: "Cloudflare", ats: "greenhouse", board: "cloudflare" },
  { name: "Figma", ats: "greenhouse", board: "figma" },
  { name: "Dropbox", ats: "greenhouse", board: "dropbox" },
  { name: "Spotify", ats: "lever", board: "spotify" },
  { name: "Palantir", ats: "lever", board: "palantir" },
  { name: "Notion", ats: "ashby", board: "notion" },
  { name: "Ramp", ats: "ashby", board: "ramp" },
  { name: "Linear", ats: "ashby", board: "linear" },
  { name: "OpenAI", ats: "ashby", board: "openai" },
  { name: "Supabase", ats: "ashby", board: "supabase" },
];

// Remote job boards with public APIs. Each one asks for a link back to the
// original listing, which the site always shows.
export const REMOTE_BOARDS = {
  remotive: true,
  remoteok: true,
  himalayas: true,
};

// Search links for sites we can't legally copy listings from.
export const EXTERNAL_SEARCHES = [
  {
    name: "LinkedIn",
    url: "https://www.linkedin.com/jobs/search/?keywords=product%20manager&location=India&f_TPR=r604800",
  },
  {
    name: "Naukri",
    url: "https://www.naukri.com/product-manager-jobs-in-india",
  },
  {
    name: "Wellfound",
    url: "https://wellfound.com/role/l/product-manager/india",
  },
  {
    name: "Internshala",
    url: "https://internshala.com/internships/product-management-internship/",
  },
];

// How long (seconds) job lists are cached before refetching.
export const JOBS_REVALIDATE_SECONDS = 60 * 60;
