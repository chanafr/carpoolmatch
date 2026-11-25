import { RefreshCw, TriangleAlert } from 'lucide-react';
import { useCarpool } from '../state/CarpoolContext';

export function Toast() {
  const { toast } = useCarpool();
  return (
    <div aria-live="polite" role="status" className="pointer-events-none fixed inset-x-0 bottom-6 z-50 flex justify-center px-4">
      {toast && (
        <div className="animate-toast rounded-full bg-ink px-5 py-3 text-sm font-semibold text-white shadow-xl">{toast}</div>
      )}
    </div>
  );
}

/** Shown after data edits so the user can re-run the scheduler (manual swaps are kept until they do). */
export function StaleBanner() {
  const { state, autoSchedule } = useCarpool();
  if (!state.scheduleStale) return null;
  return (
    <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3">
      <TriangleAlert size={18} className="shrink-0 text-amber-600" />
      <p className="flex-1 text-sm font-medium text-amber-900">
        הנתונים השתנו מאז השיבוץ האחרון. חשבו מחדש כדי לעדכן את הלוח (החלפות ידניות יבוטלו).
      </p>
      <button
        type="button"
        onClick={autoSchedule}
        className="flex h-9 items-center gap-1.5 rounded-xl bg-amber-500 px-3.5 text-sm font-bold whitespace-nowrap text-white hover:bg-amber-600"
      >
        <RefreshCw size={15} /> חשב לוח מחדש
      </button>
    </div>
  );
}
