# PM Radar

Product manager, APM and product internship roles from India and remote, in one list.

- **Job list** pulled every hour from company career pages (Greenhouse, Lever, Ashby) and three remote job boards (Remotive, Remote OK, Himalayas). Filtered to product roles, grouped by Today / This week / Earlier, with the source on every listing.
- **AI resume match** (Google Gemini, free tier). Upload a resume PDF or a portfolio link once, then check any role: fit score with reasons, gaps, steps to take before applying, rewritten resume lines and missing keywords.
- **Daily email** with only the roles posted since the last one, plus a **PDF download** of whatever list you're looking at.
- **Search links** for LinkedIn, Naukri, Wellfound and Internshala (those sites don't allow copying listings).
- Works on phone and laptop, light and dark mode.

Stack: Next.js 15 (React) on Vercel, Gemini API, Upstash Redis, Gmail SMTP. Everything used here has a free tier.

---

## 1. Run it on your laptop

You need Node.js 20 or newer.

```bash
npm install
cp .env.example .env.local
```

**Quickest look (no keys needed):** sample jobs and a sample AI result.

```bash
MOCK_JOBS=1 npm run dev
```

On Windows PowerShell: `$env:MOCK_JOBS="1"; npm run dev`

Open http://localhost:3000

**Real data:** remove `MOCK_JOBS`, add `GEMINI_API_KEY` to `.env.local`, then `npm run dev`. The job list works without any keys.

## 2. Get the free keys (about 15 minutes)

| What | Where | Env vars |
|---|---|---|
| Gemini API key | https://aistudio.google.com/apikey | `GEMINI_API_KEY` |
| Adzuna key (Indian job sites, optional but adds most roles) | Sign up at https://developer.adzuna.com, then open your dashboard | `ADZUNA_APP_ID`, `ADZUNA_APP_KEY` |
| Redis (stores email subscribers) | Vercel dashboard > Storage > Marketplace > **Upstash for Redis** > connect to this project | filled in for you |
| Gmail app password (sends emails) | Turn on 2-Step Verification, then https://myaccount.google.com/apppasswords | `SMTP_USER`, `SMTP_PASS` |
| Cron secret | Any long random string, e.g. from https://1password.com/password-generator | `CRON_SECRET` |

## 3. Deploy on Vercel

1. Create a new GitHub repo (for example `pm-radar`) and push this folder:
   ```bash
   git init && git add . && git commit -m "PM Radar v1"
   git branch -M main
   git remote add origin https://github.com/KartikManral/pm-radar.git
   git push -u origin main
   ```
2. On https://vercel.com/new import the repo. Framework is detected as Next.js.
3. Add the env vars from step 2 (Project > Settings > Environment Variables), plus `NEXT_PUBLIC_SITE_URL` set to your Vercel URL.
4. Add Upstash for Redis from the Storage tab and connect it to the project.
5. Redeploy. The daily email runs automatically at 8:00 AM IST (`vercel.json`).

**Test the daily email now** (replace the values):
```bash
curl -H "Authorization: Bearer YOUR_CRON_SECRET" https://your-site.vercel.app/api/cron/digest
```
It returns how many emails were sent. The first run only records the current jobs; new roles get emailed from the next run onward. People who subscribe get a welcome email with the latest roles right away.

## 4. Add more companies

Open `lib/config.ts`. Find a company's careers page and look at the URL:

- `boards.greenhouse.io/acme` or `job-boards.greenhouse.io/acme` > `{ name: "Acme", ats: "greenhouse", board: "acme" }`
- `jobs.lever.co/acme` > `{ name: "Acme", ats: "lever", board: "acme" }`
- `jobs.ashbyhq.com/acme` > `{ name: "Acme", ats: "ashby", board: "acme" }`

A wrong name is skipped automatically, so it never breaks the site. Open `/api/sources` on your site to see which sources worked and how many roles each one found. Indian startups that hire APMs are the highest-value additions.

## 4b. The job crawler (more roles, no API keys)

Company career pages are public, but each one only has a few PM roles in India.
So a crawler checks **hundreds** of them:

- `scripts/crawl.ts` checks about 570 company job boards (Greenhouse, Lever,
  Ashby, Workable, SmartRecruiters, Keka) plus the remote job boards, keeps product
  roles in India or remote, and saves them to your Upstash database.
- Once a week it also looks for Indian companies' boards: it tries every
  company in `data/india-companies.ts` on all five systems and remembers which
  ones exist. Add Indian companies there by name.
- Discovery also checks Y Combinator's Indian startups and fully remote YC companies that are hiring (from github.com/yc-oss/api), and every run adds company job boards linked in Hacker News' monthly "Who is hiring?" thread.
- It also searches about 30 large companies' Workday careers sites (Walmart, Adobe, Salesforce, NVIDIA...), listed in `data/workday-boards.ts`.
- **Internships:** with free `SERPAPI_KEY` (Google Jobs) and `JOOBLE_API_KEY` secrets set, it also searches job engines that index Internshala, LinkedIn, Naukri and Unstop. A role is marked Internship only when the listing's job type says so. Google Jobs runs once a day to stay inside SerpApi's free plan.
- Boards that don't exist are skipped for a week, so the list cleans itself.
- It runs on **GitHub Actions** every 4 hours (`.github/workflows/crawl.yml`),
  free for public repos. The website reads the saved list and picks up each
  new crawl within 10 minutes.

**Setup (one time):** in your GitHub repo go to Settings > Secrets and
variables > Actions > New repository secret, and add `KV_REST_API_URL` and
`KV_REST_API_TOKEN` (copy them from Upstash: Vercel > Storage > your database >
Open in Upstash > REST API). Then Actions > Crawl jobs > Run workflow, with
"Search for Indian companies' job boards now" ticked.

Check results at `/api/sources` on your site, or open the latest run in the
Actions tab to see the log.

## 5. How it works

```
app/page.tsx                 job list page (rebuilt at most once an hour)
components/JobBoard.tsx      filters, search, Today/This week/Earlier groups
components/MatchPanel.tsx    AI match result under a job
components/ResumeSheet.tsx   resume upload / portfolio link
components/SubscribeSheet.tsx daily email sign-up
lib/sources.ts               fetches each job board and normalises the data
scripts/crawl.ts             the crawler (runs on GitHub Actions)
data/                        company lists the crawler checks
lib/classify.ts              decides what counts as a product role, the level, India vs remote
lib/gemini.ts                prompt + scoring rubric for the AI match
app/api/resume               turns a PDF or link into text (nothing stored)
app/api/match                runs the AI match for one job
app/api/subscribe, unsubscribe, cron/digest   daily email
```

**Why a fit score and not "% chance of getting hired":** nobody has data on who actually got interviews, so a probability would be made up. The score is the AI's judgement of how well your resume covers the job's requirements, using a fixed rubric (80+ strong, 60-79 good, 40-59 stretch, below 40 long shot).

## 6. Limits to know

- **Gemini free tier:** limited requests per minute and per day (see your limits in Google AI Studio). Each visitor gets 25 match checks a day by default (`MATCH_DAILY_LIMIT`). On the free tier, Google may use requests to improve its products; the site tells users this.
- **Gmail:** about 500 emails a day. Past that, switch to Brevo or Resend SMTP by changing `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`.
- **Adzuna:** the free plan is about 2,500 calls a month. The crawler refreshes Adzuna every 6 hours with 13 calls each time (about 1,560 a month). If you add searches in `lib/config.ts`, keep calls x 4 x 30 under 2,500.
- **Google Jobs (SerpApi):** the free plan is about 100 searches a month and the crawler already uses about 90 (3 a day), so don't add more searches there without a paid plan.
- **Listings that ask for money:** job search sites (Adzuna, Jooble, Google Jobs) sometimes carry them. `lib/scam.ts` drops listings that mention fees, deposits or "pay Rs..." (unless the text says there is no fee). Visitors can also press "Report" on a listing: it hides for them at once, and for everyone once `REPORT_THRESHOLD` (default 2) different visitors report it. Reports are logged in Redis under `reports:log`. To block a company by hand, add its name to `data/blocked-companies.ts` (this hides only its job-search-site listings, never its own career page).
- **Undated and older roles:** job search sites often omit the posting date. Those roles are kept and shown under "Date not listed". Internships are kept for 60 days, other roles for 30.
- **Remote OK and Remotive** ask that you link back to them and name them as the source. The site does both on every listing; keep it that way.

## 7. Ideas for v2 (let users decide)

- Save and track applications (applied / interviewing / rejected)
- "Roles you're a strong match for" sorted by score
- More Indian companies, plus Workable and SmartRecruiters boards
- Weekly email option
- Simple analytics (Vercel Analytics) to measure users, match checks and subscribers for your case study
