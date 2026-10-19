/** Keep the organiser's round list in the order rounds were created, not by play date. */
function createdTime(value) {
  if (value == null) return null;
  if (typeof value.toMillis === 'function') {
    const ms = value.toMillis();
    return Number.isFinite(ms) ? ms : null;
  }
  if (value instanceof Date) return Number.isFinite(value.getTime()) ? value.getTime() : null;
  if (typeof value.seconds === 'number') {
    return value.seconds * 1000 + (value.nanoseconds ?? 0) / 1e6;
  }
  if (typeof value === 'string') {
    const ms = Date.parse(value);
    return Number.isFinite(ms) ? ms : null;
  }
  return null;
}

export function sortRoundsByCreation(rounds) {
  return [...(rounds ?? [])]
    .map((round, index) => ({ round, index, time: createdTime(round.createdAt) }))
    .sort((a, b) => {
      if (a.time != null && b.time != null && a.time !== b.time) return a.time - b.time;
      if (a.time != null && b.time == null) return -1;
      if (a.time == null && b.time != null) return 1;
      return a.index - b.index;
    })
    .map(({ round }) => round);
}
