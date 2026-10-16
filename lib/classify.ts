import type { Level, Region } from "./types";

// Titles we count as product management roles.
const PRODUCT_TITLE =
  /(product\s+(manager|management|owner|lead|leader|intern|internship|head)|\b(apm|gpm)\b|associate\s+product\s+manager|head\s+of\s+product|chief\s+product|vp,?\s+(of\s+)?product|director,?\s+(of\s+)?product)/i;

// Titles that mention product but are a different job: analysts, operations,
// design, marketing, engineering, program/project management, and so on.
const NOT_PM =
  /product\s+(designer|design|marketing|marketer|engineer|engineering|security|support|specialist|counsel|research|researcher|photographer|developer|sales|content|analyst|analytics|operations|ops|expert|consultant|trainer|evangelist|architect|success|quality|compliance|owner\s+-?\s*sap)|\banalyst\b|\bprogram\s+manager\b|\bproject\s+manager\b|\bscrum\b|\bskillbridge\b|\bsales\b|\bmarketing\s+manager\b/i;

export function isProductRole(title: string): boolean {
  return PRODUCT_TITLE.test(title) && !NOT_PM.test(title);
}

/** Only roles posted within this many days are shown. */
export const MAX_AGE_DAYS = 30;

export function isRecent(postedAt: number | null, now = Date.now()) {
  if (!postedAt) return false; // no posting date: we can't tell how old it is
  const age = now - postedAt;
  return age < MAX_AGE_DAYS * 24 * 3_600_000 && age > -2 * 24 * 3_600_000;
}

// ---------- Experience ----------

const WORD_NUM: Record<string, string> = {
  one: "1", two: "2", three: "3", four: "4", five: "5", six: "6", seven: "7", eight: "8",
  nine: "9", ten: "10", eleven: "11", twelve: "12", fifteen: "15",
};

/**
 * Years of experience a job asks for, read from its description,
 * e.g. "3-5 years of product management experience" -> { min: 3, max: 5 }.
 * When several numbers appear, the largest minimum wins (it is usually the
 * main requirement; smaller ones are for sub-skills).
 */
export function experienceFrom(text: string): { min: number; max: number | null } | null {
  if (!text) return null;
  const t = text
    .toLowerCase()
    .replace(/\s+/g, " ")
    .replace(/\b(one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|fifteen)\b/g, (w) => WORD_NUM[w]);
  const re = /(\d{1,2}(?:\.\d)?)\s*(?:\+|plus)?\s*(?:(?:-|–|—|to)\s*(\d{1,2})\s*\+?\s*)?(?:years?|yrs?)/g;
  let best: { min: number; max: number | null } | null = null;
  for (const m of t.matchAll(re)) {
    const i = m.index ?? 0;
    const after = t.slice(i + m[0].length, i + m[0].length + 60);
    const before = t.slice(Math.max(0, i - 45), i);
    if (/^\s*(ago|old|of age|history|running|in business)/.test(after)) continue;
    // "5+ years of (product) experience", "3 years in product", "4 years as a PM"
    const statedAfter =
      /^\s*'?\s*(?:of\s+)?(?:(?:relevant|professional|hands-on|work|working|total|overall|proven|prior|industry|full-time|post-mba)\s+)*(?:experience|exp\b|in\s+(?:a\s+)?(?:product|pm\b|b2b|b2c|saas|tech|fintech|consumer|a\s+similar)|of\s+(?:product|pm\b|working|managing|building|leading|hands)|as\s+an?\s+(?:pm\b|product|apm))/.test(
        after
      );
    // "Experience: 3-5 years", "minimum experience of 4 years"
    const statedBefore = /(?:experience|exp)\b[^.;]{0,25}$/.test(before);
    if (!statedAfter && !statedBefore) continue;
    const min = parseFloat(m[1]);
    const max = m[2] ? parseInt(m[2], 10) : null;
    if (min > 20 || (max !== null && (max < min || max > 25))) continue;
    if (!best || min > best.min) best = { min, max };
  }
  return best;
}

/** Experience from the description, or a sensible default from the title. */
export function experienceFor(title: string, description = ""): { min: number; max: number | null } | null {
  const found = experienceFrom(description);
  if (found) return found;
  if (/\b(intern|internship|trainee|apprentice)\b/i.test(title)) return { min: 0, max: 1 };
  if (/\b(associate\s+product|apm|junior|jr\.?|graduate|new\s+grad|entry)\b/i.test(title)) return { min: 0, max: 2 };
  return null;
}

// ---------- Remote roles limited to other countries ----------

const RESTRICTED =
  /\b(must|need to|needs to|required to|should)\s+(be\s+)?(located|based|reside|residing|living|legally authori[sz]ed to work|authori[sz]ed to work)\s+(in|within)\s+(the\s+)?(u\.?s\.?a?|united states|canada|uk|united kingdom|europe|eu|emea|latam|latin america|australia|germany|brazil|mexico|spain|france|poland|netherlands|ireland)\b|\b(u\.?s\.?|united states|canada|uk|eu|emea|europe|latam|north america)[- ](based|only)\b|\b(us|u\.s\.) (citizen|citizenship|person)s?\b|\bsecurity clearance\b|\bskillbridge\b|\bremote\s*[-(,]?\s*(us|usa|u\.s\.|united states|canada|uk|emea|europe|latam|north america)\b|\bw-?2\b/i;

/** True when the description says a remote role is only open in other countries. */
export function remoteIsRestricted(description: string): boolean {
  if (!description) return false;
  return RESTRICTED.test(description) && !/\bindia\b/i.test(description);
}

export function levelFor(title: string): Level {
  if (/\b(intern|internship|trainee|apprentice)\b/i.test(title)) return "intern";
  if (/\b(associate\s+product|apm|junior|jr\.?|graduate|new\s+grad|entry)\b/i.test(title))
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
