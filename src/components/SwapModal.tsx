import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeftRight, Check, TriangleAlert, Users, X } from 'lucide-react';
import { useCarpool } from '../state/CarpoolContext';
import { swapDriver } from '../state/actions';
import { DAY_LABELS } from '../types';
import { applySwap, calculateFairness, getSwapCandidates, rideIssue } from '../utils/scheduler';
import { Avatar, SchoolTag, drivesThisWeek, firstName } from './ui';
import { WhatsAppButton } from './WhatsAppButton';

interface Props {
  rideId: string;
  onClose: () => void;
  onSwapped: (rideId: string) => void;
}

export function SwapModal({ rideId, onClose, onSwapped }: Props) {
  const { state, update, showToast } = useCarpool();
  const ride = state.rides.find((r) => r.id === rideId);

  const candidates = useMemo(() => {
    if (!ride) return [];
    return getSwapCandidates(state, state.rides, ride.id).map((c) => ({
      ...c,
      fairnessAfter: calculateFairness(state.parents, applySwap(state, state.rides, ride.id, c.parent.id)).score,
    }));
  }, [state, ride]);

  const [selectedId, setSelectedId] = useState<string | null>(candidates[0]?.parent.id ?? null);
  const confirmRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    confirmRef.current?.focus();
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [onClose]);

  if (!ride) return null;

  const issue = rideIssue(state, state.rides, ride);
  const driver = state.parents.find((p) => p.id === ride.driverId);
  const institution = state.institutions.find((i) => i.id === ride.institutionId);
  const kids = ride.passengerIds.map((id) => state.children.find((c) => c.id === id)?.name).filter(Boolean);
  const when = `יום ${DAY_LABELS[ride.day]} ${ride.time}`;
  const title = issue === 'unassigned' ? `שיבוץ נהג/ת · ${when}` : `לא יכול/ה להסיע ב${when}?`;
  const selected = candidates.find((c) => c.parent.id === selectedId);

  const confirm = () => {
    if (!selected) return;
    update((s) => swapDriver(s, ride.id, selected.parent.id));
    showToast(`✅ ${firstName(selected.parent.name)} שובצ/ה ל${when}`);
    onSwapped(ride.id);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center sm:items-center sm:p-6">
      <div className="absolute inset-0 bg-ink/55" onClick={onClose} aria-hidden="true" />
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="swap-title"
        className="animate-sheet relative flex max-h-[90dvh] w-full flex-col gap-4 overflow-y-auto rounded-t-[28px] bg-white px-5 pt-3 pb-8 shadow-[0_-12px_40px_-12px_rgba(15,23,42,0.35)] sm:max-w-md sm:rounded-[28px] sm:pt-5"
      >
        <div className="mx-auto h-1.5 w-10 rounded-full bg-slate-300 sm:hidden" />

        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-red-50 text-red-600">
              <TriangleAlert size={22} />
            </span>
            <h2 id="swap-title" className="text-xl leading-tight font-extrabold tracking-tight">{title}</h2>
          </div>
          <button type="button" onClick={onClose} aria-label="סגירה" className="grid size-9 shrink-0 place-items-center rounded-full bg-slate-100 text-slate-600 hover:bg-slate-200">
            <X size={16} />
          </button>
        </div>

        {/* Ride details */}
        <div className="flex flex-col gap-2 rounded-2xl bg-slate-50 p-3 text-sm">
          <div className="flex flex-wrap items-center gap-2">
            <SchoolTag institution={institution} />
            <span className="text-slate-600">
              נהג/ת נוכחי/ת: <strong className="text-ink">{driver ? firstName(driver.name) : 'אין'}</strong>
            </span>
          </div>
          <div className="flex items-center gap-2 text-slate-600">
            <Users size={14} /> {kids.join(', ')}
          </div>
        </div>

        {/* Candidates */}
        {candidates.length > 0 ? (
          <div role="radiogroup" aria-label="הורים זמינים להחלפה" className="flex flex-col gap-2">
            <span className="text-sm font-semibold text-slate-600">הורים זמינים ({candidates.length})</span>
            {candidates.map((c, i) => {
              const isSel = c.parent.id === selectedId;
              return (
                <button
                  key={c.parent.id}
                  type="button"
                  role="radio"
                  aria-checked={isSel}
                  onClick={() => setSelectedId(c.parent.id)}
                  className={`flex items-center gap-3 rounded-2xl border-2 p-3 text-start transition ${
                    isSel ? 'border-emerald-500 bg-emerald-50' : 'border-slate-200 bg-white hover:border-slate-300'
                  }`}
                >
                  <Avatar parent={c.parent} size={44} />
                  <span className="flex flex-1 flex-col gap-0.5">
                    <span className="font-bold">
                      {i === 0 && <span className="text-emerald-700">ההתאמה הטובה ביותר: </span>}
                      {firstName(c.parent.name)}
                    </span>
                    <span className="text-xs text-slate-600">
                      פנוי/ה · {drivesThisWeek(c.driveCount)}{c.hasOwnChild && ' · הילד/ה בנסיעה'}
                    </span>
                    <span className={`text-xs font-semibold ${c.fairnessAfter >= 90 ? 'text-emerald-700' : c.fairnessAfter >= 70 ? 'text-amber-700' : 'text-red-700'}`}>
                      מדד הוגנות אחרי ההחלפה: {c.fairnessAfter}%
                    </span>
                  </span>
                  <span className={`grid size-7 shrink-0 place-items-center rounded-full ${isSel ? 'bg-emerald-500 text-white' : 'border-2 border-slate-300'}`}>
                    {isSel && <Check size={16} strokeWidth={3} />}
                  </span>
                </button>
              );
            })}
          </div>
        ) : (
          <p className="rounded-2xl bg-red-50 p-4 text-sm font-medium text-red-800">
            אין כרגע הורה פנוי עם מספיק מקומות ברכב לנסיעה הזו. אפשר לעדכן זמינות בלשונית "משפחות וזמינות".
          </p>
        )}

        <button
          ref={confirmRef}
          type="button"
          onClick={confirm}
          disabled={!selected}
          className="flex h-14 items-center justify-center gap-2 rounded-2xl bg-brand text-base font-bold text-white hover:bg-teal-800 disabled:opacity-40"
        >
          <ArrowLeftRight size={18} />
          {selected ? `אישור החלפה ל${firstName(selected.parent.name)}` : 'אישור החלפה'}
        </button>
        <WhatsAppButton variant="pill" />
      </section>
    </div>
  );
}
