import { useEffect, useRef, useState } from 'react';
import type { Employee } from '../types';
import { runAgent } from '../services/chatAgent';

interface Props {
  employee: Employee;
  employees: Employee[];
}

interface ChatMsg { role: 'user' | 'bot'; text: string; ok?: boolean }

const SUGGESTIONS = [
  'What are my tasks today?',
  'Who checked in today?',
  'Add "finish the report" as my task today',
];

export default function ChatDock({ employee, employees }: Props) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [input, setInput] = useState('');
  const [msgs, setMsgs] = useState<ChatMsg[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Greet + onboarding question on first open of the day
  useEffect(() => {
    if (open && msgs.length === 0) {
      const first = employee.name.split(' ')[0];
      setMsgs([{
        role: 'bot',
        ok: true,
        text: `Hi ${first} 👋 I'm your BuddyDesk assistant. What's the one thing you want to get done today? (Or ask me to add a task, send a file, or post an announcement.)`,
      }]);
    }
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [msgs, busy]);

  const send = async (raw?: string) => {
    const text = (raw ?? input).trim();
    if (!text || busy) return;
    setInput('');
    setMsgs(m => [...m, { role: 'user', text }]);
    setBusy(true);
    const res = await runAgent(text, { me: employee, employees });
    setMsgs(m => [...m, { role: 'bot', text: res.reply, ok: res.ok }]);
    setBusy(false);
  };

  return (
    <>
      {/* Floating launcher */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          aria-label="Open assistant"
          style={{
            position: 'fixed', right: 24, bottom: 24, zIndex: 60,
            width: 58, height: 58, borderRadius: '50%', border: 'none', cursor: 'pointer',
            background: 'linear-gradient(135deg,#2563EB,#7C3AED)', color: '#fff',
            fontSize: 24, boxShadow: '0 8px 24px rgba(37,99,235,.4)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >💬</button>
      )}

      {/* Panel */}
      {open && (
        <div
          style={{
            position: 'fixed', right: 24, bottom: 24, zIndex: 60,
            width: 380, maxWidth: 'calc(100vw - 32px)', height: 560, maxHeight: 'calc(100vh - 48px)',
            display: 'flex', flexDirection: 'column',
            background: 'var(--card, #fff)', color: 'var(--text, #1a1a1a)',
            borderRadius: 16, overflow: 'hidden',
            boxShadow: '0 20px 60px rgba(0,0,0,.28)', border: '1px solid var(--border, #eee)',
          }}
        >
          {/* Header */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 10, padding: '14px 16px',
            background: 'linear-gradient(135deg,#2563EB,#7C3AED)', color: '#fff',
          }}>
            <span style={{ fontSize: 20 }}>🤖</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 700, fontSize: 15 }}>BuddyDesk Assistant</div>
              <div style={{ fontSize: 11, opacity: .85 }}>Acts on your dashboard in real time</div>
            </div>
            <button onClick={() => setOpen(false)} aria-label="Close"
              style={{ background: 'rgba(255,255,255,.2)', border: 'none', color: '#fff', width: 28, height: 28, borderRadius: 8, cursor: 'pointer', fontSize: 16 }}>×</button>
          </div>

          {/* Messages */}
          <div ref={scrollRef} style={{ flex: 1, overflowY: 'auto', padding: 16, display: 'flex', flexDirection: 'column', gap: 10, background: 'var(--bg, #f7f7f6)' }}>
            {msgs.map((m, i) => (
              <div key={i} style={{ alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start', maxWidth: '85%' }}>
                <div style={{
                  padding: '9px 13px', borderRadius: 14, fontSize: 13.5, lineHeight: 1.45, whiteSpace: 'pre-wrap',
                  background: m.role === 'user' ? '#2563EB' : m.ok === false ? '#FEF2F2' : 'var(--card,#fff)',
                  color: m.role === 'user' ? '#fff' : m.ok === false ? '#B91C1C' : 'var(--text,#1a1a1a)',
                  border: m.role === 'user' ? 'none' : `1px solid ${m.ok === false ? '#FECACA' : 'var(--border,#eee)'}`,
                  borderBottomRightRadius: m.role === 'user' ? 4 : 14,
                  borderBottomLeftRadius: m.role === 'user' ? 14 : 4,
                }}>{m.text}</div>
              </div>
            ))}
            {busy && (
              <div style={{ alignSelf: 'flex-start', padding: '9px 13px', borderRadius: 14, background: 'var(--card,#fff)', border: '1px solid var(--border,#eee)', fontSize: 13, color: '#888' }}>
                Working on it…
              </div>
            )}
            {msgs.length <= 1 && !busy && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 4 }}>
                {SUGGESTIONS.map(s => (
                  <button key={s} onClick={() => send(s)}
                    style={{ fontSize: 12, padding: '6px 10px', borderRadius: 999, border: '1px solid var(--border,#ddd)', background: 'var(--card,#fff)', color: 'var(--text,#333)', cursor: 'pointer' }}>
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
                flex: 1, height: 40, borderRadius: 10, border: '1.5px solid var(--border,#e5e5e5)',
                padding: '0 12px', fontSize: 13.5, outline: 'none', background: 'var(--bg,#fafafa)', color: 'var(--text,#1a1a1a)',
              }}
            />
            <button onClick={() => send()} disabled={busy || !input.trim()}
              style={{
                height: 40, padding: '0 16px', borderRadius: 10, border: 'none', cursor: busy || !input.trim() ? 'default' : 'pointer',
                background: busy || !input.trim() ? '#93C5FD' : 'linear-gradient(135deg,#2563EB,#7C3AED)', color: '#fff', fontWeight: 600, fontSize: 13.5,
              }}>Send</button>
          </div>
        </div>
      )}
    </>
  );
}
