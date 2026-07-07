import { useEffect, useRef, useState } from 'react';
import type { AppNotif } from '../services/notifications';
import { notifIcon } from '../services/notifications';

interface Props {
  /** Same navigate() the app uses — clicking an action routes and dismisses the card. */
  onNavigate: (page: string, id?: string) => void;
}

const MAX_VISIBLE = 4;

/**
 * Renders WhatsApp-style notification cards stacked in the bottom-right corner,
 * just above the mascot. Listens for 'app-notification' events raised by
 * pushNotification(). Cards auto-dismiss after their autoCloseMs (default 4s);
 * cards with autoCloseMs === null stay until the user acts on / closes them.
 */
export default function NotificationCenter({ onNavigate }: Props) {
  const [items, setItems] = useState<AppNotif[]>([]);
  const timers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  const dismiss = (id: string) => {
    setItems(list => list.filter(n => n.id !== id));
    const t = timers.current[id];
    if (t) { clearTimeout(t); delete timers.current[id]; }
  };

  useEffect(() => {
    const onNotif = (e: Event) => {
      const n = (e as CustomEvent<AppNotif>).detail;
      if (!n) return;
      setItems(list => [...list.filter(x => x.id !== n.id), n].slice(-MAX_VISIBLE));
      const ms = n.autoCloseMs;
      if (ms && ms > 0) {
        if (timers.current[n.id]) clearTimeout(timers.current[n.id]);
        timers.current[n.id] = setTimeout(() => dismiss(n.id), ms);
      }
    };
    window.addEventListener('app-notification', onNotif);
    return () => {
      window.removeEventListener('app-notification', onNotif);
      Object.values(timers.current).forEach(clearTimeout);
    };
  }, []);

  if (!items.length) return null;

  return (
    <>
      <style>{`
        @keyframes notifIn {
          from { opacity: 0; transform: translateX(24px) scale(0.98); }
          to   { opacity: 1; transform: translateX(0) scale(1); }
        }
      `}</style>
      <div
        style={{
          position: 'fixed', right: 24, bottom: 96, zIndex: 9998,
          display: 'flex', flexDirection: 'column', gap: 10, alignItems: 'flex-end',
          maxWidth: 'calc(100vw - 48px)', pointerEvents: 'none',
        }}
      >
        {items.map(n => (
          <div
            key={n.id}
            style={{
              pointerEvents: 'auto',
              width: 330, maxWidth: '100%',
              background: 'var(--surface)', border: '1px solid var(--border)',
              borderRadius: 14, boxShadow: '0 10px 34px rgba(0,0,0,0.16), 0 2px 8px rgba(0,0,0,0.06)',
              padding: '13px 14px', animation: 'notifIn 260ms cubic-bezier(0.16,1,0.3,1) both',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 11 }}>
              <div style={{ fontSize: 20, lineHeight: 1, marginTop: 1, flexShrink: 0 }}>{notifIcon(n.kind)}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--text)', letterSpacing: '-0.01em', lineHeight: 1.35 }}>
                  {n.title}
                </div>
                {n.body && (
                  <div style={{ fontSize: 12.5, color: 'var(--text-muted)', marginTop: 3, lineHeight: 1.45, overflowWrap: 'anywhere' }}>
                    {n.body}
                  </div>
                )}
                {!!n.actions?.length && (
                  <div style={{ display: 'flex', gap: 8, marginTop: 11 }}>
                    {n.actions.map((a, i) => (
                      <button
                        key={i}
                        onClick={() => { if (a.page) onNavigate(a.page, a.targetId); dismiss(n.id); }}
                        style={{
                          height: 30, padding: '0 13px', borderRadius: 8, cursor: 'pointer',
                          fontSize: 12.5, fontWeight: 500, transition: 'all 140ms',
                          border: a.primary ? 'none' : '1px solid var(--border)',
                          background: a.primary ? 'var(--accent)' : 'var(--surface2)',
                          color: a.primary ? '#fff' : 'var(--text)',
                        }}
                      >
                        {a.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <button
                onClick={() => dismiss(n.id)}
                aria-label="Dismiss"
                style={{
                  background: 'none', border: 'none', cursor: 'pointer', padding: 2, marginRight: -2,
                  color: 'var(--text-faint)', display: 'flex', flexShrink: 0, lineHeight: 1,
                }}
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
