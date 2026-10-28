"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { PRODUCT_REPS_URL, SITE_NAME, type ExternalLink } from "@/lib/config";
import {
  EXP_BUCKETS,
  expLabel,
  isNewToday,
  matchesExperience,
  RECENCY,
  withinDays,
  type ExpBucket,
  type Recency,
} from "@/lib/filters";
import { loadHidden, loadResume, saveHidden, type SavedResume } from "@/lib/storage";
import { ago, BUCKET_LABEL, bucketFor, whenLabel, type Bucket } from "@/lib/time";
import { LEVEL_LABELS, type Job, type Level } from "@/lib/types";
import { prepUrl } from "@/lib/practice";
import MatchPanel from "./MatchPanel";
import ResumeSheet from "./ResumeSheet";
import SubscribeSheet from "./SubscribeSheet";

type Place = "for-you" | "india" | "remote";

// Company initials get one of these colours, picked from the name so a
// company always has the same colour.
const AVATAR_HUES = ["#0ea5e9", "#8b5cf6", "#ec4899", "#f97316", "#10b981", "#eab308", "#6366f1", "#14b8a6", "#ef4444", "#84cc16"];
function avatarColor(name: string) {
  let h = 0;
  for (const ch of name) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return AVATAR_HUES[h % AVATAR_HUES.length];
}
function initials(name: string) {
  const words = name.replace(/[^A-Za-z0-9 ]/g, " ").trim().split(/\s+/).filter(Boolean);
  if (!words.length) return "?";
  return (words.length > 1 ? words[0][0] + words[1][0] : words[0].slice(0, 2)).toUpperCase();
}

const PLACES: { id: Place; label: string }[] = [
  { id: "for-you", label: "India + remote" },
  { id: "india", label: "India" },
  { id: "remote", label: "Remote" },
];
const LEVELS: Level[] = ["intern", "entry", "pm", "senior"];

type Props = {
  jobs: Job[];
  fetchedAt: number;
  sourceCount: number;
  externalSearches: { group: string; note: string; links: ExternalLink[] }[];
};

