import { useState, useEffect } from 'react';
import type { Employee, LoginLog } from '../types';
import { logLogin, logLogout, getTodaysLog, getTimeLogs } from '../services/firebase';

interface Props { employee: Employee; }

export default function TimeTracker({ employee }: Props) {
  const [todayLog, setTodayLog]   = useState<LoginLog | null>(null);
  const [history, setHistory]     = useState<LoginLog[]>([]);
  const [loading, setLoading]     = useState(true);
  const [working, setWorking]     = useState(false);
  const [elapsed, setElapsed]     = useState('');

  useEffect(() => {
    const run = async () => {
      const [log, hist] = await Promise.all([
        getTodaysLog(employee.id),
        getTimeLogs(employee.id, 7),
      ]);
      setTodayLog(log);
      setHistory(hist);
      setLoading(false);
    };
    run();
  }, [employee.id]);

  useEffect(() => {
    if (!todayLog?.loginTime || todayLog.logoutTime) return;
    const calc = () => {
      const diff = Date.now() - todayLog.loginTime;
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setElapsed(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`);
    };
    calc();
    const id = setInterval(calc, 1000);
    return () => clearInterval(id);
  }, [todayLog]);

  const handleClockIn = async () => {
    setWorking(true);
    try {
      await logLogin(employee.id, employee.name);
      const log = await getTodaysLog(employee.id);
      setTodayLog(log);
    } finally { setWorking(false); }
  };

  const handleClockOut = async () => {
    if (!todayLog?.id) return;
    setWorking(true);
    try {
      await logLogout(todayLog.id, employee.id);
      setTodayLog(prev => prev ? { ...prev, logoutTime: Date.now() } : null);
      const hist = await getTimeLogs(employee.id, 7);
      setHistory(hist);
    } finally { setWorking(false); }
  };

  const isClockedIn = todayLog && !todayLog.logoutTime;

  const totalWeek = history.reduce((s, l) => {
    const dur = l.duration ?? (l.logoutTime ? (l.logoutTime - l.loginTime) / 3600000 : 0);
    return s + dur;
  }, 0);

  if (loading) return <div className="p-6 flex items-center justify-center"><div className="loading-spinner" /></div>;

  return (
    <div className="p-6 space-y-6 animate-slide-in max-w-2xl mx-auto">
      <div>
        <h2 className="text-2xl font-bold" style={{ color: 'var(--text)' }}>⏱️ Time Tracker</h2>
        <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>Track your work hours</p>
      </div>

      {/* Clock */}
      <div className="card p-8 text-center">
        {isClockedIn ? (
          <>
            <div className="text-5xl font-mono font-bold mb-2" style={{ color: 'var(--text)', letterSpacing: '0.05em' }}>
              {elapsed || '00:00:00'}
            </div>
            <p className="text-sm mb-6" style={{ color: 'var(--text-muted)' }}>
              Clocked in at {new Date(todayLog.loginTime).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })}
            </p>
            <button onClick={handleClockOut} disabled={working}
              className="px-8 py-3 rounded-xl bg-red-500 hover:bg-red-600 disabled:opacity-50 text-white font-semibold text-lg shadow-lg transition hover:scale-105">
              {working ? 'Clocking out…' : '🔴 Clock Out'}
            </button>
          </>
        ) : (
          <>
            <div className="text-5xl mb-4">🕐</div>
            {todayLog?.logoutTime ? (
              <>
                <p className="font-semibold text-lg mb-1" style={{ color: 'var(--text)' }}>Shift complete!</p>
                <p className="text-sm mb-6" style={{ color: 'var(--text-muted)' }}>
                  {(() => {
                    const dur = todayLog.duration ?? (todayLog.logoutTime - todayLog.loginTime) / 3600000;
                    return `${dur.toFixed(1)} hours worked today`;
                  })()}
                </p>
              </>
            ) : (
              <>
                <p className="font-semibold text-lg mb-1" style={{ color: 'var(--text)' }}>Not clocked in</p>
                <p className="text-sm mb-6" style={{ color: 'var(--text-muted)' }}>Start your shift when you're ready</p>
              </>
            )}
            <button onClick={handleClockIn} disabled={working || !!todayLog?.logoutTime}
              className="px-8 py-3 rounded-xl bg-green-500 hover:bg-green-600 disabled:opacity-50 text-white font-semibold text-lg shadow-lg transition hover:scale-105">
              {working ? 'Clocking in…' : todayLog?.logoutTime ? '✅ Day Complete' : '🟢 Clock In'}
            </button>
          </>
        )}
      </div>

      {/* Week Stats */}
      <div className="grid grid-cols-2 gap-4">
        <div className="card p-5 text-center">
          <p className="text-3xl font-bold" style={{ color: 'var(--text)' }}>{totalWeek.toFixed(1)}h</p>
          <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>This Week</p>
        </div>
        <div className="card p-5 text-center">
          <p className="text-3xl font-bold" style={{ color: 'var(--text)' }}>
            {history.filter(l => l.logoutTime).length > 0
              ? (totalWeek / history.filter(l => l.logoutTime).length).toFixed(1)
              : '—'}h
          </p>
          <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>Daily Average</p>
        </div>
      </div>

      {/* History */}
      <div className="card p-5">
        <h3 className="font-semibold mb-4" style={{ color: 'var(--text)' }}>📅 Recent History</h3>
        {history.length === 0 ? (
          <p className="text-sm text-center py-4" style={{ color: 'var(--text-muted)' }}>No history yet.</p>
        ) : (
          <div className="space-y-2">
            {history.map(log => {
              const dur = log.duration ?? (log.logoutTime ? (log.logoutTime - log.loginTime) / 3600000 : null);
              const loginStr = new Date(log.loginTime).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
              const logoutStr = log.logoutTime ? new Date(log.logoutTime).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true }) : null;
              const isToday = log.date === new Date().toISOString().split('T')[0];
              return (
                <div key={log.id} className="flex items-center justify-between p-3 rounded-lg"
                  style={{ background: isToday ? 'rgba(99,102,241,0.08)' : 'var(--surface2)' }}>
                  <div>
                    <p className="text-sm font-medium" style={{ color: 'var(--text)' }}>
                      {isToday ? 'Today' : new Date(log.date + 'T00:00:00').toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })}
                    </p>
                    <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                      {loginStr}{logoutStr ? ` – ${logoutStr}` : ' (active)'}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold" style={{ color: 'var(--text)' }}>
                      {dur !== null ? `${dur.toFixed(1)}h` : '—'}
                    </p>
                    <div className="w-16 h-1.5 rounded-full overflow-hidden mt-1" style={{ background: 'var(--border)' }}>
                      <div className="h-full rounded-full" style={{ width: `${Math.min(100, ((dur ?? 0) / 8) * 100)}%`, background: '#6366F1' }} />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
