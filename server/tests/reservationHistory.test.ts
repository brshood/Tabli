import { buildHistoryFilter, escapeRegex, gstDayStart } from '../src/services/reservationHistory';

const RID = '64b000000000000000000001';
const NOW = new Date('2026-11-09T12:00:00Z');

describe('gstDayStart', () => {
  it('returns GST midnight for a valid date', () => {
    expect(gstDayStart('2026-11-01')?.toISOString()).toBe('2026-10-31T20:00:00.000Z');
  });
  it('rejects malformed input', () => {
    expect(gstDayStart('11/01/2026')).toBeNull();
    expect(gstDayStart(undefined)).toBeNull();
    expect(gstDayStart('2026-13-45')).toBeNull();
  });
});

describe('buildHistoryFilter', () => {
  it('scopes to the restaurant and defaults to the last 30 days', () => {
    const f = buildHistoryFilter({ restaurantId: RID }, NOW);
    expect(String(f.restaurantId)).toBe(RID);
    expect(f.requestedAt.$gte.toISOString()).toBe('2026-10-10T12:00:00.000Z');
    expect(f.requestedAt.$lte).toBeUndefined();
  });

  it('treats `to` as inclusive of the whole GST day', () => {
    const f = buildHistoryFilter({ restaurantId: RID, from: '2026-11-01', to: '2026-11-03' }, NOW);
    expect(f.requestedAt.$gte.toISOString()).toBe('2026-10-31T20:00:00.000Z');
    expect(f.requestedAt.$lte.toISOString()).toBe('2026-11-03T19:59:59.999Z');
  });

  it('keeps cancelled/expired rows (no implicit status filter)', () => {
    expect(buildHistoryFilter({ restaurantId: RID }, NOW).status).toBeUndefined();
    expect(buildHistoryFilter({ restaurantId: RID, status: 'cancelled' }, NOW).status).toBe('cancelled');
  });

  it('ignores unknown statuses', () => {
    expect(buildHistoryFilter({ restaurantId: RID, status: '$ne' }, NOW).status).toBeUndefined();
  });

  it('searches name, phone and email with a escaped regex', () => {
    const f = buildHistoryFilter({ restaurantId: RID, q: 'a.b(' }, NOW);
    expect(f.$or).toHaveLength(3);
    expect(f.$or[0].name.source).toBe(escapeRegex('a.b('));
    expect(f.$or[0].name.test('xa.b(')).toBe(true);
    expect(f.$or[0].name.test('xaZb(')).toBe(false);
  });
});
