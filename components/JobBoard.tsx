"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { SITE_NAME } from "@/lib/config";
import { loadResume, type SavedResume } from "@/lib/storage";
import { ago, BUCKET_LABEL, bucketFor, type Bucket } from "@/lib/time";
import { LEVEL_LABELS, type Job, type Level } from "@/lib/types";
import MatchPanel from "./MatchPanel";
import ResumeSheet from "./ResumeSheet";
import SubscribeSheet from "./SubscribeSheet";

type Place = "for-you" | "india" | "remote";

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
  externalSearches: { name: string; url: string }[];
};

export default function JobBoard({ jobs, fetchedAt, externalSearches }: Props) {
  const [now, setNow] = useState(fetchedAt);
  const [query, setQuery] = useState("");
  const [place, setPlace] = useState<Place>("for-you");
  const [levels, setLevels] = useState<Level[]>(LEVELS);
  const [showRestricted, setShowRestricted] = useState(false);
  const [openMatch, setOpenMatch] = useState<string | null>(null);
  const [resume, setResume] = useState<SavedResume | null>(null);
  const [pendingMatch, setPendingMatch] = useState<string | null>(null);
  const resumeRef = useRef<HTMLDialogElement>(null);
  const subRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    setNow(Date.now());
    setResume(loadResume());
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return jobs.filter((j) => {
      if (!levels.includes(j.level)) return false;
      if (j.region === "remote-restricted" && !showRestricted) return false;
      if (place === "india" && j.region !== "india") return false;
      if (place === "remote" && j.region === "india") return false;
      if (q && !`${j.title} ${j.company} ${j.location}`.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [jobs, query, place, levels, showRestricted]);

  const groups = useMemo(() => {
    const g: Record<Bucket, Job[]> = { today: [], week: [], earlier: [] };
    for (const j of filtered) g[bucketFor(j.postedAt, now)].push(j);
    return (Object.keys(g) as Bucket[]).filter((b) => g[b].length).map((b) => ({ bucket: b, jobs: g[b] }));
  }, [filtered, now]);

  const companies = useMemo(() => new Set(jobs.map((j) => j.company)).size, [jobs]);

  function toggleLevel(l: Level) {
    setLevels((cur) => (cur.includes(l) ? (cur.length > 1 ? cur.filter((x) => x !== l) : cur) : [...cur, l]));
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
            PM, APM and product internship roles in India and remote, from {companies} companies' career pages and
            three remote job boards. Add your resume to see how well you fit each one, and what to fix before you
            apply.
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

          <div className="filter-foot">
            <label className="check">
              <input type="checkbox" checked={showRestricted} onChange={(e) => setShowRestricted(e.target.checked)} />
              Include remote roles limited to other countries
            </label>
            <button className="link-btn" onClick={downloadPdf} disabled={!filtered.length}>
              Download this list as PDF
            </button>
          </div>
        </section>

        <p className="count" aria-live="polite">
          {filtered.length} {filtered.length === 1 ? "role" : "roles"}
          <span className="count-sub"> updated {ago(fetchedAt, now).replace("Just posted", "just now")}</span>
        </p>

        {groups.length === 0 && (
          <div className="empty">
            <p>No roles match these filters. Clear the search or turn on more levels.</p>
            <button
              className="btn btn-primary"
              onClick={() => {
                setQuery("");
                setLevels(LEVELS);
                setPlace("for-you");
              }}
            >
              Reset filters
            </button>
          </div>
        )}

        {groups.map(({ bucket, jobs: list }) => (
          <section key={bucket} className="bucket" aria-labelledby={`b-${bucket}`}>
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
                      <span className={`tag tag-${j.level}`}>{LEVEL_LABELS[j.level]}</span>
                      {j.region !== "india" && (
                        <span className={j.region === "remote" ? "tag tag-remote" : "tag tag-muted"}>
                          {j.region === "remote" ? "Remote, open to India" : "Remote, other countries"}
                        </span>
                      )}
                      <span className="source">via {j.sourceLabel}</span>
                      <span className="when">{ago(j.postedAt, now)}</span>
                    </p>
                  </div>
                  <div className="job-actions">
                    <button
                      className={openMatch === j.id ? "btn btn-outline btn-active" : "btn btn-outline"}
                      onClick={() => checkMatch(j.id)}
                      aria-expanded={openMatch === j.id}
                    >
                      {openMatch === j.id ? "Hide match" : "Check my match"}
                    </button>
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
            These sites don't allow copying their listings, so we link to a ready-made search instead.
          </p>
          <div className="elsewhere-links">
            {externalSearches.map((s) => (
              <a key={s.name} className="btn btn-quiet" href={s.url} target="_blank" rel="noopener noreferrer">
                {s.name}
              </a>
            ))}
          </div>
        </section>

        <footer className="foot">
          <p>
            Listings come from public company job boards (Greenhouse, Lever, Ashby) and remote job boards (Remotive,
            Remote OK, Himalayas). Every role links to its original post. Match scores are AI estimates of fit, not a
            prediction of hiring decisions.
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
