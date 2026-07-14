import { useState, useEffect, useMemo } from 'react';
import type { Employee, Group, Broadcast, AudienceTarget } from '../types';
import { sendBroadcast, onBroadcastsChange, cancelScheduledBroadcast } from '../services/firebase';
import { toast } from '../utils/toast';

interface Props {
  employee: Employee;
  allEmployees: Employee[];
  allGroups: Group[];
}

type Mode = 'people' | 'groups' | 'everyone';

const KINDS: { value: Broadcast['kind']; label: string; icon: string }[] = [
  { value: 'alert',      label: 'Alert',      icon: '🚨' },
  { value: 'info',       label: 'Info',       icon: '🔔' },
  { value: 'motivation', label: 'Motivation', icon: '✨' },
];

// 'YYYY-MM-DDTHH:mm' in local time, suitable for an <input type="datetime-local"> min/value.
const toLocalInputValue = (d: Date) => {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

function describeTargets(b: Broadcast, employees: Employee[], groups: Group[]): string {
  if (b.audience.includes('all')) return 'Everyone';
  const parts: string[] = [];
  const names = b.audience
    .map(a => employees.find(e => e.id === a)?.name)
    .filter(Boolean) as string[];
  if (names.length) parts.push(names.join(', '));
  const groupNames = (b.groupIds ?? [])
    .map(gid => groups.find(g => g.id === gid)?.name)
    .filter(Boolean) as string[];
  if (groupNames.length) parts.push(groupNames.map(n => `#${n}`).join(', '));
  return parts.join(' + ') || '—';
}

/**
 * Founder-only: push a real Chrome/OS notification (not a persistent
 * Announcement) to specific people, whole working groups, or everyone in
 * bulk — either right now or at a scheduled future time. Reuses the existing
 * `broadcasts` delivery pipeline (see App.tsx's broadcast listener), which
 * already turns each doc into a native notification on every recipient's
 * device whenever their CRM tab is open (foreground or background).
 */
export default function NotifyPage({ employee, allEmployees, allGroups }: Props) {
  const [mode, setMode]           = useState<Mode>('people');
  const [search, setSearch]       = useState('');
  const [peopleIds, setPeopleIds] = useState<Set<string>>(new Set());
  const [groupIds, setGroupIds]   = useState<Set<string>>(new Set());
  const [title, setTitle]         = useState('');
  const [body, setBody]           = useState('');
  const [kind, setKind]           = useState<Broadcast['kind']>('alert');
  const [scheduleMode, setScheduleMode] = useState<'now' | 'later'>('now');
  const [scheduleAt, setScheduleAt]     = useState('');
  const [sending, setSending]     = useState(false);
  const [error, setError]         = useState('');

  const [broadcasts, setBroadcasts] = useState<Broadcast[]>([]);
  useEffect(() => onBroadcastsChange(setBroadcasts), []);

  const pending = useMemo(
    () => broadcasts
      .filter(b => !b.cancelled && b.scheduledFor && b.scheduledFor > Date.now())
      .sort((a, b) => (a.scheduledFor! - b.scheduledFor!)),
    [broadcasts]
  );

  const filteredEmployees = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return allEmployees;
    return allEmployees.filter(e => e.name.toLowerCase().includes(q) || e.department.toLowerCase().includes(q));
  }, [allEmployees, search]);

  const allFilteredSelected = filteredEmployees.length > 0 && filteredEmployees.every(e => peopleIds.has(e.id));

  const togglePerson = (id: string) => {
    setPeopleIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleSelectAllFiltered = () => {
    setPeopleIds(prev => {
      const next = new Set(prev);
      if (allFilteredSelected) filteredEmployees.forEach(e => next.delete(e.id));
      else filteredEmployees.forEach(e => next.add(e.id));
      return next;
    });
  };

  const toggleGroup = (id: string) => {
    setGroupIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const reset = () => {
    setTitle(''); setBody(''); setKind('alert');
    setPeopleIds(new Set()); setGroupIds(new Set()); setSearch('');
    setScheduleMode('now'); setScheduleAt('');
  };

  const handleSend = async () => {
    setError('');
    const t = title.trim();
    if (!t) { setError('Add a title.'); return; }
    if (mode === 'people' && peopleIds.size === 0) { setError('Select at least one person.'); return; }
    if (mode === 'groups' && groupIds.size === 0) { setError('Select at least one working group.'); return; }

    let scheduledFor: number | undefined;
    if (scheduleMode === 'later') {
      if (!scheduleAt) { setError('Pick a date and time to schedule for.'); return; }
      scheduledFor = new Date(scheduleAt).getTime();
      if (!Number.isFinite(scheduledFor) || scheduledFor <= Date.now()) {
        setError('Scheduled time must be in the future.'); return;
      }
    }

    const audience: AudienceTarget[] = mode === 'everyone' ? ['all'] : mode === 'people' ? [...peopleIds] : [];

    setSending(true);
    try {
      await sendBroadcast({
        title: t,
        body: body.trim() || undefined,
        kind,
        audience,
        groupIds: mode === 'groups' ? [...groupIds] : undefined,
        authorId: employee.id,
        authorName: employee.name,
        scheduledFor,
      });
      toast(scheduledFor
        ? `🔔 Notification scheduled for ${new Date(scheduledFor).toLocaleString()}`
        : '🔔 Notification sent');
      reset();
    } catch {
      setError('Failed to send. Try again.');
    } finally {
      setSending(false);
    }
  };

  const handleCancel = async (id: string) => {
    try { await cancelScheduledBroadcast(id); toast('Scheduled notification cancelled.'); }
    catch { toast('Failed to cancel. Try again.'); }
  };

  const nowLocal = toLocalInputValue(new Date());

  return (
    <div style={{ maxWidth: 720, margin: '0 auto', padding: '28px 24px' }}>
      <div style={{ marginBottom: 22 }}>
        <div style={{ fontSize: 20, fontWeight: 600, color: 'var(--text)', letterSpacing: '-0.02em' }}>Notify</div>
        <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>
          Send a real Chrome/OS pop-up notification to specific people, a working group, or everyone —
          not a persistent post like Announcements. Delivered to anyone with the app open (fires in the
          background if their tab is hidden).
        </div>
      </div>

      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: 20, marginBottom: 20 }}>
        {/* Recipient mode */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
          {([
            { value: 'people' as Mode,   label: 'Specific people', icon: '🙋' },
            { value: 'groups' as Mode,   label: 'Working groups',  icon: '👥' },
            { value: 'everyone' as Mode, label: 'Everyone (bulk)', icon: '📣' },
          ]).map(m => (
            <button key={m.value} type="button" onClick={() => setMode(m.value)}
              style={{ flex: 1, height: 38, borderRadius: 8, cursor: 'pointer', fontSize: 12.5, fontWeight: 500, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                border: `1.5px solid ${mode === m.value ? 'var(--accent)' : 'var(--border)'}`,
                background: mode === m.value ? '#EFF6FF' : 'var(--surface2)',
                color: mode === m.value ? 'var(--accent)' : 'var(--text-muted)' }}>
              <span>{m.icon}</span>{m.label}
            </button>
          ))}
        </div>

        {mode === 'people' && (
          <div style={{ marginBottom: 14 }}>
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search by name or department…"
              style={{ width: '100%', height: 38, padding: '0 12px', background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 13, fontFamily: 'inherit', color: 'var(--text)', outline: 'none', marginBottom: 8, boxSizing: 'border-box' }}
            />
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12.5, color: 'var(--text-muted)', padding: '4px 2px', cursor: 'pointer' }}>
              <input type="checkbox" checked={allFilteredSelected} onChange={toggleSelectAllFiltered} />
              Select all {search.trim() ? 'matching' : ''} ({peopleIds.size} selected)
            </label>
            <div style={{ maxHeight: 220, overflowY: 'auto', border: '1px solid var(--border)', borderRadius: 8, marginTop: 6 }}>
              {filteredEmployees.map(e => (
                <label key={e.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', fontSize: 13, color: 'var(--text)', cursor: 'pointer', borderBottom: '1px solid var(--border)' }}>
                  <input type="checkbox" checked={peopleIds.has(e.id)} onChange={() => togglePerson(e.id)} />
                  <span style={{ flex: 1 }}>{e.name}</span>
                  <span style={{ fontSize: 11, color: 'var(--text-faint)' }}>{e.department}</span>
                </label>
              ))}
              {filteredEmployees.length === 0 && (
                <div style={{ padding: 14, fontSize: 12.5, color: 'var(--text-faint)', textAlign: 'center' }}>No matches.</div>
              )}
            </div>
          </div>
        )}

        {mode === 'groups' && (
          <div style={{ marginBottom: 14 }}>
            {allGroups.length === 0 && (
              <div style={{ padding: 14, fontSize: 12.5, color: 'var(--text-faint)', textAlign: 'center', border: '1px dashed var(--border)', borderRadius: 8 }}>
                No working groups yet — create one on the Groups page first.
              </div>
            )}
            <div style={{ maxHeight: 220, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 6 }}>
              {allGroups.map(g => (
                <label key={g.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', fontSize: 13, color: 'var(--text)', cursor: 'pointer', border: '1px solid var(--border)', borderRadius: 8 }}>
                  <input type="checkbox" checked={groupIds.has(g.id)} onChange={() => toggleGroup(g.id)} />
                  <span style={{ flex: 1, fontWeight: 500 }}>{g.name}</span>
                  <span style={{ fontSize: 11, color: 'var(--text-faint)' }}>{g.memberIds.length} members</span>
                </label>
              ))}
            </div>
          </div>
        )}

        {mode === 'everyone' && (
          <div style={{ marginBottom: 14, padding: 14, fontSize: 12.5, color: 'var(--text-muted)', border: '1px dashed var(--border)', borderRadius: 8 }}>
            This will notify every employee in the company.
          </div>
        )}

        {/* Kind */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
          {KINDS.map(k => (
            <button key={k.value} type="button" onClick={() => setKind(k.value)}
              style={{ flex: 1, height: 36, borderRadius: 8, cursor: 'pointer', fontSize: 12.5, fontWeight: 500, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
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
          placeholder="Title — e.g. Server maintenance at 6pm"
          maxLength={80}
          style={{ width: '100%', height: 42, padding: '0 14px', background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 14, fontFamily: 'inherit', color: 'var(--text)', outline: 'none', marginBottom: 10, boxSizing: 'border-box' }}
        />
        <textarea
          value={body}
          onChange={e => setBody(e.target.value)}
          placeholder="Optional message…"
          rows={2}
          maxLength={200}
          style={{ width: '100%', padding: '10px 14px', background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 13.5, fontFamily: 'inherit', color: 'var(--text)', outline: 'none', resize: 'vertical', marginBottom: 14, boxSizing: 'border-box' }}
        />

        {/* Schedule */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 14 }}>
          <label style={{ fontSize: 12, color: 'var(--text-muted)' }}>When</label>
          <button type="button" onClick={() => setScheduleMode('now')}
            style={{ height: 32, padding: '0 12px', borderRadius: 8, cursor: 'pointer', fontSize: 12.5, fontWeight: 500,
              border: `1.5px solid ${scheduleMode === 'now' ? 'var(--accent)' : 'var(--border)'}`,
              background: scheduleMode === 'now' ? '#EFF6FF' : 'var(--surface2)',
              color: scheduleMode === 'now' ? 'var(--accent)' : 'var(--text-muted)' }}>
            Send now
          </button>
          <button type="button" onClick={() => setScheduleMode('later')}
            style={{ height: 32, padding: '0 12px', borderRadius: 8, cursor: 'pointer', fontSize: 12.5, fontWeight: 500,
              border: `1.5px solid ${scheduleMode === 'later' ? 'var(--accent)' : 'var(--border)'}`,
              background: scheduleMode === 'later' ? '#EFF6FF' : 'var(--surface2)',
              color: scheduleMode === 'later' ? 'var(--accent)' : 'var(--text-muted)' }}>
            Schedule for later
          </button>
          {scheduleMode === 'later' && (
            <input
              type="datetime-local"
              value={scheduleAt}
              min={nowLocal}
              onChange={e => setScheduleAt(e.target.value)}
              style={{ height: 32, padding: '0 10px', background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12.5, fontFamily: 'inherit', color: 'var(--text)', outline: 'none' }}
            />
          )}
        </div>

        {error && (
          <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: '#DC2626', marginBottom: 12 }}>
            {error}
          </div>
        )}

        <button
          onClick={handleSend}
          disabled={sending || !title.trim()}
          style={{ width: '100%', height: 42, border: 'none', borderRadius: 8, fontSize: 13.5, fontWeight: 600,
            background: sending || !title.trim() ? '#C7C7C5' : 'var(--accent)', color: '#fff',
            cursor: sending || !title.trim() ? 'not-allowed' : 'pointer' }}>
          {sending ? 'Sending…' : scheduleMode === 'later' ? 'Schedule notification →' : 'Send now →'}
        </button>
      </div>

      {/* Scheduled / pending sends */}
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: 20 }}>
        <div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--text)', marginBottom: 12 }}>Scheduled ({pending.length})</div>
        {pending.length === 0 ? (
          <div style={{ fontSize: 12.5, color: 'var(--text-faint)' }}>Nothing scheduled right now.</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {pending.map(b => (
              <div key={b.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', border: '1px solid var(--border)', borderRadius: 8 }}>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{b.title}</div>
                  <div style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>
                    To {describeTargets(b, allEmployees, allGroups)} · {new Date(b.scheduledFor!).toLocaleString()}
                  </div>
                </div>
                <button onClick={() => handleCancel(b.id)}
                  style={{ height: 30, padding: '0 12px', background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 7, fontSize: 12, color: 'var(--text-muted)', cursor: 'pointer', flexShrink: 0 }}>
                  Cancel
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
