// Y Combinator companies, from the open-source list at github.com/yc-oss/api.
// Used once a week to find more company job boards to check.
import type { AtsName } from "./config";
import type { Candidate } from "../data/india-companies";

const YC_URL = "https://yc-oss.github.io/api/companies/all.json";

type YcCompany = {
  name: string;
  slug?: string;
  website?: string;
  regions?: string[];
  all_locations?: string;
  status?: string;
  isHiring?: boolean;
};

/** "https://www.razorpay.com/" -> "razorpay" */
function domainRoot(url = ""): string | null {
  try {
    const host = new URL(url.startsWith("http") ? url : `https://${url}`).hostname.replace(/^www\./, "");
    const root = host.split(".")[0];
    return root && root.length > 1 ? root.toLowerCase() : null;
  } catch {
    return null;
  }
}

/**
 * Indian YC startups (checked on every hiring tool) plus fully remote YC
 * companies that are hiring now (checked on the tools remote startups use).
 */
export async function ycCandidates(): Promise<Candidate[]> {
  const res = await fetch(YC_URL, { signal: AbortSignal.timeout(30_000) });
  if (!res.ok) throw new Error(`YC list ${res.status}`);
  const all = (await res.json()) as YcCompany[];
  const out: Candidate[] = [];
  for (const c of all) {
    const live = c.status === "Active" || c.status === "Public";
    if (!live || !c.name) continue;
    const regions = c.regions ?? [];
    const indian = regions.includes("India") || /\bindia\b/i.test(c.all_locations ?? "");
    const remoteHiring = c.isHiring === true && regions.includes("Fully Remote");
    if (!indian && !remoteHiring) continue;
    const slugs = [c.slug, domainRoot(c.website)].filter((s): s is string => Boolean(s));
    const ats: AtsName[] | undefined = indian ? undefined : ["greenhouse", "lever", "ashby", "workable"];
    out.push({ name: c.name, slugs, ats });
  }
  return out;
}
