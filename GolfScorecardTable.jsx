import { Fragment } from 'react';

const sum = (items) => items.reduce((total, n) => total + (typeof n === 'number' ? n : 0), 0);
const scoreText = (score) => score === 'pickup' ? 'P/U' : (typeof score === 'number' ? score : '—');
const pointText = (points) => typeof points === 'number' ? points : '—';

function grossTotal(card, start, end) {
  const section = card.slice(start, end);
  const strokes = section.filter((s) => typeof s === 'number');
  if (!strokes.length) return '—';
  return `${sum(strokes)}${section.every((s) => typeof s === 'number') ? '' : '*'}`;
}

/**
 * Read-only scorecard presentation. `players` is an array of:
 * { id, name, playingHandicap, scores: (number|'pickup'|null)[], points: (number|null)[] }
 * Scores and points are prepared by the calling screen; this component does not
 * decide whether the data is provisional or verified.
 */
export default function GolfScorecardTable({ holes = [], players = [], onSelectHole, statusLabel = 'Provisional' }) {
  const ink = 'var(--ink, #173d30)';
  const muted = 'var(--muted, #667469)';
  const primary = 'var(--primary, #173d30)';
  const paper = 'var(--surface, #ffffff)';
  const line = 'var(--line, #dfe6df)';
  const soft = 'var(--surface-soft, #eff2ec)';
  const headerLine = 'rgba(255,255,255,.19)';
  const cell = 'border-r border-b py-[5px] px-[1px] text-center align-middle leading-none tabular-nums';
  const numberOfPlayers = Math.max(players.length, 1);
  const fixedWidth = 26;
  const playerWidth = (100 - fixedWidth) / numberOfPlayers;
  const scoreColour = (points) => {
    if (points === 3) return { background: 'var(--score-good, #efc543)', color: '#24251e' };
    if (typeof points === 'number' && points >= 4) return { background: 'var(--score-great, #267354)', color: '#fff' };
    return {};
  };

  const sectionRow = (label, from, to) => (
    <tr key={label} className="font-bold" style={{ background: soft }}>
      <th scope="row" className={cell} style={{ borderColor: line }}>{label}</th>
      <td className={cell} style={{ borderColor: line }}>{sum(holes.slice(from, to).map((h) => Number(h.par) || 0))}</td>
      <td className={cell} style={{ borderColor: line }}>—</td>
      {players.map((p) => <Fragment key={p.id}>
        <td className={cell} style={{ borderColor: line }}>{grossTotal(p.scores ?? [], from, to)}</td>
        <td className={`${cell} font-extrabold`} style={{ borderColor: line }}>{sum((p.points ?? []).slice(from, to))}</td>
      </Fragment>)}
    </tr>
  );

  return (
    <div className="flex h-full min-h-0 w-full flex-col overflow-hidden rounded-lg border" style={{ borderColor: line, background: paper, color: ink }}>
      <div className="min-h-0 flex-1 overflow-auto overscroll-contain [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden" tabIndex={0} aria-label="Scrollable round scorecard">
      <table className="w-full table-fixed border-separate border-spacing-0 text-[10px] sm:text-xs" style={{ fontVariantNumeric: 'tabular-nums' }} aria-label="Round golf scorecard">
        <colgroup>
          <col style={{ width: '9%' }} /><col style={{ width: '8%' }} /><col style={{ width: '9%' }} />
          {players.map((p) => <Fragment key={p.id}>
            <col style={{ width: `${playerWidth * .52}%` }} />
            <col style={{ width: `${playerWidth * .48}%` }} />
          </Fragment>)}
        </colgroup>
        <thead className="sticky top-0 z-10" style={{ background: primary, color: 'var(--on-primary, #fff)' }}>
          <tr>
            <th rowSpan={2} scope="col" className="border-r px-0.5 text-center text-[9px]" style={{ borderColor: headerLine }}>Hole</th>
            <th rowSpan={2} scope="col" className="border-r px-0.5 text-center text-[9px]" style={{ borderColor: headerLine }}>Par</th>
            <th rowSpan={2} scope="col" className="border-r px-0.5 text-center text-[9px]" style={{ borderColor: headerLine }}>SI</th>
            {players.map((p) => <th key={p.id} colSpan={2} scope="colgroup" className="border-r px-0.5 py-2 text-center align-middle last:border-r-0" style={{ borderColor: headerLine }} title={p.name}>
              <span className="block break-words text-[9px] font-bold leading-[1.2] sm:text-[11px]">{p.name}</span>
              <span className="mt-1 block text-[8px] font-normal opacity-85">HCP {p.playingHandicap ?? '—'}</span>
            </th>)}
          </tr>
          <tr>
            {players.map((p) => <Fragment key={p.id}>
              <th scope="col" className="border-r border-t py-1 text-center text-[9px]" style={{ borderColor: headerLine }}>Str</th>
              <th scope="col" className="border-r border-t py-1 text-center text-[9px]" style={{ borderColor: headerLine }}>Pts</th>
            </Fragment>)}
          </tr>
        </thead>
        <tbody>
          {holes.map((hole, i) => <Fragment key={i}>
            <tr>
              <th scope="row" className={`${cell} font-semibold`} style={{ borderColor: line }}>
                {onSelectHole ? <button type="button" className="min-h-7 w-full font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px]" onClick={() => onSelectHole(i)} aria-label={`Edit hole ${i + 1}`}>{i + 1}</button> : i + 1}
              </th>
              <td className={cell} style={{ borderColor: line, color: muted }}>{hole.par}</td>
              <td className={cell} style={{ borderColor: line, color: muted }}>{hole.strokeIndex}</td>
              {players.map((p) => {
                const stroke = p.scores?.[i];
                const points = p.points?.[i];
                return <Fragment key={p.id}>
                  <td className={cell} style={{ borderColor: line, color: stroke == null ? muted : ink }}>{scoreText(stroke)}</td>
                  <td className={`${cell} font-bold`} style={{ borderColor: line, ...scoreColour(points) }}>{pointText(points)}</td>
                </Fragment>;
              })}
            </tr>
            {i === 8 && sectionRow('OUT', 0, 9)}
          </Fragment>)}
          {sectionRow('IN', 9, 18)}
          {sectionRow('TOTAL', 0, 18)}
        </tbody>
      </table>
      </div>
      <p className="shrink-0 border-t px-2 py-2 text-[10px] leading-snug" style={{ color: muted }}>
        {statusLabel} · — Missing · P/U Pickup · * Partial gross total
      </p>
    </div>
  );
}
