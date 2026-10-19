import test from 'node:test';
import assert from 'node:assert/strict';
import { majorThemeIdForView } from '../src/lib/themeRouting.js';

const active = { id: 'active', tier: 'major', majorThemeId: 'navy' };
const draft = { id: 'draft', tier: 'major', majorThemeId: 'burgundy' };

 test('the live Major theme continues on leaderboard and scorecard', () => {
  for (const activePage of ['home', 'activeScorecard']) {
    assert.equal(majorThemeIdForView({ activePage, activeTournament: active }), 'navy');
  }
});

test('the viewed Major theme applies while adding/editing draft rounds', () => {
  assert.equal(majorThemeIdForView({ activePage: 'tournamentOverview', activeTournament: active,
    selectedTournamentId: 'draft', overviewTournament: draft }), 'burgundy');
});

test('a viewed Casual tournament never inherits a different active Major palette', () => {
  assert.equal(majorThemeIdForView({ activePage: 'tournamentOverview', activeTournament: active,
    selectedTournamentId: 'casual', overviewTournament: { id: 'casual', tier: 'casual' } }), null);
});

test('stale overview data cannot show a previous tournament theme', () => {
  assert.equal(majorThemeIdForView({ activePage: 'tournamentOverview', activeTournament: active,
    selectedTournamentId: 'another', overviewTournament: draft }), null);
});

test('leaving a draft returns to the active tournament palette', () => {
  assert.equal(majorThemeIdForView({ activePage: 'tournaments', activeTournament: active,
    selectedTournamentId: 'draft', overviewTournament: draft }), 'navy');
});

test('unknown theme names and no tournament use normal BaggyGolf', () => {
  assert.equal(majorThemeIdForView({ activePage: 'tournamentOverview', selectedTournamentId: 'x',
    overviewTournament: { id: 'x', tier: 'major', majorThemeId: 'unknown' } }), null);
  assert.equal(majorThemeIdForView({ activePage: 'home', activeTournament: null }), null);
});
