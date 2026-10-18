
import { useEffect, useState } from 'react';
import { saveRoundScorecard } from '../../../repositories/roundRepository.js';

function makeDefaultHoles() {
    return Array.from({ length: 18 }, (_, index) => ({
        number: index + 1,
        par: 4,
        strokeIndex: index + 1,
    }));
}

export default function RoundScorecardEditor({
                                                 tournament,
                                                 round,
                                                 onSaved,
                                             }) {
    const [holes, setHoles] = useState(() =>
        round.scorecard?.holes ?? makeDefaultHoles(),
    );

    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    useEffect(() => {
        setHoles(round.scorecard?.holes ?? makeDefaultHoles());
        setError('');
        setSuccess('');
    }, [round.id, round.scorecard]);

    function updateHole(index, field, value) {
        setHoles((current) =>
            current.map((hole, holeIndex) =>
                holeIndex === index
                    ? { ...hole, [field]: Number(value) }
                    : hole,
            ),
        );

        setSuccess('');
    }

    async function handleSave() {
        setSaving(true);
        setError('');
        setSuccess('');

        try {
            await saveRoundScorecard(tournament, round.id, holes);
            setSuccess('Scorecard saved.');
            await onSaved?.();
        } catch (err) {
            setError(err.message);
        } finally {
            setSaving(false);
        }
    }

    const totalPar = holes.reduce(
        (total, hole) => total + hole.par,
        0,
    );

    const strokeIndicesUnique =
        new Set(holes.map((hole) => hole.strokeIndex)).size === 18;

    return (
        <div className="space-y-4">
            <div>
                <h3 className="text-lg font-semibold">
                    {round.name} — Scorecard setup
                </h3>
                <p className="text-sm text-baggygolf-muted">
                    Total par: {totalPar}
                </p>
            </div>

            <div className="overflow-x-auto">
                <table className="w-full text-sm">
                    <thead>
                    <tr className="border-b text-left">
                        <th className="p-2">Hole</th>
                        <th className="p-2">Par</th>
                        <th className="p-2">Stroke Index</th>
                    </tr>
                    </thead>

                    <tbody>
                    {holes.map((hole, index) => (
                        <tr key={hole.number} className="border-b">
                            <td className="p-2 font-medium">
                                {hole.number}
                            </td>

                            <td className="p-2">
                                <select
                                    value={hole.par}
                                    disabled={saving || round.status !== 'draft'}
                                    onChange={(event) =>
                                        updateHole(index, 'par', event.target.value)
                                    }
                                    className="w-full rounded border border-baggygolf-line p-2"
                                >
                                    {[3, 4, 5, 6].map((par) => (
                                        <option key={par} value={par}>
                                            {par}
                                        </option>
                                    ))}
                                </select>
                            </td>

                            <td className="p-2">
                                <select
                                    value={hole.strokeIndex}
                                    disabled={saving || round.status !== 'draft'}
                                    onChange={(event) =>
                                        updateHole(
                                            index,
                                            'strokeIndex',
                                            event.target.value,
                                        )
                                    }
                                    className="w-full rounded border border-baggygolf-line p-2"
                                >
                                    {Array.from({ length: 18 }, (_, i) => i + 1).map(
                                        (strokeIndex) => (
                                            <option key={strokeIndex} value={strokeIndex}>
                                                {strokeIndex}
                                            </option>
                                        ),
                                    )}
                                </select>
                            </td>
                        </tr>
                    ))}
                    </tbody>
                </table>
            </div>

            {!strokeIndicesUnique && (
                <p className="text-sm text-amber-700">
                    Every stroke index must be unique (1–18).
                </p>
            )}

            {error && (
                <p role="alert" className="text-sm text-red-600">
                    {error}
                </p>
            )}

            {success && (
                <p role="status" className="text-sm text-green-700">
                    {success}
                </p>
            )}

            <button
                type="button"
                onClick={handleSave}
                disabled={
                    saving ||
                    !strokeIndicesUnique ||
                    round.status !== 'draft'
                }
                className="rounded-lg bg-baggygolf-primary px-5 py-3 font-semibold text-white disabled:opacity-50"
            >
                {saving ? 'Saving...' : 'Save scorecard'}
            </button>
        </div>
    );
}
