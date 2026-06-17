import { useState, useEffect } from 'react';
import type { Employee, LoginLog, Task, CheckInResponse } from '../types';
import { getTimeLogs, onUserTasksChange, getTodaysCheckIn } from '../services/firebase';

interface Props {
  employee: Employee;
  targetEmployee: Employee;
  allEmployees: Employee[];
}

function RingChart({ pct, color, size = 80, label }: { pct: number; color: string; size?: number; label: string }) {
  const r = (size - 12) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (pct / 100) * circ;
  return (
    <div className="flex flex-col items-center gap-1">
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="var(--surface2)" strokeWidth={10} />
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={10}
          strokeDasharray={circ} strokeDashoffset={offset}
          strokeLinecap="round" style={{ transition: 'stroke-dashoffset 0.8s ease' }} />
      </svg>
      <p className="text-xs font-semibold" style={{ color: 'var(--text)' }}>{Math.round(pct)}%</p>
      <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{label}</p>
    </div>
  );
}

function HourBar({ hour, minutes, maxMin }: { hour: number; minutes: number; maxMin: number }) {
  const pct = maxMin > 0 ? (minutes / maxMin) * 100 : 0;
  const label = hour === 0 ? '12am' : hour < 12 ? `${hour}am` : hour === 12 ? '12pm' : `${hour-12}pm`;
  return (
    <div className="flex flex-col items-center gap-1 flex-1">
      <div className="w-full flex items-end justify-center" style={{ height: 60 }}>
        <div className="w-4 rounded-t transition-all duration-700"
          style={{ height: `${pct}%`, minHeight: pct > 0 ? 4 : 0, background: 'var(--indigo,#6366F1)' }} />
      </div>
      <p className="text-[9px] text-center" style={{ color: 'var(--text-muted)' }}>{label}</p>
    </div>
  );
}

