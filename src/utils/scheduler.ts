// Pure scheduling logic. Implements scheduling_rules_data_specification.md (no extra math).
import { DAYS, DIRECTIONS } from '../types';
import type {
  CarpoolData,
  Child,
  DayKey,
  Direction,
  FairnessLabel,
  FairnessResult,
  Parent,
  RideSlot,
  SwapCandidate,
} from '../types';

export const NO_DRIVER_REASON = 'אין הורה פנוי עם מספיק מקומות ברכב';

interface RideNeed {
  day: DayKey;
  direction: Direction;
  institutionId: string;
  time: string;
  children: Child[];
}

// ---------- §1 Grouping ----------

function needsRide(child: Child, day: DayKey, direction: Direction): string | null {
  const s = child.schedule[day];
  if (!s) return null;
  if (direction === 'morning') return s.needsMorning === false ? null : s.start;
  return s.needsAfternoon === false ? null : s.end;
}

/** Groups children by (day, direction, institution, time). Ordered: day → morning/afternoon → time → institution. */
export function buildRideNeeds(children: Child[]): RideNeed[] {
  const needs: RideNeed[] = [];
  for (const day of DAYS) {
    for (const direction of DIRECTIONS) {
      const byKey = new Map<string, RideNeed>();
      for (const child of children) {
        const time = needsRide(child, day, direction);
        if (!time) continue;
        const key = `${child.institutionId}|${time}`;
        let need = byKey.get(key);
        if (!need) {
          need = { day, direction, institutionId: child.institutionId, time, children: [] };
          byKey.set(key, need);
        }
        need.children.push(child);
      }
      const group = [...byKey.values()].sort(
        (a, b) => a.time.localeCompare(b.time) || a.institutionId.localeCompare(b.institutionId),
      );
      needs.push(...group);
    }
  }
  return needs;
}

/**
 * §1.4 Capacity splitting: chunks of at most `maxSeats`, keeping siblings together when possible
 * (first-fit over sibling groups, largest first). maxSeats <= 0 → one chunk (becomes a conflict).
 */
export function splitByCapacity(children: Child[], maxSeats: number): Child[][] {
  if (maxSeats <= 0 || children.length <= maxSeats) return [children];

  const siblings = new Map<string, Child[]>();
  for (const c of children) siblings.set(c.parentId, [...(siblings.get(c.parentId) ?? []), c]);

  // Sibling groups larger than a car must be broken up.
  const units: Child[][] = [];
  for (const group of siblings.values()) {
    for (let i = 0; i < group.length; i += maxSeats) units.push(group.slice(i, i + maxSeats));
  }
  units.sort((a, b) => b.length - a.length || a[0].parentId.localeCompare(b[0].parentId));

  const bins: Child[][] = [];
  for (const unit of units) {
    const bin = bins.find((b) => b.length + unit.length <= maxSeats);
    if (bin) bin.push(...unit);
    else bins.push([...unit]);
  }
  return bins;
}

// ---------- §2 Eligibility & ranking ----------

/** Available + Capacity + No Time Conflict (ignoring the slot itself). */
export function isParentEligible(parent: Parent, slot: RideSlot, rides: RideSlot[]): boolean {
  if (!parent.availability[slot.day]?.[slot.direction]) return false;
  if (parent.seatCapacity < slot.passengerIds.length) return false;
  return !rides.some(
    (r) => r.id !== slot.id && r.driverId === parent.id && r.day === slot.day && r.time === slot.time,
  );
}

function hasOwnChild(parent: Parent, slot: RideSlot, childById: Map<string, Child>): boolean {
  return slot.passengerIds.some((id) => childById.get(id)?.parentId === parent.id);
}

/** Lowest drive count → own child in ride → stable id. */
function rankCandidates(candidates: SwapCandidate[]): SwapCandidate[] {
  return [...candidates].sort(
    (a, b) =>
      a.driveCount - b.driveCount ||
      Number(b.hasOwnChild) - Number(a.hasOwnChild) ||
      (a.parent.id < b.parent.id ? -1 : a.parent.id > b.parent.id ? 1 : 0),
  );
}

export function reasonFor(driveCountAfter: number, ownChild: boolean): string {
  const base = driveCountAfter <= 1 ? 'איזון עומס (נסיעה ראשונה השבוע)' : `איזון עומס (${driveCountAfter} נסיעות)`;
  return ownChild ? `${base} + הילד/ה בנסיעה` : base;
}

export function getDriveCounts(parents: Parent[], rides: RideSlot[]): Record<string, number> {
  const counts: Record<string, number> = Object.fromEntries(parents.map((p) => [p.id, 0]));
  for (const r of rides) if (r.driverId && r.driverId in counts) counts[r.driverId] += 1;
  return counts;
}

