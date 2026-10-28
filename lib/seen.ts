// For roles that have no posting date we can't know their age, so we record when
// the crawler first saw them. This is shown as "first seen 3d ago" and is used to
// expire undated roles. It is never used for the "New" badge: a role we only
// *found* today may have been posted months ago.
//
// The key is company + title + location rather than the source's id, because
// some job search sites hand out a different id for the same role each time.

export function seenKey(j: { company: string; title: string; location: string }): string {
  return `${j.company}|${j.title}|${j.location}`.toLowerCase();
}

export function assignFirstSeen(
  jobs: { company: string; title: string; location: string; postedAt: number | null; firstSeenAt?: number }[],
  previous: Record<string, number>,
  firstRun: boolean,
  now: number
): Record<string, number> {
  const next: Record<string, number> = {};
  for (const j of jobs) {
    if (j.postedAt != null) continue;
    const key = seenKey(j);
    // On the very first run everything already listed counts as old (time 1).
    const first = Number(previous[key]) || next[key] || (firstRun ? 1 : now);
    j.firstSeenAt = first;
    next[key] = first;
  }
  return next;
}
