import type { AppState } from '../types';
import { loadDemoData } from './seedData';

// Bump the version if the AppState shape changes, so stale saved data is ignored.
export const STORAGE_KEY = 'carpoolmatch:v1';

export function loadState(): AppState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as AppState;
      if (Array.isArray(parsed.parents) && Array.isArray(parsed.children) && Array.isArray(parsed.rides)) {
        return parsed;
      }
    }
  } catch {
    // Corrupt or unavailable storage: fall back to the demo.
  }
  return loadDemoData();
}

export function saveState(state: AppState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Storage full or blocked: the app keeps working in memory.
  }
}

/** "Reset Demo" / "טען נתוני דמו": wipe saved changes and return a fresh demo state. */
export function resetToDemo(): AppState {
  const state = loadDemoData();
  saveState(state);
  return state;
}
