export default function AdminPage({ onBack, onCreate }) {
  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <button type="button" onClick={onBack} className="min-h-11 text-sm font-semibold text-fairway-800 hover:underline">← Back to account</button>
      <header>
        <h1 className="text-2xl font-bold text-fairway-950">Administration</h1>
        <p className="mt-1 text-sm text-gray-500">Tournament setup and organiser tools.</p>
      </header>
      <section className="space-y-3 rounded-xl border border-gray-200 bg-white p-5">
        <h2 className="text-lg font-semibold text-fairway-950">Tournament setup</h2>
        <p className="text-sm text-gray-600">Create a competition, choose players and set handicap rules.</p>
        <button type="button" onClick={onCreate} className="min-h-11 rounded-lg bg-fairway-950 px-4 font-semibold text-white hover:bg-fairway-800">Create tournament</button>
      </section>
      <p className="text-sm text-gray-500">For existing tournaments, open a competition under Tournaments to manage rounds, handicaps and scorecards.</p>
    </div>
  );
}
