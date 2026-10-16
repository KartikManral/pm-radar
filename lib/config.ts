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

export type AtsName = "greenhouse" | "lever" | "ashby" | "workable" | "smartrecruiters" | "keka";

export type AtsCompany = {
  name?: string;
  ats: AtsName;
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
  { name: "HackerRank", ats: "greenhouse", board: "hackerrank" },
  { name: "Paytm", ats: "lever", board: "paytm" },
  { name: "Okta", ats: "greenhouse", board: "okta" },

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
  { name: "Canonical", ats: "greenhouse", board: "canonical" },
  { name: "Twilio", ats: "greenhouse", board: "twilio" },
  { name: "Grafana Labs", ats: "greenhouse", board: "grafanalabs" },
  { name: "Elastic", ats: "greenhouse", board: "elastic" },
  { name: "Datadog", ats: "greenhouse", board: "datadog" },
];

// Remote job boards with public APIs. Each one asks for a link back to the
// original listing, which the site always shows.
export const REMOTE_BOARDS = {
  remotive: true,
  remoteok: true,
  himalayas: true,
};

// Adzuna: a job search API that gathers listings from many Indian job sites.
// Free developer key at https://developer.adzuna.com (ADZUNA_APP_ID, ADZUNA_APP_KEY).
// Free tier allows about 2,500 calls a month, so results are cached for 3 hours
// and only 6 searches run per refresh (about 1,600 calls a month).
export const ADZUNA_SEARCHES = [
  { title: "product manager", pages: 3 },
  { title: "product intern", pages: 1 },
  { title: "product owner", pages: 1 },
  { title: "product analyst", pages: 1 },
];
export const ADZUNA_REVALIDATE_SECONDS = 3 * 60 * 60;

// Sites and companies whose listings we can't legally copy. We link to a
// ready-made search (or their careers page) instead.
export type ExternalLink = { name: string; url: string };

export const EXTERNAL_SEARCHES: { group: string; note: string; links: ExternalLink[] }[] = [
  {
    group: "Job sites",
    note: "Product manager searches in India, opened on each site.",
    links: [
      { name: "LinkedIn", url: "https://www.linkedin.com/jobs/search/?keywords=product%20manager&location=India&f_TPR=r604800" },
      { name: "Naukri", url: "https://www.naukri.com/product-manager-jobs-in-india" },
      { name: "Indeed", url: "https://in.indeed.com/jobs?q=product+manager&l=India&fromage=14" },
      { name: "Wellfound", url: "https://wellfound.com/role/l/product-manager/india" },
      { name: "Glassdoor", url: "https://www.glassdoor.co.in/Job/india-product-manager-jobs-SRCH_IL.0,5_IN115_KO6,21.htm" },
      { name: "foundit", url: "https://www.foundit.in/srp/results?query=product%20manager&locations=India" },
      { name: "Instahyre", url: "https://www.instahyre.com/" },
      { name: "iimjobs", url: "https://www.iimjobs.com/" },
      { name: "Hirist", url: "https://www.hirist.tech/" },
      { name: "Cutshort", url: "https://cutshort.io/jobs" },
      { name: "Shine", url: "https://www.shine.com/job-search/product-manager-jobs" },
      { name: "Y Combinator startups", url: "https://www.workatastartup.com/jobs?role=product" },
      { name: "Internshala", url: "https://internshala.com/internships/product-management-internship/" },
      { name: "Unstop", url: "https://unstop.com/jobs" },
    ],
  },
  {
    group: "Company career pages",
    note: "Large companies that hire PMs in India but run their own careers sites.",
    links: [
      { name: "Google", url: "https://www.google.com/about/careers/applications/jobs/results/?q=product%20manager&location=India" },
      { name: "Microsoft", url: "https://jobs.careers.microsoft.com/global/en/search?q=product%20manager&lc=India" },
      { name: "Amazon", url: "https://www.amazon.jobs/en/search?base_query=product+manager&loc_query=India" },
      { name: "Meta", url: "https://www.metacareers.com/jobs?q=product%20manager" },
      { name: "Apple", url: "https://jobs.apple.com/en-in/search?search=product%20manager&location=india-INDC" },
      { name: "Flipkart", url: "https://www.flipkartcareers.com/" },
      { name: "Walmart Global Tech", url: "https://walmart.wd5.myworkdayjobs.com/WalmartExternal?q=product%20manager" },
      { name: "PhonePe", url: "https://www.phonepe.com/careers/" },
      { name: "Swiggy", url: "https://careers.swiggy.com/" },
      { name: "Zomato", url: "https://www.zomato.com/careers" },
      { name: "Myntra", url: "https://careers.myntra.com/" },
      { name: "MakeMyTrip", url: "https://careers.makemytrip.com/" },
      { name: "Uber", url: "https://www.uber.com/global/en/careers/list/?query=product%20manager" },
      { name: "Adobe", url: "https://careers.adobe.com/us/en/search-results?keywords=product%20manager" },
      { name: "Salesforce", url: "https://careers.salesforce.com/en/jobs/?search=product+manager" },
      { name: "Atlassian", url: "https://www.atlassian.com/company/careers/all-jobs" },
      { name: "Intuit", url: "https://jobs.intuit.com/search-jobs/product%20manager/India" },
      { name: "SAP", url: "https://jobs.sap.com/search/?q=product+manager&locationsearch=India" },
      { name: "Oracle", url: "https://careers.oracle.com/" },
      { name: "Jio", url: "https://careers.jio.com/" },
    ],
  },
];

// How long (seconds) job lists are cached before refetching.
export const JOBS_REVALIDATE_SECONDS = 60 * 60;
