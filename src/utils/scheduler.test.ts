import { describe, expect, it } from 'vitest';
import { loadDemoData } from '../data/seedData';
import { DAYS, DIRECTIONS } from '../types';
import type { AppState, Child, Parent, RideSlot } from '../types';
import {
  NO_DRIVER_REASON,
  applySwap,
  buildRideNeeds,
  calculateFairness,
  generateSchedule,
  getDriveCounts,
  getSwapCandidates,
  isParentEligible,
  splitByCapacity,
} from './scheduler';

const allTrue = () =>
  Object.fromEntries(DAYS.map((d) => [d, { morning: true, afternoon: true }])) as Parent['availability'];

function parent(id: string, seatCapacity: number, availability = allTrue()): Parent {
  return { id, name: id, seatCapacity, color: '#000', availability };
}

function child(id: string, parentId: string, institutionId = 'inst-a', start = '08:00', end = '13:00'): Child {
  return {
    id,
    name: id,
    parentId,
    institutionId,
    schedule: Object.fromEntries(DAYS.map((d) => [d, { start, end }])),
  };
}

function fakeRides(counts: Record<string, number>): RideSlot[] {
  return Object.entries(counts).flatMap(([driverId, n]) =>
    Array.from({ length: n }, (_, i) => ({
      id: `${driverId}-${i}`,
      day: 'sun' as const,
      direction: 'morning' as const,
      institutionId: 'x',
      time: `0${i}:00`,
      driverId,
      passengerIds: [],
      assignmentReason: '',
    })),
  );
}

/** Every rule from §2 must hold for every assigned ride. */
function expectValidSchedule(state: Pick<AppState, 'parents' | 'children'>, rides: RideSlot[]) {
  const byId = new Map(state.parents.map((p) => [p.id, p]));
  for (const r of rides) {
    if (!r.driverId) continue;
    const p = byId.get(r.driverId)!;
    expect(p.availability[r.day][r.direction], `${r.id} availability`).toBe(true);
    expect(p.seatCapacity, `${r.id} capacity`).toBeGreaterThanOrEqual(r.passengerIds.length);
    expect(isParentEligible(p, r, rides), `${r.id} time conflict`).toBe(true);
  }
}

