import { useEffect, useRef, useState, type CSSProperties } from 'react';
import type { Employee } from '../types';
import { interpret, assess, execute, buildGreeting, type AgentAction, type AgentResult } from '../services/chatAgent';

// ─────────────────────────────────────────────────────────────────────────
// BuddyDesk Assistant dock.
// Design: follows the dashboard's own token system (--surface/--border/--text,
// SF-style type, restrained single blue accent) instead of the generic
// AI-gradient look. Daily-use ergonomics: Ctrl/Cmd+K to toggle, Esc to close,
// autofocused input, capped message list, cleaned-up timers (no leaks).
// ─────────────────────────────────────────────────────────────────────────

interface Props {
  employee: Employee;
  employees: Employee[];
}

interface ChatMsg {
  id: number;
  role: 'user' | 'bot';
  text: string;
  ok?: boolean;
  undo?: () => Promise<void>;
}

interface HistoryItem { label: string; at: number }

const MAX_MSGS = 60;          // cap so a full workday never bloats the DOM
const UNDO_WINDOW = 6000;     // ms the Undo button stays available
const ACCENT = '#2563EB';     // the dashboard's one accent — used sparingly

let _mid = 0;
const nextId = () => ++_mid;

export default function ChatDock({ employee, employees }: Props) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [input, setInput] = useState('');
  const [msgs, setMsgs] = useState<ChatMsg[]>([]);
  const [chips, setChips] = useState<string[]>([]);
  const [greeted, setGreeted] = useState(false);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [pending, setPending] = useState<{ action: AgentAction; text: string; count: number } | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const timersRef = useRef<number[]>([]);   // undo-expiry timers → cleared on unmount
  const ctx = { me: employee, employees };

  // Global keyboard: Ctrl/Cmd+K toggles, Esc closes. Power-user path for daily use.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); setOpen(o => !o); }
      else if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // Clear all pending timers on unmount (leak guard)
  useEffect(() => () => { timersRef.current.forEach(t => window.clearTimeout(t)); }, []);

  // Autofocus the composer whenever the dock opens
  useEffect(() => { if (open) setTimeout(() => inputRef.current?.focus(), 60); }, [open]);

  // Proactive, personalized greeting on first open
  useEffect(() => {
    if (open && !greeted) {
      setGreeted(true);
      setMsgs([{ id: nextId(), role: 'bot', ok: true, text: `Hi ${employee.name.split(' ')[0]} 👋` }]);
      buildGreeting(ctx).then(({ text, chips }) => {
        setMsgs([{ id: nextId(), role: 'bot', ok: true, text }]);
        setChips(chips);
      }).catch(() => {});
    }
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [msgs, busy, pending]);

  // 3-2-1 countdown → auto-execute for confirmed risky actions
  useEffect(() => {
    if (!pending) return;
    if (pending.count <= 0) { void commit(pending.action); setPending(null); return; }
    const t = window.setTimeout(() => setPending(p => (p ? { ...p, count: p.count - 1 } : p)), 1000);
    return () => window.clearTimeout(t);
  }, [pending]); // eslint-disable-line react-hooks/exhaustive-deps

  const pushBot = (r: AgentResult) => {
    const id = nextId();
    setMsgs(m => [...m.slice(-(MAX_MSGS - 1)), { id, role: 'bot', text: r.reply, ok: r.ok, undo: r.undo }]);
    if (r.ok && r.historyLabel) setHistory(h => [{ label: r.historyLabel!, at: Date.now() }, ...h].slice(0, 20));
    if (r.undo) {
      const t = window.setTimeout(() => setMsgs(m => m.map(x => x.id === id ? { ...x, undo: undefined } : x)), UNDO_WINDOW);
      timersRef.current.push(t);
    }
  };

  const commit = async (action: AgentAction) => {
    setBusy(true);
    try { pushBot(await execute(action, ctx)); }
    catch (e: any) { pushBot({ ok: false, reply: `Something went wrong: ${e?.message || 'unknown'}. Nothing was changed.` }); }
    setBusy(false);
    inputRef.current?.focus();
  };

  const send = async (raw?: string) => {
    const text = (raw ?? input).trim();
    if (!text || busy || pending) return;
    setInput('');
    setChips([]);
    setMsgs(m => [...m.slice(-(MAX_MSGS - 1)), { id: nextId(), role: 'user', text }]);
    setBusy(true);
    try {
      const action = await interpret(text, ctx);
      const gate = assess(action, ctx);
      setBusy(false);
      if (!gate.permitted) { pushBot({ ok: false, reply: gate.denyReason ?? 'You cannot do that.' }); return; }
      if (gate.risky) { setPending({ action, text: gate.confirmText ?? 'Confirm this action?', count: 3 }); return; }
      await commit(action);
    } catch (e: any) {
      setBusy(false);
      pushBot({ ok: false, reply: `Something went wrong: ${e?.message || 'unknown'}.` });
    }
  };

  const runUndo = async (id: number, fn: () => Promise<void>) => {
    setMsgs(m => m.map(x => x.id === id ? { ...x, undo: undefined } : x));
    setBusy(true);
    try { await fn(); setMsgs(m => [...m, { id: nextId(), role: 'bot', ok: true, text: '↩️ Undone.' }]); }
    catch (e: any) { pushBot({ ok: false, reply: `Couldn't undo: ${e?.message || 'unknown'}.` }); }
    setBusy(false);
  };

  return (
    <>
      {/* Floating launcher — quiet, on-brand, hints the shortcut */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          aria-label="Open assistant (Ctrl+K)"
          title="Ask BuddyDesk — Ctrl+K"
          className="bd-launcher"
          style={{
            position: 'fixed', right: 24, bottom: 24, zIndex: 60,
            height: 44, padding: '0 16px 0 12px', borderRadius: 999, cursor: 'pointer',
            background: 'var(--text, #111)', color: 'var(--surface, #fff)',
            border: '1px solid transparent',
            display: 'flex', alignItems: 'center', gap: 8,
            fontSize: 13.5, fontWeight: 600,
            boxShadow: 'var(--card-shadow-hover, 0 4px 16px rgba(0,0,0,.14))',
          }}
        >
          <span style={{ fontSize: 15 }}>✦</span> Ask
          <kbd style={{
            fontSize: 10.5, fontWeight: 500, opacity: .65, padding: '2px 5px',
            borderRadius: 4, border: '1px solid currentColor', fontFamily: 'inherit',
          }}>⌘K</kbd>
        </button>
      )}

      {open && (
        <div
          className="bd-panel"
          style={{
            position: 'fixed', right: 24, bottom: 24, zIndex: 60,
            width: 396, maxWidth: 'calc(100vw - 32px)', height: 600, maxHeight: 'calc(100vh - 48px)',
            display: 'flex', flexDirection: 'column',
            background: 'var(--surface, #fff)', color: 'var(--text, #111)',
            borderRadius: 14, overflow: 'hidden',
            boxShadow: '0 24px 64px rgba(0,0,0,.22)', border: '1px solid var(--border, #E9E9E7)',
          }}
        >
          {/* Header — surface + hairline, not a gradient banner */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px',
            background: 'var(--surface, #fff)', borderBottom: '1px solid var(--border, #E9E9E7)',
          }}>
            <span style={{
              width: 30, height: 30, borderRadius: 8, background: ACCENT, color: '#fff',
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15,
            }}>✦</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 650, fontSize: 14, letterSpacing: '-0.01em' }}>Assistant</div>
              <div style={{ fontSize: 11, color: 'var(--text-muted, #888)', display: 'flex', alignItems: 'center', gap: 5 }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#22C55E', display: 'inline-block' }} />
                Live on your dashboard
              </div>
            </div>
            <button onClick={() => setShowHistory(s => !s)} aria-label="Recent actions" title="Recent actions"
              className="bd-iconbtn" style={iconBtn(showHistory)}>🕑</button>
            <button onClick={() => setOpen(false)} aria-label="Close (Esc)" title="Close — Esc"
              className="bd-iconbtn" style={iconBtn(false)}>×</button>
          </div>

          {/* History drawer */}
          {showHistory && (
            <div style={{ maxHeight: 168, overflowY: 'auto', padding: '10px 14px', borderBottom: '1px solid var(--border,#E9E9E7)', background: 'var(--surface2,#F7F7F6)' }}>
              <div style={{ fontSize: 10.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: .6, color: 'var(--text-faint,#BBB)', marginBottom: 6 }}>Recent actions</div>
              {history.length === 0
                ? <div style={{ fontSize: 12.5, color: 'var(--text-muted,#888)' }}>Nothing yet. Actions I take will show here.</div>
                : history.map((h, i) => (
                  <div key={i} style={{ fontSize: 12.5, padding: '4px 0', display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{h.label}</span>
                    <span style={{ color: 'var(--text-faint,#BBB)', flexShrink: 0 }}>{timeAgo(h.at)}</span>
                  </div>
                ))}
            </div>
          )}

          {/* Messages */}
          <div ref={scrollRef} style={{ flex: 1, overflowY: 'auto', padding: '16px 14px', display: 'flex', flexDirection: 'column', gap: 8, background: 'var(--bg, #F7F7F6)' }}>
            {msgs.map(m => (
              <div key={m.id} style={{ alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start', maxWidth: '86%' }} className="bd-msg">
                <div style={{
                  padding: '8px 12px', borderRadius: 12, fontSize: 13.5, lineHeight: 1.5, whiteSpace: 'pre-wrap',
                  background: m.role === 'user' ? ACCENT : m.ok === false ? '#FEF2F2' : 'var(--surface,#fff)',
                  color: m.role === 'user' ? '#fff' : m.ok === false ? '#B91C1C' : 'var(--text,#111)',
                  border: m.role === 'user' ? 'none' : `1px solid ${m.ok === false ? '#FECACA' : 'var(--border,#E9E9E7)'}`,
                  borderBottomRightRadius: m.role === 'user' ? 4 : 12,
                  borderBottomLeftRadius: m.role === 'user' ? 12 : 4,
                  boxShadow: m.role === 'user' ? 'none' : 'var(--card-shadow, 0 1px 3px rgba(0,0,0,.06))',
                }}>{m.text}</div>
                {m.undo && (
                  <button onClick={() => runUndo(m.id, m.undo!)}
                    style={{ marginTop: 5, fontSize: 12, fontWeight: 600, padding: '4px 12px', borderRadius: 999, border: '1px solid var(--border,#E9E9E7)', background: 'var(--surface,#fff)', color: ACCENT, cursor: 'pointer' }}>
                    ↩ Undo
                  </button>
                )}
              </div>
            ))}

            {/* Risky-action confirm with 3-2-1 countdown */}
            {pending && (
              <div style={{ alignSelf: 'flex-start', maxWidth: '92%', background: 'var(--surface,#fff)', border: '1px solid #FCD34D', borderRadius: 12, padding: 12, boxShadow: 'var(--card-shadow)' }}>
                <div style={{ fontSize: 13.5, lineHeight: 1.5, whiteSpace: 'pre-wrap', marginBottom: 10 }}>{pending.text}</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <button onClick={() => { const a = pending.action; setPending(null); void commit(a); }}
                    style={{ flex: 1, height: 34, borderRadius: 8, border: 'none', background: ACCENT, color: '#fff', fontWeight: 650, fontSize: 13, cursor: 'pointer' }}>
                    Confirm ({pending.count})
                  </button>
                  <button onClick={() => { setPending(null); setMsgs(m => [...m, { id: nextId(), role: 'bot', ok: true, text: 'Okay, cancelled — nothing changed.' }]); }}
                    style={{ flex: 1, height: 34, borderRadius: 8, border: '1px solid var(--border,#E9E9E7)', background: 'var(--surface2,#F7F7F6)', color: 'var(--text,#111)', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>
                    Cancel
                  </button>
                </div>
                <div style={{ fontSize: 10.5, color: 'var(--text-faint,#BBB)', marginTop: 7, textAlign: 'center' }}>Auto-confirms in {pending.count}s · Cancel to stop</div>
              </div>
            )}

            {busy && (
              <div style={{ alignSelf: 'flex-start', padding: '10px 13px', borderRadius: 12, background: 'var(--surface,#fff)', border: '1px solid var(--border,#E9E9E7)' }}>
                <span style={{ display: 'inline-flex', gap: 4 }}>
                  {[0, 1, 2].map(i => (
                    <span key={i} className="bd-dot" style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--text-muted,#888)', display: 'inline-block', animationDelay: `${i * 0.15}s` }} />
                  ))}
                </span>
              </div>
            )}

            {/* Personalized quick-action chips */}
            {chips.length > 0 && !busy && !pending && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 2 }}>
                {chips.map(s => (
                  <button key={s} onClick={() => send(s)}
                    className="bd-chip"
                    style={{ fontSize: 12, padding: '6px 11px', borderRadius: 999, border: '1px solid var(--border,#E9E9E7)', background: 'var(--surface,#fff)', color: 'var(--text,#111)', cursor: 'pointer' }}>
                    {s}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Composer */}
          <div style={{ display: 'flex', gap: 8, padding: 12, borderTop: '1px solid var(--border,#E9E9E7)', background: 'var(--surface,#fff)' }}>
            <input
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') send(); }}
              placeholder="Add a task, send a file, ask anything…"
              disabled={busy}
              style={{
                flex: 1, height: 40, borderRadius: 10, border: '1.5px solid var(--border,#E9E9E7)',
                padding: '0 12px', fontSize: 13.5, outline: 'none',
                background: 'var(--surface2,#F7F7F6)', color: 'var(--text,#111)', fontFamily: 'inherit',
              }}
            />
            <button onClick={() => send()} disabled={busy || !input.trim()}
              style={{
                height: 40, padding: '0 16px', borderRadius: 10, border: 'none',
                cursor: busy || !input.trim() ? 'default' : 'pointer',
                background: busy || !input.trim() ? 'var(--border,#E9E9E7)' : ACCENT,
                color: busy || !input.trim() ? 'var(--text-muted,#888)' : '#fff',
                fontWeight: 650, fontSize: 13.5, fontFamily: 'inherit',
              }}>Send</button>
          </div>
        </div>
      )}

      <style>{`
        .bd-launcher { transition: transform 150ms ease, box-shadow 150ms ease; }
        .bd-launcher:hover { transform: translateY(-1px); }
        .bd-panel { animation: bd-rise .18s ease-out; }
        .bd-msg { animation: bd-in .16s ease-out; }
        .bd-chip { transition: border-color 120ms, background 120ms; }
        .bd-chip:hover { border-color: var(--border-hover, #C8C8C6); background: var(--surface2, #F7F7F6); }
        .bd-dot { animation: bd-bounce 1s infinite ease-in-out; }
        @keyframes bd-rise { from { opacity: 0; transform: translateY(10px) scale(.99); } to { opacity: 1; transform: none; } }
        @keyframes bd-in { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: none; } }
        @keyframes bd-bounce { 0%,80%,100% { transform: scale(.6); opacity: .4; } 40% { transform: scale(1); opacity: 1; } }
        @media (prefers-reduced-motion: reduce) {
          .bd-panel, .bd-msg, .bd-dot { animation: none !important; }
          .bd-launcher { transition: none; }
        }
      `}</style>
    </>
  );
}

function iconBtn(active: boolean): CSSProperties {
  return {
    background: active ? 'var(--surface2,#F7F7F6)' : 'transparent',
    border: '1px solid ' + (active ? 'var(--border,#E9E9E7)' : 'transparent'),
    color: 'var(--text-muted,#888)', width: 28, height: 28, borderRadius: 7,
    cursor: 'pointer', fontSize: 15, display: 'flex', alignItems: 'center', justifyContent: 'center',
  };
}

function timeAgo(ts: number): string {
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 60) return 'just now';
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  return `${Math.floor(s / 3600)}h ago`;
}
