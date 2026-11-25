import { Scale } from 'lucide-react';
import { useCarpool } from '../state/CarpoolContext';
import type { FairnessLabel } from '../types';
import { Avatar, drivesThisWeek, firstName } from './ui';

const TONE: Record<FairnessLabel, { text: string; bar: string; chip: string }> = {
  'מאוזן מאוד': { text: 'text-emerald-700', bar: 'bg-emerald-500', chip: 'bg-emerald-50 text-emerald-600' },
  'סביר': { text: 'text-amber-700', bar: 'bg-amber-500', chip: 'bg-amber-50 text-amber-600' },
  'דורש איזון': { text: 'text-red-700', bar: 'bg-red-500', chip: 'bg-red-50 text-red-600' },
};

export function FairnessMeter() {
  const { state, fairness } = useCarpool();
  const hasRides = state.rides.some((r) => r.driverId);
  const tone = TONE[fairness.label];
  const total = Object.values(fairness.counts).reduce((a, b) => a + b, 0);
  const avg = state.parents.length ? total / state.parents.length : 0;
  const scaleMax = Math.max(1, fairness.maxDrives);

  return (
    <section
      aria-label="מדד הוגנות"
      className="flex flex-col gap-4 rounded-2xl bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.05),0_8px_24px_-12px_rgba(15,23,42,0.12)]"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex flex-col gap-1">
          <span className="text-sm font-semibold text-slate-600">מדד הוגנות</span>
          {hasRides ? (
            <div className="flex items-baseline gap-2">
              <span className="text-4xl leading-none font-extrabold tracking-tight tabular-nums">{fairness.score}%</span>
              <span className={`text-base font-semibold ${tone.text}`}>{fairness.label}</span>
            </div>
          ) : (
            <span className="text-base font-semibold text-slate-400">עוד לא שובץ — לחצו על "שיבוץ אוטומטי"</span>
          )}
        </div>
        <span className={`grid size-10 place-items-center rounded-xl ${hasRides ? tone.chip : 'bg-slate-100 text-slate-400'}`}>
          <Scale size={20} />
        </span>
      </div>

      <div className="h-2 overflow-hidden rounded-full bg-slate-200">
        <div
          className={`h-full rounded-full transition-[width] duration-500 ${hasRides ? tone.bar : ''}`}
          style={{ width: hasRides ? `${fairness.score}%` : '0%' }}
        />
      </div>

      <ul className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {state.parents.map((p) => {
          const count = fairness.counts[p.id] ?? 0;
          const isActive = p.id === state.activeParentId;
          return (
            <li
              key={p.id}
              className={`flex flex-col gap-2 rounded-xl px-3 py-2.5 ${isActive ? 'bg-brand-soft ring-1 ring-teal-200' : 'bg-slate-50'}`}
            >
              <div className="flex items-center gap-2">
                <Avatar parent={p} size={24} />
                <span className="truncate text-sm font-semibold text-slate-700">{firstName(p.name)}</span>
                <span className="ms-auto text-sm font-bold tabular-nums">{count}</span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-slate-200" title={drivesThisWeek(count)}>
                <div
                  className="h-full rounded-full bg-brand-light transition-[width] duration-500"
                  style={{ width: `${(count / scaleMax) * 100}%` }}
                />
              </div>
            </li>
          );
        })}
      </ul>

      {hasRides && (
        <p className="text-xs text-slate-500">
          ממוצע לקבוצה: <span className="font-semibold tabular-nums">{avg.toFixed(1)}</span> נסיעות להורה · פער מקסימלי:{' '}
          <span className="font-semibold tabular-nums">{fairness.spread}</span>
        </p>
      )}
    </section>
  );
}