describe('seed data', () => {
  it('loads 4 parents, 6 children, 2 institutions with colors', () => {
    const s = loadDemoData();
    expect(s.parents).toHaveLength(4);
    expect(s.children).toHaveLength(6);
    expect(s.institutions).toHaveLength(2);
    expect(s.parents.every((p) => /^#[0-9A-F]{6}$/i.test(p.color))).toBe(true);
    expect(s.rides).toEqual([]);
    expect(s.activeParentId).toBe('p-dana');
  });

  it('"Load Demo" returns a fresh deep copy every time', () => {
    const a = loadDemoData();
    a.parents[0].name = 'changed';
    a.parents[0].availability.sun.morning = false;
    const b = loadDemoData();
    expect(b.parents[0].name).toBe('דנה כהן');
    expect(b.parents[0].availability.sun.morning).toBe(true);
  });
});

describe('grouping (§1)', () => {
  it('groups seed children into 20 needs: 2 schools × 5 days × 2 directions', () => {
    const needs = buildRideNeeds(loadDemoData().children);
    expect(needs).toHaveLength(20);
    expect(needs.every((n) => n.children.length === 3)).toBe(true);
  });

  it('uses per-day end times (Alon: Tue 14:30, Thu 12:45)', () => {
    const needs = buildRideNeeds(loadDemoData().children);
    const alonAfternoon = (day: string) =>
      needs.find((n) => n.day === day && n.direction === 'afternoon' && n.institutionId === 'inst-alon')!.time;
    expect(alonAfternoon('sun')).toBe('13:30');
    expect(alonAfternoon('tue')).toBe('14:30');
    expect(alonAfternoon('thu')).toBe('12:45');
  });

  it('separates children of the same school with different times, and respects needsMorning=false / missing days', () => {
    const a = child('a', 'p1', 'inst-a', '08:00', '13:00');
    const b = child('b', 'p2', 'inst-a', '08:00', '16:00');
    b.schedule.sun = { start: '08:00', end: '16:00', needsMorning: false };
    delete b.schedule.mon;
    const needs = buildRideNeeds([a, b]);
    const sunMorning = needs.filter((n) => n.day === 'sun' && n.direction === 'morning');
    expect(sunMorning).toHaveLength(1);
    expect(sunMorning[0].children.map((c) => c.id)).toEqual(['a']);
    expect(needs.filter((n) => n.day === 'sun' && n.direction === 'afternoon')).toHaveLength(2);
    expect(needs.filter((n) => n.day === 'mon').flatMap((n) => n.children.map((c) => c.id))).not.toContain('b');
  });
});

describe('capacity splitting (§1.4)', () => {
  it('splits 5 kids with max 3 seats into 2 rides, keeping siblings together', () => {
    const kids = [child('a1', 'pA'), child('b1', 'pB'), child('a2', 'pA'), child('c1', 'pC'), child('b2', 'pB')];
    const chunks = splitByCapacity(kids, 3);
    expect(chunks).toHaveLength(2);
    expect(chunks.every((c) => c.length <= 3)).toBe(true);
    for (const chunk of chunks) {
      const ids = chunk.map((c) => c.id);
      expect(ids.includes('a1')).toBe(ids.includes('a2'));
      expect(ids.includes('b1')).toBe(ids.includes('b2'));
    }
    expect(chunks.flat()).toHaveLength(5);
  });

  it('does not split when nobody is available (becomes one conflict slot)', () => {
    expect(splitByCapacity([child('a', 'p'), child('b', 'q')], 0)).toHaveLength(1);
  });

  it('generateSchedule splits an oversized group and assigns both halves', () => {
    const parents = [parent('p1', 3), parent('p2', 3), parent('p3', 2)];
    const children = ['p1', 'p1', 'p2', 'p2', 'p3'].map((pid, i) => child(`k${i}`, pid));
    const rides = generateSchedule({ institutions: [], parents, children });
    const sunMorning = rides.filter((r) => r.day === 'sun' && r.direction === 'morning');
    expect(sunMorning).toHaveLength(2);
    expect(sunMorning.every((r) => r.driverId)).toBe(true);
    expect(new Set(sunMorning.map((r) => r.driverId)).size).toBe(2); // same time → different drivers
    expectValidSchedule({ parents, children }, rides);
  });
});

describe('weekly assignment (§2) on seed data', () => {
  const state = loadDemoData();
  const rides = generateSchedule(state);

  it('creates 20 rides, all assigned, all rules respected', () => {
    expect(rides).toHaveLength(20);
    expect(rides.filter((r) => !r.driverId)).toHaveLength(0);
    expectValidSchedule(state, rides);
  });

  it('every child who needs a ride appears exactly once per day/direction', () => {
    for (const d of DAYS) for (const dir of DIRECTIONS) {
      const ids = rides.filter((r) => r.day === d && r.direction === dir).flatMap((r) => r.passengerIds);
      expect(ids.sort()).toEqual(state.children.map((c) => c.id).sort());
    }
  });

  it('is perfectly balanced: 5 drives each, 100%', () => {
    const f = calculateFairness(state.parents, rides);
    expect(Object.values(f.counts)).toEqual([5, 5, 5, 5]);
    expect(f.score).toBe(100);
    expect(f.label).toBe('מאוזן מאוד');
  });

  it('applies tie-breakers: own child, then stable id (Sun morning)', () => {
    const byId = (id: string) => rides.find((r) => r.id === id)!;
    // Dana, Michal, Oren available, all at 0. Alon: Dana & Oren have a child → id order → Dana.
    expect(byId('sun-morning-inst-alon-08:00-1').driverId).toBe('p-dana');
    // Shaked at the same 08:00: Dana is time-conflicted; Michal & Oren have a child → Michal.
    expect(byId('sun-morning-inst-shaked-08:00-1').driverId).toBe('p-michal');
    expect(byId('sun-morning-inst-alon-08:00-1').assignmentReason).toBe(
      'איזון עומס (נסיעה ראשונה השבוע) + הילד/ה בנסיעה',
    );
  });

  it('is deterministic', () => {
    expect(generateSchedule(loadDemoData())).toEqual(rides);
  });
});

describe('conflicts', () => {
  it('no available parent → driverId null + Hebrew conflict reason', () => {
    const state = loadDemoData();
    for (const p of state.parents) p.availability.sun.morning = false;
    const rides = generateSchedule(state);
    const sunMorning = rides.filter((r) => r.day === 'sun' && r.direction === 'morning');
    expect(sunMorning).toHaveLength(2);
    for (const r of sunMorning) {
      expect(r.driverId).toBeNull();
      expect(r.assignmentReason).toBe(NO_DRIVER_REASON);
    }
    expectValidSchedule(state, rides);
  });

  it('only one parent available for two same-time rides → second is a conflict', () => {
    const state = loadDemoData();
    for (const p of state.parents) p.availability.wed.morning = p.id === 'p-dana';
    const wed = generateSchedule(state).filter((r) => r.day === 'wed' && r.direction === 'morning');
    expect(wed.map((r) => r.driverId)).toEqual(['p-dana', null]);
  });

  it('a new child that exceeds every car is flagged as a conflict, not silently overfilled', () => {
    const parents = [parent('p1', 1)];
    const children = [child('a', 'p1'), child('b', 'p1')];
    const rides = generateSchedule({ institutions: [], parents, children });
    const sun = rides.filter((r) => r.day === 'sun' && r.direction === 'morning');
    // Split into 2 one-seat rides at the same time; only one can be driven.
    expect(sun).toHaveLength(2);
    expect(sun.filter((r) => r.driverId === null)).toHaveLength(1);
  });
});

describe('fairness score (§3)', () => {
  const ps = ['a', 'b', 'c', 'd'].map((id) => parent(id, 4));
  const score = (counts: Record<string, number>) => calculateFairness(ps, fakeRides(counts));

  it('100% when no rides', () => expect(calculateFairness(ps, []).score).toBe(100));
  it('[3,3,2,3] → 83%, מאוזן מאוד', () => {
    const f = score({ a: 3, b: 3, c: 2, d: 3 });
    expect(f.score).toBe(83);
    expect(f.label).toBe('מאוזן מאוד');
  });
  it('[4,2,3,3] → 75%, סביר', () => {
    const f = score({ a: 4, b: 2, c: 3, d: 3 });
    expect(f.score).toBe(75);
    expect(f.label).toBe('סביר');
  });
  it('[6,0,0,0] → 50%, דורש איזון', () => {
    const f = score({ a: 6 });
    expect(f.score).toBe(50);
    expect(f.label).toBe('דורש איזון');
  });
  it('parents with 0 drives count toward the spread', () => {
    expect(getDriveCounts(ps, fakeRides({ a: 1 }))).toEqual({ a: 1, b: 0, c: 0, d: 0 });
  });
});

describe('SOS swap (§4)', () => {
  const state = loadDemoData();
  const rides = generateSchedule(state);

  it('candidates exclude the current driver, are all eligible, and are sorted by drive count', () => {
    for (const r of rides) {
      const cands = getSwapCandidates(state, rides, r.id);
      expect(cands.map((c) => c.parent.id)).not.toContain(r.driverId);
      for (const c of cands) expect(isParentEligible(c.parent, r, rides)).toBe(true);
      const counts = cands.map((c) => c.driveCount);
      expect(counts).toEqual([...counts].sort((a, b) => a - b));
    }
  });

  it('excludes time-conflicted parents (Sun 08:00 Alon: Michal drives Shaked at 08:00)', () => {
    const ids = getSwapCandidates(state, rides, 'sun-morning-inst-alon-08:00-1').map((c) => c.parent.id);
    expect(ids).toEqual(['p-oren']); // Yossi unavailable, Michal busy, Dana is current
  });

  it('swap reassigns the ride and fairness updates immediately', () => {
    const slotId = 'sun-morning-inst-alon-08:00-1';
    const next = applySwap(state, rides, slotId, 'p-oren');
    expect(next.find((r) => r.id === slotId)!.driverId).toBe('p-oren');
    expect(next.find((r) => r.id === slotId)!.assignmentReason).toContain('החלפת חירום');
    const f = calculateFairness(state.parents, next);
    expect(f.counts['p-dana']).toBe(4);
    expect(f.counts['p-oren']).toBe(6);
    expect(f.score).toBe(83); // spread 2, max 6 → 100 - 2/6*50
    expect(f.label).toBe('סביר');
    expect(rides.find((r) => r.id === slotId)!.driverId).toBe('p-dana'); // original untouched (immutable)
    expectValidSchedule(state, next);
  });

  it('rejects an ineligible replacement', () => {
    expect(() => applySwap(state, rides, 'sun-morning-inst-alon-08:00-1', 'p-michal')).toThrow();
    expect(() => applySwap(state, rides, 'sun-morning-inst-alon-08:00-1', 'p-yossi')).toThrow();
  });

  it('"Assign Driver" on a conflict slot works through the same candidate list', () => {
    const s = loadDemoData();
    for (const p of s.parents) p.availability.sun.morning = false;
    const conflictRides = generateSchedule(s);
    s.parents.find((p) => p.id === 'p-yossi')!.availability.sun.morning = true; // Yossi becomes free
    const slotId = 'sun-morning-inst-alon-08:00-1';
    expect(getSwapCandidates(s, conflictRides, slotId).map((c) => c.parent.id)).toEqual(['p-yossi']);
    const fixed = applySwap(s, conflictRides, slotId, 'p-yossi');
    expect(fixed.find((r) => r.id === slotId)!.driverId).toBe('p-yossi');
  });
});