function rankedEligible(
  data: CarpoolData,
  slot: RideSlot,
  rides: RideSlot[],
  counts: Record<string, number>,
  excludeId: string | null,
): SwapCandidate[] {
  const childById = new Map(data.children.map((c) => [c.id, c]));
  const candidates = data.parents
    .filter((p) => p.id !== excludeId && isParentEligible(p, slot, rides))
    .map((parent) => ({
      parent,
      driveCount: counts[parent.id] ?? 0,
      hasOwnChild: hasOwnChild(parent, slot, childById),
    }));
  return rankCandidates(candidates);
}

// ---------- §2 Weekly assignment (greedy fairness) ----------

export function generateSchedule(data: CarpoolData): RideSlot[] {
  const rides: RideSlot[] = [];
  const counts = getDriveCounts(data.parents, []);

  for (const need of buildRideNeeds(data.children)) {
    const maxSeats = Math.max(
      0,
      ...data.parents.filter((p) => p.availability[need.day]?.[need.direction]).map((p) => p.seatCapacity),
    );
    splitByCapacity(need.children, maxSeats).forEach((chunk, i) => {
      const slot: RideSlot = {
        id: `${need.day}-${need.direction}-${need.institutionId}-${need.time}-${i + 1}`,
        day: need.day,
        direction: need.direction,
        institutionId: need.institutionId,
        time: need.time,
        driverId: null,
        passengerIds: chunk.map((c) => c.id),
        assignmentReason: NO_DRIVER_REASON,
      };
      const best = rankedEligible(data, slot, rides, counts, null)[0];
      if (best) {
        counts[best.parent.id] += 1;
        slot.driverId = best.parent.id;
        slot.assignmentReason = reasonFor(counts[best.parent.id], best.hasOwnChild);
      }
      rides.push(slot);
    });
  }
  return rides;
}

// ---------- §3 Fairness ----------

export function fairnessLabel(spread: number): FairnessLabel {
  if (spread <= 1) return 'מאוזן מאוד';
  if (spread === 2) return 'סביר';
  return 'דורש איזון';
}

export function calculateFairness(parents: Parent[], rides: RideSlot[]): FairnessResult {
  const counts = getDriveCounts(parents, rides);
  const values = Object.values(counts);
  const total = values.reduce((a, b) => a + b, 0);
  if (values.length === 0 || total === 0) {
    return { score: 100, label: fairnessLabel(0), spread: 0, maxDrives: 0, minDrives: 0, counts };
  }
  const maxDrives = Math.max(...values);
  const minDrives = Math.min(...values);
  const spread = maxDrives - minDrives;
  const score = Math.max(0, Math.round(100 - (spread / Math.max(1, maxDrives)) * 50));
  return { score, label: fairnessLabel(spread), spread, maxDrives, minDrives, counts };
}

/**
 * Conflict state for the UI: no driver, or a driver who no longer passes the eligibility rules
 * (e.g. availability/seats were edited after scheduling, or a child was added to the ride).
 */
export function rideIssue(data: CarpoolData, rides: RideSlot[], ride: RideSlot): 'unassigned' | 'invalid' | null {
  if (!ride.driverId) return 'unassigned';
  const driver = data.parents.find((p) => p.id === ride.driverId);
  if (!driver || !isParentEligible(driver, ride, rides)) return 'invalid';
  return null;
}

// ---------- §4 SOS swap ----------

/** Eligible replacements for a slot (current driver excluded), best first. Also works for unassigned/conflict slots. */
export function getSwapCandidates(data: CarpoolData, rides: RideSlot[], slotId: string): SwapCandidate[] {
  const slot = rides.find((r) => r.id === slotId);
  if (!slot) return [];
  return rankedEligible(data, slot, rides, getDriveCounts(data.parents, rides), slot.driverId);
}

/** Returns a new rides array with the slot reassigned. Throws if the new driver is not an eligible candidate. */
export function applySwap(data: CarpoolData, rides: RideSlot[], slotId: string, newDriverId: string): RideSlot[] {
  const candidate = getSwapCandidates(data, rides, slotId).find((c) => c.parent.id === newDriverId);
  if (!candidate) throw new Error(`Parent ${newDriverId} is not an eligible replacement for ride ${slotId}`);
  const reason = `החלפת חירום (SOS) · ${reasonFor(candidate.driveCount + 1, candidate.hasOwnChild)}`;
  return rides.map((r) => (r.id === slotId ? { ...r, driverId: newDriverId, assignmentReason: reason } : r));
}
