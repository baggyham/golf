import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../../hooks/useAuth.js';
import { getRoundPlayingHandicap } from '../../lib/handicap.js';
import { calculateRoundStableford } from '../../lib/stableford.js';
import {
  emptyScorecard,
  getMyScoreEntry,
  saveMyScoreEntry,
} from '../../repositories/scoreEntryRepository.js';

export default function ScoreEntry({ tournament, round }) {
  const { user } = useAuth();
  const participants = Object.entries(tournament.participants ?? {});
  const [selectedPlayerId, setSelectedPlayerId] = useState(user?.uid ?? participants[0]?.[0] ?? '');
  const [scores, setScores] = useState(emptyScorecard);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  // Entries are private to the person recording them: changing player loads
  // *this user's* independent scorecard for that golfer.
  useEffect(() => {
    let active = true;
    setLoading(true);
    setScores(emptyScorecard());
    setDirty(false);
    setMessage('');
    setError('');
    if (!selectedPlayerId) {
      setLoading(false);
      return () => { active = false; };
    }
    getMyScoreEntry(tournament.id, round.id, selectedPlayerId)
      .then((entry) => {
        if (active) setScores(entry?.holes ?? emptyScorecard());
      })
      .catch((err) => {
        if (active) setError(err.message || 'Unable to load scores.');
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [tournament.id, round.id, selectedPlayerId]);

  const participant = tournament.participants?.[selectedPlayerId];
  const holes = round.scorecard?.holes;
  let playingHandicap = null;
  try {
    if (participant) {
      playingHandicap = getRoundPlayingHandicap(participant, tournament.handicapMode, round);
    }
  } catch { /* Not yet configured */ }

  const result = useMemo(() => {
    if (!holes || playingHandicap === null) return null;
    return calculateRoundStableford({ holes, scores, playingHandicap });
  }, [holes, scores, playingHandicap]);

  function updateScore(index, value) {
    setScores((current) => current.map((score, i) => (i === index ? value : score)));
    setDirty(true);
    setMessage('');
  }

  async function save() {
    setSaving(true);
    setError('');
    setMessage('');
    try {
      await saveMyScoreEntry(tournament, round, selectedPlayerId, scores);
      setDirty(false);
      setMessage('Scorecard saved to Firestore.');
    } catch (err) {
      setError(err.message || 'Unable to save scores.');
    } finally {
      setSaving(false);
    }
  }

  if (!user || !tournament.participants?.[user.uid]) {
    return <p>Only tournament participants can enter scores.</p>;
  }
  if (!holes) return <p>Configure the round scorecard first.</p>;
  if (!participants.length) return <p>No players in this tournament.</p>;

  return (
    <section className="space-y-4 rounded-xl border border-gray-200 bg-white p-5">
      <div>
        <h3 className="text-lg font-semibold">{round.name} — Score entry</h3>
        <p className="text-sm text-gray-500">
          Record your own scores or another player's. Only your entries are edited here.
        </p>
      </div>

      <label className="block text-sm font-medium">
        Player being scored
        <select
          value={selectedPlayerId}
          disabled={loading || saving}
          onChange={(event) => {
            if (dirty && !window.confirm('Discard unsaved changes?')) return;
            setSelectedPlayerId(event.target.value);
          }}
          className="mt-1 w-full rounded border border-gray-300 p-3"
        >
          {participants.map(([id, player]) => (
            <option key={id} value={id}>{player.displayName}{id === user.uid ? ' (you)' : ''}</option>
          ))}
        </select>
      </label>

      {loading ? <p>Loading your scorecard...</p> : (
        <>
          {playingHandicap === null ? (
            <p role="alert">Complete the round handicap setup before entering scores.</p>
          ) : (
            <>
              <div className="flex flex-wrap gap-5 rounded-lg bg-gray-50 p-4">
                <p>Playing Handicap: <strong>{playingHandicap}</strong></p>
                <p>Points: <strong>{result?.totalPoints ?? 0}</strong></p>
                <p>Holes: <strong>{result?.completedHoles ?? 0}/18</strong></p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead><tr className="border-b text-left">
                    <th className="p-2">Hole</th><th className="p-2">Par</th>
                    <th className="p-2">SI</th><th className="p-2">Shots</th>
                    <th className="p-2">Gross</th><th className="p-2">Pts</th>
                  </tr></thead>
                  <tbody>
                    {holes.map((hole, index) => (
                      <tr key={hole.number} className="border-b">
                        <td className="p-2">{hole.number}</td>
                        <td className="p-2">{hole.par}</td>
                        <td className="p-2">{hole.strokeIndex}</td>
                        <td className="p-2">{result?.holes[index].handicapStrokes}</td>
                        <td className="p-2">
                          <select
                            aria-label={`Gross strokes on hole ${hole.number}`}
                            value={scores[index] ?? ''}
                            disabled={saving || round.status !== 'in_progress'}
                            onChange={(event) => {
                              const raw = event.target.value;
                              updateScore(index, raw === '' ? null : raw === 'pickup' ? 'pickup' : Number(raw));
                            }}
                            className="w-24 rounded border border-gray-300 p-2"
                          >
                            <option value="">—</option>
                            {Array.from({ length: 30 }, (_, i) => i + 1).map((n) => (
                              <option key={n} value={n}>{n}</option>
                            ))}
                            <option value="pickup">Pickup</option>
                          </select>
                        </td>
                        <td className="p-2 font-semibold">{result?.holes[index].points ?? '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {dirty && <p className="text-sm text-amber-700">Unsaved changes</p>}
              <button
                type="button"
                onClick={save}
                disabled={saving || !dirty || round.status !== 'in_progress'}
                className="rounded-lg bg-fairway-950 px-5 py-3 font-semibold text-white disabled:opacity-50"
              >{saving ? 'Saving...' : 'Save scorecard'}</button>
            </>
          )}
        </>
      )}
      {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
      {message && <p role="status" className="text-sm text-green-700">{message}</p>}
    </section>
  );
}
