import { useState, useEffect } from 'react';
import type { Employee, Task, LoginLog } from '../../types';
import { onAllTasksChange, onLoginLogsChange, todayKey } from '../../services/firebase';

interface Props {
  employee: Employee;
  allEmployees: Employee[];
}

const STATUS_DOT: Record<string, string> = {
  active: '#22C55E', idle: '#F59E0B', blocked: '#EF4444', offline: '#D1D5DB',
};

const ACCENT_BAR: Record<string, string> = {
  active: '#22C55E', idle: '#F59E0B', blocked: '#EF4444', offline: '#E9E9E7',
};

const STATE_LABEL: Record<string, string> = {
  active: 'Active', idle: 'Idle', blocked: 'Blocked', offline: 'Offline',
};

const STATE_BG: Record<string, string> = {
  active: '#DCFCE7', idle: '#FEF3C7', blocked: '#FEE2E2', offline: '#F3F3F2',
};

const STATE_FG: Record<string, string> = {
  active: '#166534', idle: '#78350F', blocked: '#7F1D1D', offline: '#666',
};

const PRIORITY_COLOR: Record<string, string> = {
  urgent: '#DC2626', high: '#EA580C', medium: '#CA8A04', low: '#16A34A',
};

const STATUS_BG: Record<string, string> = {
  todo: '#F3F3F2', in_progress: '#FEF3C7', blocked: '#FEE2E2', done: '#DCFCE7',
};

const STATUS_FG: Record<string, string> = {
  todo: '#666', in_progress: '#78350F', blocked: '#7F1D1D', done: '#166534',
};

const STATUS_LABEL: Record<string, string> = {
  todo: 'To do', in_progress: 'In progress', blocked: 'Blocked', done: 'Done',
};

