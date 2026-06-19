import { useState, useEffect, useRef } from 'react';
import type { Employee, Task, LoginLog, CheckInResponse, ActivityEntry } from '../../types';
import { onAllTasksChange, onLoginLogsChange, onCheckInsChange, onActivityChange, updateEmployeeStatus, todayKey } from '../../services/firebase';

interface Props {
  employee: Employee;
  allEmployees: Employee[];
}

function AITimer({ action, onConfirm, onCancel }: { action: string; onConfirm: () => void; onCancel: () => void }) {
  const [remaining, setRemaining] = useState(4);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    intervalRef.current = setInterval(() => {
      setRemaining(r => {
        if (r <= 1) { clearInterval(intervalRef.current!); onConfirm(); return 0; }
        return r - 1;
      });
    }, 1000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, []);

  const pct = ((4 - remaining) / 4) * 100;

  return (
    <div className="fixed bottom-6 right-6 z-50 card p-4 shadow-2xl w-72 border-l-4 border-orange-500 animate-slide-in">
      <div className="flex items-start justify-between mb-2">
        <p className="font-semibold text-sm" style={{ color: 'var(--text)' }}>⚡ AI Action</p>
        <span className="text-lg font-mono font-bold text-orange-500">{remaining}s</span>
      </div>
      <p className="text-xs mb-3" style={{ color: 'var(--text-muted)' }}>{action}</p>
      <div className="h-1.5 rounded-full overflow-hidden mb-3" style={{ background: 'var(--surface2)' }}>
        <div className="h-full rounded-full bg-orange-500 transition-all duration-1000" style={{ width: `${pct}%` }} />
      </div>
      <button onClick={() => { clearInterval(intervalRef.current!); onCancel(); }}
        className="w-full py-1.5 rounded-lg text-xs font-medium text-red-500 border border-red-200 dark:border-red-800 hover:bg-red-50 dark:hover:bg-red-900/20 transition">
        Cancel Action
      </button>
    </div>
  );
}

