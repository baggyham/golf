import { useEffect, useMemo, useState } from 'react';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '../../config/firebase.js';
import { reconcilePlayerScores } from '../../lib/scoreReconciliation.js';
import { validateVerifiedCard } from '../../lib/verification.js';
import { listenToVerifiedScores, verifyPlayerScore } from '../../repositories/scoreVerificationRepository.js';

const OPTIONS = [
  { value: '', label: 'Not recorded' },
  ...Array.from({ length: 30 }, (_, index) => ({ value: String(index + 1), label: String(index + 1) })),
  { value: 'pickup', label: 'Pickup' },
];

export default function ScoreVerification({ tournament, round }) {
  const [entries, setEntries] = useState([]);
  const [official, setOfficial] = useState({});
  const [playerId, setPlayerId] = useState(Object.keys(tournament.participants ?? {})[0] ?? '');
  const [scores, setScores] = useState(Array(18).fill(null));
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [entriesReady, setEntriesReady] = useState(false);
  const [officialReady, setOfficialReady] = useState(false);

  useEffect(() => {
    setEntriesReady(false);
    setOfficialReady(false);
    setEntries([]);
    setOfficial({});
    const path = collection(db, 'tournaments', tournament.id, 'rounds', round.id, 'scoreEntries');
    const unsubEntries = onSnapshot(path, (snapshot) => {
      setEntries(snapshot.docs.map((item) => ({ id: item.id, ...item.data() })));
      setEntriesReady(true);
    }, (err) => setError(err.message));
    const unsubOfficial = listenToVerifiedScores(tournament.id, round.id,
      (data) => { setOfficial(data); setOfficialReady(true); },
      (err) => setError(err.message),
    );
    return () => { unsubEntries(); unsubOfficial(); };
  }, [tournament.id, round.id]);

  const reconciled = useMemo(
    () => reconcilePlayerScores(playerId, entries),
    [playerId, entries],
  );
  const officialForPlayer = official[playerId];

  // Do not replace edits when another player submits scores while organiser is reviewing.
  // Changing the selected player resets the working card explicitly.
  useEffect(() => {
    if (!entriesReady || !officialReady) return;
    setScores(officialForPlayer?.holes ? [...officialForPlayer.holes] : [...reconciled.scores]);
    setNote('');
    setError('');
    setMessage('');
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playerId, round.id, entriesReady, officialReady]);

  function reloadSuggestion() {
    setScores(officialForPlayer?.holes ? [...officialForPlayer.holes] : [...reconciled.scores]);
    setMessage('Suggestions restored.');
  }

  async function handleConfirm() {
    setError('');
    setMessage('');
    try {
      validateVerifiedCard(scores);
      setSaving(true);
      await verifyPlayerScore(tournament, round, playerId, scores, note);
      setMessage('Official scorecard saved.');
      setNote('');
    } catch (err) {
      setError(err.message || 'Could not verify scorecard.');
    } finally {
      setSaving(false);
    }
  }

  if (round.status !== 'awaiting_verification') return null;
  const ready = entriesReady && officialReady;
  const verifiedCount = Object.keys(official).filter((id) => tournament.participants?.[id]).length;
  const isRevision = Boolean(officialForPlayer);
  const differs = isRevision && scores.some((score, i) => score !== officialForPlayer.holes[i]);
  return (
    <section className="space-y-4 rounded-xl border border-baggygolf-line bg-baggygolf-surface p-4">
      <div>
        <h3 className="font-semibold">Score verification</h3>
        <p className="text-sm text-baggygolf-muted">{verifiedCount}/{Object.keys(tournament.participants ?? {}).length} players confirmed</p>
      </div>
      <label className="block text-sm font-medium">Player
        <select className="mt-1 w-full rounded border p-3" value={playerId} onChange={(event) => setPlayerId(event.target.value)}>
          {Object.entries(tournament.participants ?? {}).map(([id, person]) => (
            <option key={id} value={id}>{person.displayName}{official[id] ? ' ✓' : ''}</option>
          ))}
        </select>
      </label>
      {!ready && <p className="text-sm text-baggygolf-muted">Loading submissions…</p>}
      {ready && <>
        <p className="text-sm text-baggygolf-muted">Self-entered scores take provisional priority. Check against marker or paper cards before confirming.</p>
        <div className="overflow-x-auto">
          <table className="w-full text-sm"><thead><tr className="border-b text-left"><th className="p-2">Hole</th><th className="p-2">Submissions</th><th className="p-2">Official</th></tr></thead>
            <tbody>{reconciled.holes.map((hole, index) => (
              <tr key={index} className={`border-b ${hole.disputed ? 'bg-amber-50' : ''}`}>
                <td className="p-2 font-medium">{index + 1}{hole.disputed ? ' ⚠' : ''}</td>
                <td className="p-2 text-xs text-baggygolf-text">
                  {hole.submissions.length ? hole.submissions.map((submission) => (
                    <div key={submission.recordedBy}>
                      {tournament.participants[submission.recordedBy]?.displayName ?? 'Recorder'}: {submission.grossStrokes}
                    </div>
                  )) : 'No digital entry'}
                </td>
                <td className="p-2"><select aria-label={`Official score for hole ${index + 1}`} className="w-28 rounded border p-2" value={scores[index] ?? ''}
                  onChange={(event) => setScores((prev) => prev.map((s, i) => i === index ? (event.target.value === '' ? null : event.target.value === 'pickup' ? 'pickup' : Number(event.target.value)) : s))}>
                  {OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                </select></td>
              </tr>
            ))}</tbody>
          </table>
        </div>
        <button type="button" className="text-sm underline" onClick={reloadSuggestion}>Reset to {isRevision ? 'confirmed card' : 'provisional scores'}</button>
        <label className="block text-sm">Verification note (required for corrections to confirmed results)
          <textarea rows={2} maxLength={500} className="mt-1 w-full rounded border p-2" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Checked against paper card…" />
        </label>
        {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
        {message && <p role="status" className="text-sm text-green-700">{message}</p>}
        <button type="button" onClick={handleConfirm} disabled={saving || !ready || (differs && !note.trim())}
          className="rounded bg-baggygolf-primary px-4 py-3 text-sm font-semibold text-white disabled:opacity-50">
          {saving ? 'Saving…' : isRevision ? 'Update confirmed scorecard' : 'Confirm player scorecard'}
        </button>
      </>}
    </section>
  );
}
