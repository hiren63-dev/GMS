import { useState, useEffect } from 'react';
import type { Employee, Objective, KeyResult, ActivityEntry, LoginLog, CheckInResponse, Task } from '../types';
import { onObjectivesChange, createObjective, updateObjective, deleteObjective, onActivityChange, onLoginLogsChange, todayKey, onCheckInsChange, onAllTasksChange } from '../services/firebase';

interface Props {
  employee: Employee;
  allEmployees: Employee[];
}

const OKR_STATUS_COLORS = {
  on_track: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  at_risk:  'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  off_track:'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  achieved: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
};


export default function FounderView({ employee, allEmployees }: Props) {
  const [objectives, setObjectives] = useState<Objective[]>([]);
  const [activity, setActivity]     = useState<ActivityEntry[]>([]);
  const [logs, setLogs]             = useState<LoginLog[]>([]);
  const [checkIns, setCheckIns]     = useState<CheckInResponse[]>([]);
  const [allTasks, setAllTasks]     = useState<Task[]>([]);
  const [showNewOKR, setShowNewOKR] = useState(false);
  const [editingKR, setEditingKR]   = useState<{ objId: string; krIdx: number; value: string } | null>(null);
  const [newTitle, setNewTitle]     = useState('');
  const [newQuarter, setNewQuarter] = useState(`Q${Math.ceil((new Date().getMonth() + 1) / 3)} ${new Date().getFullYear()}`);
  const [krModal, setKrModal]       = useState<{ objId: string } | null>(null);
  const [krForm, setKrForm]         = useState({ title: '', target: '', unit: '%' });
  const [krError, setKrError]       = useState('');

  useEffect(() => {
    const u1 = onObjectivesChange(setObjectives);
    const u2 = onActivityChange(setActivity);
    const u3 = onLoginLogsChange(setLogs);
    const u4 = onCheckInsChange(setCheckIns);
    const u5 = onAllTasksChange(setAllTasks);
    return () => { u1(); u2(); u3(); u4(); u5(); };
  }, []);

  // Refresh "X ago" labels every minute.
  const [, setNowTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setNowTick(t => t + 1), 60000);
    return () => clearInterval(id);
  }, []);

  const activeToday = new Set(
    logs.filter(l => l.date === todayKey() && !l.logoutTime).map(l => l.employeeId)
  ).size;

  const deptGroups = allEmployees.reduce<Record<string, Employee[]>>((acc, e) => {
    acc[e.department] = [...(acc[e.department] || []), e];
    return acc;
  }, {});

  const handleCreateOKR = async () => {
    if (!newTitle.trim()) return;
    await createObjective({
      title: newTitle, quarter: newQuarter, ownerId: employee.id,
      ownerName: employee.name, keyResults: [], status: 'on_track', createdAt: Date.now(),
    });
    setShowNewOKR(false); setNewTitle('');
  };

  const openAddKR = (obj: Objective) => {
    setKrForm({ title: '', target: '', unit: '%' });
    setKrError('');
    setKrModal({ objId: obj.id });
  };

  const submitKR = async () => {
    if (!krModal) return;
    const obj = objectives.find(o => o.id === krModal.objId);
    if (!obj) { setKrModal(null); return; }
    const target = parseFloat(krForm.target);
    if (!krForm.title.trim()) { setKrError('Enter a title.'); return; }
    if (!Number.isFinite(target) || target <= 0) { setKrError('Target must be a number greater than 0.'); return; }
    const kr: KeyResult = { id: Date.now().toString(), title: krForm.title.trim(), current: 0, target, unit: krForm.unit.trim() || '%' };
    try {
      await updateObjective(obj.id, { keyResults: [...obj.keyResults, kr] });
      setKrModal(null);
    } catch (err) {
      console.error('Failed to add key result:', err);
      setKrError('Could not save. Please try again.');
    }
  };

  const handleUpdateKR = async (obj: Objective, krIdx: number, current: number) => {
    const updated = obj.keyResults.map((kr, i) => i === krIdx ? { ...kr, current } : kr);
    await updateObjective(obj.id, { keyResults: updated });
  };

  const handleUpdateStatus = async (obj: Objective, status: Objective['status']) => {
    await updateObjective(obj.id, { status });
  };

  const moods = activity.filter(a => a.type === 'check_in');
  const tasksCompleted = activity.filter(a => a.type === 'task_done').length;
  const todayLogins = logs.filter(l => l.date === todayKey()).length;

  return (
    <div className="p-6 space-y-6 animate-slide-in">
      <div>
        <h2 className="text-2xl font-bold flex items-center gap-2" style={{ color: 'var(--text)' }}>
          <span className="founder-gradient text-transparent bg-clip-text">👑 Founder Dashboard</span>
        </h2>
        <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>Executive overview — all data in real time</p>
      </div>

      {/* Pulse Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { icon: '🟢', label: 'Active Now',   value: activeToday,        color: '#16A34A' },
          { icon: '👥', label: 'Total Team',   value: allEmployees.length, color: 'var(--accent)' },
          { icon: '✅', label: 'Tasks Done',   value: tasksCompleted,      color: '#213183' },
          { icon: '📋', label: 'Clock-ins',    value: todayLogins,         color: '#C2410C' },
        ].map(s => (
          <div key={s.label} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, padding: '18px 20px' }}>
            <div style={{ fontSize: 28, fontWeight: 700, color: s.color, letterSpacing: '-0.02em' }}>{s.value}</div>
            <div style={{ fontSize: 12, marginTop: 4, color: 'var(--text-muted)' }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* ── Team Accountability Today ───────────────────────────────────── */}
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12 }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>Team Accountability — Today</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>Login times, active hours, and task completion for {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'short' })}</div>
          </div>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)' }}>
                {['Employee', 'Dept', 'Logged In', 'Active', 'Tasks Done', 'Check-In', 'Status'].map(h => (
                  <th key={h} style={{ padding: '10px 16px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', letterSpacing: '0.05em', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {allEmployees.filter(e => e.role !== 'founder').map(emp => {
                const todayLog = logs
                  .filter(l => l.employeeId === emp.id && l.date === todayKey())
                  .sort((a, b) => (b.loginTime ?? 0) - (a.loginTime ?? 0))[0];
                const loginStr = todayLog?.loginTime
                  ? new Date(todayLog.loginTime).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })
                  : null;
                const activeMs = todayLog
                  ? ((todayLog.logoutTime ?? Date.now()) - (todayLog.loginTime ?? Date.now()))
                  : 0;
                const activeH = Math.floor(activeMs / 3600000);
                const activeM = Math.floor((activeMs % 3600000) / 60000);
                const activeStr = activeMs > 0 ? `${activeH}h ${activeM}m` : null;
                const empTasks = allTasks.filter(t => t.assigneeId === emp.id);
                const doneTasks = empTasks.filter(t => t.status === 'done').length;
                const totalTasks = empTasks.length;
                const todayCheckin = checkIns.find(c => c.employeeId === emp.id && (c.dateKey === todayKey() || todayKey(new Date(c.date)) === todayKey()));
                const status = !todayLog ? 'absent' : todayLog.logoutTime ? 'done' : 'active';
                return (
                  <tr key={emp.id} style={{ borderBottom: '1px solid var(--border)' }}
                    onMouseOver={e => (e.currentTarget as HTMLElement).style.background = 'var(--bg)'}
                    onMouseOut={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}>
                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'var(--text)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--surface)', fontSize: 10, fontWeight: 600, flexShrink: 0 }}>
                          {emp.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                        </div>
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)' }}>{emp.name}</div>
                          {emp.jobTitle && <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{emp.jobTitle}</div>}
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: 12, color: 'var(--text-muted)' }}>{emp.department}</td>
                    <td style={{ padding: '12px 16px', fontSize: 12, color: loginStr ? 'var(--text)' : '#DC2626', fontWeight: loginStr ? 400 : 500 }}>
                      {loginStr ?? '— Not in'}
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: 12, color: 'var(--text)' }}>
                      {activeStr ?? <span style={{ color: 'var(--text-faint)' }}>—</span>}
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      {totalTasks > 0 ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span style={{ fontSize: 12, color: 'var(--text)' }}>{doneTasks}/{totalTasks}</span>
                          <div style={{ flex: 1, height: 4, background: 'var(--border)', borderRadius: 99, minWidth: 40 }}>
                            <div style={{ height: '100%', background: doneTasks === totalTasks ? '#16A34A' : 'var(--accent)', borderRadius: 99, width: `${Math.round((doneTasks / totalTasks) * 100)}%`, transition: 'width 600ms' }} />
                          </div>
                        </div>
                      ) : <span style={{ fontSize: 12, color: 'var(--text-faint)' }}>No tasks</span>}
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      {todayCheckin
                        ? <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 4, background: '#F0FDF4', color: '#16A34A', fontWeight: 600 }}>✓ Done</span>
                        : <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 4, background: '#F7F7F6', color: 'var(--text-muted)' }}>Pending</span>}
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <span style={{
                        fontSize: 11, padding: '2px 8px', borderRadius: 4, fontWeight: 600,
                        ...(status === 'active' ? { background: '#F0FDF4', color: '#16A34A' } :
                            status === 'done' ? { background: '#EFF6FF', color: 'var(--accent)' } :
                            { background: '#FEF2F2', color: '#DC2626' })
                      }}>
                        {status === 'active' ? '● Active' : status === 'done' ? '✓ Done' : '✗ Absent'}
                      </span>
                    </td>
                  </tr>
                );
              })}
              {allEmployees.filter(e => e.role !== 'founder').length === 0 && (
                <tr><td colSpan={7} style={{ padding: 24, textAlign: 'center', fontSize: 13, color: 'var(--text-muted)' }}>No employees yet. Add team members in Admin → Team.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* OKR Tracker */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-lg" style={{ color: 'var(--text)' }}>🎯 OKRs</h3>
            <button onClick={() => setShowNewOKR(true)}
              className="text-sm font-medium text-white bg-purple-600 hover:bg-purple-700 px-4 py-1.5 rounded-lg transition">
              + New Objective
            </button>
          </div>

          {objectives.length === 0 && !showNewOKR && (
            <div className="card p-8 text-center">
              <p className="text-4xl mb-3">🎯</p>
              <p className="font-medium" style={{ color: 'var(--text)' }}>No objectives yet</p>
              <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>Track your company goals with OKRs</p>
            </div>
          )}

          {objectives.map(obj => {
            const avgPct = obj.keyResults.length
              ? Math.round(obj.keyResults.reduce((s, kr) => s + (kr.target > 0 ? Math.min(100, (kr.current / kr.target) * 100) : 0), 0) / obj.keyResults.length)
              : 0;
            return (
              <div key={obj.id} className="card p-5">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h4 className="font-semibold" style={{ color: 'var(--text)' }}>{obj.title}</h4>
                    <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{obj.quarter} · {obj.ownerName}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <select
                      value={obj.status}
                      onChange={e => handleUpdateStatus(obj, e.target.value as Objective['status'])}
                      className={`text-xs px-2 py-1 rounded-full border-0 font-medium cursor-pointer ${OKR_STATUS_COLORS[obj.status]}`}
                    >
                      <option value="on_track">On Track</option>
                      <option value="at_risk">At Risk</option>
                      <option value="off_track">Off Track</option>
                      <option value="achieved">Achieved</option>
                    </select>
                    <button onClick={() => { if (confirm(`Delete objective "${obj.title}"? All key results will be removed.`)) deleteObjective(obj.id); }}
                      className="text-xs text-red-400 hover:text-red-600 transition">✕</button>
                  </div>
                </div>

                <div className="mb-3">
                  <div className="flex justify-between text-xs mb-1" style={{ color: 'var(--text-muted)' }}>
                    <span>Overall Progress</span>
                    <span className="font-bold">{avgPct}%</span>
                  </div>
                  <div className="h-3 rounded-full overflow-hidden" style={{ background: 'var(--surface2)' }}>
                    <div className="h-full rounded-full transition-all duration-700"
                      style={{ width: `${avgPct}%`, background: '#213183' }} />
                  </div>
                </div>

                {obj.keyResults.map((kr, i) => (
                  <div key={kr.id} className="group">
                    <div className="flex justify-between text-xs mb-1" style={{ color: 'var(--text-muted)' }}>
                      <span>{kr.title}</span>
                      <button
                        onClick={() => setEditingKR({ objId: obj.id, krIdx: i, value: kr.current.toString() })}
                        className="font-semibold hover:text-blue-500 transition" style={{ color: 'var(--text)' }}
                      >
                        {kr.current}/{kr.target} {kr.unit}
                      </button>
                    </div>
                    {editingKR?.objId === obj.id && editingKR.krIdx === i ? (
                      <div className="flex gap-2 mb-2">
                        <input type="number" value={editingKR.value}
                          onChange={e => setEditingKR({ ...editingKR, value: e.target.value })}
                          className="input flex-1 text-xs py-1" />
                        <button onClick={() => {
                          const val = parseFloat(editingKR.value);
                          if (!Number.isFinite(val) || val < 0) return;
                          handleUpdateKR(obj, i, val);
                          setEditingKR(null);
                        }} className="text-xs px-3 py-1 bg-green-500 text-white rounded-lg">Save</button>
                        <button onClick={() => setEditingKR(null)}
                          className="text-xs px-3 py-1 rounded-lg" style={{ background: 'var(--surface2)', color: 'var(--text-muted)' }}>✕</button>
                      </div>
                    ) : (
                      <div className="h-2 rounded-full overflow-hidden mb-2" style={{ background: 'var(--surface2)' }}>
                        <div className="h-full rounded-full transition-all"
                          style={{ width: `${kr.target > 0 ? Math.min(100, (kr.current / kr.target) * 100) : 0}%`, background: '#213183' }} />
                      </div>
                    )}
                  </div>
                ))}

                <button onClick={() => openAddKR(obj)}
                  className="text-xs text-blue-500 hover:text-blue-600 font-medium mt-1">+ Add Key Result</button>
              </div>
            );
          })}
        </div>

        {/* Right panel: Team Map + Activity */}
        <div className="space-y-4">
          {/* Team by Department */}
          <div className="card p-5">
            <h3 className="font-semibold mb-3" style={{ color: 'var(--text)' }}>🗺️ Team Map</h3>
            {Object.entries(deptGroups).map(([dept, members]) => (
              <div key={dept} className="mb-3">
                <p className="text-xs font-semibold uppercase tracking-wide mb-1.5" style={{ color: 'var(--text-muted)' }}>{dept}</p>
                <div className="flex flex-wrap gap-1">
                  {members.map(m => {
                    const initials = m.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
                    const statusClass = { active: 'avatar-active', idle: 'avatar-idle', blocked: 'avatar-blocked', offline: 'avatar-offline' }[m.status ?? 'offline'];
                    return (
                      <div key={m.id} title={`${m.name} — ${m.status ?? 'offline'}`}
                        className={`w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-xs font-bold cursor-default ${statusClass}`}>
                        {initials}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          {/* Live Activity Feed */}
          <div className="card p-5">
            <h3 className="font-semibold mb-3" style={{ color: 'var(--text)' }}>⚡ Live Activity</h3>
            {activity.length === 0 ? (
              <p className="text-sm" style={{ color: 'var(--text-muted)' }}>No activity yet.</p>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {activity.slice(0, 20).map(a => {
                  const icon = { login: '🟢', logout: '🔴', task_done: '✅', check_in: '📋', message: '💬', task_created: '📌' }[a.type] ?? '•';
                  const color = { login: 'text-green-500', logout: 'text-red-500', task_done: 'text-blue-500', check_in: 'text-purple-500', message: 'text-indigo-500', task_created: 'text-orange-500' }[a.type] ?? '';
                  const mins = Math.round((Date.now() - a.timestamp) / 60000);
                  const timeStr = mins < 60 ? `${mins}m ago` : mins < 1440 ? `${Math.floor(mins / 60)}h ago` : `${Math.floor(mins / 1440)}d ago`;
                  return (
                    <div key={a.id} className="flex items-start gap-2 text-xs">
                      <span className="mt-0.5">{icon}</span>
                      <div className="flex-1 min-w-0">
                        <span className="font-medium" style={{ color: 'var(--text)' }}>{a.employeeName}</span>
                        <span style={{ color: 'var(--text-muted)' }}> {a.detail}</span>
                      </div>
                      <span className="flex-shrink-0" style={{ color: 'var(--text-muted)' }}>{timeStr}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* New Objective modal */}
      {showNewOKR && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}
          onClick={e => { if (e.target === e.currentTarget) setShowNewOKR(false); }}>
          <div style={{ width: 400, background: 'var(--surface)', borderRadius: 12, padding: 26, boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
            <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--text)', marginBottom: 18 }}>New Objective</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <input value={newTitle} onChange={e => setNewTitle(e.target.value)}
                placeholder="Objective title e.g. Grow MRR to $50k"
                className="input w-full" autoFocus />
              <input value={newQuarter} onChange={e => setNewQuarter(e.target.value)}
                placeholder="Quarter e.g. Q3 2026"
                className="input w-full" />
              <div style={{ display: 'flex', gap: 10, marginTop: 2 }}>
                <button onClick={() => setShowNewOKR(false)}
                  style={{ flex: 1, height: 40, background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 13, fontWeight: 500, color: 'var(--text-muted)', cursor: 'pointer' }}>Cancel</button>
                <button onClick={handleCreateOKR}
                  style={{ flex: 1, height: 40, background: '#213183', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 500, cursor: 'pointer' }}>Create</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Key Result modal */}
      {krModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}
          onClick={e => { if (e.target === e.currentTarget) setKrModal(null); }}>
          <div style={{ width: 400, background: 'var(--surface)', borderRadius: 12, padding: 26, boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
            <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--text)', marginBottom: 18 }}>Add Key Result</div>
            {krError && (
              <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 8, padding: '9px 12px', fontSize: 13, color: '#DC2626', marginBottom: 12 }}>{krError}</div>
            )}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <input value={krForm.title} onChange={e => setKrForm(f => ({ ...f, title: e.target.value }))}
                placeholder="Key result e.g. Sign 20 new customers" className="input w-full" autoFocus />
              <div style={{ display: 'flex', gap: 10 }}>
                <input type="number" value={krForm.target} onChange={e => setKrForm(f => ({ ...f, target: e.target.value }))}
                  placeholder="Target" className="input" style={{ flex: 1 }} min={1} />
                <input value={krForm.unit} onChange={e => setKrForm(f => ({ ...f, unit: e.target.value }))}
                  placeholder="Unit (%, users, $)" className="input" style={{ flex: 1 }} />
              </div>
              <div style={{ display: 'flex', gap: 10, marginTop: 2 }}>
                <button onClick={() => setKrModal(null)}
                  style={{ flex: 1, height: 40, background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 13, fontWeight: 500, color: 'var(--text-muted)', cursor: 'pointer' }}>Cancel</button>
                <button onClick={submitKR}
                  style={{ flex: 1, height: 40, background: '#213183', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 500, cursor: 'pointer' }}>Add</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
