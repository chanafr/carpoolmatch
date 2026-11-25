import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import type { AppState, FairnessResult } from '../types';
import { loadState, resetToDemo, saveState } from '../data/storage';
import { calculateFairness, generateSchedule } from '../utils/scheduler';

interface CarpoolContextValue {
  state: AppState;
  fairness: FairnessResult;
  autoSchedule: () => void;
  loadDemo: () => void;
  setActiveParent: (id: string) => void;
  /** Apply a pure transition from state/actions.ts. */
  update: (fn: (s: AppState) => AppState) => void;
  toast: string | null;
  showToast: (message: string) => void;
}

const CarpoolContext = createContext<CarpoolContextValue | null>(null);

export function CarpoolProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AppState>(loadState);
  const [toast, setToast] = useState<string | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => saveState(state), [state]);

  const fairness = useMemo(() => calculateFairness(state.parents, state.rides), [state.parents, state.rides]);

  const showToast = useCallback((message: string) => {
    clearTimeout(toastTimer.current);
    setToast(message);
    toastTimer.current = setTimeout(() => setToast(null), 2600);
  }, []);

  const update = useCallback((fn: (s: AppState) => AppState) => setState(fn), []);

  const autoSchedule = useCallback(() => {
    const rides = generateSchedule(state);
    const f = calculateFairness(state.parents, rides);
    const conflicts = rides.filter((r) => !r.driverId).length;
    setState({ ...state, rides, scheduleStale: false });
    showToast(
      conflicts > 0
        ? `השבוע שובץ · ${conflicts === 1 ? 'נסיעה אחת' : `${conflicts} נסיעות`} ללא נהג ⚠️`
        : `✨ השבוע שובץ · מדד הוגנות ${f.score}%`,
    );
  }, [state, showToast]);

  const loadDemo = useCallback(() => {
    setState(resetToDemo());
    showToast('נתוני הדמו נטענו');
  }, [showToast]);

  const setActiveParent = useCallback((id: string) => setState((s) => ({ ...s, activeParentId: id })), []);

  const value = useMemo(
    () => ({ state, fairness, autoSchedule, loadDemo, setActiveParent, update, toast, showToast }),
    [state, fairness, autoSchedule, loadDemo, setActiveParent, update, toast, showToast],
  );
  return <CarpoolContext.Provider value={value}>{children}</CarpoolContext.Provider>;
}

export function useCarpool(): CarpoolContextValue {
  const ctx = useContext(CarpoolContext);
  if (!ctx) throw new Error('useCarpool must be used inside <CarpoolProvider>');
  return ctx;
}