export default function JobBoard({ jobs, fetchedAt, externalSearches }: Props) {
  const [now, setNow] = useState(fetchedAt);
  const [query, setQuery] = useState("");
  const [place, setPlace] = useState<Place>("for-you");
  const [levels, setLevels] = useState<Level[]>(LEVELS);
  const [showRestricted, setShowRestricted] = useState(false);
  const [onlyNew, setOnlyNew] = useState(false);
  const [showUndated, setShowUndated] = useState(false);
  const [exp, setExp] = useState<ExpBucket>("any");
  const [recency, setRecency] = useState<Recency>("30");
  const [openMatch, setOpenMatch] = useState<string | null>(null);
  const [resume, setResume] = useState<SavedResume | null>(null);
  const [pendingMatch, setPendingMatch] = useState<string | null>(null);
  const [hidden, setHidden] = useState<string[]>([]);
  const [reporting, setReporting] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const resumeRef = useRef<HTMLDialogElement>(null);
  const subRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    setNow(Date.now());
    setResume(loadResume());
    setHidden(loadHidden());
  }, []);

  const base = useMemo(() => {
    const q = query.trim().toLowerCase();
    const gone = new Set(hidden);
    return jobs.filter((j) => {
      if (gone.has(j.id)) return false;
      if (!levels.includes(j.level)) return false;
      if (j.region === "remote-restricted" && !showRestricted) return false;
      if (j.postedAt == null && !showUndated) return false; // age unknown: hidden unless asked for
      if (place === "india" && j.region !== "india") return false;
      if (place === "remote" && j.region === "india") return false;
      if (!matchesExperience(j, exp)) return false;
      if (!withinDays(j, Number(recency), now)) return false;
      if (q && !`${j.title} ${j.company} ${j.location}`.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [jobs, query, place, levels, showRestricted, showUndated, exp, recency, now, hidden]);

  const undatedCount = useMemo(() => jobs.filter((j) => j.postedAt == null).length, [jobs]);

  const newCount = useMemo(() => base.filter((j) => isNewToday(j, now)).length, [base, now]);
  const filtered = useMemo(() => (onlyNew ? base.filter((j) => isNewToday(j, now)) : base), [base, onlyNew, now]);

  // Roles hidden only because they don't say how much experience they need.
  const hiddenNoExp = useMemo(() => {
    if (exp === "any") return 0;
    return jobs.filter(
      (j) =>
        (j.expMin ?? null) === null &&
        levels.includes(j.level) &&
        (showRestricted || j.region !== "remote-restricted") &&
        !(place === "india" && j.region !== "india") &&
        !(place === "remote" && j.region === "india") &&
        withinDays(j, Number(recency), now)
    ).length;
  }, [jobs, exp, levels, showRestricted, place, recency, now]);

  const groups = useMemo(() => {
    const g: Record<Bucket, Job[]> = { today: [], week: [], earlier: [], undated: [] };
    for (const j of filtered) g[bucketFor(j.postedAt, now)].push(j);
    return (Object.keys(g) as Bucket[]).filter((b) => g[b].length).map((b) => ({ bucket: b, jobs: g[b] }));
  }, [filtered, now]);

  const companies = useMemo(() => new Set(jobs.map((j) => j.company)).size, [jobs]);

  function toggleLevel(l: Level) {
    setLevels((cur) => (cur.includes(l) ? (cur.length > 1 ? cur.filter((x) => x !== l) : cur) : [...cur, l]));
  }

  async function report(job: Job, reason: "fee" | "not-pm" | "expired") {
    setReporting(null);
    // Hide it for this visitor straight away; the server decides when to hide it for everyone.
    setHidden((cur) => {
      const next = [...cur, job.id];
      saveHidden(next);
      return next;
    });
    setOpenMatch((cur) => (cur === job.id ? null : cur));
    setNotice("Thanks. That listing is hidden for you, and we'll hide it for everyone once others report it too.");
    window.setTimeout(() => setNotice(null), 6000);
    try {
      await fetch("/api/report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobId: job.id, reason }),
      });
    } catch {
      /* offline: it stays hidden on this device */
    }
  }

  function checkMatch(id: string) {
    if (!resume) {
      setPendingMatch(id);
      resumeRef.current?.showModal();
      return;
    }
    setOpenMatch((cur) => (cur === id ? null : id));
  }

  function onResumeSaved(r: SavedResume | null) {
    setResume(r);
    if (r && pendingMatch) {
      setOpenMatch(pendingMatch);
      setPendingMatch(null);
      resumeRef.current?.close();
    }
  }

  async function downloadPdf() {
    const { exportJobsPdf } = await import("@/lib/pdf");
    exportJobsPdf(filtered, now);
  }

  return (
    <>
      <header className="topbar">
        <div className="wrap topbar-inner">
          <a className="wordmark" href="/">
            <svg width="26" height="26" viewBox="0 0 26 26" aria-hidden="true">
              <circle cx="13" cy="13" r="11.5" fill="none" stroke="currentColor" strokeWidth="1.6" />
              <circle cx="13" cy="13" r="6.5" fill="none" stroke="currentColor" strokeWidth="1.6" opacity=".55" />
              <path d="M13 13 L22 6" stroke="var(--accent)" strokeWidth="2.2" strokeLinecap="round" />
              <circle cx="18.6" cy="16.8" r="1.9" fill="var(--accent)" />
            </svg>
            {SITE_NAME}
          </a>
          <nav className="topbar-actions">
            <a
              className="btn btn-quiet"
              href={`${PRODUCT_REPS_URL}?ref=pm-radar`}
              target="_blank"
              rel="noopener"
              aria-label="Product Reps: practice PM interview questions"
              title="Practice PM interview questions on Product Reps"
            >
              <span className="hide-sm">Product Reps</span>
              <span className="show-sm">Prep</span>
            </a>
            <button className="btn btn-quiet" onClick={() => subRef.current?.showModal()} aria-label="Daily email">
              <span className="hide-sm">Daily email</span>
              <span className="show-sm">Email</span>
            </button>
            <button className="btn btn-quiet resume-btn" onClick={() => resumeRef.current?.showModal()}>
              <span className={resume ? "dot dot-on" : "dot"} aria-hidden="true" />
              {resume ? "Resume added" : "Add resume"}
            </button>
          </nav>
        </div>
      </header>

      <main className="wrap">
        <section className="intro">
          <h1 className="display">Every product role worth applying to, in one list.</h1>
          <p className="lede">
            PM, APM and product internship roles in India and remote, from {companies} companies across company
            career pages, Indian job sites and remote job boards. Add your resume to see how well you fit each one,
            and what to fix before you apply.
          </p>
        </section>

        <section className="controls" aria-label="Filter roles">
          <label className="search">
            <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
              <circle cx="11" cy="11" r="7" fill="none" stroke="currentColor" strokeWidth="2" />
              <path d="M20 20l-4-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
            <input
              type="search"
              placeholder="Search title, company or city"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              aria-label="Search roles"
            />
          </label>

          <div className="filter-row">
            <div className="segmented" role="radiogroup" aria-label="Location">
              {PLACES.map((p) => (
                <button
                  key={p.id}
                  role="radio"
                  aria-checked={place === p.id}
                  className={place === p.id ? "seg seg-on" : "seg"}
                  onClick={() => setPlace(p.id)}
                >
                  {p.label}
                </button>
              ))}
            </div>
            <div className="chips" role="group" aria-label="Level">
              {LEVELS.map((l) => (
                <button
                  key={l}
                  aria-pressed={levels.includes(l)}
                  className={levels.includes(l) ? "chip chip-on" : "chip"}
                  onClick={() => toggleLevel(l)}
                >
                  {LEVEL_LABELS[l]}
                </button>
              ))}
            </div>
          </div>

          <div className="chips" role="group" aria-label="Freshness">
            <button
              aria-pressed={onlyNew}
              className={onlyNew ? "chip chip-on" : "chip"}
              onClick={() => setOnlyNew((v) => !v)}
              title="Roles posted in the last 24 hours"
            >
              New today{newCount > 0 ? ` (${newCount})` : ""}
            </button>
          </div>

          <div className="selects">
            <label className="select">
              <span>Experience</span>
              <select value={exp} onChange={(e) => setExp(e.target.value as ExpBucket)}>
                {EXP_BUCKETS.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="select">
              <span>Posted</span>
              <select value={recency} onChange={(e) => setRecency(e.target.value as Recency)}>
                {RECENCY.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.label}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="filter-foot">
            <label className="check">
              <input type="checkbox" checked={showRestricted} onChange={(e) => setShowRestricted(e.target.checked)} />
              Include remote roles limited to other countries
            </label>
            <label className="check">
              <input type="checkbox" checked={showUndated} onChange={(e) => setShowUndated(e.target.checked)} />
              Include roles with no posting date{undatedCount > 0 ? ` (${undatedCount})` : ""}
            </label>
            <button className="link-btn" onClick={downloadPdf} disabled={!filtered.length}>
              Download this list as PDF
            </button>
          </div>
        </section>

        <p className="count" aria-live="polite">
          {filtered.length} {filtered.length === 1 ? "role" : "roles"}
          <span className="count-sub">
            {" "}
            {onlyNew
              ? "new in the last 24 hours"
              : `posted in the last ${recency === "1" ? "24 hours" : recency === "30" ? "30 days (internships 60)" : `${recency} days`}`}
            , updated{" "}
            {ago(fetchedAt, now).replace("Just posted", "just now")}
          </span>
        </p>
        {hiddenNoExp > 0 && (
          <p className="hint">
            {hiddenNoExp} more {hiddenNoExp === 1 ? "role doesn't" : "roles don't"} say how much experience{" "}
            {hiddenNoExp === 1 ? "it needs" : "they need"}.{" "}
            <button className="link-btn" onClick={() => setExp("any")}>
              Show all experience levels
            </button>
          </p>
        )}

        {notice && (
          <p className="hint" role="status" aria-live="polite">
            {notice}
          </p>
        )}

        {groups.length === 0 && (
          <div className="empty">
            <p>
              {onlyNew
                ? 'No new roles in the last 24 hours with these filters. Turn off "New today" to see everything.'
                : "No roles match these filters. Clear the search or turn on more levels."}
            </p>
            <button
              className="btn btn-primary"
              onClick={() => {
                setQuery("");
                setLevels(LEVELS);
                setPlace("for-you");
                setExp("any");
                setRecency("30");
                setOnlyNew(false);
              }}
            >
              Reset filters
            </button>
          </div>
        )}

        {groups.map(({ bucket, jobs: list }) => (
          <section key={bucket} className={`bucket bucket-${bucket}`} aria-labelledby={`b-${bucket}`}>
            <div className="rail">
              <h2 id={`b-${bucket}`} className="rail-label">
                {BUCKET_LABEL[bucket]}
              </h2>
              <span className="rail-count">
                {list.length} {list.length === 1 ? "role" : "roles"}
              </span>
            </div>
            <ol className="jobs">
              {list.map((j) => (
                <li key={j.id} className={openMatch === j.id ? "job job-open" : "job"}>
                  <div className="job-main">
                    <span
                      className="avatar"
                      style={{ ["--av" as string]: avatarColor(j.company) } as React.CSSProperties}
                      aria-hidden="true"
                    >
                      {initials(j.company)}
                    </span>
                    <div className="job-text">
                    <h3 className="job-title">
                      <a href={j.url} target="_blank" rel="noopener noreferrer">
                        {j.title}
                      </a>
                    </h3>
                    <p className="job-where">
                      <span className="job-company">{j.company}</span>
                      <span className="job-loc">{j.location}</span>
                    </p>
                    <p className="job-meta">
                      {isNewToday(j, now) && <span className="tag tag-new">New</span>}
                      <span className={`tag tag-${j.level}`}>{LEVEL_LABELS[j.level]}</span>
                      {expLabel(j) && <span className="tag tag-exp">{expLabel(j)}</span>}
                      {j.region !== "india" && (
                        <span className={j.region === "remote" ? "tag tag-remote" : "tag tag-muted"}>
                          {j.region === "remote" ? "Remote, open to India" : "Remote, other countries"}
                        </span>
                      )}
                      {(j.closedReports ?? 0) > 0 && (
                        <span className="tag tag-muted" title="Someone reported this role as closed, or its link as broken">
                          Reported closed{(j.closedReports ?? 0) > 1 ? ` x${j.closedReports}` : ""}
                        </span>
                      )}
                      <span className="source">via {j.sourceLabel}</span>
                      <span className="when">{whenLabel(j.postedAt, j.firstSeenAt, now)}</span>
                      <button
                        className="link-btn report-btn"
                        onClick={() => setReporting((cur) => (cur === j.id ? null : j.id))}
                        aria-expanded={reporting === j.id}
                        aria-label={`Report ${j.title} at ${j.company}`}
                      >
                        Report
                      </button>
                    </p>
                    {reporting === j.id && (
                      <div className="report-choices" role="group" aria-label="What is wrong with this listing?">
                        <span className="muted small">What's wrong?</span>
                        <button className="chip" onClick={() => report(j, "fee")}>
                          Asks for money
                        </button>
                        <button className="chip" onClick={() => report(j, "not-pm")}>
                          Not a product role
                        </button>
                        <button className="chip" onClick={() => report(j, "expired")}>
                          Closed or broken link
                        </button>
                        <button className="link-btn" onClick={() => setReporting(null)}>
                          Cancel
                        </button>
                      </div>
                    )}
                    </div>
                  </div>
                  <div className="job-actions">
                    <button
                      className={openMatch === j.id ? "btn btn-outline btn-active" : "btn btn-outline"}
                      onClick={() => checkMatch(j.id)}
                      aria-expanded={openMatch === j.id}
                    >
                      {openMatch === j.id ? "Hide match" : "Check my match"}
                    </button>
                    <a
                      className="btn btn-quiet"
                      href={prepUrl(j)}
                      target="_blank"
                      rel="noopener"
                      title={`Practise interview questions for ${j.company} on Product Reps`}
                    >
                      <span className="hide-sm">Prep for this role</span>
                      <span className="show-sm">Prep</span>
                    </a>
                    <a className="btn btn-primary" href={j.url} target="_blank" rel="noopener noreferrer">
                      Apply
                    </a>
                  </div>
                  {openMatch === j.id && resume && <MatchPanel job={j} resume={resume} />}
                </li>
              ))}
            </ol>
          </section>
        ))}

        <section className="elsewhere">
          <h2 className="h3">Search other job sites</h2>
          <p className="muted">
            These sites and companies don't allow copying their listings, so we link to them instead.
          </p>
          {externalSearches.map((g) => (
            <div key={g.group} className="elsewhere-group">
              <h3 className="elsewhere-title">{g.group}</h3>
              <p className="muted small">{g.note}</p>
              <div className="elsewhere-links">
                {g.links.map((s) => (
                  <a key={s.name} className="btn btn-quiet" href={s.url} target="_blank" rel="noopener noreferrer">
                    {s.name}
                  </a>
                ))}
              </div>
            </div>
          ))}
        </section>

        <footer className="foot">
          <p>
            Roles are shown for 30 days after posting (internships for 60). Some job sites don't give a posting date;
            those roles are grouped under "Date not listed", so check the original post. Real jobs never ask you to
            pay to apply: use "Report" on any listing that does. Listings come from public company job boards
            (Greenhouse, Lever, Ashby, Workable, SmartRecruiters, Keka, Workday), remote job boards (Remotive,
            Remote OK, Himalayas, We Work Remotely, Jobicy, Working Nomads), Hacker News "Who is hiring?", Google
            Jobs (via SerpApi), Jooble and{" "}
            <a href="https://www.adzuna.in" target="_blank" rel="noopener noreferrer">
              Jobs by Adzuna
            </a>
            . Every role links to its original post. Match scores are AI estimates of fit, not a prediction of hiring
            decisions.
          </p>
          <p>
            Built by{" "}
            <a href="https://www.linkedin.com/in/kartik-manral-b08383249" target="_blank" rel="noopener noreferrer">
              Kartik Manral
            </a>
          </p>
        </footer>
      </main>

      <ResumeSheet ref={resumeRef} resume={resume} onSaved={onResumeSaved} pending={Boolean(pendingMatch)} />
      <SubscribeSheet ref={subRef} />
    </>
  );
}