export default function AdminOverview({ employee, allEmployees }: Props) {
  const [tasks, setTasks]           = useState<Task[]>([]);
  const [logs, setLogs]             = useState<LoginLog[]>([]);
  const [checkIns, setCheckIns]     = useState<CheckInResponse[]>([]);
  const [activity, setActivity]     = useState<ActivityEntry[]>([]);
  const [aiTimer, setAiTimer]       = useState<{ action: string; fn: () => void } | null>(null);
  const [, setNowTick]              = useState(0);

  useEffect(() => {
    const u1 = onAllTasksChange(setTasks);
    const u2 = onLoginLogsChange(setLogs);
    const u3 = onCheckInsChange(setCheckIns);
    const u4 = onActivityChange(setActivity);
    return () => { u1(); u2(); u3(); u4(); };
  }, []);

  // Refresh "X ago" labels every minute.
  useEffect(() => {
    const id = setInterval(() => setNowTick(t => t + 1), 60000);
    return () => clearInterval(id);
  }, []);

  const today = todayKey();
  const todayLogs  = logs.filter(l => l.date === today);
  const activeNow  = todayLogs.filter(l => !l.logoutTime).length;
  const todayCI    = checkIns.filter(ci => (ci as any).dateKey === today || todayKey(new Date((ci as any).date)) === today);
  const issues     = todayCI.filter(ci => ci.hasProblems);
  const openTasks  = tasks.filter(t => t.status !== 'done').length;
  const urgentTasks = tasks.filter(t => t.priority === 'urgent' && t.status !== 'done');

  const avgMoodScore = todayCI.length > 0
    ? todayCI.reduce((s, ci) => s + ({ great:5, good:4, okay:3, rough:2, bad:1 }[ci.mood] ?? 3), 0) / todayCI.length
    : null;

  const triggerAI = (label: string, fn: () => void) => {
    setAiTimer({ action: label, fn });
  };

  const handleMarkAllIdle = () => {
    triggerAI('Mark all clocked-in employees as "idle"', () => {
      allEmployees.filter(e => e.status === 'active').forEach(e => updateEmployeeStatus(e.id, 'idle'));
      setAiTimer(null);
    });
  };

  return (
    <div className="p-6 space-y-6 animate-slide-in">
      {aiTimer && (
        <AITimer
          action={aiTimer.action}
          onConfirm={aiTimer.fn}
          onCancel={() => setAiTimer(null)}
        />
      )}

      <div>
        <h2 className="text-2xl font-bold" style={{ color: 'var(--text)' }}>📊 Admin Overview</h2>
        <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
          {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { icon: '🟢', label: 'Active Now',    value: activeNow,        total: allEmployees.length, color: 'text-green-600' },
          { icon: '✅', label: 'Checked In',    value: todayCI.length,   total: allEmployees.length, color: 'text-blue-600' },
          { icon: '⚠️', label: 'Issues Flagged', value: issues.length,   total: todayCI.length,      color: 'text-red-600' },
          { icon: '📋', label: 'Open Tasks',    value: openTasks,        total: tasks.length,         color: 'text-purple-600' },
        ].map(s => (
          <div key={s.label} className="card p-5">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xl">{s.icon}</span>
              <span className="text-xs" style={{ color: 'var(--text-muted)' }}>of {s.total}</span>
            </div>
            <p className={`text-3xl font-extrabold ${s.color}`}>{s.value}</p>
            <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>{s.label}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Urgent Tasks */}
        <div className="lg:col-span-2 card p-5">
          <h3 className="font-semibold mb-4 flex items-center gap-2" style={{ color: 'var(--text)' }}>
            🚨 Urgent Tasks
            <span className="text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-700">{urgentTasks.length}</span>
          </h3>
          {urgentTasks.length === 0 ? (
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>No urgent tasks — great! 🎉</p>
          ) : (
            <div className="space-y-2">
              {urgentTasks.slice(0, 8).map(task => (
                <div key={task.id} className="flex items-center gap-3 p-3 rounded-lg" style={{ background: 'var(--surface2)' }}>
                  <span className="text-red-500 text-sm">🚨</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate" style={{ color: 'var(--text)' }}>{task.title}</p>
                    <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{task.assigneeName} · {task.status}</p>
                  </div>
                  {task.dueDate && (
                    <span className="text-xs text-red-500">
                      {new Date(task.dueDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Quick Actions + Mood */}
        <div className="space-y-4">
          <div className="card p-5">
            <h3 className="font-semibold mb-3" style={{ color: 'var(--text)' }}>⚡ Quick Actions</h3>
            <div className="space-y-2">
              <button onClick={handleMarkAllIdle}
                className="w-full text-left p-3 rounded-lg border text-sm font-medium transition hover:border-orange-400"
                style={{ background: 'var(--surface2)', borderColor: 'var(--border)', color: 'var(--text)' }}>
                😴 Mark all as idle
              </button>
            </div>
            <p className="text-xs mt-2" style={{ color: 'var(--text-muted)' }}>Actions run after 4-second confirmation window</p>
          </div>

          {avgMoodScore !== null && (
            <div className="card p-5">
              <h3 className="font-semibold mb-3" style={{ color: 'var(--text)' }}>😊 Team Mood Today</h3>
              <div className="flex items-center gap-3">
                <div className="text-4xl">
                  {avgMoodScore >= 4.5 ? '😄' : avgMoodScore >= 3.5 ? '🙂' : avgMoodScore >= 2.5 ? '😐' : avgMoodScore >= 1.5 ? '😟' : '😢'}
                </div>
                <div>
                  <p className="text-2xl font-bold" style={{ color: 'var(--text)' }}>{avgMoodScore.toFixed(1)}/5</p>
                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Avg across {todayCI.length} check-ins</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Issues from check-ins */}
      {issues.length > 0 && (
        <div className="card p-5 border-l-4 border-red-500">
          <h3 className="font-semibold mb-3 text-red-600">⚠️ Flagged Issues ({issues.length})</h3>
          <div className="space-y-3">
            {issues.map(ci => (
              <div key={ci.id} className="p-3 rounded-lg" style={{ background: 'var(--surface2)' }}>
                <p className="font-medium text-sm" style={{ color: 'var(--text)' }}>{ci.employeeName}</p>
                {ci.problemDetails && (
                  <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>"{ci.problemDetails}"</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Live Activity Feed */}
      <div className="card p-5">
        <h3 className="font-semibold mb-4" style={{ color: 'var(--text)' }}>⚡ Live Activity Feed</h3>
        {activity.length === 0 ? (
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>No activity yet today.</p>
        ) : (
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {activity.slice(0, 30).map(a => {
              const icon = { login: '🟢', logout: '🔴', task_done: '✅', check_in: '📋', message: '💬', task_created: '📌' }[a.type] ?? '•';
              const mins = Math.round((Date.now() - a.timestamp) / 60000);
              const timeStr = mins < 60 ? `${mins}m ago` : `${Math.floor(mins/60)}h ago`;
              return (
                <div key={a.id} className="flex items-center gap-3 text-sm">
                  <span>{icon}</span>
                  <span className="font-medium" style={{ color: 'var(--text)' }}>{a.employeeName}</span>
                  <span className="flex-1" style={{ color: 'var(--text-muted)' }}>{a.detail}</span>
                  <span className="text-xs flex-shrink-0" style={{ color: 'var(--text-muted)' }}>{timeStr}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
