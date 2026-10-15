import type { Level, Region } from "./types";

// Titles we count as product roles.
const PRODUCT_TITLE =
  /(product\s+(manager|management|owner|lead|leader|analyst|ops|operations|intern|internship|strategy|strategist)|\b(apm|gpm|tpm)\b|associate\s+product|head\s+of\s+product|chief\s+product|vp,?\s+(of\s+)?product|director,?\s+(of\s+)?product|product\s+management\s+intern)/i;

// "Product X" titles that are a different job family.
const NOT_PM =
  /product\s+(designer|design|marketing|marketer|engineer|engineering|security|support|specialist|counsel|research|photographer|developer|sales|content)/i;

// TPM usually means technical program manager, keep only when "product" is spelled out.
const PROGRAM_MANAGER = /\bprogram\s+manager\b/i;

export function isProductRole(title: string): boolean {
  if (!PRODUCT_TITLE.test(title)) return false;
  if (NOT_PM.test(title)) return false;
  if (PROGRAM_MANAGER.test(title) && !/product/i.test(title)) return false;
  return true;
}

export function levelFor(title: string): Level {
  if (/\b(intern|internship|trainee|apprentice)\b/i.test(title)) return "intern";
  if (/\b(associate\s+product|apm|junior|jr\.?|graduate|new\s+grad|entry|product\s+analyst)\b/i.test(title))
    return "entry";
  if (/\b(senior|sr\.?|lead|principal|staff|group|director|head|vp|chief|gpm)\b/i.test(title))
    return "senior";
  return "pm";
}

const INDIA =
  /\b(india|bengaluru|bangalore|mumbai|pune|hyderabad|gurugram|gurgaon|noida|delhi|new delhi|ncr|chennai|kolkata|ahmedabad|jaipur|kochi|chandigarh|indore|coimbatore|thiruvananthapuram|trivandrum|mysore|mysuru|mangalore|vizag|visakhapatnam|bhubaneswar|lucknow|nagpur|surat|vadodara|navi mumbai|thane|karnataka|maharashtra|telangana|tamil nadu|haryana|uttar pradesh|kerala|gujarat|rajasthan|west bengal|delhi ncr)\b/i;
const REMOTE = /\b(remote|anywhere|worldwide|work from home|wfh|distributed)\b/i;
const OPEN_TO_INDIA = /\b(india|apac|asia|worldwide|anywhere|global|international)\b/i;

/**
 * Decide where a job sits for an India-based candidate.
 * Returns null for on-site roles outside India (we hide those).
 */
export function regionFor(location: string, isRemote = false): Region | null {
  const loc = location || "";
  const remote = isRemote || REMOTE.test(loc);

  if (!remote) return INDIA.test(loc) ? "india" : null;
  // Remote role: is it open to people in India?
  if (OPEN_TO_INDIA.test(loc) || loc.trim() === "" || /^remote$/i.test(loc.trim())) return "remote";
  return "remote-restricted";
}

export function toMs(value: unknown): number | null {
  if (value == null || value === "") return null;
  if (typeof value === "number") return value < 1e12 ? value * 1000 : value;
  const t = Date.parse(String(value));
  return Number.isNaN(t) ? null : t;
}

const ENTITIES: Record<string, string> = {
  "&amp;": "&",
  "&lt;": "<",
  "&gt;": ">",
  "&quot;": '"',
  "&#39;": "'",
  "&nbsp;": " ",
  "&rsquo;": "'",
  "&lsquo;": "'",
  "&rdquo;": '"',
  "&ldquo;": '"',
  "&mdash;": "-",
  "&ndash;": "-",
  "&hellip;": "...",
};

export function decodeEntities(s: string): string {
  return s
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCharCode(parseInt(n, 16)))
    .replace(/&[a-z]+;|&#39;/gi, (m) => ENTITIES[m.toLowerCase()] ?? m);
}

export function htmlToText(html: string, max = 8000): string {
  const text = decodeEntities(
    html
      .replace(/<(script|style)[\s\S]*?<\/\1>/gi, " ")
      .replace(/<(br|\/p|\/li|\/h\d|\/div)>/gi, "\n")
      .replace(/<li[^>]*>/gi, "- ")
      .replace(/<[^>]+>/g, " ")
  )
    .replace(/[ \t]+/g, " ")
    .replace(/\n\s*\n+/g, "\n")
    .trim();
  return text.slice(0, max);
}
