import { useState } from 'react';
import type { Employee, Broadcast, AudienceTarget } from '../types';
import { sendBroadcast } from '../services/firebase';
import { sendPush } from '../services/push';
import { toast } from '../utils/toast';

interface Props {
  employee: Employee;
  /** Departments available as audience segments (from the roster). */
  departments: string[];
  /** Full roster — needed to resolve "everyone"/department into actual recipient ids for Web Push. */
  allEmployees: Employee[];
}

const KINDS: { value: Broadcast['kind']; label: string; icon: string }[] = [
  { value: 'alert',      label: 'Alert',      icon: '🚨' },
  { value: 'motivation', label: 'Motivation', icon: '✨' },
  { value: 'info',       label: 'Info',       icon: '🔔' },
];

/**
 * Lets an admin/founder push a transient pop-up alert to everyone (or a
 * department). Writes a `broadcasts` doc; every online client's listener turns
 * it into a bottom-right notification. Not a persistent post — use Announcements
 * for those.
 */
export default function BroadcastComposer({ employee, departments, allEmployees }: Props) {
  const [open, setOpen]     = useState(false);
  const [title, setTitle]   = useState('');
  const [body, setBody]     = useState('');
  const [kind, setKind]     = useState<Broadcast['kind']>('alert');
  const [audience, setAudience] = useState<string>('all'); // 'all' or a department
  const [sending, setSending]   = useState(false);

  const reset = () => { setTitle(''); setBody(''); setKind('alert'); setAudience('all'); };

  const handleSend = async () => {
    const t = title.trim();
    if (!t) return;
    setSending(true);
    try {
      const target: AudienceTarget[] = audience === 'all' ? ['all'] : [audience as AudienceTarget];
      await sendBroadcast({
        title: t,
        body: body.trim() || undefined,
        kind,
        audience: target,
        authorId: employee.id,
        authorName: employee.name,
      });
      // Real Web Push — reaches recipients even with no tab/app open at all.
      const targetIds = (audience === 'all' ? allEmployees : allEmployees.filter(e => e.department === audience))
        .map(e => e.id).filter(id => id !== employee.id);
      sendPush(targetIds, { title: t, body: body.trim() || undefined, tag: 'broadcast', url: '/' });
      toast('📢 Broadcast sent to ' + (audience === 'all' ? 'everyone' : audience));
      reset();
      setOpen(false);
    } catch {
      toast('Failed to send broadcast. Try again.');
    } finally {
      setSending(false);
    }
  };

  return (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: open ? '18px 20px' : '14px 20px', marginBottom: 20, transition: 'padding 150ms' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 11, minWidth: 0 }}>
          <div style={{ fontSize: 18 }}>📣</div>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--text)' }}>Broadcast to the team</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              Push an instant pop-up alert to everyone who's online.
            </div>
          </div>
        </div>
        <button
          onClick={() => setOpen(v => !v)}
          style={{ height: 32, padding: '0 14px', flexShrink: 0, background: open ? 'var(--surface2)' : 'var(--accent)', color: open ? 'var(--text)' : '#fff', border: open ? '1px solid var(--border)' : 'none', borderRadius: 8, fontSize: 12.5, fontWeight: 500, cursor: 'pointer' }}
        >
          {open ? 'Cancel' : 'New broadcast'}
        </button>
      </div>

      {open && (
        <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
          {/* Kind */}
          <div style={{ display: 'flex', gap: 8 }}>
            {KINDS.map(k => (
              <button key={k.value} type="button" onClick={() => setKind(k.value)}
                style={{ flex: 1, height: 38, borderRadius: 8, cursor: 'pointer', fontSize: 12.5, fontWeight: 500, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                  border: `1.5px solid ${kind === k.value ? 'var(--accent)' : 'var(--border)'}`,
                  background: kind === k.value ? '#EFF6FF' : 'var(--surface2)',
                  color: kind === k.value ? 'var(--accent)' : 'var(--text-muted)' }}>
                <span>{k.icon}</span>{k.label}
              </button>
            ))}
          </div>

          <input
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="Title — e.g. All-hands in 10 minutes"
            maxLength={80}
            style={{ height: 42, padding: '0 14px', background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 14, fontFamily: 'inherit', color: 'var(--text)', outline: 'none' }}
          />
          <textarea
            value={body}
            onChange={e => setBody(e.target.value)}
            placeholder="Optional message…"
            rows={2}
            maxLength={200}
            style={{ padding: '10px 14px', background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 13.5, fontFamily: 'inherit', color: 'var(--text)', outline: 'none', resize: 'vertical' }}
          />

          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <label style={{ fontSize: 12, color: 'var(--text-muted)' }}>Send to</label>
            <select value={audience} onChange={e => setAudience(e.target.value)}
              style={{ height: 36, padding: '0 10px', background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 13, fontFamily: 'inherit', color: 'var(--text)', outline: 'none' }}>
              <option value="all">Everyone</option>
              {departments.map(d => <option key={d} value={d}>{d} dept</option>)}
            </select>
            <div style={{ flex: 1 }} />
            <button
              onClick={handleSend}
              disabled={sending || !title.trim()}
              style={{ height: 38, padding: '0 20px', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600,
                background: sending || !title.trim() ? '#C7C7C5' : 'var(--accent)', color: '#fff',
                cursor: sending || !title.trim() ? 'not-allowed' : 'pointer' }}>
              {sending ? 'Sending…' : 'Send now →'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
