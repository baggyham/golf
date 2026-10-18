import { useCourseSearch } from '../../hooks/useCourseSearch.js';

export default function CourseSearch({ onSelectClub }) {
  const { query, setQuery, clubs, loading, error, searched, search } = useCourseSearch();

  function handleSubmit(event) {
    event.preventDefault();
    search();
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-semibold text-baggygolf-950">Find a golf club</h2>
        <p className="mt-1 text-sm text-baggygolf-muted">
          Search for a club to import its course information.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="e.g. Wentworth"
          className="min-w-0 flex-1 rounded-lg border border-baggygolf-line bg-baggygolf-surface px-4 py-3 outline-none focus:border-baggygolf-800"
        />

        <button
          type="submit"
          disabled={loading || query.trim().length < 3}
          className="rounded-lg bg-baggygolf-primary px-5 py-3 font-medium text-white transition hover:bg-baggygolf-primary-hover disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? 'Searching...' : 'Search'}
        </button>
      </form>

      {error && (
        <p role="alert" className="text-sm text-red-600">
          {error}
        </p>
      )}

      {searched && clubs.length === 0 && (
        <p className="text-sm text-baggygolf-muted">No golf clubs found. Try another search.</p>
      )}

      {clubs.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm text-baggygolf-muted">{clubs.length} results displayed</p>

          {clubs.map((club) => (
            <button
              key={club.id}
              type="button"
              onClick={() => onSelectClub?.(club)}
              className="flex w-full items-center justify-between rounded-xl border border-baggygolf-line bg-baggygolf-surface p-4 text-left transition hover:border-baggygolf-800"
            >
              <div>
                <p className="font-semibold text-baggygolf-950">{club.name}</p>

                {(club.city || club.county) && (
                  <p className="mt-1 text-sm text-baggygolf-muted">
                    {[club.city, club.county].filter(Boolean).join(', ')}
                  </p>
                )}
              </div>

              <span className="text-sm font-medium text-baggygolf-800">Select →</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
