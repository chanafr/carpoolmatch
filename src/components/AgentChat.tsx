import { useCallback, useEffect, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import type { LucideIcon } from 'lucide-react';
import { Bot, CheckCircle2, Lightbulb, Loader2, MapPin, MessagesSquare, PartyPopper, Send, Trash2, X } from 'lucide-react';

interface Message {
  role: 'user' | 'model';
  text: string;
}

type AgentId = 'planner' | 'events';

interface AgentConfig {
  /** Must match an agent id in server/geminiChat.ts */
  id: AgentId;
  label: string;
  title: string;
  subtitle: string;
  greeting: string;
  icon: LucideIcon;
  /** Header / button / user-bubble color */
  color: string;
  /** Action menu shown under the header; the first item is the default. Omit for a plain chat. */
  menu?: { id: Mode; label: string; icon: LucideIcon }[];
}

/** chat = free conversation with the agent; city = code + city → Make; recommend = free text → Make recommendations. */
type Mode = 'chat' | 'city' | 'recommend';

const AGENTS: AgentConfig[] = [
  {
    id: 'planner',
    label: "צ'אט משימות",
    title: 'סוכן תכנון 48 שעות',
    subtitle: 'מרשימה מבולגנת לתוכנית פעולה',
    greeting: 'כתבו את רשימת המשימות שלכם, והסוכן יעזור להפוך אותה לתוכנית ל-48 השעות הקרובות.',
    icon: Bot,
    color: '#0F766E',
    menu: [
      { id: 'chat', label: 'דבר עם הלקוח', icon: MessagesSquare },
      { id: 'city', label: 'שליחת קוד ועיר', icon: MapPin },
    ],
  },
  {
    id: 'events',
    label: "צ'אט אירועים",
    title: 'סוכן הפקת אירועים',
    subtitle: 'מהרעיון ועד תוצרי ההפקה',
    greeting: 'ספרו לי מה מטרת האירוע, מי המוזמנים ואיזה אופי אירוע אתם רוצים.',
    icon: PartyPopper,
    color: '#7C3AED',
    menu: [
      { id: 'chat', label: 'מלל חופשי', icon: MessagesSquare },
      { id: 'recommend', label: 'קבלת המלצות', icon: Lightbulb },
    ],
  },
];

/** Viewport width (px) from which open chats are shown side by side; below it, one at a time with tabs. */
const SIDE_BY_SIDE = '(min-width: 1024px)';
const PANEL_WIDTH = 400;
const GAP = 20;

const storageKey = (id: string) => `agent-chat-history:${id}`;

function loadHistory(id: string): Message[] {
  try {
    return JSON.parse(sessionStorage.getItem(storageKey(id)) ?? '[]') as Message[];
  } catch {
    return [];
  }
}

/**
 * Floating buttons + one panel per agent. Several chats can be open and talking at once:
 * every panel stays mounted (so a reply keeps streaming while hidden) and is only shown/hidden.
 */
export function AgentChatDock() {
  /** Open chats, in the order they were opened (= left-to-right slot on wide screens). */
  const [openIds, setOpenIds] = useState<AgentId[]>([]);
  /** The chat in front (shown on narrow screens; target of Escape). */
  const [activeId, setActiveId] = useState<AgentId | null>(null);
  const [unread, setUnread] = useState<Set<AgentId>>(new Set());
  const stateRef = useRef({ openIds, activeId });
  stateRef.current = { openIds, activeId };

  const activate = useCallback((id: AgentId) => {
    setOpenIds((ids) => (ids.includes(id) ? ids : [...ids, id]));
    setActiveId(id);
    setUnread((u) => {
      if (!u.has(id)) return u;
      const next = new Set(u);
      next.delete(id);
      return next;
    });
  }, []);

  const close = useCallback((id: AgentId) => {
    const rest = stateRef.current.openIds.filter((x) => x !== id);
    setOpenIds(rest);
    setActiveId((a) => (a === id ? (rest.at(-1) ?? null) : a));
  }, []);

  /** Called when an agent finishes replying; flag it if the user can't currently see that chat. */
  const onReplyDone = useCallback((id: AgentId) => {
    const { openIds: ids, activeId: active } = stateRef.current;
    const visible = ids.includes(id) && (active === id || window.matchMedia(SIDE_BY_SIDE).matches);
    if (!visible) setUnread((u) => new Set(u).add(id));
  }, []);

  useEffect(() => {
    if (!activeId) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && close(activeId);
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [activeId, close]);

  const closedAgents = AGENTS.filter((a) => !openIds.includes(a.id));

  return (
    <>
      {closedAgents.length > 0 && (
        <div
          className="fixed bottom-5 z-30 flex flex-col items-start gap-3"
          // On wide screens the buttons sit to the right of the open panels; on narrow screens open panels cover them anyway.
          style={{ left: GAP + openIds.length * (PANEL_WIDTH + GAP) }}
        >
          {closedAgents.map((a) => (
            <button
              key={a.id}
              type="button"
              onClick={() => activate(a.id)}
              aria-label={`פתיחת ${a.title}`}
              style={{ background: a.color }}
              className="relative flex h-14 items-center gap-2 rounded-full px-5 font-bold text-white shadow-[0_12px_28px_-10px_rgba(15,23,42,0.6)] hover:brightness-110"
            >
              <a.icon size={20} /> {a.label}
              {unread.has(a.id) && <UnreadDot className="absolute -top-1 -right-1" />}
            </button>
          ))}
        </div>
      )}

      {AGENTS.map((a) => {
        const slot = openIds.indexOf(a.id);
        return (
          <AgentChatPanel
            key={a.id}
            agent={a}
            open={slot !== -1}
            active={activeId === a.id}
            slot={Math.max(slot, 0)}
            unread={unread}
            onActivate={activate}
            onClose={close}
            onReplyDone={onReplyDone}
          />
        );
      })}
    </>
  );
}

function UnreadDot({ className = '' }: { className?: string }) {
  return <span aria-label="הודעה חדשה" className={`size-3 rounded-full bg-red-500 ring-2 ring-white ${className}`} />;
}

interface PanelProps {
  agent: AgentConfig;
  open: boolean;
  active: boolean;
  slot: number;
  unread: Set<AgentId>;
  onActivate: (id: AgentId) => void;
  onClose: (id: AgentId) => void;
  onReplyDone: (id: AgentId) => void;
}

function AgentChatPanel({ agent, open, active, slot, unread, onActivate, onClose, onReplyDone }: PanelProps) {
  const [messages, setMessages] = useState<Message[]>(() => loadHistory(agent.id));
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<Mode>('chat');
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    sessionStorage.setItem(storageKey(agent.id), JSON.stringify(messages.filter((m) => m.text)));
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight });
  }, [agent.id, messages]);

  useEffect(() => {
    if (open && active) {
      inputRef.current?.focus();
      listRef.current?.scrollTo({ top: listRef.current.scrollHeight });
    }
  }, [open, active, mode]);

  const send = async () => {
    const text = input.trim();
    if (!text || busy) return;
    const history: Message[] = [...messages, { role: 'user', text }];
    setMessages([...history, { role: 'model', text: '' }]);
    setInput('');
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agent: agent.id, messages: history }),
      });
      if (!res.ok || !res.body) {
        throw new Error((await res.text()) || 'שגיאה בתקשורת עם הסוכן');
      }
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let reply = '';
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        reply += decoder.decode(value, { stream: true });
        setMessages([...history, { role: 'model', text: reply }]);
      }
      if (!reply.trim()) throw new Error('הסוכן לא החזיר תשובה');
      onReplyDone(agent.id);
    } catch (e) {
      // Restore the draft so the user can just press send again.
      setMessages(messages);
      setInput(text);
      setError(e instanceof Error ? e.message : 'שגיאה');
    } finally {
      setBusy(false);
    }
  };

  const clear = () => {
    setMessages([]);
    setError(null);
  };

  return (
    <section
      role="dialog"
      aria-label={agent.title}
      aria-hidden={!open}
      onPointerDown={() => !active && onActivate(agent.id)}
      style={{ '--chat-left': `${GAP + slot * (PANEL_WIDTH + GAP)}px`, zIndex: active ? 41 : 40 } as CSSProperties}
      className={`animate-sheet fixed inset-x-0 bottom-0 h-[85dvh] flex-col overflow-hidden rounded-t-[28px] bg-white shadow-[0_-12px_40px_-12px_rgba(15,23,42,0.35)] lg:inset-x-auto lg:bottom-5 lg:left-(--chat-left) lg:h-[600px] lg:max-h-[calc(100dvh-40px)] lg:w-[400px] lg:rounded-[28px] ${
        !open ? 'hidden' : active ? 'flex' : 'hidden lg:flex'
      }`}
    >
      {/* Narrow screens: tabs to switch between chats (all keep running in the background). */}
      <nav className="flex gap-1 bg-slate-100 p-1.5 lg:hidden" aria-label="מעבר בין צ'אטים">
        {AGENTS.map((a) => (
          <button
            key={a.id}
            type="button"
            onClick={() => onActivate(a.id)}
            aria-current={a.id === agent.id}
            className={`relative flex flex-1 items-center justify-center gap-1.5 rounded-xl py-2 text-sm font-bold ${
              a.id === agent.id ? 'bg-white shadow-sm' : 'text-slate-500'
            }`}
            style={a.id === agent.id ? { color: a.color } : undefined}
          >
            <a.icon size={16} /> {a.label}
            {unread.has(a.id) && <UnreadDot className="absolute top-1 left-2" />}
          </button>
        ))}
      </nav>

      <header className="flex items-center justify-between gap-2 px-4 py-3 text-white" style={{ background: agent.color }}>
        <div className="flex items-center gap-2.5">
          <span className="grid size-9 place-items-center rounded-full bg-white/15">
            {busy ? <Loader2 size={20} className="animate-spin" /> : <agent.icon size={20} />}
          </span>
          <div>
            <h2 className="leading-tight font-bold">{agent.title}</h2>
            <p className="text-xs text-white/75">{busy ? 'כותב/ת תשובה…' : agent.subtitle}</p>
          </div>
        </div>
        <div className="flex gap-1">
          <button
            type="button"
            onClick={clear}
            disabled={busy || messages.length === 0 || mode !== 'chat'}
            aria-label="ניקוי השיחה"
            className="grid size-9 place-items-center rounded-full hover:bg-white/15 disabled:opacity-40"
          >
            <Trash2 size={16} />
          </button>
          <button type="button" onClick={() => onClose(agent.id)} aria-label="סגירה" className="grid size-9 place-items-center rounded-full hover:bg-white/15">
            <X size={18} />
          </button>
        </div>
      </header>

      {agent.menu && (
        <div role="tablist" aria-label="תפריט פעולות" className="flex gap-1 border-b border-slate-200 bg-white p-1.5">
          {agent.menu.map((item) => (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={mode === item.id}
              onClick={() => setMode(item.id)}
              style={mode === item.id ? { background: agent.color } : undefined}
              className={`flex flex-1 items-center justify-center gap-1.5 rounded-xl py-2 text-sm font-bold ${
                mode === item.id ? 'text-white' : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <item.icon size={16} /> {item.label}
            </button>
          ))}
        </div>
      )}

      {mode === 'city' ? (
        <CityForm color={agent.color} />
      ) : mode === 'recommend' ? (
        <RecommendForm color={agent.color} />
      ) : (
        <>
          <div ref={listRef} className="flex flex-1 flex-col gap-3 overflow-y-auto bg-canvas px-4 py-4" aria-live="polite">
            {messages.length === 0 && <p className="m-auto max-w-[260px] text-center text-sm text-slate-500">{agent.greeting}</p>}
            {messages.map((m, i) => (
              <div
                key={i}
                style={m.role === 'user' ? { background: agent.color } : undefined}
                className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-[15px] leading-relaxed whitespace-pre-wrap ${
                  m.role === 'user' ? 'self-start rounded-br-md text-white' : 'self-end rounded-bl-md bg-white text-ink shadow-sm ring-1 ring-slate-200'
                }`}
              >
                {m.text || <Loader2 size={16} className="animate-spin text-slate-400" />}
              </div>
            ))}
            {error && <p className="self-center rounded-xl bg-red-50 px-3 py-2 text-center text-sm text-red-700">{error}</p>}
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              void send();
            }}
            className="flex items-end gap-2 border-t border-slate-200 bg-white p-3"
          >
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  void send();
                }
              }}
              rows={1}
              placeholder="כתבו הודעה…"
              className="max-h-32 min-h-11 flex-1 resize-none rounded-2xl bg-slate-100 px-3.5 py-2.5 text-[15px] outline-none focus:ring-2 focus:ring-slate-300"
            />
            <button
              type="submit"
              disabled={busy || !input.trim()}
              aria-label="שליחה"
              style={{ background: agent.color }}
              className="grid size-11 shrink-0 place-items-center rounded-full text-white hover:brightness-110 disabled:opacity-40"
            >
              {busy ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} className="-scale-x-100" />}
            </button>
          </form>
        </>
      )}
    </section>
  );
}

