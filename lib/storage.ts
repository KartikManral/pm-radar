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

// Listings this visitor reported are hidden right away, even before enough
// reports come in to hide them for everyone.
const HIDDEN_KEY = "pmradar.hidden.v1";

export function loadHidden(): string[] {
  try {
    const raw = window.localStorage.getItem(HIDDEN_KEY);
    const list = raw ? JSON.parse(raw) : [];
    return Array.isArray(list) ? list.filter((x) => typeof x === "string").slice(-500) : [];
  } catch {
    return [];
  }
}

export function saveHidden(ids: string[]) {
  try {
    window.localStorage.setItem(HIDDEN_KEY, JSON.stringify(ids.slice(-500)));
  } catch {
    /* ignore: the listing is still hidden for this visit */
  }
}
