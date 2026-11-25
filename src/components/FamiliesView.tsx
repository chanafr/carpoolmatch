import { useState } from 'react';
import type { FormEvent } from 'react';
import { Baby, Minus, Phone, Plus, UserPlus, X } from 'lucide-react';
import { useCarpool } from '../state/CarpoolContext';
import { MAX_SEATS, MIN_SEATS, addChild, addParent, removeChild, setAvailability, setSeatCapacity } from '../state/actions';
import { DAYS, DAY_LABELS, DIRECTIONS, DIRECTION_LABELS } from '../types';
import type { Parent } from '../types';
import { StaleBanner } from './Feedback';
import { Avatar, firstName } from './ui';

const card = 'rounded-2xl bg-white p-4 shadow-[0_1px_2px_rgba(15,23,42,0.05),0_8px_24px_-14px_rgba(15,23,42,0.12)]';
const input =
  'h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-[15px] outline-none focus:border-brand-light focus:ring-2 focus:ring-teal-100';
const label = 'flex flex-col gap-1 text-xs font-medium text-slate-500';

export function FamiliesView() {
  return (
    <div className="flex flex-col gap-5">
      <StaleBanner />
      <div className="grid gap-4 lg:grid-cols-2">
        <AddChildForm />
        <AddParentForm />
      </div>
      <h2 className="text-lg font-bold">משפחות וזמינות שבועית</h2>
      <FamiliesGrid />
    </div>
  );
}

function FamiliesGrid() {
  const { state } = useCarpool();
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {state.parents.map((p) => (
        <ParentCard key={p.id} parent={p} />
      ))}
    </div>
  );
}

function SeatStepper({ parent }: { parent: Parent }) {
  const { update } = useCarpool();
  const set = (n: number) => update((s) => setSeatCapacity(s, parent.id, n));
  const btn = 'grid size-8 place-items-center rounded-lg border text-slate-700 disabled:opacity-30';
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-slate-500">מקומות ברכב</span>
      <button type="button" aria-label="פחות מקומות" className={`${btn} border-slate-200 bg-slate-50`} disabled={parent.seatCapacity <= MIN_SEATS} onClick={() => set(parent.seatCapacity - 1)}>
        <Minus size={14} />
      </button>
      <span className="w-4 text-center font-bold tabular-nums" aria-live="polite">{parent.seatCapacity}</span>
      <button type="button" aria-label="יותר מקומות" className={`${btn} border-teal-200 bg-brand-soft text-teal-800`} disabled={parent.seatCapacity >= MAX_SEATS} onClick={() => set(parent.seatCapacity + 1)}>
        <Plus size={14} />
      </button>
    </div>
  );
}

function Toggle({ on, label, onChange }: { on: boolean; label: string; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      onClick={() => onChange(!on)}
      className={`flex h-6 w-10 items-center rounded-full p-[3px] transition-colors ${on ? 'justify-end bg-brand-light' : 'justify-start bg-slate-300'}`}
    >
      <span className="size-[18px] rounded-full bg-white shadow-[0_1px_3px_rgba(15,23,42,0.25)]" />
    </button>
  );
}

function ParentCard({ parent }: { parent: Parent }) {
  const { state, update } = useCarpool();
  const kids = state.children.filter((c) => c.parentId === parent.id);
  const instName = (id: string) => state.institutions.find((i) => i.id === id)?.name ?? '';
  const isActive = parent.id === state.activeParentId;

  return (
    <section className={`${card} flex flex-col gap-4 ${isActive ? 'ring-2 ring-teal-200' : ''}`}>
      <div className="flex flex-wrap items-center gap-3">
        <Avatar parent={parent} size={40} />
        <div className="flex flex-1 flex-col">
          <span className="font-bold">{parent.name}</span>
          {parent.phone && (
            <span className="flex items-center gap-1 text-xs text-slate-500">
              <Phone size={11} /> <span dir="ltr">{parent.phone}</span>
            </span>
          )}
        </div>
        <SeatStepper parent={parent} />
      </div>

      <div className="flex flex-col gap-1.5">
        <span className="text-xs font-semibold text-slate-500">ילדים</span>
        {kids.length === 0 && <span className="text-xs text-slate-400">אין ילדים רשומים</span>}
        <ul className="flex flex-wrap gap-1.5">
          {kids.map((c) => {
            const day = c.schedule.sun ?? Object.values(c.schedule)[0];
            return (
              <li key={c.id} className="flex items-center gap-1.5 rounded-full border border-slate-200 bg-white py-1 ps-3 pe-1 text-xs text-slate-600">
                <strong className="text-ink">{c.name}</strong> · {instName(c.institutionId)}
                {day && <span dir="ltr" className="tabular-nums">({day.start}–{day.end})</span>}
                <button
                  type="button"
                  aria-label={`הסרת ${c.name}`}
                  onClick={() => update((s) => removeChild(s, c.id))}
                  className="grid size-5 place-items-center rounded-full text-slate-400 hover:bg-red-50 hover:text-red-600"
                >
                  <X size={12} />
                </button>
              </li>
            );
          })}
        </ul>
      </div>

      <div className="grid grid-cols-[4.5rem_repeat(5,minmax(0,1fr))] items-center justify-items-center gap-y-3">
        <span />
        {DAYS.map((d) => (
          <span key={d} className="text-xs font-semibold text-slate-500">{DAY_LABELS[d]}</span>
        ))}
        {DIRECTIONS.map((dir) => (
          <div key={dir} className="contents">
            <span className={`justify-self-start rounded-full px-2 py-0.5 text-[11px] font-semibold ${dir === 'morning' ? 'bg-amber-100 text-amber-800' : 'bg-indigo-100 text-indigo-800'}`}>
              {DIRECTION_LABELS[dir]}
            </span>
            {DAYS.map((d) => (
              <Toggle
                key={d}
                on={parent.availability[d][dir]}
                label={`${firstName(parent.name)} · ${DAY_LABELS[d]} ${DIRECTION_LABELS[dir]}`}
                onChange={(v) => update((s) => setAvailability(s, parent.id, d, dir, v))}
              />
            ))}
          </div>
        ))}
      </div>
    </section>
  );
}

