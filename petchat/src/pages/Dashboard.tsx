import { useState, useEffect } from 'react';
import type { Employee, Task, LoginLog, CheckInResponse, Announcement } from '../types';
import {
  onUserTasksChange, getTodaysLog, logLogin, logLogout,
  getTodaysCheckIn, filterAnnouncements, onAnnouncementsChange,
  onMessagesChange,
} from '../services/firebase';
import { avatarColor, initialsOf } from '../lib/avatar';

interface Props {
  employee: Employee;
  allEmployees: Employee[];
  onNavigate: (page: string) => void;
}

export default function Dashboard({ employee, allEmployees, onNavigate }: Props) {
  const [tasks, setTasks]               = useState<Task[]>([]);
  const [log, setLog]                   = useState<LoginLog | null>(null);
  const [checkin, setCheckin]           = useState<CheckInResponse | null>(null);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [workHours, setWorkHours]       = useState('0h 0m');
  const [clockLoading, setClockLoading] = useState(false);
  const [clockError, setClockError]     = useState('');
  const [recentConvs, setRecentConvs]   = useState<{ emp: Employee; lastMsg: string; time: string }[]>([]);

  const [showLogoutWarning, setShowLogoutWarning] = useState(false);

  useEffect(() => {
    const unsub  = onUserTasksChange(employee.id, setTasks);
    const unsubA = onAnnouncementsChange(items => setAnnouncements(filterAnnouncements(items, employee)));
    getTodaysLog(employee.id).then(setLog);
    getTodaysCheckIn(employee.id).then(setCheckin);
    return () => { unsub(); unsubA(); };
  }, [employee.id]);

  // Load recent conversations preview (live, leak-free, no shared-state race)
  const otherIds = allEmployees.filter(e => e.id !== employee.id).slice(0, 3).map(e => e.id).join(',');
  useEffect(() => {
    const others = allEmployees.filter(e => e.id !== employee.id).slice(0, 3);
    if (others.length === 0) { setRecentConvs([]); return; }
    const previews: Record<string, { emp: Employee; lastMsg: string; time: string }> = {};
    const unsubs = others.map(other =>
      onMessagesChange(employee.id, other.id, msgs => {
        const last = msgs[msgs.length - 1];
        if (last) {
          const timeStr = new Date(last.timestamp).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
          const text = last.content ?? (last.attachment ? `📎 ${last.attachment.name}` : '');
          previews[other.id] = { emp: other, lastMsg: text.slice(0, 40), time: timeStr };
        } else {
          delete previews[other.id];
        }
        setRecentConvs(Object.values(previews));
      })
    );
    return () => unsubs.forEach(u => u());
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [employee.id, otherIds]);

  // Live work-hours counter
  useEffect(() => {
    if (!log?.loginTime) return;
    const calc = () => {
      const loginMs = typeof log.loginTime === 'number' ? log.loginTime : Date.now();
      const endMs   = log.logoutTime ? (typeof log.logoutTime === 'number' ? log.logoutTime : Date.now()) : Date.now();
      const diff    = endMs - loginMs;
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      setWorkHours(`${h}h ${m}m`);
    };
    calc();
    const id = setInterval(calc, 30000);
    return () => clearInterval(id);
  }, [log]);


  const handleClock = async () => {
    // If they are clocking out and have incomplete tasks, show warning first
    if (log && !log.logoutTime) {
      const open = tasks.filter(t => t.status !== 'done');
      if (open.length > 0) {
        setShowLogoutWarning(true);
        return;
      }
    }
    
    // Normal clock flow
    executeClock();
  };

  const executeClock = async () => {
    setShowLogoutWarning(false);
    setClockLoading(true);
    setClockError('');
    try {
      if (!log || log.logoutTime) {
        await logLogin(employee.id, employee.name);
        const newLog = await getTodaysLog(employee.id);
        setLog(newLog);
      } else {
        await logLogout(log.id, employee.id);
        setLog(prev => prev ? { ...prev, logoutTime: Date.now() } : null);
      }
    } catch (err) {
      console.error('Clock action failed:', err);
      setClockError('Could not update your clock status. Check your connection and try again.');
    } finally { setClockLoading(false); }
  };

  const normalizeStatus = (s?: string) => {
    if (!s) return 'todo';
    const str = s.toLowerCase().replace(/[\s-]/g, '_');
    if (str === 'in_progress' || str === 'inprogress') return 'in_progress';
    if (str === 'done' || str === 'completed') return 'done';
    if (str === 'blocked') return 'blocked';
    return 'todo';
  };

  const todo       = tasks.filter(t => normalizeStatus(t.status) === 'todo').length;
  const inProgress = tasks.filter(t => normalizeStatus(t.status) === 'in_progress').length;
  const done       = tasks.filter(t => normalizeStatus(t.status) === 'done').length;
  const urgent     = tasks.filter(t => t.priority === 'urgent' && normalizeStatus(t.status) !== 'done').length;
  const total      = tasks.length;
  const pct        = total ? Math.round((done / total) * 100) : 0;
  const activeCount = allEmployees.filter(e => e.status === 'active').length;
  const isClockedIn = log && !log.logoutTime;

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const today = new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' });

  // Birthday reminders — check next 7 days
  const upcomingBirthdays = (() => {
    const result: { emp: Employee; daysAway: number }[] = [];
    const now = new Date();
    for (let i = 0; i < 7; i++) {
      const d = new Date(now); d.setDate(d.getDate() + i);
      const md = `${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      allEmployees.filter(e => e.id !== employee.id && e.birthday === md).forEach(e => result.push({ emp: e, daysAway: i }));
    }
    return result;
  })();

  const statusDot = (status: string) => ({
    todo: '#D1D5DB', in_progress: '#CA8A04', done: '#16A34A', blocked: '#DC2626',
  }[status] ?? '#D1D5DB');

  const formatDue = (ts?: number) => {
    if (!ts) return '';
    const d = new Date(ts);
    return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
  };
  // A task from 3 days ago must never read the same as one due today —
  // this distinction was previously missing entirely from the widget.
  const overdueDays = (ts?: number) => ts && ts < Date.now() ? Math.max(1, Math.floor((Date.now() - ts) / 86400000)) : 0;

  return (
    <div style={{ height: '100%', overflowY: 'auto', padding: '28px 32px', animation: 'fadeIn 200ms ease' }}>
      {/* Header */}
      <div style={{ marginBottom: 28, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontSize: 26, fontWeight: 600, color: 'var(--text)', letterSpacing: '-0.02em', lineHeight: 1.2 }}>{greeting}, {employee.name.split(' ')[0]}</div>
          <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>{today}</div>
        </div>
        <button
          onClick={handleClock}
          disabled={clockLoading}
          style={{ height: 38, padding: '0 18px', background: isClockedIn ? '#FEF2F2' : 'var(--accent)', color: isClockedIn ? '#DC2626' : '#fff', border: isClockedIn ? '1px solid #FECACA' : 'none', borderRadius: 8, fontSize: 13, fontWeight: 500, cursor: clockLoading ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: 7, flexShrink: 0 }}
        >
          <span style={{ width: 7, height: 7, borderRadius: '50%', background: isClockedIn ? '#DC2626' : '#22C55E', flexShrink: 0 }} />
          {clockLoading ? '…' : isClockedIn ? `Clock Out · ${workHours}` : 'Clock In'}
        </button>
      </div>

      {clockError && (
        <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: '#DC2626', marginBottom: 16 }}>
          {clockError}
        </div>
      )}

      {/* Pinned announcements */}
      {announcements.filter(a => a.pinned).slice(0, 1).map(a => (
        <div key={a.id} style={{ background: '#EFF6FF', border: '1px solid #BFDBFE', borderRadius: 10, padding: '12px 16px', marginBottom: 24, display: 'flex', gap: 12, alignItems: 'flex-start' }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" style={{ flexShrink: 0, marginTop: 1 }}><path d="M3 11l18-5v12L3 14v-3z"/></svg>
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--accent-pressed)', marginBottom: 2 }}>{a.title}</div>
            <div style={{ fontSize: 12, color: 'var(--accent)' }}>{a.body}</div>
          </div>
        </div>
      ))}

      {/* Birthday reminders */}
      {upcomingBirthdays.length > 0 && (
        <div style={{ background: '#FFF7ED', border: '1px solid #FDE68A', borderRadius: 12, padding: '12px 16px', marginBottom: 20, display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center' }}>
          <span style={{ fontSize: 20 }}>🎂</span>
          <div style={{ flex: 1, minWidth: 200 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#92400E', marginBottom: 2 }}>Upcoming Birthdays</div>
            <div style={{ fontSize: 12, color: '#B45309', display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {upcomingBirthdays.map(({ emp, daysAway }) => (
                <span key={emp.id} style={{ background: 'rgba(255,255,255,0.7)', borderRadius: 6, padding: '2px 8px' }}>
                  {emp.name.split(' ')[0]} — {daysAway === 0 ? 'Today! 🎉' : daysAway === 1 ? 'Tomorrow' : `in ${daysAway} days`}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12, marginBottom: 24 }}>
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, padding: '16px 18px' }}>
          <div style={{ fontSize: 11, fontWeight: 500, color: 'var(--text-muted)', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: 8 }}>Active today</div>
          <div style={{ fontSize: 24, fontWeight: 600, color: 'var(--text)', letterSpacing: '-0.02em' }}>{workHours}</div>
        </div>
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, padding: '16px 18px' }}>
          <div style={{ fontSize: 11, fontWeight: 500, color: 'var(--text-muted)', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: 8 }}>Completed</div>
          <div style={{ fontSize: 24, fontWeight: 600, color: 'var(--text)', letterSpacing: '-0.02em' }}>{pct}%</div>
        </div>
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, padding: '16px 18px' }}>
          <div style={{ fontSize: 11, fontWeight: 500, color: 'var(--text-muted)', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: 8 }}>Urgent</div>
          <div style={{ fontSize: 24, fontWeight: 600, color: urgent > 0 ? '#DC2626' : 'var(--text)', letterSpacing: '-0.02em' }}>{urgent}</div>
        </div>
        {/* The one "night band" — the contract's single inverted indigo island */}
        <div style={{ background: 'linear-gradient(135deg, #213183 0%, #17235e 100%)', borderRadius: 12, padding: '16px 18px' }}>
          <div style={{ fontSize: 11, fontWeight: 500, color: 'rgba(255,255,255,0.55)', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: 8 }}>Team active</div>
          <div style={{ fontSize: 24, fontWeight: 600, color: '#fff', letterSpacing: '-0.02em' }}>{activeCount}</div>
        </div>
      </div>

      {/* Progress bar */}
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, padding: '16px 18px', marginBottom: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
          <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-muted)' }}>Today's progress</span>
          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{total === 0 ? 'No tasks yet' : `${done} of ${total} tasks`}</span>
        </div>
        <div style={{ height: 5, background: 'var(--bg)', borderRadius: 99, overflow: 'hidden' }}>
          <div style={{ height: '100%', background: total === 0 ? 'transparent' : 'var(--text)', borderRadius: 99, width: `${pct}%`, transition: 'width 600ms ease' }} />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8, fontSize: 11, color: 'var(--text-muted)' }}>
          <span>{todo} to do</span>
          <span>{inProgress} in progress</span>
          <span>{done} done</span>
        </div>
      </div>

      {/* Two columns */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 20 }}>
        {/* My Tasks */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>My Tasks</span>
            <button onClick={() => onNavigate('tasks')} style={{ fontSize: 12, color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer' }}
              onMouseOver={e => (e.currentTarget as HTMLButtonElement).style.color = 'var(--text)'}
              onMouseOut={e => (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-muted)'}
            >View all →</button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {tasks.filter(t => t.status !== 'done')
              .sort((a, b) => (overdueDays(b.dueDate) > 0 ? 1 : 0) - (overdueDays(a.dueDate) > 0 ? 1 : 0))
              .slice(0, 5).map(task => {
              const late = overdueDays(task.dueDate);
              return (
                <div key={task.id} style={{ background: 'var(--surface)', border: late ? '1px solid rgba(221,91,0,0.35)' : '1px solid var(--border)', borderRadius: 8, padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 10, transition: 'border-color 150ms', cursor: 'default' }}
                  onMouseOver={e => (e.currentTarget as HTMLElement).style.borderColor = late ? 'rgba(221,91,0,0.5)' : 'var(--border-hover)'}
                  onMouseOut={e => (e.currentTarget as HTMLElement).style.borderColor = late ? 'rgba(221,91,0,0.35)' : 'var(--border)'}
                >
                  <div style={{ width: 7, height: 7, borderRadius: '50%', background: late ? '#dd5b00' : statusDot(task.status), flexShrink: 0 }} />
                  <span style={{ flex: 1, fontSize: 13, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{task.title}</span>
                  <span className={`badge-${task.priority}`}>{task.priority}</span>
                  {late > 0 ? (
                    <span title="Still incomplete — flagged to your admin if not done today" style={{ fontSize: 11, fontWeight: 600, color: '#dd5b00', background: 'rgba(221,91,0,0.10)', padding: '2px 8px', borderRadius: 99, flexShrink: 0 }}>
                      Overdue {late}d
                    </span>
                  ) : task.dueDate && (
                    <span style={{ fontSize: 11, color: 'var(--text-faint)', flexShrink: 0 }}>{formatDue(task.dueDate)}</span>
                  )}
                </div>
              );
            })}
            {tasks.filter(t => t.status !== 'done').length === 0 && (
              <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, padding: '20px', textAlign: 'center', fontSize: 13, color: 'var(--text-muted)' }}>
                No pending tasks · <button onClick={() => onNavigate('tasks')} style={{ color: 'var(--accent)', background: 'none', border: 'none', cursor: 'pointer', fontSize: 13 }}>Add one →</button>
              </div>
            )}
          </div>
        </div>

        {/* Messages + Quick actions */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>Messages</span>
            <button onClick={() => onNavigate('messages')} style={{ fontSize: 12, color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer' }}
              onMouseOver={e => (e.currentTarget as HTMLButtonElement).style.color = 'var(--text)'}
              onMouseOut={e => (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-muted)'}
            >Open →</button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 14 }}>
            {allEmployees.filter(e => e.id !== employee.id).slice(0, 3).map(emp => {
              const initials = emp.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
              const conv = recentConvs.find(c => c.emp.id === emp.id);
              return (
                <div key={emp.id} onClick={() => onNavigate('messages')}
                  style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, padding: '10px 12px', display: 'flex', alignItems: 'center', gap: 9, cursor: 'pointer', transition: 'border-color 150ms' }}
                  onMouseOver={e => (e.currentTarget as HTMLElement).style.borderColor = 'var(--border-hover)'}
                  onMouseOut={e => (e.currentTarget as HTMLElement).style.borderColor = 'var(--border)'}
                >
                  <div style={{ width: 30, height: 30, borderRadius: '50%', background: 'var(--text)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 600, color: 'var(--surface)', flexShrink: 0 }}>{initials}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--text)' }}>{emp.name}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{conv?.lastMsg || emp.department}</div>
                  </div>
                  {conv?.time && <span style={{ fontSize: 10, color: 'var(--text-faint)', flexShrink: 0 }}>{conv.time}</span>}
                </div>
              );
            })}
            {allEmployees.filter(e => e.id !== employee.id).length === 0 && (
              <div style={{ fontSize: 13, color: 'var(--text-muted)', padding: '12px 0' }}>No teammates yet.</div>
            )}
          </div>

          {/* Quick actions */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <button onClick={() => onNavigate('tasks')}
              style={{ padding: 10, background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12, fontWeight: 500, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}
              onMouseOver={e => (e.currentTarget as HTMLButtonElement).style.background = 'var(--border)'}
              onMouseOut={e => (e.currentTarget as HTMLButtonElement).style.background = 'var(--bg)'}
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>
              New task
            </button>
            <button onClick={() => onNavigate('messages')}
              style={{ padding: 10, background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12, fontWeight: 500, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}
              onMouseOver={e => (e.currentTarget as HTMLButtonElement).style.background = 'var(--border)'}
              onMouseOut={e => (e.currentTarget as HTMLButtonElement).style.background = 'var(--bg)'}
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
              Message
            </button>
            <button onClick={() => onNavigate('resources')}
              style={{ padding: 10, background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12, fontWeight: 500, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}
              onMouseOver={e => (e.currentTarget as HTMLButtonElement).style.background = 'var(--border)'}
              onMouseOut={e => (e.currentTarget as HTMLButtonElement).style.background = 'var(--bg)'}
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>
              Resources
            </button>
            <button onClick={() => onNavigate('announcements')}
              style={{ padding: 10, background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12, fontWeight: 500, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}
              onMouseOver={e => (e.currentTarget as HTMLButtonElement).style.background = 'var(--border)'}
              onMouseOut={e => (e.currentTarget as HTMLButtonElement).style.background = 'var(--bg)'}
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M3 11l18-5v12L3 14v-3z"/></svg>
              Announcements
            </button>
          </div>
        </div>
      </div>

      {/* Team Today — a tidy, aligned grid of teammates with a clear status
          dot per person and an at-a-glance online count in the header. */}
      {(() => {
        const mates = allEmployees.filter(e => e.id !== employee.id);
        const onlineCount = mates.filter(e => (e.status ?? 'offline') === 'active').length;
        const statusColor: Record<string, string> = { active: '#1aae39', idle: '#dd5b00', blocked: '#EF4444', offline: '#a39e98' };
        return (
          <div style={{ marginTop: 24, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: '16px 18px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>Team Today</span>
                <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{onlineCount} online · {mates.length} total</span>
              </div>
              <button onClick={() => onNavigate('team')} style={{ fontSize: 12, color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer' }}>View all →</button>
            </div>
            {mates.length === 0 ? (
              <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>No teammates yet.</p>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(96px, 1fr))', gap: 16 }}>
                {mates.slice(0, 12).map(emp => {
                  const av = avatarColor(emp.name);
                  const status = emp.status ?? 'offline';
                  return (
                    <div key={emp.id} title={`${emp.name} — ${status}`} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 7 }}>
                      <div style={{ position: 'relative' }}>
                        <div style={{ width: 44, height: 44, borderRadius: '50%', background: av.bg, color: av.fg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 600 }}>
                          {initialsOf(emp.name)}
                        </div>
                        <span style={{ position: 'absolute', right: -1, bottom: -1, width: 12, height: 12, borderRadius: '50%', background: statusColor[status], border: '2px solid var(--surface)' }} />
                      </div>
                      <span style={{ fontSize: 11, color: 'var(--text)', fontWeight: 500, maxWidth: 88, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{emp.name.split(' ')[0]}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })()}
      {/* Modals */}
      {showLogoutWarning && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }} onClick={() => setShowLogoutWarning(false)}>
          <div style={{ width: 380, background: 'var(--surface)', borderRadius: 12, padding: 28, boxShadow: '0 20px 60px rgba(0,0,0,0.2)', animation: 'scaleIn 150ms ease' }} onClick={e => e.stopPropagation()}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>🛑</div>
            <div style={{ fontSize: 17, fontWeight: 600, color: 'var(--text)', marginBottom: 8 }}>Wait! You still have open tasks.</div>
            <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 20, lineHeight: 1.5 }}>
              You have <strong>{tasks.filter(t => t.status !== 'done').length} tasks</strong> still marked as incomplete. Are you sure you want to clock out?
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={executeClock} style={{ flex: 1, height: 40, background: '#FEF2F2', color: '#DC2626', border: '1px solid #FECACA', borderRadius: 8, fontSize: 13, fontWeight: 500, cursor: 'pointer' }}>Clock out anyway</button>
              <button onClick={() => { setShowLogoutWarning(false); onNavigate('tasks'); }} style={{ flex: 1, height: 40, background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 500, cursor: 'pointer' }}>Finish tasks</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
