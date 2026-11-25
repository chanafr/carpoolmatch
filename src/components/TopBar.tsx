import { CalendarDays, Car, ChevronDown, RotateCcw, Sparkles, Users } from 'lucide-react';
import { useCarpool } from '../state/CarpoolContext';
import { Avatar, firstName } from './ui';

export type View = 'schedule' | 'families';

const VIEWS: { id: View; label: string; Icon: typeof Users }[] = [
  { id: 'schedule', label: 'לוח שבועי', Icon: CalendarDays },
  { id: 'families', label: 'משפחות וזמינות', Icon: Users },
];

export function TopBar({ view, onViewChange }: { view: View; onViewChange: (v: View) => void }) {
  const { state, autoSchedule, loadDemo, setActiveParent } = useCarpool();
  const active = state.parents.find((p) => p.id === state.activeParentId) ?? state.parents[0];

  return (
    <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/90 backdrop-blur">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-3 px-4 py-3 sm:px-6">
        {/* Logo */}
        <div className="flex items-center gap-2.5">
          <span className="grid size-9 place-items-center rounded-xl bg-brand-light text-white">
            <Car size={20} />
          </span>
          <span className="text-xl font-extrabold tracking-tight" dir="ltr">CarpoolMatch</span>
        </div>

        {/* View tabs: full-width last row on mobile, inline after the logo on larger screens. */}
        <nav aria-label="תצוגות" className="order-last flex w-full rounded-xl bg-slate-100 p-1 sm:order-none sm:w-auto">
          {VIEWS.map(({ id, label, Icon }) => (
            <button
              key={id}
              type="button"
              aria-current={view === id ? 'page' : undefined}
              onClick={() => onViewChange(id)}
              className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-semibold whitespace-nowrap transition sm:flex-none ${
                view === id ? 'bg-white text-teal-800 shadow-sm' : 'text-slate-600 hover:text-ink'
              }`}
            >
              <Icon size={15} /> {label}
            </button>
          ))}
        </nav>

        {/* Viewing-as switcher: a native select layered over a styled pill (accessible + zero deps). */}
        {active && (
          <label className="relative ms-auto flex h-9 cursor-pointer items-center gap-1.5 rounded-full border border-slate-200 bg-white ps-1 pe-2.5 text-xs font-medium text-slate-600 hover:border-slate-300 sm:order-last sm:ms-0">
            <Avatar parent={active} size={28} />
            <span className="hidden xl:inline">צופה בתור:</span>
            <strong className="font-bold text-ink">{firstName(active.name)}</strong>
            <ChevronDown size={14} />
            <select
              aria-label="צופה בתור"
              className="absolute inset-0 cursor-pointer opacity-0"
              value={active.id}
              onChange={(e) => setActiveParent(e.target.value)}
            >
              {state.parents.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </label>
        )}

        {/* Actions */}
        <div className="flex w-full gap-2 sm:ms-auto sm:w-auto">
          <button
            type="button"
            onClick={autoSchedule}
            disabled={state.parents.length === 0}
            className="flex h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-brand px-4 text-[15px] font-bold whitespace-nowrap sm:px-5 sm:text-base text-white shadow-[0_8px_20px_-8px_rgba(13,148,136,0.6)] transition hover:bg-teal-800 active:scale-[0.98] disabled:opacity-50 sm:flex-none"
          >
            <Sparkles size={18} />
            שיבוץ אוטומטי לשבוע
          </button>
          <button
            type="button"
            onClick={loadDemo}
            title="טוען מחדש את נתוני השכונה לדוגמה ומוחק שינויים"
            className="flex h-11 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold whitespace-nowrap sm:px-3.5 text-slate-700 transition hover:bg-slate-50"
          >
            <RotateCcw size={16} />
            <span className="xl:hidden">טען דמו</span>
            <span className="hidden xl:inline">טען נתוני דמו</span>
          </button>
        </div>
      </div>
    </header>
  );
}
