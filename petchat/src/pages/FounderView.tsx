import { useState, useEffect } from 'react';
import type { Employee, Objective, KeyResult, ActivityEntry, LoginLog } from '../types';
import { onObjectivesChange, createObjective, updateObjective, deleteObjective, onActivityChange, onLoginLogsChange, todayKey } from '../services/firebase';

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

function KRBar({ kr }: { kr: KeyResult }) {
  const pct = kr.target > 0 ? Math.min(100, Math.round((kr.current / kr.target) * 100)) : 0;
  const color = pct >= 80 ? '#10B981' : pct >= 50 ? '#F59E0B' : '#EF4444';
  return (
    <div className="mb-3">
      <div className="flex justify-between text-xs mb-1" style={{ color: 'var(--text-muted)' }}>
        <span>{kr.title}</span>
        <span className="font-semibold" style={{ color: 'var(--text)' }}>{kr.current}/{kr.target} {kr.unit}</span>
      </div>
      <div className="h-2 rounded-full overflow-hidden" style={{ background: 'var(--surface2)' }}>
        <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct}%`, background: color }} />
      </div>
    </div>
  );
}

export default function FounderView({ employee, allEmployees }: Props) {
  const [objectives, setObjectives] = useState<Objective[]>([]);
  const [activity, setActivity]     = useState<ActivityEntry[]>([]);
  const [logs, setLogs]             = useState<LoginLog[]>([]);
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
    return () => { u1(); u2(); u3(); };
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
  const todayLogins = logs.filter(l => l.date === new Date().toISOString().split('T')[0]).length;

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
          { icon: '🟢', label: 'Active Now',   value: activeToday,        color: 'text-green-600' },
          { icon: '👥', label: 'Total Team',   value: allEmployees.length, color: 'text-blue-600' },
          { icon: '✅', label: 'Tasks Done',   value: tasksCompleted,      color: 'text-purple-600' },
          { icon: '📋', label: 'Clock-ins',    value: todayLogins,         color: 'text-orange-600' },
        ].map(s => (
          <div key={s.label} className="card p-5">
            <div className={`text-3xl font-extrabold ${s.color}`}>{s.value}</div>
            <div className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>{s.label}</div>
          </div>
        ))}
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

          {showNewOKR && (
            <div className="card p-4 space-y-3 border-2 border-purple-300">
              <input value={newTitle} onChange={e => setNewTitle(e.target.value)}
                placeholder="Objective title e.g. Grow MRR to $50k"
                className="input w-full" />
              <input value={newQuarter} onChange={e => setNewQuarter(e.target.value)}
                placeholder="Quarter e.g. Q3 2026"
                className="input w-full" />
              <div className="flex gap-2">
                <button onClick={handleCreateOKR}
                  className="flex-1 py-2 rounded-lg bg-purple-600 hover:bg-purple-700 text-white text-sm font-medium transition">
                  Create
                </button>
                <button onClick={() => setShowNewOKR(false)}
                  className="flex-1 py-2 rounded-lg text-sm font-medium transition"
                  style={{ background: 'var(--surface2)', color: 'var(--text-muted)' }}>
                  Cancel
                </button>
              </div>
            </div>
          )}

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
                    <button onClick={() => deleteObjective(obj.id)}
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
                      style={{ width: `${avgPct}%`, background: 'linear-gradient(90deg,#7C3AED,#2563EB)' }} />
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
                        <button onClick={() => { handleUpdateKR(obj, i, parseFloat(editingKR.value)); setEditingKR(null); }}
                          className="text-xs px-3 py-1 bg-green-500 text-white rounded-lg">Save</button>
                        <button onClick={() => setEditingKR(null)}
                          className="text-xs px-3 py-1 rounded-lg" style={{ background: 'var(--surface2)', color: 'var(--text-muted)' }}>✕</button>
                      </div>
                    ) : (
                      <div className="h-2 rounded-full overflow-hidden mb-2" style={{ background: 'var(--surface2)' }}>
                        <div className="h-full rounded-full transition-all"
                          style={{ width: `${kr.target > 0 ? Math.min(100, (kr.current / kr.target) * 100) : 0}%`, background: '#7C3AED' }} />
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
                  const timeStr = mins < 60 ? `${mins}m ago` : `${Math.floor(mins/60)}h ago`;
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
                  style={{ flex: 1, height: 40, background: '#7C3AED', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 500, cursor: 'pointer' }}>Add</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
