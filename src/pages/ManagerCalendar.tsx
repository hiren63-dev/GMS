import { useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import { useApp } from '../store/useStore';
import Modal from '../components/ui/Modal';
import { generateId, formatDate } from '../utils/helpers';
import type { PTSession } from '../types';

const TIME_SLOTS = ['06:00', '07:00', '08:00', '09:00', '10:00', '11:00', '17:00', '18:00', '19:00', '20:00'];
const DAY_SHORT = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const TRAINER_COLORS = ['#0A84FF', '#32d74b', '#ffd60a', '#ff453a', '#5E5CE6', '#ff9f0a'];

function getWeekStart(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function getDaysInWeek(weekStart: Date): Date[] {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(weekStart.getDate() + i);
    return d;
  });
}

export default function ManagerCalendar() {
  const { trainers, ptSessions, members, addPTSession, addToast } = useApp();
  const today = new Date();
  const [weekStart, setWeekStart] = useState(getWeekStart(today));
  const [addOpen, setAddOpen] = useState(false);
  const [prefillDate, setPrefillDate] = useState('');
  const [prefillTime, setPrefillTime] = useState('');
  const [form, setForm] = useState({ memberId: '', trainerId: '', date: '', time: '07:00', duration: 60, exercises: '' });
  const [selectedSession, setSelectedSession] = useState<PTSession | null>(null);

  const weekDays = useMemo(() => getDaysInWeek(weekStart), [weekStart]);

  const prevWeek = () => { const d = new Date(weekStart); d.setDate(d.getDate() - 7); setWeekStart(d); };
  const nextWeek = () => { const d = new Date(weekStart); d.setDate(d.getDate() + 7); setWeekStart(d); };
  const goToday = () => setWeekStart(getWeekStart(today));

  const weekLabel = `${weekDays[0].toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })} – ${weekDays[6].toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}`;


  const handleCellClick = (dateObj: Date, time: string) => {
    const dStr = dateObj.toISOString().split('T')[0];
    setPrefillDate(dStr);
    setPrefillTime(time);
    setForm(f => ({ ...f, date: dStr, time }));
    setAddOpen(true);
  };

  const handleSchedule = () => {
    if (!form.memberId) { addToast('Select a member', 'error'); return; }
    if (!form.trainerId) { addToast('Select a trainer', 'error'); return; }
    const member = members.find(m => m.id === form.memberId);
    const trainer = trainers.find(t => t.id === form.trainerId);
    if (!member || !trainer) return;
    const session: PTSession = {
      id: generateId(),
      memberId: form.memberId,
      memberName: member.name,
      trainerId: form.trainerId,
      trainerName: trainer.name,
      date: form.date || prefillDate,
      time: form.time || prefillTime,
      duration: form.duration,
      exercises: form.exercises || 'General Fitness',
      notes: '',
      status: 'Scheduled',
    };
    addPTSession(session);
    addToast(`Session scheduled!`, 'success');
    setAddOpen(false);
    setForm({ memberId: '', trainerId: '', date: '', time: '07:00', duration: 60, exercises: '' });
  };

  const todayStr = today.toISOString().split('T')[0];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Trainer Calendar</h1>
          <p className="page-subtitle">View and manage trainer schedules for the week</p>
        </div>
        <div className="page-header-actions">
          <button className="btn btn-secondary" onClick={goToday}>Today</button>
          <div className="card card-sm" style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 14px' }}>
            <button onClick={prevWeek} className="btn btn-ghost btn-icon btn-sm"><ChevronLeft size={18} /></button>
            <span style={{ fontWeight: 700, fontSize: 13, whiteSpace: 'nowrap' }}>{weekLabel}</span>
            <button onClick={nextWeek} className="btn btn-ghost btn-icon btn-sm"><ChevronRight size={18} /></button>
          </div>
          <button className="btn btn-primary" onClick={() => { setAddOpen(true); setPrefillDate(todayStr); setForm(f => ({ ...f, date: todayStr })); }}>
            <Plus size={16} /> Schedule
          </button>
        </div>
      </div>

      {/* Trainer legend */}
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        {trainers.map((t, i) => (
          <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 10px', background: 'var(--bg-elevated)', borderRadius: 20, fontSize: 12, fontWeight: 600 }}>
            <div style={{ width: 10, height: 10, borderRadius: '50%', background: TRAINER_COLORS[i % TRAINER_COLORS.length] }} />
            {t.name}
          </div>
        ))}
      </div>

      {/* Calendar Grid */}
      <div className="card card-no-padding" style={{ overflowX: 'auto' }}>
        <div style={{ minWidth: 700 }}>
          {/* Day headers */}
          <div style={{ display: 'grid', gridTemplateColumns: '70px repeat(7, 1fr)', background: 'var(--bg-elevated)', borderBottom: '1px solid var(--border-color)' }}>
            <div style={{ padding: '10px 8px', fontSize: 11, color: 'var(--text-muted)', fontWeight: 700, textAlign: 'center' }}>TIME</div>
            {weekDays.map((d, i) => {
              const dStr = d.toISOString().split('T')[0];
              const isToday = dStr === todayStr;
              const dayCount = ptSessions.filter(s => s.date === dStr).length;
              return (
                <div key={dStr} style={{ padding: '10px 8px', textAlign: 'center', borderLeft: '1px solid var(--border-color)' }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: isToday ? 'var(--accent-primary)' : 'var(--text-muted)', marginBottom: 2 }}>{DAY_SHORT[i]}</div>
                  <div style={{ fontSize: 18, fontWeight: 800, color: isToday ? 'var(--accent-primary)' : 'var(--text-primary)' }}>{d.getDate()}</div>
                  {dayCount > 0 && <div style={{ fontSize: 9, color: 'var(--accent-success)', fontWeight: 700 }}>{dayCount} session{dayCount > 1 ? 's' : ''}</div>}
                </div>
              );
            })}
          </div>

          {/* Time rows */}
          {TIME_SLOTS.map(time => (
            <div key={time} style={{ display: 'grid', gridTemplateColumns: '70px repeat(7, 1fr)', borderBottom: '1px solid var(--glass-border)', minHeight: 64 }}>
              {/* Time label */}
              <div style={{ padding: '8px 8px', fontSize: 11, color: 'var(--text-muted)', fontWeight: 700, textAlign: 'right', paddingRight: 10, paddingTop: 10, background: 'var(--bg-elevated)', borderRight: '1px solid var(--border-color)' }}>
                {time}
              </div>

              {/* Day cells */}
              {weekDays.map((d, di) => {
                const dStr = d.toISOString().split('T')[0];
                // Collect sessions from ALL trainers for this day+time
                const cellSessions = ptSessions.filter(s => s.date === dStr && s.time === time);

                return (
                  <div
                    key={di}
                    onClick={() => cellSessions.length === 0 && handleCellClick(d, time)}
                    style={{
                      borderLeft: '1px solid var(--glass-border)',
                      padding: 4,
                      position: 'relative',
                      cursor: cellSessions.length === 0 ? 'pointer' : 'default',
                      transition: 'background 0.15s',
                      background: d.toISOString().split('T')[0] === todayStr ? 'rgba(10,132,255,0.03)' : 'transparent',
                    }}
                    onMouseEnter={e => { if (cellSessions.length === 0) (e.currentTarget as HTMLElement).style.background = 'var(--bg-hover)'; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = d.toISOString().split('T')[0] === todayStr ? 'rgba(10,132,255,0.03)' : 'transparent'; }}
                  >
                    {cellSessions.map((s) => {
                      const trainerIdx = trainers.findIndex(t => t.id === s.trainerId);
                      const color = TRAINER_COLORS[trainerIdx % TRAINER_COLORS.length] || '#0A84FF';
                      const isCancelled = s.status === 'Cancelled';
                      const isCompleted = s.status === 'Completed';
                      return (
                        <div
                          key={s.id}
                          onClick={e => { e.stopPropagation(); setSelectedSession(s); }}
                          style={{
                            background: isCancelled ? 'var(--bg-elevated)' : isCompleted ? 'rgba(50,215,75,0.2)' : `${color}22`,
                            borderLeft: `3px solid ${isCancelled ? '#52525b' : isCompleted ? '#32d74b' : color}`,
                            borderRadius: 6,
                            padding: '4px 6px',
                            marginBottom: 2,
                            cursor: 'pointer',
                            opacity: isCancelled ? 0.5 : 1,
                          }}
                        >
                          <div style={{ fontSize: 11, fontWeight: 700, color: isCancelled ? 'var(--text-muted)' : isCompleted ? '#32d74b' : color, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {s.memberName}
                          </div>
                          <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>{s.trainerName} · {s.duration}m</div>
                        </div>
                      );
                    })}

                    {cellSessions.length === 0 && (
                      <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0, transition: 'opacity 0.15s' }}
                        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.opacity = '1'; }}
                        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.opacity = '0'; }}
                      >
                        <Plus size={14} style={{ color: 'var(--text-muted)' }} />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {/* Session Detail Popup */}
      {selectedSession && (
        <Modal open={!!selectedSession} onClose={() => setSelectedSession(null)} title="Session Details" size="sm">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {[
              { label: 'Member', value: selectedSession.memberName },
              { label: 'Trainer', value: selectedSession.trainerName },
              { label: 'Date', value: formatDate(selectedSession.date) },
              { label: 'Time', value: selectedSession.time },
              { label: 'Duration', value: `${selectedSession.duration} min` },
              { label: 'Focus', value: selectedSession.exercises || '-' },
              { label: 'Status', value: selectedSession.status },
              { label: 'Notes', value: selectedSession.notes || '-' },
            ].map(row => (
              <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--glass-border)', fontSize: 13 }}>
                <span style={{ color: 'var(--text-muted)', fontWeight: 600 }}>{row.label}</span>
                <span style={{ fontWeight: 500 }}>{row.value}</span>
              </div>
            ))}
          </div>
        </Modal>
      )}

      {/* Schedule Modal */}
      <Modal open={addOpen} onClose={() => setAddOpen(false)} title="Schedule PT Session"
        footer={<><button className="btn btn-secondary" onClick={() => setAddOpen(false)}>Cancel</button><button className="btn btn-primary" onClick={handleSchedule}>Schedule</button></>}
      >
        <div className="grid grid-2" style={{ gap: 14 }}>
          <div className="form-group">
            <label className="form-label required">Member</label>
            <select className="select" value={form.memberId} onChange={e => setForm(p => ({ ...p, memberId: e.target.value }))}>
              <option value="">-- Select Member --</option>
              {members.filter(m => m.status !== 'Expired').map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label required">Trainer</label>
            <select className="select" value={form.trainerId} onChange={e => setForm(p => ({ ...p, trainerId: e.target.value }))}>
              <option value="">-- Select Trainer --</option>
              {trainers.filter(t => t.status === 'Active').map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label required">Date</label>
            <input className="input" type="date" value={form.date} onChange={e => setForm(p => ({ ...p, date: e.target.value }))} />
          </div>
          <div className="form-group">
            <label className="form-label">Time</label>
            <select className="select" value={form.time} onChange={e => setForm(p => ({ ...p, time: e.target.value }))}>
              {TIME_SLOTS.map(t => <option key={t}>{t}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Duration</label>
            <select className="select" value={form.duration} onChange={e => setForm(p => ({ ...p, duration: +e.target.value }))}>
              {[30, 45, 60, 90, 120].map(d => <option key={d} value={d}>{d} min</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Focus Area</label>
            <input className="input" value={form.exercises} onChange={e => setForm(p => ({ ...p, exercises: e.target.value }))} placeholder="e.g. Legs, Core, Cardio" />
          </div>
        </div>
      </Modal>
    </div>
  );
}
