// "New today" for roles that have no posting date. Dated roles are new by their
// posting date; an undated role is new when the crawler first saw it.
// (Using first-seen for dated roles too would flag old roles as new whenever a
// company's job board is added.)

export function assignFirstSeen(
  jobs: { id: string; postedAt: number | null; firstSeenAt?: number }[],
  previous: Record<string, number>,
  firstRun: boolean,
  now: number
): Record<string, number> {
  const next: Record<string, number> = {};
  for (const j of jobs) {
    if (j.postedAt != null) continue;
    // On the very first run everything already listed counts as old (time 1).
    const first = Number(previous[j.id]) || (firstRun ? 1 : now);
    j.firstSeenAt = first;
    next[j.id] = first;
  }
  return next;
}
