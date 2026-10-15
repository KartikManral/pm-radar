"use client";

import { forwardRef, useState } from "react";
import { saveResume, type SavedResume } from "@/lib/storage";

type Props = { resume: SavedResume | null; onSaved: (r: SavedResume | null) => void; pending: boolean };

const ResumeSheet = forwardRef<HTMLDialogElement, Props>(function ResumeSheet({ resume, onSaved, pending }, ref) {
  const [mode, setMode] = useState<"pdf" | "link">("pdf");
  const [link, setLink] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(body: FormData | string) {
    setBusy(true);
    setError(null);
    try {
      const r = await fetch("/api/resume", {
        method: "POST",
        ...(typeof body === "string"
          ? { headers: { "Content-Type": "application/json" }, body: JSON.stringify({ url: body }) }
          : { body }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error);
      const saved = { text: data.text, label: data.label, savedAt: Date.now() };
      saveResume(saved);
      onSaved(saved);
    } catch (e: any) {
      setError(e?.message || "That didn't work. Try again.");
    } finally {
      setBusy(false);
    }
  }

  function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    const fd = new FormData();
    fd.append("file", f);
    submit(fd);
    e.target.value = "";
  }

  function close() {
    (ref as React.RefObject<HTMLDialogElement>).current?.close();
  }

  return (
    <dialog ref={ref} className="sheet" aria-labelledby="resume-title" onClick={(e) => e.target === e.currentTarget && close()}>
      <div className="sheet-body">
        <div className="sheet-head">
          <h2 id="resume-title" className="h2">
            {resume ? "Your resume" : "Add your resume"}
          </h2>
          <button className="icon-btn" onClick={close} aria-label="Close">
            <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        {pending && !resume && <p className="note">Add your resume once, then check your match on any role.</p>}

        {resume && (
          <div className="saved">
            <div>
              <p className="saved-name">{resume.label}</p>
              <p className="muted small">{resume.text.length.toLocaleString()} characters read</p>
            </div>
            <button
              className="link-btn danger"
              onClick={() => {
                saveResume(null);
                onSaved(null);
              }}
            >
              Remove
            </button>
          </div>
        )}

        <div className="segmented full" role="tablist">
          <button role="tab" aria-selected={mode === "pdf"} className={mode === "pdf" ? "seg seg-on" : "seg"} onClick={() => setMode("pdf")}>
            Upload PDF
          </button>
          <button role="tab" aria-selected={mode === "link"} className={mode === "link" ? "seg seg-on" : "seg"} onClick={() => setMode("link")}>
            Portfolio link
          </button>
        </div>

        {mode === "pdf" ? (
          <label className={busy ? "drop busy" : "drop"}>
            <input type="file" accept="application/pdf,.pdf" onChange={onFile} disabled={busy} />
            <span className="drop-title">{busy ? "Reading your resume" : resume ? "Upload a new PDF" : "Choose your resume PDF"}</span>
            <span className="muted small">PDF up to 5 MB</span>
          </label>
        ) : (
          <form
            className="link-form"
            onSubmit={(e) => {
              e.preventDefault();
              if (link.trim()) submit(link.trim());
            }}
          >
            <input
              type="url"
              inputMode="url"
              placeholder="https://your-portfolio.vercel.app"
              value={link}
              onChange={(e) => setLink(e.target.value)}
              aria-label="Portfolio or resume link"
              required
            />
            <button className="btn btn-primary" disabled={busy}>
              {busy ? "Reading" : "Use this link"}
            </button>
          </form>
        )}

        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}

        <p className="muted small privacy">
          Your resume stays in this browser and we don't store it. It's sent to Google's Gemini AI only when you
          check a match; on Gemini's free tier, Google may use what's sent to improve its products.
        </p>
      </div>
    </dialog>
  );
});

export default ResumeSheet;