export default function AdminOverview({ allEmployees }: Props) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [logs, setLogs]   = useState<LoginLog[]>([]);
  const [widgetStats, setWidgetStats]       = useState(true);
  const [widgetActivity, setWidgetActivity] = useState(true);
  const [widgetQueue, setWidgetQueue]       = useState(true);
  const [showCustomize, setShowCustomize]   = useState(false);
  const [deptFilter, setDeptFilter]         = useState<string>('all');

  const departments = ['all', ...Array.from(new Set(allEmployees.map(e => e.department).filter(Boolean)))];

  useEffect(() => {
    const u1 = onAllTasksChange(setTasks);
    const u2 = onLoginLogsChange(setLogs);
    return () => { u1(); u2(); };
  }, []);

  const today = todayKey();
  const todayLogs = logs.filter(l => l.date === today);
  const activeNow = todayLogs.filter(l => !l.logoutTime).length;
  const openTasks = tasks.filter(t => t.status !== 'done').length;
  const urgentCount = tasks.filter(t => t.priority === 'urgent' && t.status !== 'done').length;
  const doneCount = tasks.filter(t => t.status === 'done').length;

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const todayLabel = new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' });

  const deptEmployees = deptFilter === 'all' ? allEmployees : allEmployees.filter(e => e.department === deptFilter);
  const activePres = deptEmployees.filter(e => e.status === 'active' || e.status === 'idle').length;
  const blockedPres = deptEmployees.filter(e => e.status === 'blocked').length;

  const recentTasks = tasks
    .filter(t => t.status !== 'done')
    .sort((a, b) => {
      const p = { urgent: 4, high: 3, medium: 2, low: 1 };
      return (p[b.priority] ?? 0) - (p[a.priority] ?? 0);
    })
    .slice(0, 8);

  const widgets = [
    { label: 'Stats', on: widgetStats,    toggle: () => setWidgetStats(v => !v) },
    { label: 'Team presence', on: widgetActivity, toggle: () => setWidgetActivity(v => !v) },
    { label: 'Task queue',    on: widgetQueue,    toggle: () => setWidgetQueue(v => !v) },
  ];

  return (
    <div style={{ height: '100%', overflowY: 'auto', padding: '28px 32px', animation: 'fadeIn 200ms ease' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <div style={{ fontSize: 26, fontWeight: 600, color: 'var(--text)', letterSpacing: '-0.02em' }}>{greeting}</div>
          <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>{todayLabel} · Admin view</div>
        </div>
        <div style={{ position: 'relative' }}>
          <button
            onClick={() => setShowCustomize(v => !v)}
            style={{ height: 34, padding: '0 14px', background: showCustomize ? 'var(--bg)' : 'var(--surface)', color: 'var(--text-muted)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12, fontWeight: 500, display: 'flex', alignItems: 'center', gap: 7, cursor: 'pointer', transition: 'all 150ms' }}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="4" y1="21" x2="4" y2="14"/><line x1="4" y1="10" x2="4" y2="3"/>
              <line x1="12" y1="21" x2="12" y2="12"/><line x1="12" y1="8" x2="12" y2="3"/>
              <line x1="20" y1="21" x2="20" y2="16"/><line x1="20" y1="12" x2="20" y2="3"/>
              <line x1="1" y1="14" x2="7" y2="14"/><line x1="9" y1="8" x2="15" y2="8"/><line x1="17" y1="16" x2="23" y2="16"/>
            </svg>
            Customize
          </button>
          {showCustomize && (
            <div style={{ position: 'absolute', top: 42, right: 0, width: 220, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, boxShadow: '0 12px 40px rgba(0,0,0,0.12)', padding: 8, zIndex: 40 }}>
              <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-faint)', padding: '6px 8px' }}>Visible widgets</div>
              {widgets.map(w => (
                <button key={w.label} onClick={w.toggle}
                  style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 8px', border: 'none', background: 'transparent', borderRadius: 7, fontSize: 13, color: 'var(--text)', textAlign: 'left', cursor: 'pointer', transition: 'background 120ms' }}
                  onMouseOver={e => (e.currentTarget as HTMLButtonElement).style.background = 'var(--bg)'}
                  onMouseOut={e => (e.currentTarget as HTMLButtonElement).style.background = 'transparent'}
                >
                  {w.label}
                  <span style={{ width: 30, height: 18, borderRadius: 99, background: w.on ? '#111' : '#E9E9E7', position: 'relative', flexShrink: 0, transition: 'background 150ms', display: 'inline-block' }}>
                    <span style={{ position: 'absolute', top: 2, left: w.on ? 14 : 2, width: 14, height: 14, borderRadius: '50%', background: '#fff', transition: 'left 150ms', display: 'block' }} />
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Department filter tabs */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 20 }}>
        {departments.map(d => (
          <button key={d} onClick={() => setDeptFilter(d)}
            style={{ height: 30, padding: '0 14px', borderRadius: 99, fontSize: 12, fontWeight: 500, cursor: 'pointer', border: '1px solid', transition: 'all 150ms',
              background: deptFilter === d ? '#111' : 'var(--surface)',
              color: deptFilter === d ? '#fff' : 'var(--text-muted)',
              borderColor: deptFilter === d ? '#111' : 'var(--border)',
            }}>
            {d === 'all' ? 'All Departments' : d}
          </button>
        ))}
      </div>

      {/* Stats widget */}
      {widgetStats && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12, marginBottom: 24 }}>
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, padding: '16px 18px' }}>
            <div style={{ fontSize: 11, fontWeight: 500, color: 'var(--text-muted)', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: 8 }}>Team online</div>
            <div style={{ fontSize: 28, fontWeight: 600, color: 'var(--text)', letterSpacing: '-0.02em' }}>
              {activeNow}<span style={{ fontSize: 16, color: 'var(--text-faint)', fontWeight: 400 }}>/{allEmployees.length}</span>
            </div>
          </div>
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, padding: '16px 18px' }}>
            <div style={{ fontSize: 11, fontWeight: 500, color: 'var(--text-muted)', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: 8 }}>Active tasks</div>
            <div style={{ fontSize: 28, fontWeight: 600, color: 'var(--text)', letterSpacing: '-0.02em' }}>{openTasks}</div>
          </div>
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, padding: '16px 18px' }}>
            <div style={{ fontSize: 11, fontWeight: 500, color: 'var(--text-muted)', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: 8 }}>Urgent</div>
            <div style={{ fontSize: 28, fontWeight: 600, color: urgentCount > 0 ? '#DC2626' : 'var(--text)', letterSpacing: '-0.02em' }}>{urgentCount}</div>
          </div>
          <div style={{ background: '#111', borderRadius: 10, padding: '16px 18px' }}>
            <div style={{ fontSize: 11, fontWeight: 500, color: 'rgba(255,255,255,0.5)', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: 8 }}>Completed</div>
            <div style={{ fontSize: 28, fontWeight: 600, color: '#fff', letterSpacing: '-0.02em' }}>{doneCount}</div>
          </div>
        </div>
      )}

      {/* Team presence */}
      {widgetActivity && (
        <div style={{ marginBottom: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>Team presence</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: '#22C55E', fontWeight: 500 }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#22C55E', display: 'inline-block' }} />
              Live
            </span>
            <span style={{ fontSize: 12, color: 'var(--text-muted)', marginLeft: 6 }}>{activePres} active · {blockedPres} blocked</span>
          </div>
          {deptEmployees.length === 0 ? (
            <div style={{ padding: '24px 0', fontSize: 13, color: 'var(--text-muted)' }}>No employees yet.</div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(196px, 1fr))', gap: 12 }}>
              {deptEmployees.map(emp => {
                const initials = emp.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
                const status = emp.status ?? 'offline';
                const todayLog = todayLogs.find(l => l.employeeId === emp.id && !l.logoutTime);
                const loginTime = todayLog?.loginTime
                  ? new Date(todayLog.loginTime).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })
                  : null;
                return (
                  <div key={emp.id}
                    style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: '14px 15px 13px', position: 'relative', overflow: 'hidden', transition: 'border-color 150ms, box-shadow 150ms', cursor: 'default' }}
                    onMouseOver={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--border-hover)'; (e.currentTarget as HTMLElement).style.boxShadow = '0 3px 12px rgba(0,0,0,0.06)'; }}
                    onMouseOut={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--border)'; (e.currentTarget as HTMLElement).style.boxShadow = 'none'; }}
                  >
                    <span style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: 3, background: ACCENT_BAR[status] }} />
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 11 }}>
                      <div style={{ position: 'relative', flexShrink: 0 }}>
                        <div style={{ width: 36, height: 36, borderRadius: '50%', background: '#111', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 600, color: '#fff' }}>{initials}</div>
                        <span style={{ position: 'absolute', bottom: -1, right: -1, width: 11, height: 11, borderRadius: '50%', background: STATUS_DOT[status], border: '2px solid var(--surface)' }} />
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{emp.name}</div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{emp.department}</div>
                      </div>
                    </div>
                    <span style={{ display: 'inline-block', padding: '3px 10px', borderRadius: 99, fontSize: 11, fontWeight: 600, background: STATE_BG[status], color: STATE_FG[status], marginBottom: 9 }}>
                      {STATE_LABEL[status]}
                    </span>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.45 }}>
                      {loginTime ? `Logged in at ${loginTime}` : status === 'offline' ? 'Not logged in today' : emp.department}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Task queue */}
      {widgetQueue && (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>Task queue</span>
            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{openTasks} open</span>
          </div>
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden' }}>
            {recentTasks.length === 0 ? (
              <div style={{ padding: '24px 16px', textAlign: 'center', fontSize: 13, color: 'var(--text-muted)' }}>No open tasks — all clear!</div>
            ) : (
              recentTasks.map((task, i) => (
                <div key={task.id}
                  style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px', borderBottom: i < recentTasks.length - 1 ? '1px solid var(--border-subtle)' : 'none', transition: 'background 120ms' }}
                  onMouseOver={e => (e.currentTarget as HTMLElement).style.background = 'var(--bg)'}
                  onMouseOut={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}
                >
                  <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-faint)', width: 18, flexShrink: 0 }}>{i + 1}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{task.title}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{task.assigneeName}</div>
                  </div>
                  <span style={{ fontSize: 11, color: PRIORITY_COLOR[task.priority] ?? 'var(--text-muted)', fontWeight: 600, textTransform: 'capitalize', flexShrink: 0 }}>{task.priority}</span>
                  <span style={{ padding: '2px 8px', borderRadius: 4, fontSize: 10, fontWeight: 500, background: STATUS_BG[task.status] ?? '#F3F3F2', color: STATUS_FG[task.status] ?? '#666', flexShrink: 0 }}>
                    {STATUS_LABEL[task.status] ?? task.status}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
