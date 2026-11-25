import { ArrowLeftRight, Info, TriangleAlert, Users } from 'lucide-react';
import type { AppState, RideSlot } from '../types';
import { rideIssue } from '../utils/scheduler';
import { Avatar, SchoolTag, firstName } from './ui';

interface Props {
  ride: RideSlot;
  state: AppState;
  onSwap?: (rideId: string) => void;
  flash?: boolean; // brief highlight right after a swap
  dimmed?: boolean; // "highlight my drives" mode: fade other parents' rides
}

export function RideCard({ ride, state, onSwap, flash, dimmed }: Props) {
  const driver = state.parents.find((p) => p.id === ride.driverId);
  const institution = state.institutions.find((i) => i.id === ride.institutionId);
  const passengers = ride.passengerIds
    .map((id) => state.children.find((c) => c.id === id))
    .filter((c) => c !== undefined);
  const issue = rideIssue(state, state.rides, ride);
  const isConflict = issue !== null;
  const isMine = !!driver && driver.id === state.activeParentId;

  return (
    <article
      className={[
        'flex flex-col gap-3 rounded-2xl bg-white p-3.5 transition',
        'shadow-[0_1px_2px_rgba(15,23,42,0.05),0_8px_24px_-14px_rgba(15,23,42,0.12)]',
        isConflict ? 'ring-2 ring-red-500 shadow-[0_0_0_4px_rgba(239,68,68,0.15)]' : '',
        isMine && !isConflict ? 'ring-2 ring-brand-light' : '',
        flash ? 'animate-flash' : '',
        dimmed && !isConflict ? 'opacity-40 saturate-50' : '',
      ].join(' ')}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-base font-bold tabular-nums" dir="ltr">{ride.time}</span>
        <SchoolTag institution={institution} />
      </div>

      {driver ? (
        <div className="flex items-center gap-2.5">
          <Avatar parent={driver} size={32} />
          <div className="flex min-w-0 flex-col">
            <span className="text-[11px] font-medium text-slate-500">{isMine ? 'אני נוהג/ת 🚗' : 'נהג/ת'}</span>
            <span className="truncate text-sm font-semibold">
              {firstName(driver.name)} <span className="font-normal text-slate-500">({driver.seatCapacity} מקומות)</span>
            </span>
          </div>
        </div>
      ) : null}
      {issue === 'invalid' && driver && (
        <div className="flex items-center gap-2 rounded-xl bg-red-50 px-3 py-2 text-xs font-semibold text-red-700">
          <TriangleAlert size={14} className="shrink-0" />
          {firstName(driver.name)} כבר לא זמינ/ה לנסיעה הזו
        </div>
      )}
      {!driver && (
        <div className="flex items-center gap-2 rounded-xl bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">
          <TriangleAlert size={16} className="shrink-0" />
          אין נהג/ת משובץ/ת
        </div>
      )}

      <div className="flex items-start gap-2 border-t border-slate-100 pt-2.5">
        <Users size={15} className="mt-1 shrink-0 text-slate-400" aria-label="נוסעים" />
        <ul className="flex flex-wrap gap-1">
          {passengers.map((c) => {
            const mine = c.parentId === state.activeParentId;
            return (
              <li
                key={c.id}
                className={`rounded-full px-2 py-0.5 text-xs ${mine ? 'bg-brand-soft font-bold text-teal-800' : 'bg-slate-100 font-medium text-slate-700'}`}
              >
                {c.name}
              </li>
            );
          })}
        </ul>
      </div>

      <p className={`flex items-start gap-1.5 text-[11px] leading-snug ${!driver ? 'text-red-600' : 'text-slate-500'}`}>
        <Info size={12} className="mt-px shrink-0" />
        {ride.assignmentReason}
      </p>

      {onSwap && (
        <button
          type="button"
          onClick={() => onSwap(ride.id)}
          className={
            !driver
              ? 'flex h-9 items-center justify-center gap-1.5 rounded-xl bg-red-600 text-sm font-semibold text-white hover:bg-red-700'
              : 'flex h-9 items-center justify-center gap-1.5 rounded-xl border-[1.5px] border-red-600 bg-white text-sm font-semibold text-red-700 hover:bg-red-50'
          }
        >
          {!driver ? <TriangleAlert size={14} /> : <ArrowLeftRight size={14} />}
          {!driver ? 'שיבוץ נהג/ת' : issue === 'invalid' ? 'החלפת נהג/ת' : 'לא יכול/ה להסיע / החלפה'}
        </button>
      )}
    </article>
  );
}
