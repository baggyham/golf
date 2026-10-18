/** Recent official competition placements, independent of how a format is scored. */
export function getRecentFinishes(tournaments, playerId, limit = 5) {
  if (!playerId || !Array.isArray(tournaments)) return [];
  return tournaments
    .filter(t => t?.status === 'completed' && t?.participants?.[playerId])
    .map(t => {
      // Only use an explicitly recorded individual placement. Team placements
      // must be modelled separately when team formats are introduced.
      const result = Array.isArray(t.finalStandings)
        ? t.finalStandings.find(row => row.playerId === playerId)
        : null;
      const position = result?.position;
      if (!Number.isInteger(position) || position < 1) return null;
      const format = String(t.format || 'stableford').toLowerCase();
      const formatLabels = { stableford: 'Stableford', stroke_play: 'Stroke', strokeplay: 'Stroke', match_play: 'Match', matchplay: 'Match', scramble: 'Scramble', better_ball: 'Better ball', betterball: 'Better ball' };
      return { id: t.id, name: t.name || 'Competition', position, formatLabel: formatLabels[format] || 'Competition', endDate: t.endDate || '' };
    })
    .filter(Boolean)
    .sort((a,b) => b.endDate.localeCompare(a.endDate) || String(b.id).localeCompare(String(a.id)))
    .slice(0, Math.max(0, limit));
}

export function ordinalFinish(position) {
  if (!Number.isInteger(position) || position < 1) return '—';
  const mod100 = position % 100;
  const suffix = mod100 >= 11 && mod100 <= 13 ? 'th' : ({1:'st', 2:'nd', 3:'rd'}[position % 10] || 'th');
  return `${position}${suffix}`;
}
