import { useEffect, useRef, useState } from 'react';
import type { Employee } from '../types';
import { interpret, assess, execute, buildGreeting, type AgentAction, type AgentResult } from '../services/chatAgent';

interface Props {
  employee: Employee;
  employees: Employee[];
}

interface ChatMsg {
  id: number;
  role: 'user' | 'bot';
  text: string;
  ok?: boolean;
  undo?: () => Promise<void>;   // set for a few seconds after a reversible action
}

interface HistoryItem { label: string; at: number }

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
  // pending risky action awaiting a 3-2-1 confirm
  const [pending, setPending] = useState<{ action: AgentAction; text: string; count: number } | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const ctx = { me: employee, employees };

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
    const t = setTimeout(() => setPending(p => (p ? { ...p, count: p.count - 1 } : p)), 1000);
    return () => clearTimeout(t);
  }, [pending]); // eslint-disable-line react-hooks/exhaustive-deps

  const pushBot = (r: AgentResult) => {
    const id = nextId();
    setMsgs(m => [...m, { id, role: 'bot', text: r.reply, ok: r.ok, undo: r.undo }]);
    if (r.ok && r.historyLabel) setHistory(h => [{ label: r.historyLabel!, at: Date.now() }, ...h].slice(0, 20));
    // Undo offer expires after 6s so the chat doesn't accumulate stale buttons
    if (r.undo) setTimeout(() => setMsgs(m => m.map(x => x.id === id ? { ...x, undo: undefined } : x)), 6000);
  };

  const commit = async (action: AgentAction) => {
    setBusy(true);
    try { pushBot(await execute(action, ctx)); }
    catch (e: any) { pushBot({ ok: false, reply: `Something went wrong: ${e?.message || 'unknown'}. Nothing was changed.` }); }
    setBusy(false);
  };

  const send = async (raw?: string) => {
    const text = (raw ?? input).trim();
    if (!text || busy || pending) return;
    setInput('');
    setChips([]);
    setMsgs(m => [...m, { id: nextId(), role: 'user', text }]);
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

  const GRAD = 'linear-gradient(135deg,#2563EB,#7C3AED)';

  return (
    <>
      {/* Floating launcher */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          aria-label="Open assistant"
          style={{
            position: 'fixed', right: 24, bottom: 24, zIndex: 60,
            width: 60, height: 60, borderRadius: '50%', border: 'none', cursor: 'pointer',
            background: GRAD, color: '#fff', fontSize: 26,
            boxShadow: '0 10px 30px rgba(37,99,235,.45)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            animation: 'bd-pulse 2.6s ease-in-out infinite',
          }}
        >✨</button>
      )}

      {open && (
        <div
          style={{
            position: 'fixed', right: 24, bottom: 24, zIndex: 60,
            width: 384, maxWidth: 'calc(100vw - 32px)', height: 588, maxHeight: 'calc(100vh - 48px)',
            display: 'flex', flexDirection: 'column',
            background: 'var(--card, #fff)', color: 'var(--text, #1a1a1a)',
            borderRadius: 18, overflow: 'hidden',
            boxShadow: '0 24px 70px rgba(0,0,0,.32)', border: '1px solid var(--border, #eee)',
            animation: 'bd-rise .22s ease-out',
          }}
        >
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 11, padding: '13px 16px', background: GRAD, color: '#fff' }}>
            <span style={{ fontSize: 22 }}>✨</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 700, fontSize: 15 }}>BuddyDesk Assistant</div>
              <div style={{ fontSize: 11, opacity: .85, display: 'flex', alignItems: 'center', gap: 5 }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#4ADE80', display: 'inline-block' }} />
                Acts on your dashboard, live
              </div>
            </div>
            <button onClick={() => setShowHistory(s => !s)} aria-label="History" title="Recent actions"
              style={{ background: 'rgba(255,255,255,.18)', border: 'none', color: '#fff', width: 30, height: 30, borderRadius: 8, cursor: 'pointer', fontSize: 15 }}>🕑</button>
            <button onClick={() => setOpen(false)} aria-label="Close"
              style={{ background: 'rgba(255,255,255,.18)', border: 'none', color: '#fff', width: 30, height: 30, borderRadius: 8, cursor: 'pointer', fontSize: 17 }}>×</button>
          </div>

          {/* History drawer */}
          {showHistory && (
            <div style={{ maxHeight: 168, overflowY: 'auto', padding: '10px 14px', borderBottom: '1px solid var(--border,#eee)', background: 'var(--bg,#fafafa)' }}>
              <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: .5, opacity: .5, marginBottom: 6 }}>Recent actions</div>
              {history.length === 0
                ? <div style={{ fontSize: 12.5, opacity: .55 }}>Nothing yet. Actions the assistant takes will show here.</div>
                : history.map((h, i) => (
                  <div key={i} style={{ fontSize: 12.5, padding: '4px 0', display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{h.label}</span>
                    <span style={{ opacity: .45, flexShrink: 0 }}>{timeAgo(h.at)}</span>
                  </div>
                ))}
            </div>
          )}

          {/* Messages */}
          <div ref={scrollRef} style={{ flex: 1, overflowY: 'auto', padding: 16, display: 'flex', flexDirection: 'column', gap: 10, background: 'var(--bg, #f7f7f6)' }}>
            {msgs.map(m => (
              <div key={m.id} style={{ alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start', maxWidth: '86%' }}>
                <div style={{
                  padding: '9px 13px', borderRadius: 15, fontSize: 13.5, lineHeight: 1.5, whiteSpace: 'pre-wrap',
                  background: m.role === 'user' ? '#2563EB' : m.ok === false ? '#FEF2F2' : 'var(--card,#fff)',
                  color: m.role === 'user' ? '#fff' : m.ok === false ? '#B91C1C' : 'var(--text,#1a1a1a)',
                  border: m.role === 'user' ? 'none' : `1px solid ${m.ok === false ? '#FECACA' : 'var(--border,#eee)'}`,
                  borderBottomRightRadius: m.role === 'user' ? 4 : 15,
                  borderBottomLeftRadius: m.role === 'user' ? 15 : 4,
                }}>{m.text}</div>
                {m.undo && (
                  <button onClick={() => runUndo(m.id, m.undo!)}
                    style={{ marginTop: 5, fontSize: 12, fontWeight: 600, padding: '4px 12px', borderRadius: 999, border: '1px solid var(--border,#ddd)', background: 'var(--card,#fff)', color: '#2563EB', cursor: 'pointer' }}>
                    ↩ Undo
                  </button>
                )}
              </div>
            ))}

            {/* Risky-action confirm with 3-2-1 countdown */}
            {pending && (
              <div style={{ alignSelf: 'flex-start', maxWidth: '90%', background: 'var(--card,#fff)', border: '1px solid #FDE68A', borderRadius: 15, padding: 13 }}>
                <div style={{ fontSize: 13.5, lineHeight: 1.5, whiteSpace: 'pre-wrap', marginBottom: 10 }}>{pending.text}</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <button onClick={() => { const a = pending.action; setPending(null); void commit(a); }}
                    style={{ flex: 1, height: 34, borderRadius: 9, border: 'none', background: GRAD, color: '#fff', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>
                    Confirm ({pending.count})
                  </button>
                  <button onClick={() => { setPending(null); setMsgs(m => [...m, { id: nextId(), role: 'bot', ok: true, text: 'Okay, cancelled — nothing changed.' }]); }}
                    style={{ flex: 1, height: 34, borderRadius: 9, border: '1px solid var(--border,#e5e5e5)', background: 'var(--bg,#fafafa)', color: 'var(--text,#333)', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>
                    Cancel
                  </button>
                </div>
                <div style={{ fontSize: 10.5, opacity: .5, marginTop: 7, textAlign: 'center' }}>Auto-confirms in {pending.count}s · Cancel to stop</div>
              </div>
            )}

            {busy && (
              <div style={{ alignSelf: 'flex-start', padding: '10px 14px', borderRadius: 15, background: 'var(--card,#fff)', border: '1px solid var(--border,#eee)' }}>
                <span style={{ display: 'inline-flex', gap: 4 }}>
                  {[0, 1, 2].map(i => (
                    <span key={i} style={{ width: 6, height: 6, borderRadius: '50%', background: '#9CA3AF', display: 'inline-block', animation: `bd-bounce 1s ${i * 0.15}s infinite ease-in-out` }} />
                  ))}
                </span>
              </div>
            )}

            {/* Personalized quick-action chips */}
            {chips.length > 0 && !busy && !pending && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 2 }}>
                {chips.map(s => (
                  <button key={s} onClick={() => send(s)}
                    style={{ fontSize: 12, padding: '7px 12px', borderRadius: 999, border: '1px solid var(--border,#ddd)', background: 'var(--card,#fff)', color: 'var(--text,#333)', cursor: 'pointer' }}>
                    {s}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Composer */}
          <div style={{ display: 'flex', gap: 8, padding: 12, borderTop: '1px solid var(--border,#eee)', background: 'var(--card,#fff)' }}>
            <input
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') send(); }}
              placeholder="Tell me what to do…"
              disabled={busy}
              style={{
                flex: 1, height: 42, borderRadius: 11, border: '1.5px solid var(--border,#e5e5e5)',
                padding: '0 13px', fontSize: 13.5, outline: 'none', background: 'var(--bg,#fafafa)', color: 'var(--text,#1a1a1a)',
              }}
            />
            <button onClick={() => send()} disabled={busy || !input.trim()}
              style={{
                height: 42, padding: '0 17px', borderRadius: 11, border: 'none', cursor: busy || !input.trim() ? 'default' : 'pointer',
                background: busy || !input.trim() ? '#93C5FD' : GRAD, color: '#fff', fontWeight: 700, fontSize: 13.5,
              }}>Send</button>
          </div>
        </div>
      )}

      <style>{`
        @keyframes bd-pulse { 0%,100%{ box-shadow:0 10px 30px rgba(37,99,235,.45);} 50%{ box-shadow:0 10px 40px rgba(124,58,237,.6);} }
        @keyframes bd-rise { from{ opacity:0; transform:translateY(12px) scale(.98);} to{ opacity:1; transform:none;} }
        @keyframes bd-bounce { 0%,80%,100%{ transform:scale(.6); opacity:.4;} 40%{ transform:scale(1); opacity:1;} }
      `}</style>
    </>
  );
}

function timeAgo(ts: number): string {
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 60) return 'just now';
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  return `${Math.floor(s / 3600)}h ago`;
}
