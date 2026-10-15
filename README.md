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

A wrong name is skipped automatically (check Vercel logs for `[jobs] ... failed`), so it never breaks the site. Indian startups that hire APMs are the highest-value additions.

## 5. How it works

```
app/page.tsx                 job list page (rebuilt at most once an hour)
components/JobBoard.tsx      filters, search, Today/This week/Earlier groups
components/MatchPanel.tsx    AI match result under a job
components/ResumeSheet.tsx   resume upload / portfolio link
components/SubscribeSheet.tsx daily email sign-up
lib/sources.ts               fetches each job board and normalises the data
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
- **Remote OK and Remotive** ask that you link back to them and name them as the source. The site does both on every listing; keep it that way.

## 7. Ideas for v2 (let users decide)

- Save and track applications (applied / interviewing / rejected)
- "Roles you're a strong match for" sorted by score
- More Indian companies, plus Workable and SmartRecruiters boards
- Weekly email option
- Simple analytics (Vercel Analytics) to measure users, match checks and subscribers for your case study
