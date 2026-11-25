import rawSeed from '../../carpool-seed-data.json';
import { DAYS, DIRECTIONS } from '../types';
import type { AppState, CarpoolData, Parent } from '../types';

// Avatar palette from the Claude Design export (bg colors of the parent badges).
export const PARENT_COLORS = ['#CCFBF1', '#E0E7FF', '#FEF3C7', '#FCE7F3', '#DCFCE7', '#FFE4E6'];

export function parentColorForIndex(index: number): string {
  return PARENT_COLORS[index % PARENT_COLORS.length];
}

type RawParent = Omit<Parent, 'color'> & { color?: string };

/** Adds UI-only fields (avatar color) and checks the seed's references, so bad data fails loudly. */
function normalizeSeed(): CarpoolData {
  const parents: Parent[] = (rawSeed.parents as RawParent[]).map((p, i) => ({
    ...p,
    color: p.color ?? parentColorForIndex(i),
  }));
  const data: CarpoolData = {
    institutions: rawSeed.institutions,
    parents,
    children: rawSeed.children,
  };

  const parentIds = new Set(data.parents.map((p) => p.id));
  const instIds = new Set(data.institutions.map((i) => i.id));
  for (const p of data.parents) {
    for (const d of DAYS) for (const dir of DIRECTIONS) {
      if (typeof p.availability[d]?.[dir] !== 'boolean') {
        throw new Error(`Seed: parent ${p.id} missing availability ${d}.${dir}`);
      }
    }
  }
  for (const c of data.children) {
    if (!parentIds.has(c.parentId)) throw new Error(`Seed: child ${c.id} has unknown parent ${c.parentId}`);
    if (!instIds.has(c.institutionId)) throw new Error(`Seed: child ${c.id} has unknown institution ${c.institutionId}`);
  }
  return data;
}

const SEED: CarpoolData = normalizeSeed();

/** "טען נתוני דמו" — a fresh, deep-copied demo state. Rides start empty so "Auto-Schedule" is the next demo click. */
export function loadDemoData(): AppState {
  const data = structuredClone(SEED);
  return {
    ...data,
    rides: [],
    activeParentId: data.parents[0]?.id ?? null,
  };
}
