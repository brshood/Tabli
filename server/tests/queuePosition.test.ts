import { positionsForQueue, getServiceDayStart } from '../src/services/queuePosition';

const entry = (id: string, seatingPreference?: any) => ({ _id: id, seatingPreference });

describe('positionsForQueue', () => {
  it('numbers a single waiting customer #1', () => {
    const positions = positionsForQueue([entry('a', 'no-preference')]);
    expect(positions.get('a')).toBe(1);
  });

  it('numbers customers by arrival order, not by table count', () => {
    const positions = positionsForQueue([
      entry('a', 'no-preference'),
      entry('b', 'no-preference'),
      entry('c', 'no-preference'),
    ]);
    expect([positions.get('a'), positions.get('b'), positions.get('c')]).toEqual([1, 2, 3]);
  });

  it('does not queue an indoor request behind outdoor-only waiters', () => {
    const positions = positionsForQueue([
      entry('outdoor1', 'outdoor'),
      entry('outdoor2', 'outdoor'),
      entry('indoor1', 'indoor'),
    ]);
    expect(positions.get('indoor1')).toBe(1);
    expect(positions.get('outdoor2')).toBe(2);
  });

  it('gives a no-preference guest the better of the two sections', () => {
    const positions = positionsForQueue([
      entry('indoor1', 'indoor'),
      entry('indoor2', 'indoor'),
      entry('anywhere', 'no-preference'),
    ]);
    // Third in line overall, but first for an outdoor table
    expect(positions.get('anywhere')).toBe(1);
  });

  it('treats a missing preference as no preference', () => {
    const positions = positionsForQueue([entry('a', undefined), entry('b', null)]);
    expect(positions.get('a')).toBe(1);
    expect(positions.get('b')).toBe(2);
  });

  it('closes the gap when someone ahead is removed from the line', () => {
    const before = positionsForQueue([
      entry('a', 'no-preference'),
      entry('b', 'no-preference'),
      entry('c', 'no-preference'),
    ]);
    expect(before.get('c')).toBe(3);

    // 'a' gets seated and drops out of the active queue
    const after = positionsForQueue([entry('b', 'no-preference'), entry('c', 'no-preference')]);
    expect(after.get('c')).toBe(2);
  });
});

describe('getServiceDayStart', () => {
  it('starts the service day at 1 AM GST', () => {
    // 8 PM GST on 10 June => service day began 1 AM GST that morning
    const start = getServiceDayStart(new Date('2026-06-10T16:00:00Z'));
    expect(start.toISOString()).toBe('2026-06-09T21:00:00.000Z'); // 1 AM GST 10 June
  });

  it('keeps a post-midnight queue on the previous service day', () => {
    // 00:30 GST on 10 June: the 1 AM reset has not happened yet
    const start = getServiceDayStart(new Date('2026-06-09T20:30:00Z'));
    expect(start.toISOString()).toBe('2026-06-08T21:00:00.000Z'); // 1 AM GST 9 June
  });

  it('excludes entries from a finished service day', () => {
    const now = new Date('2026-06-10T16:00:00Z');
    const start = getServiceDayStart(now);
    const yesterdayEvening = new Date('2026-06-09T15:00:00Z');
    expect(yesterdayEvening.getTime()).toBeLessThan(start.getTime());
  });
});
