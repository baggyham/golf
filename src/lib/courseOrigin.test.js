import test from 'node:test';
import assert from 'node:assert/strict';
import { getCourseOrigin, originOnCreate, originOnEdit, originLabel } from './courseOrigin.js';

test('old library records without origin remain manual', () => {
  assert.deepEqual(getCourseOrigin({ name: 'Old club' }), { kind: 'manual' });
  assert.equal(originLabel({}), 'Manual');
});
test('new local entries are manual', () => assert.deepEqual(originOnCreate(), { kind: 'manual' }));
test('editing imported entries preserves provider identity and marks local edit', () => {
  const origin = { kind: 'api', provider: 'future-golf-provider', externalId: '123' };
  assert.deepEqual(originOnEdit({ origin }), { ...origin, locallyEdited: true });
  assert.equal(originLabel({ origin: originOnEdit({ origin }) }), 'Imported · edited');
});
test('manual edits stay manual', () => assert.deepEqual(originOnEdit({ origin: originOnCreate() }), { kind: 'manual' }));
