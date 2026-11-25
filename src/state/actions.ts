// Pure state transitions used by the UI. Data edits mark an existing schedule as stale
// (we don't silently re-run the scheduler, which would discard manual SOS swaps).
import type { AppState, DayKey, Direction } from '../types';
import { DAYS } from '../types';
import { parentColorForIndex } from '../data/seedData';
import { applySwap } from '../utils/scheduler';

const touch = (s: AppState): AppState => ({ ...s, scheduleStale: s.rides.length > 0 });

export const MIN_SEATS = 1;
export const MAX_SEATS = 8;

export function newId(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}

export function setAvailability(s: AppState, parentId: string, day: DayKey, dir: Direction, value: boolean): AppState {
  return touch({
    ...s,
    parents: s.parents.map((p) =>
      p.id === parentId
        ? { ...p, availability: { ...p.availability, [day]: { ...p.availability[day], [dir]: value } } }
        : p,
    ),
  });
}

export function setSeatCapacity(s: AppState, parentId: string, seats: number): AppState {
  const clamped = Math.min(MAX_SEATS, Math.max(MIN_SEATS, Math.round(seats)));
  return touch({ ...s, parents: s.parents.map((p) => (p.id === parentId ? { ...p, seatCapacity: clamped } : p)) });
}

export interface NewParentInput {
  name: string;
  seatCapacity: number;
  phone?: string;
}

export function addParent(s: AppState, input: NewParentInput, id = newId('p')): AppState {
  const name = input.name.trim();
  if (!name) throw new Error('Parent name is required');
  const availability = Object.fromEntries(DAYS.map((d) => [d, { morning: true, afternoon: true }])) as AppState['parents'][number]['availability'];
  return touch({
    ...s,
    parents: [
      ...s.parents,
      {
        id,
        name,
        phone: input.phone?.trim() || undefined,
        seatCapacity: Math.min(MAX_SEATS, Math.max(MIN_SEATS, Math.round(input.seatCapacity))),
        color: parentColorForIndex(s.parents.length),
        availability,
      },
    ],
  });
}

export interface NewChildInput {
  name: string;
  parentId: string;
  institutionId: string;
  start: string; // same times Sun–Thu (MVP)
  end: string;
}

export function addChild(s: AppState, input: NewChildInput, id = newId('c')): AppState {
  const name = input.name.trim();
  if (!name) throw new Error('Child name is required');
  if (!s.parents.some((p) => p.id === input.parentId)) throw new Error('Unknown parent');
  if (!s.institutions.some((i) => i.id === input.institutionId)) throw new Error('Unknown institution');
  if (!/^\d{2}:\d{2}$/.test(input.start) || !/^\d{2}:\d{2}$/.test(input.end)) throw new Error('Times must be HH:MM');
  return touch({
    ...s,
    children: [
      ...s.children,
      {
        id,
        name,
        parentId: input.parentId,
        institutionId: input.institutionId,
        schedule: Object.fromEntries(DAYS.map((d) => [d, { start: input.start, end: input.end }])),
      },
    ],
  });
}

export function removeChild(s: AppState, childId: string): AppState {
  return touch({ ...s, children: s.children.filter((c) => c.id !== childId) });
}

/** SOS swap. Does not mark the schedule stale — it *is* a schedule edit. */
export function swapDriver(s: AppState, rideId: string, newDriverId: string): AppState {
  return { ...s, rides: applySwap(s, s.rides, rideId, newDriverId) };
}
