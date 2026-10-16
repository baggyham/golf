import {useEffect, useState} from 'react';
import {getAllPlayers} from '../../repositories/playerRepository.js';
import {createTournament} from '../../repositories/tournamentRepository.js';

export default function CreateTournament({onCreated}) {
    const [name, setName] = useState('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [handicapMode, setHandicapMode] = useState('fixed');

    const [players, setPlayers] = useState([]);
    const [selected, setSelected] = useState({});
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        let active = true;

        getAllPlayers()
            .then((data) => {
                if (active) setPlayers(data);
            })
            .catch(() => {
                if (active) setError('Could not load player profiles.');
            })
            .finally(() => {
                if (active) setLoading(false);
            });

        return () => {
            active = false;
        };
    }, []);

    function togglePlayer(player) {
        setSelected((previous) => {
            const updated = {...previous};

            if (updated[player.id]) {
                delete updated[player.id];
            } else {
                if (Object.keys(updated).length >= 4) return previous;

                updated[player.id] = {
                    fixedPlayingHandicap:
                        player.handicapIndex == null
                            ? ''
                            : String(Math.round(player.handicapIndex)),
                };
            }

            return updated;
        });
    }

    function updateFixedHandicap(playerId, value) {
        setSelected((previous) => ({
            ...previous,
            [playerId]: {
                ...previous[playerId],
                fixedPlayingHandicap: value,
            },
        }));
    }

    async function handleSubmit(event) {
        event.preventDefault();
        setSaving(true);
        setError('');

        const participants = players
            .filter((player) => selected[player.id])
            .map((player) => ({
                id: player.id,
                displayName: player.displayName,
                handicapIndex: player.handicapIndex ?? null,
                fixedPlayingHandicap:
                    selected[player.id].fixedPlayingHandicap === ''
                        ? null
                        : Number(selected[player.id].fixedPlayingHandicap),
            }));

        try {
            const id = await createTournament({
                name,
                startDate,
                endDate,
                handicapMode,
                players: participants,
            });

            onCreated?.(id);
        } catch (err) {
            setError(err.message);
        } finally {
            setSaving(false);
        }
    }

    return (
        <form
            onSubmit={handleSubmit}
            className="mx-auto max-w-3xl space-y-6 rounded-xl border border-gray-200 bg-white p-6"
        >
            <h2 className="text-xl font-bold text-fairway-950">
                Create tournament
            </h2>

            <div>
                <label htmlFor="tournament-name" className="mb-1 block text-sm font-medium">
                    Tournament name
                </label>
                <input
                    id="tournament-name"
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    required
                    maxLength={100}
                    placeholder="e.g. Sabo Open 2027"
                    className="w-full rounded-lg border border-gray-300 p-3"
                />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
                <div>
                    <label htmlFor="start-date" className="mb-1 block text-sm font-medium">
                        Start date
                    </label>
                    <input
                        id="start-date"
                        type="date"
                        required
                        value={startDate}
                        onChange={(event) => setStartDate(event.target.value)}
                        className="w-full rounded-lg border border-gray-300 p-3"
                    />
                </div>

                <div>
                    <label htmlFor="end-date" className="mb-1 block text-sm font-medium">
                        End date
                    </label>
                    <input
                        id="end-date"
                        type="date"
                        required
                        min={startDate || undefined}
                        value={endDate}
                        onChange={(event) => setEndDate(event.target.value)}
                        className="w-full rounded-lg border border-gray-300 p-3"
                    />
                </div>
            </div>

            <fieldset className="space-y-3">
                <legend className="font-semibold">Handicap mode</legend>

                <label className="flex gap-3 rounded-lg border border-gray-200 p-3">
                    <input
                        type="radio"
                        name="handicapMode"
                        value="fixed"
                        checked={handicapMode === 'fixed'}
                        onChange={() => setHandicapMode('fixed')}
                    />
                    <span>
            <strong className="block">Fixed handicap</strong>
            <span className="text-sm text-gray-500">
              The same Playing Handicap for every round.
            </span>
          </span>
                </label>

                <label className="flex gap-3 rounded-lg border border-gray-200 p-3">
                    <input
                        type="radio"
                        name="handicapMode"
                        value="course"
                        checked={handicapMode === 'course'}
                        onChange={() => setHandicapMode('course')}
                    />
                    <span>
            <strong className="block">Course handicap</strong>
            <span className="text-sm text-gray-500">
              Calculated separately for each course and tee.
            </span>
          </span>
                </label>
            </fieldset>

            <fieldset className="space-y-3">
                <legend className="font-semibold">
                    Select players ({Object.keys(selected).length}/4)
                </legend>

                {loading && <p>Loading players...</p>}

                {!loading && players.length === 0 && (
                    <p className="text-sm text-gray-500">
                        No player profiles found.
                    </p>
                )}

                {players.map((player) => {
                    const isSelected = Boolean(selected[player.id]);

                    return (
                        <div
                            key={player.id}
                            className="rounded-lg border border-gray-200 p-4"
                        >
                            <label className="flex items-center gap-3">
                                <input
                                    type="checkbox"
                                    checked={isSelected}
                                    onChange={() => togglePlayer(player)}
                                    disabled={!isSelected && Object.keys(selected).length >= 4}
                                />

                                <span className="flex-1 font-medium">
                  {player.displayName}
                </span>

                                <span className="text-sm text-gray-500">
                  HI: {player.handicapIndex ?? 'Not set'}
                </span>
                            </label>

                            {isSelected && handicapMode === 'fixed' && (
                                <div className="mt-3">
                                    <label
                                        htmlFor={`hcp-${player.id}`}
                                        className="mb-1 block text-sm font-medium"
                                    >
                                        Tournament Playing Handicap
                                    </label>

                                    <input
                                        id={`hcp-${player.id}`}
                                        type="number"
                                        step="1"
                                        min="-10"
                                        max="54"
                                        required
                                        value={selected[player.id].fixedPlayingHandicap}
                                        onChange={(event) =>
                                            updateFixedHandicap(player.id, event.target.value)
                                        }
                                        className="w-32 rounded-lg border border-gray-300 p-2"
                                    />
                                </div>
                            )}
                        </div>
                    );
                })}
            </fieldset>

            {error && (
                <p role="alert" className="text-sm text-red-600">
                    {error}
                </p>
            )}

            <button
                type="submit"
                disabled={saving || loading || Object.keys(selected).length === 0}
                className="rounded-lg bg-fairway-950 px-5 py-3 font-semibold text-white disabled:opacity-50"
            >
                {saving ? 'Creating...' : 'Create tournament'}
            </button>
        </form>
    );
}
