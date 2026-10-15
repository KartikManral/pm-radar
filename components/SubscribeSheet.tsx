"use client";

import { forwardRef, useState } from "react";
import { LEVEL_LABELS, type Level, type Region } from "@/lib/types";

const REGIONS: { id: Region; label: string }[] = [
  { id: "india", label: "India" },
  { id: "remote", label: "Remote, open to India" },
  { id: "remote-restricted", label: "Remote, other countries" },
];
const LEVELS: Level[] = ["intern", "entry", "pm", "senior"];

const SubscribeSheet = forwardRef<HTMLDialogElement>(function SubscribeSheet(_, ref) {
  const [email, setEmail] = useState("");
  const [regions, setRegions] = useState<Region[]>(["india", "remote"]);
  const [levels, setLevels] = useState<Level[]>(["intern", "entry", "pm"]);
  const [state, setState] = useState<"idle" | "busy" | "done">("idle");
  const [updated, setUpdated] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toggle = <T,>(list: T[], v: T) => (list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!regions.length || !levels.length) return setError("Pick at least one location and one level.");
    setState("busy");
    setError(null);
    try {
      const r = await fetch("/api/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, regions, levels }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error);
      setUpdated(Boolean(data.updated));
      setState("done");
    } catch (err: any) {
      setError(err?.message || "That didn't work. Try again.");
      setState("idle");
    }
  }

  function close() {
    (ref as React.RefObject<HTMLDialogElement>).current?.close();
  }

  return (
    <dialog ref={ref} className="sheet" aria-labelledby="sub-title" onClick={(e) => e.target === e.currentTarget && close()}>
      <div className="sheet-body">
        <div className="sheet-head">
          <h2 id="sub-title" className="h2">
            Get new roles every morning
          </h2>
          <button className="icon-btn" onClick={close} aria-label="Close">
            <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        {state === "done" ? (
          <div className="done">
            <p className="h3">{updated ? "Preferences updated" : "You're subscribed"}</p>
            <p className="muted">
              Check your inbox for a welcome email with today's roles. After that, you'll get one email around 8 AM
              IST on days with new roles. Every email has an unsubscribe link.
            </p>
            <button className="btn btn-primary" onClick={close}>
              Back to the list
            </button>
          </div>
        ) : (
          <form onSubmit={submit} className="sub-form">
            <p className="muted">
              One email a day with only the roles posted since the last one. No email on days with nothing new.
            </p>
            <label className="field">
              <span>Email</span>
              <input type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
            </label>
            <fieldset>
              <legend>Locations</legend>
              <div className="chips">
                {REGIONS.map((r) => (
                  <button
                    type="button"
                    key={r.id}
                    aria-pressed={regions.includes(r.id)}
                    className={regions.includes(r.id) ? "chip chip-on" : "chip"}
                    onClick={() => setRegions((c) => toggle(c, r.id))}
                  >
                    {r.label}
                  </button>
                ))}
              </div>
            </fieldset>
            <fieldset>
              <legend>Levels</legend>
              <div className="chips">
                {LEVELS.map((l) => (
                  <button
                    type="button"
                    key={l}
                    aria-pressed={levels.includes(l)}
                    className={levels.includes(l) ? "chip chip-on" : "chip"}
                    onClick={() => setLevels((c) => toggle(c, l))}
                  >
                    {LEVEL_LABELS[l]}
                  </button>
                ))}
              </div>
            </fieldset>
            {error && (
              <p className="form-error" role="alert">
                {error}
              </p>
            )}
            <button className="btn btn-primary btn-wide" disabled={state === "busy"}>
              {state === "busy" ? "Subscribing" : "Subscribe"}
            </button>
          </form>
        )}
      </div>
    </dialog>
  );
});

export default SubscribeSheet;