function AddChildForm() {
  const { state, update, showToast } = useCarpool();
  const firstInst = state.institutions[0];
  const [name, setName] = useState('');
  const [parentId, setParentId] = useState(state.activeParentId ?? state.parents[0]?.id ?? '');
  const [institutionId, setInstitutionId] = useState(firstInst?.id ?? '');
  const [start, setStart] = useState(firstInst?.defaultStartTime ?? '08:00');
  const [end, setEnd] = useState(firstInst?.defaultEndTime ?? '13:30');

  const onInstitution = (id: string) => {
    setInstitutionId(id);
    const inst = state.institutions.find((i) => i.id === id);
    if (inst) {
      setStart(inst.defaultStartTime);
      setEnd(inst.defaultEndTime);
    }
  };

  // Fall back if the selected parent no longer exists (e.g. after "Load Demo").
  const validParent = state.parents.some((p) => p.id === parentId) ? parentId : state.parents[0]?.id ?? '';

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !validParent || !institutionId) return;
    update((s) => addChild(s, { name, parentId: validParent, institutionId, start, end }));
    showToast(`👶 ${name.trim()} נוספ/ה למשפחה`);
    setName('');
  };

  return (
    <form onSubmit={submit} className={`${card} flex flex-col gap-3`}>
      <h3 className="flex items-center gap-2 font-bold">
        <span className="grid size-8 place-items-center rounded-lg bg-brand-soft text-brand-light"><Baby size={18} /></span>
        הוספת ילד/ה
      </h3>
      <div className="grid grid-cols-2 gap-3">
        <label className={label}>
          שם
          <input className={input} value={name} onChange={(e) => setName(e.target.value)} placeholder="למשל: רוני" required />
        </label>
        <label className={label}>
          הורה
          <select className={input} value={validParent} onChange={(e) => setParentId(e.target.value)}>
            {state.parents.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </label>
        <label className={`${label} col-span-2`}>
          מוסד
          <select className={input} value={institutionId} onChange={(e) => onInstitution(e.target.value)}>
            {state.institutions.map((i) => <option key={i.id} value={i.id}>{i.name}</option>)}
          </select>
        </label>
        <label className={label}>
          שעת התחלה
          <input className={input} type="time" dir="ltr" value={start} onChange={(e) => setStart(e.target.value)} required />
        </label>
        <label className={label}>
          שעת סיום
          <input className={input} type="time" dir="ltr" value={end} onChange={(e) => setEnd(e.target.value)} required />
        </label>
      </div>
      <p className="text-[11px] text-slate-400">השעות חלות על ראשון–חמישי.</p>
      <button type="submit" disabled={!name.trim() || state.parents.length === 0} className="flex h-11 items-center justify-center gap-2 rounded-xl bg-brand font-bold text-white hover:bg-teal-800 disabled:opacity-40">
        <Plus size={18} /> הוספה
      </button>
    </form>
  );
}

function AddParentForm() {
  const { update, showToast } = useCarpool();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [seats, setSeats] = useState(4);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    update((s) => addParent(s, { name, phone, seatCapacity: seats }));
    showToast(`👋 ${name.trim()} הצטרפ/ה לקבוצה`);
    setName('');
    setPhone('');
    setSeats(4);
  };

  return (
    <form onSubmit={submit} className={`${card} flex flex-col gap-3`}>
      <h3 className="flex items-center gap-2 font-bold">
        <span className="grid size-8 place-items-center rounded-lg bg-brand-soft text-brand-light"><UserPlus size={18} /></span>
        הוספת הורה
      </h3>
      <div className="grid grid-cols-2 gap-3">
        <label className={label}>
          שם
          <input className={input} value={name} onChange={(e) => setName(e.target.value)} placeholder="למשל: אבי גולן" required />
        </label>
        <label className={label}>
          טלפון (רשות)
          <input className={input} type="tel" dir="ltr" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="050-0000000" />
        </label>
        <label className={`${label} col-span-2`}>
          מקומות פנויים ברכב (ללא הנהג/ת)
          <input className={input} type="number" min={MIN_SEATS} max={MAX_SEATS} value={seats} onChange={(e) => setSeats(Number(e.target.value) || MIN_SEATS)} />
        </label>
      </div>
      <p className="text-[11px] text-slate-400">הורה חדש/ה מסומנ/ת כזמינ/ה בכל המשמרות — אפשר לעדכן בטבלה למטה.</p>
      <button type="submit" disabled={!name.trim()} className="flex h-11 items-center justify-center gap-2 rounded-xl border-2 border-brand bg-white font-bold text-brand hover:bg-brand-soft disabled:opacity-40">
        <Plus size={18} /> הוספה
      </button>
    </form>
  );
}
