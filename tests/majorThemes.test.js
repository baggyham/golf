import test from 'node:test';
import assert from 'node:assert/strict';
import { MAJOR_THEMES, majorThemeById, tournamentTier } from '../src/lib/majorThemes.js';

test('Major themes have stable unique identifiers and complete colours', () => {
  assert.equal(new Set(MAJOR_THEMES.map(t => t.id)).size, MAJOR_THEMES.length);
  for (const theme of MAJOR_THEMES) {
    assert.match(theme.primary, /^#[0-9A-F]{6}$/i);
    assert.match(theme.accent, /^#[0-9A-F]{6}$/i);
    assert.equal(majorThemeById(theme.id), theme);
  }
});
test('unrecognised theme identifiers are rejected', () => assert.equal(majorThemeById('custom'), null));
test('older competitions remain casual by default', () => {
  assert.equal(tournamentTier({}), 'casual');
  assert.equal(tournamentTier({tier:'major'}), 'major');
});
