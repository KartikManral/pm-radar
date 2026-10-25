// Spots job listings that ask the candidate for money (registration fees,
// "refundable" deposits, paid "programs" sold as internships). Real company
// career pages never do this, so this runs only on job search sites
// (Adzuna, Jooble, Google Jobs), where such posts slip in.

// "<kind of fee> fee/charges/deposit"
const FEE_NOUN =
  /\b(registration|joining|security|training|application|admission|enrol?lment|kit|interview|program(?:me)?|course|bootcamp|mentorship|placement)\s+(fees?|charges?|deposit|amount)\b/gi;

const OTHER_PATTERNS: RegExp[] = [
  // "pay Rs. 500", "pay ₹2,999", "payment of INR 1500"
  /\bpay(?:ment of)?\s*(?:an?\s+)?(?:amount of\s+)?(?:rs\.?|inr|₹)\s*\d/gi,
  // "candidates must pay", "you need to pay"
  /\b(?:candidates?|applicants?|interns?|students?|you)\s+(?:will\s+|would\s+)?(?:have to|need to|needs to|must|should|are required to|is required to)\s+pay\b/gi,
  // "Rs. 999 as registration", "₹5000 towards the kit"
  /(?:rs\.?|inr|₹)\s*[\d,]+\s*(?:\/-)?\s*(?:as|for|towards)\s+(?:the\s+)?(?:registration|security|training|joining|kit|deposit|processing|enrol)/gi,
  /\b(?:refundable|non-?refundable)\s+(?:deposit|fee|amount)\b/gi,
  /\b(?:initial|upfront)\s+(?:investment|deposit|payment)\b/gi,
  /\bpay[- ]to[- ](?:work|intern|join|apply)\b/gi,
];

// Words just before a match that turn it into a promise NOT to charge:
// "no registration fee", "we never ask for any joining fee", "without any fee".
const NEGATION = /\b(no|not|never|without|zero|nil|free of|don'?t|do not|doesn'?t|does not|neither|nor)\b[^.\n]{0,30}$/i;

function hasUnnegated(text: string, re: RegExp): boolean {
  re.lastIndex = 0;
  for (const m of text.matchAll(re)) {
    const before = text.slice(Math.max(0, (m.index ?? 0) - 45), m.index ?? 0);
    if (!NEGATION.test(before)) return true;
  }
  return false;
}

/** True when the listing text appears to ask the candidate to pay. */
export function looksLikeFeeScam(text: string): boolean {
  if (!text) return false;
  const t = text.replace(/\s+/g, " ");
  return hasUnnegated(t, FEE_NOUN) || OTHER_PATTERNS.some((re) => hasUnnegated(t, re));
}
