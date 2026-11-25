import { CalendarDays, Sparkles, Sun, Sunset, TriangleAlert } from 'lucide-react';
import { useState } from 'react';
import { useCarpool } from '../state/CarpoolContext';
import { DAYS, DAY_LABELS, DIRECTIONS } from '../types';
import type { Direction, RideSlot } from '../types';
import { RideCard } from './RideCard';
import { WhatsAppButton } from './WhatsAppButton';
import { rideIssue } from '../utils/scheduler';

export type RideFilter = 'all' | 'mine' | 'conflicts';

const FILTERS: { id: RideFilter; label: string }[] = [
  { id: 'all', label: 'כל הנסיעות' },
  { id: 'mine', label: 'הנסיעות שלי' },
  { id: 'conflicts', label: 'התנגשויות' },
];

const DIRECTION_META: Record<Direction, { label: string; Icon: typeof Sun; tone: string }> = {
  morning: { label: 'בוקר', Icon: Sun, tone: 'bg-amber-100 text-amber-800' },
  afternoon: { label: 'צהריים', Icon: Sunset, tone: 'bg-indigo-100 text-indigo-800' },
};

interface Props {
  filter: RideFilter;
  onFilterChange: (f: RideFilter) => void;
  onSwap?: (rideId: string) => void;
  flashRideId?: string | null;
}

export function ScheduleGrid({ filter, onFilterChange, onSwap, flashRideId }: Props) {
  const { state, autoSchedule } = useCarpool();
  const hasIssue = (r: RideSlot) => rideIssue(state, state.rides, r) !== null;
  const conflictCount = state.rides.filter(hasIssue).length;

  const [highlightMine, setHighlightMine] = useState(false);
  const activeName = state.parents.find((p) => p.id === state.activeParentId)?.name.split(' ')[0];

  const visible = (r: RideSlot) =>
    filter === 'all' || (filter === 'mine' ? r.driverId === state.activeParentId : hasIssue(r));

  if (state.rides.length === 0) {
    return (
      <section className="flex flex-col items-center gap-3 rounded-2xl border-2 border-dashed border-slate-300 bg-white/60 px-6 py-14 text-center">
        <CalendarDays size={36} className="text-slate-400" />
        <h2 className="text-lg font-bold">הלוח השבועי עדיין ריק</h2>
        <p className="max-w-sm text-sm text-slate-500">
          {state.children.length} ילדים, {state.parents.length} הורים. לחיצה אחת תשבץ את כל השבוע בצורה הוגנת.
        </p>
        <button
          type="button"
          onClick={autoSchedule}
          className="mt-2 flex h-11 items-center gap-2 rounded-xl bg-brand px-5 font-bold text-white hover:bg-teal-800"
        >
          <Sparkles size={18} /> שיבוץ אוטומטי לשבוע
        </button>
      </section>
    );
  }

  return (
    <section aria-label="לוח שבועי" className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-bold">השבוע</h2>
          <WhatsAppButton />
        </div>
        <div role="tablist" aria-label="סינון נסיעות" className="flex rounded-xl bg-slate-200/70 p-1 text-sm">
          {FILTERS.map((f) => (
            <button
              key={f.id}
              type="button"
              role="tab"
              aria-selected={filter === f.id}
              onClick={() => onFilterChange(f.id)}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 font-semibold transition ${
                filter === f.id ? 'bg-white text-ink shadow-sm' : 'text-slate-600 hover:text-ink'
              }`}
            >
              {f.label}
              {f.id === 'conflicts' && conflictCount > 0 && (
                <span className="rounded-full bg-red-600 px-1.5 text-[11px] leading-5 text-white tabular-nums">{conflictCount}</span>
              )}
            </button>
          ))}
        </div>
      </div>

      {conflictCount > 0 && filter !== 'conflicts' && (
        <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3">
          <TriangleAlert size={18} className="shrink-0 text-red-600" />
          <p className="flex-1 text-sm font-semibold text-red-800">{conflictCount === 1 ? 'נסיעה אחת דורשת טיפול' : `${conflictCount} נסיעות דורשות טיפול`} — אין נהג/ת או שהנהג/ת כבר לא זמינ/ה</p>
          <button type="button" onClick={() => onFilterChange('conflicts')} className="h-9 rounded-xl bg-red-600 px-3.5 text-sm font-bold text-white hover:bg-red-700">
            הצג
          </button>
        </div>
      )}

      {activeName && filter === 'all' && (
        <label className="flex w-fit cursor-pointer items-center gap-2 text-sm font-medium text-slate-600">
          <input type="checkbox" className="size-4 accent-teal-700" checked={highlightMine} onChange={(e) => setHighlightMine(e.target.checked)} />
          הדגש את הנסיעות של {activeName}
        </label>
      )}

      {/* RTL grid: Sunday sits on the right. Stacked on mobile, 5 columns on wide screens. */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        {DAYS.map((day) => {
          const dayRides = state.rides.filter((r) => r.day === day);
          const dayConflicts = dayRides.filter(hasIssue).length;
          return (
            <div key={day} className="flex flex-col gap-3 rounded-2xl bg-slate-100/70 p-3">
              <div className="flex items-center justify-between px-1">
                <h3 className="font-bold">יום {DAY_LABELS[day]}</h3>
                {dayConflicts > 0 && (
                  <span className="rounded-full bg-red-100 px-2 py-0.5 text-[11px] font-bold text-red-700">
                    {dayConflicts === 1 ? 'נסיעה לטיפול' : `${dayConflicts} לטיפול`}
                  </span>
                )}
              </div>
              {DIRECTIONS.map((dir) => {
                const rides = dayRides.filter((r) => r.direction === dir && visible(r));
                const { label, Icon, tone } = DIRECTION_META[dir];
                return (
                  <div key={dir} className="flex flex-col gap-2">
                    <span className={`flex w-fit items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ${tone}`}>
                      <Icon size={12} /> {label}
                    </span>
                    {rides.length > 0 ? (
                      rides.map((r) => (
                        <RideCard
                          key={r.id}
                          ride={r}
                          state={state}
                          onSwap={onSwap}
                          flash={r.id === flashRideId}
                          dimmed={highlightMine && filter === 'all' && r.driverId !== state.activeParentId}
                        />
                      ))
                    ) : (
                      <p className="px-1 py-2 text-xs text-slate-400">אין נסיעות</p>
                    )}
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
    </section>
  );
}
