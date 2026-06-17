import { useState, useEffect } from 'react';
import type { Employee, Task, LoginLog, CheckInResponse, Announcement } from '../types';
import {
  onUserTasksChange, getTodaysLog, logLogin, logLogout,
  getTodaysCheckIn, filterAnnouncements, onAnnouncementsChange,
  getTodaysActiveCount,
} from '../services/firebase';

interface Props {
  employee: Employee;
  allEmployees: Employee[];
  onNavigate: (page: string) => void;
}

const StatCard = ({ icon, label, value, sub, color }: {
  icon: string; label: string; value: string | number; sub?: string; color: string;
}) => (
  <div className="stat-card animate-count-up">
    <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl mb-3 ${color}`}>{icon}</div>
    <div className="text-2xl font-bold" style={{ color: 'var(--text)' }}>{value}</div>
    <div className="text-sm font-medium mt-0.5" style={{ color: 'var(--text)' }}>{label}</div>
    {sub && <div className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>{sub}</div>}
  </div>
);

export default function Dashboard({ employee, allEmployees, onNavigate }: Props) {
  const [tasks, setTasks]               = useState<Task[]>([]);
  const [log, setLog]                   = useState<LoginLog | null>(null);
  const [checkin, setCheckin]           = useState<CheckInResponse | null>(null);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [activeCount, setActiveCount]   = useState<number>(0);
  const [workHours, setWorkHours]       = useState('0h 0m');
  const [clockLoading, setClockLoading] = useState(false);

  useEffect(() => {
    const unsub = onUserTasksChange(employee.id, setTasks);
    getTodaysLog(employee.id).then(setLog);
    getTodaysCheckIn(employee.id).then(setCheckin);
    getTodaysActiveCount().then(setActiveCount);
    const unsubA = onAnnouncementsChange(items => setAnnouncements(filterAnnouncements(items, employee)));
    return () => { unsub(); unsubA(); };
  }, [employee]);

  // live work-hours counter
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
    setClockLoading(true);
    try {
      if (!log || log.logoutTime) {
        await logLogin(employee.id, employee.name);
        const newLog = await getTodaysLog(employee.id);
        setLog(newLog);
      } else {
        await logLogout(log.id, employee.id);
        setLog(prev => prev ? { ...prev, logoutTime: Date.now() } : null);
      }
    } finally { setClockLoading(false); }
  };

  const todo       = tasks.filter(t => t.status === 'todo').length;
  const inProgress = tasks.filter(t => t.status === 'in_progress').length;
  const done       = tasks.filter(t => t.status === 'done').length;
  const urgent     = tasks.filter(t => t.priority === 'urgent' && t.status !== 'done').length;
  const total      = tasks.length;
  const pct        = total ? Math.round((done / total) * 100) : 0;
  const isClockedIn = log && !log.logoutTime;

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  return (
    <div className="p-6 space-y-6 animate-slide-in">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-2xl font-bold" style={{ color: 'var(--text)' }}>{greeting}, {employee.name.split(' ')[0]} 👋</h2>
          <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
            {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}
          </p>
        </div>

        {/* Clock In/Out */}
        <div className="flex flex-col items-end gap-1">
          <button
            onClick={handleClock}
            disabled={clockLoading}
            className={`px-5 py-2.5 rounded-xl font-semibold text-white transition shadow-lg hover:scale-105 ${
              isClockedIn ? 'bg-red-500 hover:bg-red-600' : 'bg-green-500 hover:bg-green-600'
            } disabled:opacity-60`}
          >
            {clockLoading ? '…' : isClockedIn ? '🔴 Clock Out' : '🟢 Clock In'}
          </button>
          {isClockedIn && (
            <p className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>{workHours} today</p>
          )}
        </div>
      </div>

      {/* Announcements banner */}
      {announcements.filter(a => a.pinned).map(a => (
        <div key={a.id} className="flex items-start gap-3 p-4 rounded-xl border-l-4 border-blue-500"
          style={{ background: 'var(--surface)', borderTopColor: 'var(--border)', borderRightColor: 'var(--border)', borderBottomColor: 'var(--border)' }}
        >
          <span className="text-xl">📢</span>
          <div>
            <p className="font-semibold text-sm" style={{ color: 'var(--text)' }}>{a.title}</p>
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>{a.body}</p>
          </div>
        </div>
      ))}

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon="👥" label="Active Today"  value={activeCount}  color="bg-green-100 dark:bg-green-900/30"  />
        <StatCard icon="✅" label="Completed"     value={`${pct}%`}   color="bg-blue-100 dark:bg-blue-900/30"    />
        <StatCard icon="🚨" label="Urgent"        value={urgent}       color="bg-red-100 dark:bg-red-900/30"     />
        <StatCard icon="🔄" label="In Progress"   value={inProgress}   color="bg-purple-100 dark:bg-purple-900/30" />
      </div>

      {/* Progress bar */}
      <div className="card p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-sm" style={{ color: 'var(--text)' }}>Today's Progress</h3>
          <span className="text-sm font-bold" style={{ color: 'var(--text-muted)' }}>{done} of {total} tasks</span>
        </div>
        <div className="h-3 rounded-full overflow-hidden" style={{ background: 'var(--surface2)' }}>
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{ width: `${pct}%`, background: 'linear-gradient(90deg,#6366F1,#8B5CF6)' }}
          />
        </div>
        <div className="flex justify-between mt-2 text-xs" style={{ color: 'var(--text-muted)' }}>
          <span>{todo} To Do</span>
          <span>{inProgress} In Progress</span>
          <span>{done} Done</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* My Tasks */}
        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold" style={{ color: 'var(--text)' }}>📋 My Tasks</h3>
            <button onClick={() => onNavigate('tasks')} className="text-xs text-blue-500 hover:text-blue-600 font-medium">View all →</button>
          </div>
          {tasks.length === 0 ? (
            <div className="text-center py-6">
              <p className="text-sm" style={{ color: 'var(--text-muted)' }}>No tasks yet.</p>
              <button onClick={() => onNavigate('tasks')}
                className="mt-2 text-sm text-blue-500 hover:underline font-medium">Add one →</button>
            </div>
          ) : (
            <div className="space-y-2">
              {tasks.filter(t => t.status !== 'done').slice(0, 5).map(task => {
                const badgeClass = { urgent: 'badge-urgent', high: 'badge-high', medium: 'badge-medium', low: 'badge-low' }[task.priority];
                return (
                  <div key={task.id} className="flex items-center gap-3 p-3 rounded-lg" style={{ background: 'var(--surface2)' }}>
                    <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
                      task.status === 'in_progress' ? 'bg-blue-500' :
                      task.status === 'blocked' ? 'bg-red-500' : 'bg-gray-400'
                    }`} />
                    <span className="flex-1 text-sm font-medium truncate" style={{ color: 'var(--text)' }}>{task.title}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${badgeClass}`}>{task.priority}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Quick Actions + Check-In Status */}
        <div className="space-y-4">
          <div className="card p-5">
            <h3 className="font-semibold mb-3" style={{ color: 'var(--text)' }}>⚡ Quick Actions</h3>
            <div className="grid grid-cols-2 gap-2">
              {[
                { icon: '📋', label: 'New Task',     page: 'tasks' },
                { icon: '💬', label: 'Message',      page: 'messages' },
                { icon: '📢', label: 'Announcements', page: 'announcements' },
                { icon: '👥', label: 'Team',         page: 'team' },
              ].map(a => (
                <button key={a.page}
                  onClick={() => onNavigate(a.page)}
                  className="flex items-center gap-2 p-3 rounded-xl border text-sm font-medium transition hover:scale-105"
                  style={{ background: 'var(--surface2)', borderColor: 'var(--border)', color: 'var(--text)' }}
                >
                  <span>{a.icon}</span> {a.label}
                </button>
              ))}
            </div>
          </div>

          {/* Check-In Status */}
          <div className="card p-5">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-semibold text-sm" style={{ color: 'var(--text)' }}>✅ Daily Check-In</h3>
            </div>
            {checkin ? (
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center text-xl">
                  {{ great: '😄', good: '🙂', okay: '😐', rough: '😟', bad: '😢' }[checkin.mood] ?? '😐'}
                </div>
                <div>
                  <p className="text-sm font-medium text-green-600">Done for today!</p>
                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                    Mood: {checkin.mood} · {checkin.hasProblems ? 'Issues flagged' : 'No issues'}
                  </p>
                </div>
              </div>
            ) : (
              <div>
                <p className="text-sm mb-2" style={{ color: 'var(--text-muted)' }}>You haven't checked in today.</p>
                <button onClick={() => onNavigate('checkin')}
                  className="text-sm font-medium text-white bg-indigo-500 hover:bg-indigo-600 px-4 py-1.5 rounded-lg transition">
                  Check in now →
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Team Status Row */}
      <div className="card p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold" style={{ color: 'var(--text)' }}>👥 Team Today</h3>
          <button onClick={() => onNavigate('team')} className="text-xs text-blue-500 hover:text-blue-600 font-medium">View all →</button>
        </div>
        <div className="flex flex-wrap gap-3">
          {allEmployees.filter(e => e.id !== employee.id).slice(0, 8).map(emp => {
            const initials = emp.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
            const statusColor = { active: 'avatar-active', idle: 'avatar-idle', blocked: 'avatar-blocked', offline: 'avatar-offline' }[emp.status ?? 'offline'];
            return (
              <div key={emp.id} className="flex flex-col items-center gap-1">
                <div className={`w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-xs font-bold ${statusColor}`}>
                  {initials}
                </div>
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{emp.name.split(' ')[0]}</p>
              </div>
            );
          })}
          {allEmployees.length === 0 && (
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>No teammates yet.</p>
          )}
        </div>
      </div>
    </div>
  );
}
