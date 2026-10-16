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
        <h2 className="text-xl font-semibold text-fairway-950">Find a golf club</h2>
        <p className="mt-1 text-sm text-gray-500">
          Search for a club to import its course information.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="e.g. Wentworth"
          className="min-w-0 flex-1 rounded-lg border border-gray-300 bg-white px-4 py-3 outline-none focus:border-fairway-800"
        />

        <button
          type="submit"
          disabled={loading || query.trim().length < 3}
          className="rounded-lg bg-fairway-950 px-5 py-3 font-medium text-white transition hover:bg-fairway-800 disabled:cursor-not-allowed disabled:opacity-50"
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
        <p className="text-sm text-gray-500">No golf clubs found. Try another search.</p>
      )}

      {clubs.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm text-gray-500">{clubs.length} results displayed</p>

          {clubs.map((club) => (
            <button
              key={club.id}
              type="button"
              onClick={() => onSelectClub?.(club)}
              className="flex w-full items-center justify-between rounded-xl border border-gray-200 bg-white p-4 text-left transition hover:border-fairway-800"
            >
              <div>
                <p className="font-semibold text-fairway-950">{club.name}</p>

                {(club.city || club.county) && (
                  <p className="mt-1 text-sm text-gray-500">
                    {[club.city, club.county].filter(Boolean).join(', ')}
                  </p>
                )}
              </div>

              <span className="text-sm font-medium text-fairway-800">Select →</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