interface CityResult {
  code: string;
  city: string;
  cityAbbreviation: string;
}

/** Collects a code + city, lets the server abbreviate the city and forward all three to the Make webhook. */
function CityForm({ color }: { color: string }) {
  const [code, setCode] = useState('');
  const [city, setCity] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState<CityResult[]>([]);
  const codeRef = useRef<HTMLInputElement>(null);

  useEffect(() => codeRef.current?.focus(), []);

  const submit = async () => {
    if (busy || !code.trim() || !city.trim()) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/city', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: code.trim(), city: city.trim() }),
      });
      const data = (await res.json().catch(() => ({}))) as Partial<CityResult> & { error?: string };
      if (!res.ok) throw new Error(data.error || 'השליחה נכשלה');
      setSent((s) => [data as CityResult, ...s]);
      setCode('');
      setCity('');
      codeRef.current?.focus();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'השליחה נכשלה');
    } finally {
      setBusy(false);
    }
  };

  const inputClass = 'h-11 w-full rounded-2xl bg-slate-100 px-3.5 text-[15px] outline-none focus:ring-2 focus:ring-slate-300';

  return (
    <div className="flex flex-1 flex-col overflow-y-auto bg-canvas">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void submit();
        }}
        className="flex flex-col gap-3 border-b border-slate-200 bg-white p-4"
      >
        <p className="text-sm text-slate-500">הזינו קוד ועיר. המערכת תיצור קיצור לשם העיר ותשלח את שלושת הנתונים ל-Make.</p>
        <label className="flex flex-col gap-1 text-sm font-semibold">
          קוד
          <input ref={codeRef} value={code} onChange={(e) => setCode(e.target.value)} maxLength={100} className={inputClass} />
        </label>
        <label className="flex flex-col gap-1 text-sm font-semibold">
          עיר
          <input value={city} onChange={(e) => setCity(e.target.value)} maxLength={100} placeholder="למשל: פתח תקווה" className={inputClass} />
        </label>
        {error && <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
        <button
          type="submit"
          disabled={busy || !code.trim() || !city.trim()}
          style={{ background: color }}
          className="flex h-11 items-center justify-center gap-2 rounded-2xl font-bold text-white hover:brightness-110 disabled:opacity-40"
        >
          {busy ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} className="-scale-x-100" />}
          {busy ? 'יוצר קיצור ושולח…' : 'שליחה ל-Make'}
        </button>
      </form>

      {sent.length > 0 && (
        <ul className="flex flex-col gap-2 p-4" aria-live="polite">
          {sent.map((r, i) => (
            <li key={i} className="flex items-center gap-3 rounded-2xl bg-white px-3.5 py-2.5 text-sm shadow-sm ring-1 ring-slate-200">
              <CheckCircle2 size={18} className="shrink-0 text-green-600" />
              <div className="min-w-0">
                <p className="font-bold">
                  {r.city} ← <span style={{ color }}>{r.cityAbbreviation}</span>
                </p>
                <p className="text-slate-500">קוד: {r.code} · נשלח ל-Make</p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

interface Recommendation {
  request: string;
  answer: string;
}

/** Sends a free-text description to the Make recommendations scenario and shows what it returns. */
function RecommendForm({ color }: { color: string }) {
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<Recommendation[]>([]);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => inputRef.current?.focus(), []);

  const submit = async () => {
    const request = text.trim();
    if (busy || !request) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/recommend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: request }),
      });
      const data = (await res.json().catch(() => ({}))) as { answer?: string; error?: string };
      if (!res.ok || !data.answer) throw new Error(data.error || 'לא התקבלו המלצות');
      setResults((r) => [{ request, answer: data.answer! }, ...r]);
      setText('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'לא התקבלו המלצות');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-1 flex-col overflow-y-auto bg-canvas">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void submit();
        }}
        className="flex flex-col gap-3 border-b border-slate-200 bg-white p-4"
      >
        <label className="flex flex-col gap-1 text-sm font-semibold">
          תארו את האירוע ומה אתם צריכים
          <textarea
            ref={inputRef}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                e.preventDefault();
                void submit();
              }
            }}
            rows={4}
            maxLength={4000}
            placeholder="למשל: ערב התרמה לישיבה, כ-200 גברים, באזור ירושלים, תקציב בינוני"
            className="resize-none rounded-2xl bg-slate-100 px-3.5 py-2.5 text-[15px] font-normal outline-none focus:ring-2 focus:ring-slate-300"
          />
        </label>
        {error && <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
        <button
          type="submit"
          disabled={busy || !text.trim()}
          style={{ background: color }}
          className="flex h-11 items-center justify-center gap-2 rounded-2xl font-bold text-white hover:brightness-110 disabled:opacity-40"
        >
          {busy ? <Loader2 size={18} className="animate-spin" /> : <Lightbulb size={18} />}
          {busy ? 'מקבל המלצות…' : 'קבלת המלצות'}
        </button>
      </form>

      {results.length > 0 && (
        <ul className="flex flex-col gap-3 p-4" aria-live="polite">
          {results.map((r, i) => (
            <li key={i} className="flex flex-col gap-2 rounded-2xl bg-white px-3.5 py-3 text-[15px] shadow-sm ring-1 ring-slate-200">
              <p className="text-sm text-slate-500">{r.request}</p>
              <p className="leading-relaxed whitespace-pre-wrap">{r.answer}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
