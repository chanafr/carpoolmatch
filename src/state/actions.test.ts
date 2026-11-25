import { describe, expect, it } from 'vitest';
import { loadDemoData } from '../data/seedData';
import { calculateFairness, generateSchedule, getSwapCandidates, rideIssue } from '../utils/scheduler';
import { buildWhatsAppSummary } from '../utils/whatsapp';
import { addChild, addParent, removeChild, setAvailability, setSeatCapacity, swapDriver } from './actions';

const scheduled = () => {
  const s = loadDemoData();
  return { ...s, rides: generateSchedule(s) };
};

describe('data actions', () => {
  it('edits before scheduling do not mark anything stale', () => {
    const s = setAvailability(loadDemoData(), 'p-dana', 'sun', 'morning', false);
    expect(s.parents[0].availability.sun.morning).toBe(false);
    expect(s.scheduleStale).toBe(false);
  });

  it('editing availability after scheduling marks stale and flags the now-invalid ride', () => {
    const s0 = scheduled();
    const ride = s0.rides.find((r) => r.id === 'sun-morning-inst-alon-08:00-1')!; // Dana drives
    const s1 = setAvailability(s0, 'p-dana', 'sun', 'morning', false);
    expect(s1.scheduleStale).toBe(true);
    expect(rideIssue(s1, s1.rides, ride)).toBe('invalid');
    expect(s0.parents[0].availability.sun.morning).toBe(true); // immutable
  });

  it('seat capacity is clamped to 1..8', () => {
    const s = scheduled();
    expect(setSeatCapacity(s, 'p-dana', 0).parents[0].seatCapacity).toBe(1);
    expect(setSeatCapacity(s, 'p-dana', 99).parents[0].seatCapacity).toBe(8);
  });

  it('addParent: fully available, gets a color, rejects empty names', () => {
    const s = addParent(loadDemoData(), { name: '  אבי  ', seatCapacity: 3 }, 'p-avi');
    const avi = s.parents.find((p) => p.id === 'p-avi')!;
    expect(avi.name).toBe('אבי');
    expect(avi.color).toMatch(/^#/);
    expect(Object.values(avi.availability).every((d) => d.morning && d.afternoon)).toBe(true);
    expect(() => addParent(loadDemoData(), { name: ' ', seatCapacity: 3 })).toThrow();
  });

  it('addChild validates references and times', () => {
    const s = loadDemoData();
    expect(() => addChild(s, { name: 'x', parentId: 'nope', institutionId: 'inst-alon', start: '08:00', end: '13:30' })).toThrow();
    expect(() => addChild(s, { name: 'x', parentId: 'p-dana', institutionId: 'inst-alon', start: '8', end: '13:30' })).toThrow();
  });

  it('removeChild drops the child and marks stale', () => {
    const s = removeChild(scheduled(), 'c-noa');
    expect(s.children.map((c) => c.id)).not.toContain('c-noa');
    expect(s.scheduleStale).toBe(true);
  });
});

describe('3-minute demo script, end to end', () => {
  it('load → schedule → add child with new time → reschedule → SOS → WhatsApp', () => {
    // 1. Load demo, 2. auto-schedule
    let s = loadDemoData();
    s = { ...s, rides: generateSchedule(s), scheduleStale: false };
    expect(calculateFairness(s.parents, s.rides).score).toBe(100);

    // 3. Add a child with a 16:00 dismissal → stale → reschedule
    s = addChild(s, { name: 'רוני', parentId: 'p-yossi', institutionId: 'inst-alon', start: '08:00', end: '16:00' }, 'c-roni');
    expect(s.scheduleStale).toBe(true);
    s = { ...s, rides: generateSchedule(s), scheduleStale: false };
    const roni = s.rides.filter((r) => r.passengerIds.includes('c-roni'));
    expect(roni).toHaveLength(10);
    expect(roni.filter((r) => r.direction === 'afternoon').every((r) => r.time === '16:00')).toBe(true);
    expect(s.rides.every((r) => rideIssue(s, s.rides, r) === null)).toBe(true);

    // 4. SOS: driver of the first ride can't drive → best candidate takes it
    const ride = s.rides[0];
    const best = getSwapCandidates(s, s.rides, ride.id)[0];
    expect(best).toBeDefined();
    const before = calculateFairness(s.parents, s.rides).counts[best.parent.id];
    s = swapDriver(s, ride.id, best.parent.id);
    expect(s.rides[0].driverId).toBe(best.parent.id);
    expect(calculateFairness(s.parents, s.rides).counts[best.parent.id]).toBe(before + 1);

    // 5. WhatsApp summary
    const text = buildWhatsAppSummary(s);
    expect(text.startsWith('🚗 *לוח הסעות שבועי — CarpoolMatch* 🚗')).toBe(true);
    expect(text).toContain('📅 *יום ראשון*');
    expect(text).toContain('🌤️ 16:00 | בי״ס יסודי אלון — נהג: ');
    expect(text).toContain('רוני');
    expect(text.split('\n').filter((l) => l.startsWith('☀️') || l.startsWith('🌤️'))).toHaveLength(s.rides.length);
  });

  it('WhatsApp marks rides without a driver', () => {
    const s = loadDemoData();
    for (const p of s.parents) p.availability.sun.morning = false;
    const text = buildWhatsAppSummary({ ...s, rides: generateSchedule(s) });
    expect(text).toContain('☀️ 08:00 | גן שקד — ⚠️ אין נהג (איתי, מאיה, תמר)');
  });
});
