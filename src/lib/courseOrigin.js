/** Source metadata is kept separate from editable club/course/tee details.
 * Imported records keep their provider identity when edited manually.
 */
export function getCourseOrigin(record) {
  const source = record?.origin;
  if (source?.kind === 'api' && typeof source.provider === 'string' && typeof source.externalId === 'string') {
    return { kind: 'api', provider: source.provider, externalId: source.externalId, locallyEdited: Boolean(source.locallyEdited) };
  }
  return { kind: 'manual' };
}

export function originOnCreate() { return { kind: 'manual' }; }

export function originOnEdit(record) {
  const origin = getCourseOrigin(record);
  return origin.kind === 'api' ? { ...origin, locallyEdited: true } : origin;
}

export function originLabel(record) {
  const origin = getCourseOrigin(record);
  if (origin.kind === 'manual') return 'Manual';
  return origin.locallyEdited ? 'Imported · edited' : 'Imported';
}
