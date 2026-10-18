// Fixed championship identities. IDs, not arbitrary colours, are persisted.
export const MAJOR_THEMES = Object.freeze([
  { id: 'emerald', name: 'Emerald & Gold', primary: '#173D30', accent: '#D6BA77', background: '#EDF2EB' },
  { id: 'navy', name: 'Navy & Champagne', primary: '#23334D', accent: '#E3CBA0', background: '#EDF0F6' },
  { id: 'burgundy', name: 'Burgundy & Copper', primary: '#642F31', accent: '#E6B78C', background: '#F8EEEE' },
  { id: 'slate', name: 'Slate & Silver', primary: '#293A37', accent: '#C8D5D0', background: '#ECF0EF' },
]);

export function majorThemeById(id) {
  return MAJOR_THEMES.find(theme => theme.id === id) ?? null;
}

export function tournamentTier(tournament) {
  return tournament?.tier === 'major' ? 'major' : 'casual';
}
