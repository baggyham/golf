export default function AdminPage({ onBack, onCreate }) {
  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <button type="button" onClick={onBack} className="min-h-11 text-sm font-semibold text-baggygolf-800 hover:underline">← Back to account</button>
      <header>
        <h1 className="text-2xl font-bold text-baggygolf-950">Administration</h1>
        <p className="mt-1 text-sm text-baggygolf-muted">Tournament setup and organiser tools.</p>
      </header>
      <section className="space-y-3 rounded-xl border border-baggygolf-line bg-baggygolf-surface p-5">
        <h2 className="text-lg font-semibold text-baggygolf-950">Tournament setup</h2>
        <p className="text-sm text-baggygolf-muted">Create a competition, choose players and set handicap rules.</p>
        <button type="button" onClick={onCreate} className="min-h-11 rounded-lg bg-baggygolf-primary px-4 font-semibold text-white hover:bg-baggygolf-primary-hover">Create tournament</button>
      </section>
      <p className="text-sm text-baggygolf-muted">For existing tournaments, open a competition under Tournaments to manage rounds, handicaps and scorecards.</p>
    </div>
  );
}
