// Browser storage can be blocked (private mode, strict settings), so every
// call is wrapped and the site keeps working without it.
export type SavedResume = { text: string; label: string; savedAt: number };

const KEY = "pmradar.resume.v1";

export function loadResume(): SavedResume | null {
  try {
    const raw = window.localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as SavedResume) : null;
  } catch {
    return null;
  }
}

export function saveResume(r: SavedResume | null) {
  try {
    if (r) window.localStorage.setItem(KEY, JSON.stringify(r));
    else window.localStorage.removeItem(KEY);
  } catch {
    /* ignore: resume still works for this visit */
  }
}
