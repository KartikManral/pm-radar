"use client";

import { useEffect, useState } from "react";
import type { SavedResume } from "@/lib/storage";
import type { Job, MatchResult } from "@/lib/types";

const cache = new Map<string, MatchResult>();

const STEPS = ["Reading the job description", "Comparing it with your resume", "Writing your next steps"];

function band(score: number) {
  if (score >= 80) return "strong";
  if (score >= 60) return "good";
  if (score >= 40) return "stretch";
  return "long";
}

export default function MatchPanel({ job, resume }: { job: Job; resume: SavedResume }) {
  const key = `${job.id}|${resume.savedAt}`;
  const [result, setResult] = useState<MatchResult | null>(cache.get(key) ?? null);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState(0);
  const [attempt, setAttempt] = useState(0);
  const [copied, setCopied] = useState<number | null>(null);

  useEffect(() => {
    if (cache.has(key)) return;
    let alive = true;
    setError(null);
    setStep(0);
    const timer = setInterval(() => setStep((s) => Math.min(s + 1, STEPS.length - 1)), 2200);
    fetch("/api/match", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ jobId: job.id, resume: resume.text }),
    })
      .then(async (r) => {
        const data = await r.json().catch(() => ({ error: "The AI check didn't finish. Try again." }));
        if (!alive) return;
        if (!r.ok) setError(data.error);
        else {
          cache.set(key, data);
          setResult(data);
        }
      })
      .catch(() => alive && setError("You seem to be offline. Check your connection and try again."))
      .finally(() => clearInterval(timer));
    return () => {
      alive = false;
      clearInterval(timer);
    };
  }, [key, job.id, resume.text, attempt]);

  async function copy(text: string, i: number) {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(i);
      setTimeout(() => setCopied(null), 1600);
    } catch {
      /* clipboard blocked */
    }
  }

  if (error)
    return (
      <div className="match" role="status">
        <p className="match-error">{error}</p>
        <button className="btn btn-outline" onClick={() => setAttempt((a) => a + 1)}>
          Try again
        </button>
      </div>
    );

  if (!result)
    return (
      <div className="match match-loading" role="status" aria-live="polite">
        <div className="scan" aria-hidden="true" />
        <ol className="steps">
          {STEPS.map((s, i) => (
            <li key={s} className={i < step ? "done" : i === step ? "now" : ""}>
              {s}
            </li>
          ))}
        </ol>
      </div>
    );

  const b = band(result.score);
  return (
    <div className={`match match-${b}`}>
      <div className="match-head">
        <div className="score" aria-label={`Fit score ${result.score} out of 100`}>
          <span className="score-num">{result.score}</span>
          <span className="score-of">/100</span>
        </div>
        <div className="match-verdict">
          <p className="verdict">{result.verdict}</p>
          <div className="meter" aria-hidden="true">
            <span style={{ width: `${result.score}%` }} />
            <i style={{ left: "40%" }} />
            <i style={{ left: "60%" }} />
            <i style={{ left: "80%" }} />
          </div>
          <p className="match-summary">{result.summary}</p>
        </div>
      </div>

      <div className="match-cols">
        <div>
          <h4>Where you're strong</h4>
          <ul className="list list-plus">
            {result.strengths.map((s) => (
              <li key={s}>{s}</li>
            ))}
          </ul>
        </div>
        <div>
          <h4>What's missing</h4>
          <ul className="list list-minus">
            {result.gaps.map((s) => (
              <li key={s}>{s}</li>
            ))}
          </ul>
        </div>
      </div>

      {result.actions.length > 0 && (
        <div className="match-block">
          <h4>Before you apply</h4>
          <ul className="actions">
            {result.actions.map((a) => (
              <li key={a.title}>
                <strong>{a.title}</strong>
                <span>{a.detail}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {result.resumeTweaks.length > 0 && (
        <div className="match-block">
          <h4>Resume lines to try</h4>
          <ul className="tweaks">
            {result.resumeTweaks.map((t, i) => (
              <li key={t}>
                <p>{t}</p>
                <button className="link-btn" onClick={() => copy(t, i)}>
                  {copied === i ? "Copied" : "Copy"}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {result.missingKeywords.length > 0 && (
        <div className="match-block">
          <h4>Keywords from the job your resume doesn't mention</h4>
          <p className="kw">
            {result.missingKeywords.map((k) => (
              <span key={k}>{k}</span>
            ))}
          </p>
        </div>
      )}

      <p className="fine">
        AI estimate of how well your resume fits this role. It can't see the full hiring picture, so use it as a guide.
      </p>
    </div>
  );
}
