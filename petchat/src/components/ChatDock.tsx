import { useEffect, useRef, useState, type CSSProperties } from 'react';
import type { Employee } from '../types';
import { interpret, assess, execute, buildGreeting, type AgentAction, type AgentResult, type QuickOption } from '../services/chatAgent';

// ─────────────────────────────────────────────────────────────────────────
// Zypit Assistant — full-height side panel (not a support-bot bubble).
// Occupies ~1/3 of the horizontal screen on desktop, full width on mobile.
// The dashboard stays visible and LIVE next to it, so actions render in
// real time as the assistant does them. WhatsApp-business-style quick-reply
// buttons remove typing friction (slot-filling, disambiguation, next steps).
// Design: the dashboard's own tokens — restrained, single blue accent.
// Motion: all animation lives in the bd-* style block below — compositor
// properties only (transform + opacity), ease-out-expo signature curve,
// reduced-motion-safe. Accent runs through --bd-accent so dark mode can
// desaturate/brighten it (#2563EB → #3B82F6) per light-physics rules.
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
  options?: QuickOption[];
}

interface HistoryItem { label: string; at: number }

const MAX_MSGS = 60;
const UNDO_WINDOW = 6000;

let _mid = 0;
const nextId = () => ++_mid;
let _launcherPulsed = false; // discoverability pulse plays once per session, not per mount

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
  const [recording, setRecording] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const timersRef = useRef<number[]>([]);
  const recRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const ctx = { me: employee, employees };

  // Global keyboard: Ctrl/Cmd+K toggles, Esc closes.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); setOpen(o => !o); }
      else if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // Clear pending timers on unmount (leak guard)
  useEffect(() => () => { timersRef.current.forEach(t => window.clearTimeout(t)); }, []);

  // Autofocus composer when the panel opens
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
    setMsgs(m => [...m.slice(-(MAX_MSGS - 1)), { id, role: 'bot', text: r.reply, ok: r.ok, undo: r.undo, options: r.options }]);
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

  // Quick-reply tapped: either run its action through the same safety gate,
  // or prefill the composer so the user only types the free-text part.
  const handleOption = async (msgId: number, opt: QuickOption) => {
    setMsgs(m => m.map(x => x.id === msgId ? { ...x, options: undefined } : x)); // consume
    if (opt.send) { void send(opt.send); return; }              // clarify branch → send as a fresh message
    if (opt.prefill) { setInput(opt.prefill); inputRef.current?.focus(); return; }
    if (!opt.act) return;
    setMsgs(m => [...m.slice(-(MAX_MSGS - 1)), { id: nextId(), role: 'user', text: opt.label }]);
    const gate = assess(opt.act, ctx);
    if (!gate.permitted) { pushBot({ ok: false, reply: gate.denyReason ?? 'You cannot do that.' }); return; }
    if (gate.risky) { setPending({ action: opt.act, text: gate.confirmText ?? 'Confirm this action?', count: 3 }); return; }
    await commit(opt.act);
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

  // ── Voice: record → transcribe → DROP INTO COMPOSER (never auto-execute) ──
  // Deliberate anti-Siri choice: we transcribe into the input box so the user
  // SEES what was heard and hits Send. A mis-hear never silently does the wrong
  // thing. Uses MediaRecorder → base64 → /api/transcribe (same brain after).
  const blobToBase64 = (blob: Blob) => new Promise<string>((resolve, reject) => {
    const r = new FileReader();
    r.onloadend = () => resolve(String(r.result));
    r.onerror = reject;
    r.readAsDataURL(blob);
  });

  const startRecording = async () => {
    if (recording || transcribing || busy) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mime = MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm'
        : MediaRecorder.isTypeSupported('audio/mp4') ? 'audio/mp4' : '';
      const rec = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
      chunksRef.current = [];
      rec.ondataavailable = e => { if (e.data.size) chunksRef.current.push(e.data); };
      rec.onstop = async () => {
        stream.getTracks().forEach(t => t.stop());
        const blob = new Blob(chunksRef.current, { type: rec.mimeType || 'audio/webm' });
        if (blob.size < 1200) { setTranscribing(false); return; } // too short = accidental tap
        setTranscribing(true);
        try {
          const audioBase64 = await blobToBase64(blob);
          const res = await fetch('/api/transcribe', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ audioBase64, mimeType: rec.mimeType || 'audio/webm', me: { id: employee.id } }),
          });
          const data = await res.json();
          if (data.text) { setInput(prev => (prev ? prev + ' ' : '') + data.text); inputRef.current?.focus(); }
          else pushBot({ ok: false, reply: data.error || data.warning || `Didn't catch that — try again.` });
        } catch { pushBot({ ok: false, reply: `Voice failed — check your connection and try again.` }); }
        setTranscribing(false);
      };
      recRef.current = rec;
      rec.start();
      setRecording(true);
    } catch { pushBot({ ok: false, reply: `I need mic permission to hear you. Enable it in your browser and try again.` }); }
  };

  const stopRecording = () => {
    if (recRef.current && recording) { recRef.current.stop(); setRecording(false); }
  };

  return (
    <>
      {/* Floating launcher */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          onAnimationStart={() => { _launcherPulsed = true; }}
          aria-label="Open assistant (Ctrl+K)"
          title="Ask Zypit — Ctrl+K"
          className={'bd-launcher' + (_launcherPulsed ? '' : ' bd-launcher-pulse')}
          style={{
            position: 'fixed', right: 24, bottom: 24, zIndex: 60,
            height: 44, padding: '0 16px 0 12px', borderRadius: 999, cursor: 'pointer',
            background: 'var(--text, #111)', color: 'var(--surface, #fff)',
            border: '1px solid transparent',
            display: 'flex', alignItems: 'center', gap: 8,
            fontSize: 13, fontWeight: 600, fontFamily: 'inherit',
            boxShadow: 'var(--card-shadow-hover, 0 4px 16px rgba(0,0,0,.14))',
          }}
        >
          <span style={{ fontSize: 15 }}>✦</span> Ask
          <kbd style={{
            fontSize: 11, fontWeight: 500, opacity: .65, padding: '2px 4px',
            borderRadius: 4, border: '1px solid currentColor', fontFamily: 'inherit',
          }}>⌘K</kbd>
        </button>
      )}

      {/* Full-height side panel — the agent's third of the screen */}
      {open && (
        <div
          className="bd-panel"
          style={{
            position: 'fixed', right: 0, top: 0, bottom: 0, zIndex: 60,
            width: 'clamp(360px, 33vw, 520px)', maxWidth: '100vw',
            display: 'flex', flexDirection: 'column',
            background: 'var(--surface, #fff)', color: 'var(--text, #111)',
            borderLeft: '1px solid var(--border, #E9E9E7)',
            boxShadow: '-12px 0 40px rgba(0,0,0,.10)',
          }}
        >
          {/* Header */}
          <div className="bd-header" style={{
            display: 'flex', alignItems: 'center', gap: 8, padding: 16,
            background: 'var(--surface, #fff)', borderBottom: '1px solid var(--border, #E9E9E7)',
          }}>
            <span style={{
              width: 32, height: 32, borderRadius: 6, background: 'var(--bd-accent)', color: '#fff',
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, flexShrink: 0,
            }}>✦</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 650, fontSize: 14, letterSpacing: '-0.01em' }}>Assistant</div>
              <div style={{ fontSize: 11, color: 'var(--text-muted, #888)', display: 'flex', alignItems: 'center', gap: 4 }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#22C55E', display: 'inline-block' }} />
                Working live on your dashboard
              </div>
            </div>
            <button onClick={() => setShowHistory(s => !s)} aria-label="Recent actions" title="Recent actions"
              className="bd-iconbtn" style={iconBtn(showHistory)}>🕑</button>
            <button onClick={() => setOpen(false)} aria-label="Close (Esc)" title="Close — Esc"
              className="bd-iconbtn" style={iconBtn(false)}>×</button>
          </div>

          {/* History drawer */}
          {showHistory && (
            <div className="bd-drawer" style={{ maxHeight: 180, overflowY: 'auto', padding: '12px 16px', borderBottom: '1px solid var(--border,#E9E9E7)', background: 'var(--surface2,#F7F7F6)' }}>
              <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: .6, color: 'var(--text-faint,#BBB)', marginBottom: 8 }}>Recent actions</div>
              {history.length === 0
                ? <div className="bd-drawer-item" style={{ fontSize: 12, color: 'var(--text-muted,#888)' }}>Nothing yet. Actions I take will show here.</div>
                : history.map((h, i) => (
                  <div key={i} className="bd-drawer-item" style={{ fontSize: 12, padding: '4px 0', display: 'flex', justifyContent: 'space-between', gap: 8, animationDelay: `${Math.min(i, 10) * 30}ms` }}>
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{h.label}</span>
                    <span style={{ color: 'var(--text-faint,#BBB)', flexShrink: 0 }}>{timeAgo(h.at)}</span>
                  </div>
                ))}
            </div>
          )}

          {/* Messages */}
          <div ref={scrollRef} className="bd-body" style={{ flex: 1, overflowY: 'auto', padding: 16, display: 'flex', flexDirection: 'column', gap: 8, background: 'var(--bg, #F7F7F6)' }}>
            {msgs.map(m => (
              <div key={m.id} style={{ alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start', maxWidth: '88%' }}
                className={m.role === 'user' ? 'bd-msg bd-msg-user' : 'bd-msg bd-msg-bot'}>
                <div style={{
                  padding: '8px 12px', borderRadius: 12, fontSize: 13, lineHeight: 1.5, whiteSpace: 'pre-wrap',
                  background: m.role === 'user' ? 'var(--bd-accent)' : m.ok === false ? '#FEF2F2' : 'var(--surface,#fff)',
                  color: m.role === 'user' ? '#fff' : m.ok === false ? '#B91C1C' : 'var(--text,#111)',
                  border: m.role === 'user' ? 'none' : `1px solid ${m.ok === false ? '#FECACA' : 'var(--border,#E9E9E7)'}`,
                  borderBottomRightRadius: m.role === 'user' ? 4 : 12,
                  borderBottomLeftRadius: m.role === 'user' ? 12 : 4,
                  boxShadow: m.role === 'user' ? 'none' : 'var(--card-shadow, 0 1px 3px rgba(0,0,0,.06))',
                }}>{m.text}</div>

                {/* Quick-reply buttons: one tap instead of typing */}
                {m.options && m.options.length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 8 }}>
                    {m.options.map((o, i) => (
                      <button key={i} onClick={() => handleOption(m.id, o)} className="bd-chip bd-chip-accent"
                        style={{
                          fontSize: 12, fontWeight: 600, padding: '6px 12px', borderRadius: 999,
                          border: '1px solid var(--bd-accent-soft)', background: 'var(--surface,#fff)',
                          color: 'var(--bd-accent)', cursor: 'pointer', fontFamily: 'inherit',
                          animationDelay: `${i * 40}ms`,
                        }}>
                        {o.label}
                      </button>
                    ))}
                  </div>
                )}

                {m.undo && (
                  <button onClick={() => runUndo(m.id, m.undo!)} className="bd-undo"
                    style={{ marginTop: 4, fontSize: 12, fontWeight: 600, padding: '4px 12px', borderRadius: 999, border: '1px solid var(--border,#E9E9E7)', background: 'var(--surface,#fff)', color: 'var(--bd-accent)', cursor: 'pointer', fontFamily: 'inherit' }}>
                    ↩ Undo
                  </button>
                )}
              </div>
            ))}

            {/* Risky-action confirm with 3-2-1 countdown + visible time drain */}
            {pending && (
              <div className="bd-msg bd-msg-bot" style={{ alignSelf: 'flex-start', maxWidth: '92%', position: 'relative', overflow: 'hidden', background: 'var(--surface,#fff)', border: '1px solid #FCD34D', borderRadius: 12, padding: 16, boxShadow: 'var(--card-shadow)' }}>
                <div style={{ fontSize: 13, lineHeight: 1.5, whiteSpace: 'pre-wrap', marginBottom: 12 }}>{pending.text}</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <button onClick={() => { const a = pending.action; setPending(null); void commit(a); }} className="bd-press"
                    style={{ flex: 1, height: 36, borderRadius: 6, border: 'none', background: 'var(--bd-accent)', color: '#fff', fontWeight: 650, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' }}>
                    Confirm ({pending.count})
                  </button>
                  <button onClick={() => { setPending(null); setMsgs(m => [...m, { id: nextId(), role: 'bot', ok: true, text: 'Okay, cancelled — nothing changed.' }]); }} className="bd-press"
                    style={{ flex: 1, height: 36, borderRadius: 6, border: '1px solid var(--border,#E9E9E7)', background: 'var(--surface2,#F7F7F6)', color: 'var(--text,#111)', fontWeight: 600, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' }}>
                    Cancel
                  </button>
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-faint,#BBB)', marginTop: 8, textAlign: 'center' }}>Auto-confirms in {pending.count}s · Cancel to stop</div>
                {/* Draining time bar — remounts (keyed) each time a pending action appears */}
                <div key={pending.text} aria-hidden="true" style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 3, background: 'var(--bd-ring)' }}>
                  <div className="bd-drain" style={{ height: '100%', borderRadius: 99, background: 'var(--bd-accent)' }} />
                </div>
              </div>
            )}

            {busy && (
              <div className="bd-msg bd-msg-bot" style={{ alignSelf: 'flex-start', padding: '8px 12px', borderRadius: 12, borderBottomLeftRadius: 4, background: 'var(--surface,#fff)', border: '1px solid var(--border,#E9E9E7)' }}>
                <span style={{ display: 'inline-flex', gap: 4 }}>
                  {[0, 1, 2].map(i => (
                    <span key={i} className="bd-dot" style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--text-muted,#888)', display: 'inline-block', animationDelay: `${i * 0.15}s` }} />
                  ))}
                </span>
              </div>
            )}

            {/* Personalized starter chips */}
            {chips.length > 0 && !busy && !pending && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 4 }}>
                {chips.map((s, i) => (
                  <button key={s} onClick={() => send(s)}
                    className="bd-chip"
                    style={{ fontSize: 12, padding: '6px 12px', borderRadius: 999, border: '1px solid var(--border,#E9E9E7)', background: 'var(--surface,#fff)', color: 'var(--text,#111)', cursor: 'pointer', fontFamily: 'inherit', animationDelay: `${i * 40}ms` }}>
                    {s}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Composer */}
          <div className="bd-composer" style={{ display: 'flex', gap: 8, padding: 12, borderTop: '1px solid var(--border,#E9E9E7)', background: 'var(--surface, #fff)' }}>
            <input
              ref={inputRef}
              className="bd-input"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') send(); }}
              placeholder={recording ? 'Listening… tap ■ to stop' : transcribing ? 'Transcribing…' : 'Type or tap 🎤 — say it any way you like'}
              disabled={busy || transcribing}
              style={{
                flex: 1, height: 44, borderRadius: 12, border: '1px solid var(--border,#E9E9E7)',
                padding: '0 12px', fontSize: 13, outline: 'none',
                background: 'var(--surface2,#F7F7F6)', color: 'var(--text,#111)', fontFamily: 'inherit',
              }}
            />
            {/* Mic: hold-free tap to start, tap to stop. Transcribes INTO the box. */}
            <button
              onClick={() => (recording ? stopRecording() : startRecording())}
              disabled={busy || transcribing}
              aria-label={recording ? 'Stop recording' : 'Record voice note'}
              title={recording ? 'Stop' : 'Voice note'}
              className={'bd-mic' + (recording ? ' bd-rec' : '')}
              style={{
                width: 44, height: 44, borderRadius: 12, flexShrink: 0,
                border: '1px solid ' + (recording ? '#DC2626' : 'var(--border,#E9E9E7)'),
                background: recording ? '#DC2626' : 'var(--surface2,#F7F7F6)',
                color: recording ? '#fff' : 'var(--text-muted,#888)',
                cursor: busy || transcribing ? 'default' : 'pointer', fontSize: 16,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
              {transcribing ? '…' : recording ? '■' : '🎤'}
            </button>
            <button onClick={() => send()} disabled={busy || transcribing || !input.trim()} className="bd-press"
              style={{
                height: 44, padding: '0 16px', borderRadius: 12, border: 'none',
                cursor: busy || transcribing || !input.trim() ? 'default' : 'pointer',
                background: busy || transcribing || !input.trim() ? 'var(--border,#E9E9E7)' : 'var(--bd-accent)',
                color: busy || transcribing || !input.trim() ? 'var(--text-muted,#888)' : '#fff',
                fontWeight: 650, fontSize: 13, fontFamily: 'inherit',
              }}>Send</button>
          </div>
        </div>
      )}

      <style>{`
        /* ── bd- motion + accent tokens ─────────────────────────────────
           Curves: --bd-ease = ease-out-expo (signature, entrances settle);
           --bd-swift = standard material curve (state changes).
           Durations: 120 micro / 200 small / 320 element / 460 panel.
           Everything animates transform+opacity only (compositor-safe);
           the two box-shadow pulses (launcher ping, rec breathe) are the
           sanctioned exceptions — they run on idle, low-frequency states. */
        :root {
          --bd-ease: cubic-bezier(0.16, 1, 0.3, 1);
          --bd-swift: cubic-bezier(0.4, 0, 0.2, 1);
          --bd-dur-micro: 120ms;
          --bd-dur-small: 200ms;
          --bd-dur-el: 320ms;
          --bd-dur-panel: 460ms;
          --bd-accent: #2563EB;
          --bd-accent-soft: rgba(37, 99, 235, .22);
          --bd-ring: rgba(37, 99, 235, .15);
        }
        /* Dark-mode light physics: desaturate + lift the accent so it does
           not vibrate against #1C1C1C elevated surfaces. */
        .dark {
          --bd-accent: #3B82F6;
          --bd-accent-soft: rgba(59, 130, 246, .32);
          --bd-ring: rgba(59, 130, 246, .20);
        }

        /* ── Launcher ── */
        .bd-launcher { transition: transform var(--bd-dur-micro) var(--bd-swift), box-shadow var(--bd-dur-micro) var(--bd-swift); }
        .bd-launcher:hover { transform: translateY(-1px); }
        .bd-launcher:active { transform: translateY(0) scale(.97); }
        .bd-launcher:focus-visible { outline: none; box-shadow: var(--card-shadow-hover, 0 4px 16px rgba(0,0,0,.14)), 0 0 0 3px var(--bd-ring); }
        .bd-launcher-pulse::after {
          content: ''; position: absolute; inset: 0; border-radius: 999px; pointer-events: none;
          animation: bd-ping 1.5s var(--bd-swift) 900ms 2;
        }
        @keyframes bd-ping {
          0%   { box-shadow: 0 0 0 0 var(--bd-accent-soft); }
          100% { box-shadow: 0 0 0 12px transparent; }
        }

        /* ── Panel entrance: slide in, then interior settles in a stagger ── */
        .bd-panel { animation: bd-slide var(--bd-dur-panel) var(--bd-ease); }
        .bd-header   { animation: bd-rise var(--bd-dur-el) var(--bd-ease) 80ms backwards; }
        .bd-body     { animation: bd-rise var(--bd-dur-el) var(--bd-ease) 130ms backwards; }
        .bd-composer { animation: bd-rise var(--bd-dur-el) var(--bd-ease) 180ms backwards; }
        @keyframes bd-slide { from { opacity: 0; transform: translateX(40px); } to { opacity: 1; transform: none; } }
        @keyframes bd-rise  { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: none; } }

        /* ── Messages: grow from their anchor corner ── */
        .bd-msg { animation: bd-msg-in var(--bd-dur-el) var(--bd-ease) backwards; }
        .bd-msg-bot  { transform-origin: bottom left; }
        .bd-msg-user { transform-origin: bottom right; }
        @keyframes bd-msg-in { from { opacity: 0; transform: translateY(8px) scale(.98); } to { opacity: 1; transform: none; } }

        /* ── Quick-reply + starter chips: staggered pop (delay set inline) ── */
        .bd-chip {
          animation: bd-chip-in var(--bd-dur-small) var(--bd-ease) backwards;
          transition: border-color var(--bd-dur-micro) var(--bd-swift), background-color var(--bd-dur-micro) var(--bd-swift), transform var(--bd-dur-micro) var(--bd-swift);
        }
        .bd-chip:hover { transform: translateY(-1px); border-color: var(--border-hover, #C8C8C6); background: var(--surface2, #F7F7F6); }
        .bd-chip-accent:hover { border-color: var(--bd-accent); background: var(--surface, #fff); }
        .bd-chip:active { transform: scale(.96); transition-duration: 100ms; }
        .bd-chip:focus-visible { outline: none; box-shadow: 0 0 0 3px var(--bd-ring); }
        @keyframes bd-chip-in { from { opacity: 0; transform: translateY(4px) scale(.9); } to { opacity: 1; transform: none; } }

        /* ── Countdown drain: 3s linear, synced to the 3-2-1 auto-confirm.
             scaleX (not width) keeps it on the compositor. ── */
        .bd-drain { transform-origin: left center; animation: bd-drain 3s linear forwards; }
        @keyframes bd-drain { from { transform: scaleX(1); } to { transform: scaleX(0); } }

        /* ── Typing indicator: calm sine wave, 900ms cycle ── */
        .bd-dot { opacity: .35; animation: bd-wave 900ms ease-in-out infinite; }
        @keyframes bd-wave {
          0%, 60%, 100% { transform: translateY(0); opacity: .35; }
          30%           { transform: translateY(-3px); opacity: 1; }
        }

        /* ── Undo pill + history drawer ── */
        .bd-undo { animation: bd-rise-sm var(--bd-dur-small) var(--bd-ease) backwards; }
        .bd-drawer { animation: bd-drawer-in var(--bd-dur-small) var(--bd-ease); }
        .bd-drawer-item { animation: bd-rise-sm var(--bd-dur-small) var(--bd-ease) backwards; }
        @keyframes bd-rise-sm   { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: none; } }
        @keyframes bd-drawer-in { from { opacity: 0; transform: translateY(-6px); } to { opacity: 1; transform: none; } }

        /* ── Mic / recording: 200ms state morph, breathing red ring while live ── */
        .bd-mic { transition: background-color var(--bd-dur-small) var(--bd-swift), border-color var(--bd-dur-small) var(--bd-swift), color var(--bd-dur-small) var(--bd-swift), transform var(--bd-dur-micro) var(--bd-swift); }
        .bd-mic:not(:disabled):active { transform: scale(.96); }
        .bd-mic:focus-visible { outline: none; box-shadow: 0 0 0 3px var(--bd-ring); }
        .bd-rec { animation: bd-breathe 1.6s ease-in-out infinite; }
        @keyframes bd-breathe {
          0%   { box-shadow: 0 0 0 0 rgba(220, 38, 38, .4); }
          70%  { box-shadow: 0 0 0 6px rgba(220, 38, 38, 0); }
          100% { box-shadow: 0 0 0 6px rgba(220, 38, 38, 0); }
        }

        /* ── Pressables (Send, Confirm, Cancel) + header icon buttons ── */
        .bd-press { transition: background-color var(--bd-dur-micro) var(--bd-swift), color var(--bd-dur-micro) var(--bd-swift), transform var(--bd-dur-micro) var(--bd-swift); }
        .bd-press:not(:disabled):active { transform: scale(.98); }
        .bd-press:focus-visible { outline: none; box-shadow: 0 0 0 3px var(--bd-ring); }
        .bd-iconbtn { transition: background-color var(--bd-dur-micro) var(--bd-swift), border-color var(--bd-dur-micro) var(--bd-swift), color var(--bd-dur-micro) var(--bd-swift); }
        .bd-iconbtn:hover { color: var(--text, #111); background: var(--surface2, #F7F7F6); }
        .bd-iconbtn:focus-visible { outline: none; box-shadow: 0 0 0 3px var(--bd-ring); }

        /* Dark mode: composer focus ring follows the lifted accent
           (overrides the global #2563EB !important from index.css). */
        .dark .bd-input:focus { border-color: var(--bd-accent) !important; box-shadow: 0 0 0 3px var(--bd-ring); }

        @media (max-width: 640px) { .bd-panel { width: 100vw !important; border-left: none !important; } }

        @media (prefers-reduced-motion: reduce) {
          .bd-launcher-pulse::after, .bd-panel, .bd-header, .bd-body, .bd-composer,
          .bd-msg, .bd-chip, .bd-undo, .bd-drawer, .bd-drawer-item,
          .bd-dot, .bd-rec, .bd-drain { animation: none !important; }
          .bd-launcher, .bd-chip, .bd-mic, .bd-press, .bd-iconbtn { transition: none !important; }
          .bd-drain { visibility: hidden; } /* frozen bar would misreport time; the numeric countdown carries it */
          .bd-dot { opacity: .7; } /* static dots still read as "thinking" */
        }
      `}</style>
    </>
  );
}

function iconBtn(active: boolean): CSSProperties {
  return {
    background: active ? 'var(--surface2,#F7F7F6)' : 'transparent',
    border: '1px solid ' + (active ? 'var(--border,#E9E9E7)' : 'transparent'),
    color: 'var(--text-muted,#888)', width: 32, height: 32, borderRadius: 6,
    cursor: 'pointer', fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center',
  };
}

function timeAgo(ts: number): string {
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 60) return 'just now';
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  return `${Math.floor(s / 3600)}h ago`;
}