export default function ScreentimePage({ targetEmployee }: Props) {
  const [logs, setLogs]     = useState<LoginLog[]>([]);
  const [tasks, setTasks]   = useState<Task[]>([]);
  const [checkin, setCheckin] = useState<CheckInResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const run = async () => {
      const [fetchedLogs] = await Promise.all([getTimeLogs(targetEmployee.id, 7)]);
      setLogs(fetchedLogs);
      getTodaysCheckIn(targetEmployee.id).then(setCheckin);
      setLoading(false);
    };
    run();
    const unsub = onUserTasksChange(targetEmployee.id, setTasks);
    return unsub;
  }, [targetEmployee.id]);

  // Build hourly activity map for today
  const todayStr = new Date().toISOString().split('T')[0];
  const todayLog = logs.find(l => l.date === todayStr);
  const hourActivity: number[] = new Array(24).fill(0);
  if (todayLog?.loginTime) {
    const start = new Date(todayLog.loginTime);
    const end   = todayLog.logoutTime ? new Date(todayLog.logoutTime) : new Date();
    for (let ms = start.getTime(); ms < end.getTime(); ms += 60000) {
      hourActivity[new Date(ms).getHours()]++;
    }
  }
  const maxMin = Math.max(...hourActivity, 1);

  // Stats
  const totalHours = logs.reduce((s, l) => s + (l.duration ?? 0), 0);
  const avgHours   = logs.length > 0 ? totalHours / logs.filter(l => l.logoutTime).length : 0;
  const todayHours = todayLog ? ((todayLog.logoutTime ?? Date.now()) - todayLog.loginTime) / 3600000 : 0;
  const tasksDone  = tasks.filter(t => t.status === 'done').length;
  const taskTotal  = tasks.length;
  const taskPct    = taskTotal > 0 ? (tasksDone / taskTotal) * 100 : 0;

  const initials = targetEmployee.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  const ring = { active: 'avatar-active', idle: 'avatar-idle', blocked: 'avatar-blocked', offline: 'avatar-offline' }[targetEmployee.status ?? 'offline'];

  if (loading) {
    return <div className="flex items-center justify-center p-20"><div className="loading-spinner" /></div>;
  }

  return (
    <div className="p-6 space-y-6 animate-slide-in">
      {/* Profile Header */}
      <div className="card p-6 flex items-start gap-5">
        <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-2xl font-bold ${ring}`}>
          {initials}
        </div>
        <div className="flex-1">
          <h2 className="text-xl font-bold" style={{ color: 'var(--text)' }}>{targetEmployee.name}</h2>
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>{targetEmployee.department} · {targetEmployee.role}</p>
          <p className="text-sm mt-0.5" style={{ color: 'var(--text-muted)' }}>{targetEmployee.email}</p>
          <div className="flex items-center gap-2 mt-2">
            <span className={`text-xs px-2.5 py-0.5 rounded-full font-medium capitalize ${
              targetEmployee.status === 'active'  ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
              targetEmployee.status === 'idle'    ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' :
              targetEmployee.status === 'blocked' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' :
                                                    'bg-gray-100 text-gray-600 dark:bg-gray-800'
            }`}>
              {targetEmployee.status ?? 'offline'}
            </span>
            {targetEmployee.shiftStart && (
              <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                🕐 {targetEmployee.shiftStart} – {targetEmployee.shiftEnd ?? '?'}
              </span>
            )}
          </div>
        </div>

        {/* Activity rings */}
        <div className="flex gap-4">
          <RingChart pct={Math.min(100, (todayHours / 8) * 100)} color="#10B981" label="Work hrs" />
          <RingChart pct={taskPct} color="#6366F1" label="Tasks" />
          {checkin && <RingChart pct={{ great: 100, good: 80, okay: 60, rough: 40, bad: 20 }[checkin.mood]} color="#F59E0B" label="Mood" />}
        </div>
      </div>

      {/* Today's Timeline */}
      <div className="card p-5">
        <h3 className="font-semibold mb-4" style={{ color: 'var(--text)' }}>📊 Today's Activity</h3>
        <div className="flex items-end gap-1">
          {hourActivity.map((min, h) => <HourBar key={h} hour={h} minutes={min} maxMin={maxMin} />)}
        </div>
        <div className="flex justify-between mt-2 text-xs" style={{ color: 'var(--text-muted)' }}>
          <span>12am</span><span>6am</span><span>12pm</span><span>6pm</span><span>11pm</span>
        </div>
        {todayLog && (
          <p className="text-xs mt-3" style={{ color: 'var(--text-muted)' }}>
            Clocked in {new Date(todayLog.loginTime).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })}
            {todayLog.logoutTime ? ` · Out ${new Date(todayLog.logoutTime).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })}` : ' · Currently active'}
            {' '}· Total: {todayHours.toFixed(1)}h
          </p>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 7-day Summary */}
        <div className="card p-5">
          <h3 className="font-semibold mb-4" style={{ color: 'var(--text)' }}>📅 Last 7 Days</h3>
          {logs.length === 0 ? (
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>No data yet.</p>
          ) : (
            <div className="space-y-2">
              {logs.slice(0, 7).map(log => {
                const dur = log.duration ?? (log.logoutTime ? (log.logoutTime - log.loginTime) / 3600000 : null);
                const pct = dur ? Math.min(100, (dur / 8) * 100) : 0;
                return (
                  <div key={log.id}>
                    <div className="flex justify-between text-xs mb-1" style={{ color: 'var(--text-muted)' }}>
                      <span>{new Date(log.date).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })}</span>
                      <span className="font-semibold" style={{ color: 'var(--text)' }}>
                        {dur ? `${dur.toFixed(1)}h` : log.logoutTime ? '—' : 'Active'}
                      </span>
                    </div>
                    <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--surface2)' }}>
                      <div className="h-full rounded-full" style={{ width: `${pct}%`, background: '#6366F1' }} />
                    </div>
                  </div>
                );
              })}
              <p className="text-xs pt-2" style={{ color: 'var(--text-muted)' }}>
                Avg: {avgHours.toFixed(1)}h/day · Total: {totalHours.toFixed(1)}h
              </p>
            </div>
          )}
        </div>

        {/* Tasks & Check-in */}
        <div className="space-y-4">
          <div className="card p-5">
            <h3 className="font-semibold mb-3" style={{ color: 'var(--text)' }}>📋 Task Summary</h3>
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: 'Total',       value: taskTotal,                              color: 'text-gray-600' },
                { label: 'Done',        value: tasksDone,                              color: 'text-green-600' },
                { label: 'In Progress', value: tasks.filter(t => t.status === 'in_progress').length, color: 'text-blue-600' },
                { label: 'Urgent',      value: tasks.filter(t => t.priority === 'urgent' && t.status !== 'done').length, color: 'text-red-600' },
              ].map(s => (
                <div key={s.label} className="text-center p-3 rounded-lg" style={{ background: 'var(--surface2)' }}>
                  <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{s.label}</p>
                </div>
              ))}
            </div>
          </div>

          {checkin && (
            <div className="card p-5">
              <h3 className="font-semibold mb-3" style={{ color: 'var(--text)' }}>✅ Today's Check-In</h3>
              <div className="flex items-center gap-3 mb-3">
                <span className="text-3xl">{{ great: '😄', good: '🙂', okay: '😐', rough: '😟', bad: '😢' }[checkin.mood]}</span>
                <div>
                  <p className="font-medium text-sm capitalize" style={{ color: 'var(--text)' }}>{checkin.mood}</p>
                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{checkin.hasProblems ? '⚠️ Issues flagged' : '✓ No issues'}</p>
                </div>
              </div>
              {checkin.workDone && (
                <p className="text-sm" style={{ color: 'var(--text-muted)' }}>"{checkin.workDone}"</p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
