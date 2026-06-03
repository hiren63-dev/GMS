import { useState } from 'react';
import { useApp } from '../store/useStore';
import { formatDate, generateId } from '../utils/helpers';
import { Calendar, Clock, User, CheckCircle2, Plus, Edit2, XCircle } from 'lucide-react';
import Modal from '../components/ui/Modal';
import type { PTSession } from '../types';

const TIME_SLOTS = ['06:00', '07:00', '08:00', '09:00', '10:00', '11:00', '17:00', '18:00', '19:00', '20:00'];
const DURATIONS = [30, 45, 60, 90, 120];

export default function PTSessions() {
  const { ptSessions, trainers, members, addPTSession, updatePTSession, addToast } = useApp();
  const [filter, setFilter] = useState<string>('all');
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [editSession, setEditSession] = useState<PTSession | null>(null);
  const [completeSession, setCompleteSession] = useState<PTSession | null>(null);
  const [completeNotes, setCompleteNotes] = useState('');

  // Schedule form state
  const [form, setForm] = useState({
    memberId: '',
    trainerId: '',
    date: new Date().toISOString().split('T')[0],
    time: '07:00',
    duration: 60,
    exercises: '',
    notes: '',
  });

  const filteredSessions = ptSessions.filter(s =>
    filter === 'all' || s.status.toLowerCase() === filter
  ).sort((a, b) => b.date.localeCompare(a.date));

  const stats = {
    today: ptSessions.filter(s => s.date === new Date().toISOString().split('T')[0]).length,
    completed: ptSessions.filter(s => s.status === 'Completed').length,
    scheduled: ptSessions.filter(s => s.status === 'Scheduled').length,
  };

  const handleSchedule = () => {
    if (!form.memberId) { addToast('Please select a member', 'error'); return; }
    if (!form.trainerId) { addToast('Please select a trainer', 'error'); return; }
    if (!form.date) { addToast('Please select a date', 'error'); return; }

    const member = members.find(m => m.id === form.memberId);
    const trainer = trainers.find(t => t.id === form.trainerId);
    if (!member || !trainer) return;

    const session: PTSession = {
      id: generateId(),
      memberId: form.memberId,
      memberName: member.name,
      trainerId: form.trainerId,
      trainerName: trainer.name,
      date: form.date,
      time: form.time,
      duration: form.duration,
      exercises: form.exercises || 'General Fitness',
      notes: form.notes,
      status: 'Scheduled',
    };
    addPTSession(session);
    addToast(`Session scheduled for ${member.name} with ${trainer.name}!`, 'success');
    setScheduleOpen(false);
    setForm({ memberId: '', trainerId: '', date: new Date().toISOString().split('T')[0], time: '07:00', duration: 60, exercises: '', notes: '' });
  };

  const handleEdit = () => {
    if (!editSession) return;
    updatePTSession(editSession.id, {
      date: editSession.date,
      time: editSession.time,
      duration: editSession.duration,
      exercises: editSession.exercises,
      notes: editSession.notes,
    });
    addToast('Session updated', 'success');
    setEditSession(null);
  };

  const handleComplete = () => {
    if (!completeSession) return;
    updatePTSession(completeSession.id, {
      status: 'Completed',
      notes: completeNotes || completeSession.notes,
    });
    addToast('Session marked as completed!', 'success');
    setCompleteSession(null);
    setCompleteNotes('');
  };

  const handleCancel = (session: PTSession) => {
    updatePTSession(session.id, { status: 'Cancelled' });
    addToast('Session cancelled', 'warning');
  };

  const statusBadge = (status: string) => {
    if (status === 'Completed') return 'badge-success';
    if (status === 'Scheduled') return 'badge-warning';
    return 'badge-danger';
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div className="page-header">
        <div>
          <h1 className="page-title">PT Sessions</h1>
          <p className="page-subtitle">Schedule and manage personal training sessions</p>
        </div>
        <button className="btn btn-primary" onClick={() => setScheduleOpen(true)}>
          <Plus size={16} /> Schedule Session
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-3">
        {[
          { icon: <Calendar size={22} />, value: stats.today, label: 'Today\'s Sessions', color: '#0A84FF', bg: 'rgba(10,132,255,0.12)' },
          { icon: <CheckCircle2 size={22} />, value: stats.completed, label: 'Completed', color: '#32d74b', bg: 'rgba(50,215,75,0.12)' },
          { icon: <Clock size={22} />, value: stats.scheduled, label: 'Upcoming Scheduled', color: '#ffd60a', bg: 'rgba(255,214,10,0.12)' },
        ].map((s, i) => (
          <div key={i} className="card card-hover" style={{ display: 'flex', alignItems: 'center', gap: 14, padding: 20 }}>
            <div style={{ width: 48, height: 48, borderRadius: 14, background: s.bg, color: s.color, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              {s.icon}
            </div>
            <div>
              <div style={{ fontSize: 26, fontWeight: 800, lineHeight: 1 }}>{s.value}</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 3 }}>{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Session Table */}
      <div className="card card-no-padding">
        {/* Filter tabs */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 20px', borderBottom: '1px solid var(--border-color)' }}>
          <h2 style={{ fontSize: 15, fontWeight: 700 }}>All Sessions</h2>
          <div style={{ display: 'flex', gap: 6 }}>
            {['all', 'scheduled', 'completed', 'cancelled'].map(f => (
              <button
                key={f}
                className={`btn btn-sm ${filter === f ? 'btn-primary' : 'btn-ghost'}`}
                onClick={() => setFilter(f)}
                style={{ textTransform: 'capitalize' }}
              >
                {f === 'all' ? 'All' : f}
              </button>
            ))}
          </div>
        </div>

        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>Date & Time</th>
                <th>Member</th>
                <th>Trainer</th>
                <th>Duration</th>
                <th>Focus Area</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredSessions.length === 0 && (
                <tr><td colSpan={7}><div className="empty-state"><div style={{ fontSize: 32 }}>📅</div><h3>No sessions found</h3><p>Schedule a PT session to get started.</p></div></td></tr>
              )}
              {filteredSessions.map(s => (
                <tr key={s.id}>
                  <td>
                    <div style={{ fontWeight: 600, fontSize: 13 }}>{formatDate(s.date)}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 3, marginTop: 2 }}>
                      <Clock size={10} /> {s.time}
                    </div>
                  </td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'var(--accent-primary)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, flexShrink: 0 }}>
                        {s.memberName.charAt(0)}
                      </div>
                      <span style={{ fontSize: 13, fontWeight: 500 }}>{s.memberName}</span>
                    </div>
                  </td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <User size={13} style={{ color: 'var(--accent-primary)' }} />
                      <span style={{ fontSize: 13 }}>{s.trainerName}</span>
                    </div>
                  </td>
                  <td style={{ fontSize: 13 }}>{s.duration} min</td>
                  <td style={{ fontSize: 13, color: 'var(--text-secondary)', maxWidth: 160 }}>
                    <span style={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.exercises}</span>
                  </td>
                  <td>
                    <span className={`badge ${statusBadge(s.status)}`}>{s.status}</span>
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: 4 }}>
                      {s.status === 'Scheduled' && (
                        <>
                          <button className="btn btn-success btn-sm" onClick={() => { setCompleteSession(s); setCompleteNotes(''); }} title="Mark complete">
                            <CheckCircle2 size={13} />
                          </button>
                          <button className="btn btn-ghost btn-icon btn-sm" onClick={() => setEditSession({ ...s })} title="Edit">
                            <Edit2 size={13} />
                          </button>
                          <button className="btn btn-danger btn-sm" onClick={() => handleCancel(s)} title="Cancel">
                            <XCircle size={13} />
                          </button>
                        </>
                      )}
                      {s.status === 'Completed' && s.notes && (
                        <span style={{ fontSize: 11, color: 'var(--text-muted)', maxWidth: 100, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.notes}</span>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Schedule Modal */}
      <Modal open={scheduleOpen} onClose={() => setScheduleOpen(false)} title="Schedule PT Session"
        footer={<><button className="btn btn-secondary" onClick={() => setScheduleOpen(false)}>Cancel</button><button className="btn btn-primary" onClick={handleSchedule}>Schedule</button></>}
      >
        <div className="grid grid-2" style={{ gap: 14 }}>
          <div className="form-group">
            <label className="form-label required">Member</label>
            <select className="select" value={form.memberId} onChange={e => setForm(p => ({ ...p, memberId: e.target.value }))}>
              <option value="">-- Select Member --</option>
              {members.filter(m => m.status === 'Active' || m.status === 'Expiring Soon').map(m => (
                <option key={m.id} value={m.id}>{m.name} ({m.memberId})</option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label required">Trainer</label>
            <select className="select" value={form.trainerId} onChange={e => setForm(p => ({ ...p, trainerId: e.target.value }))}>
              <option value="">-- Select Trainer --</option>
              {trainers.filter(t => t.status === 'Active').map(t => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label required">Date</label>
            <input className="input" type="date" value={form.date} min={new Date().toISOString().split('T')[0]} onChange={e => setForm(p => ({ ...p, date: e.target.value }))} />
          </div>
          <div className="form-group">
            <label className="form-label required">Time</label>
            <select className="select" value={form.time} onChange={e => setForm(p => ({ ...p, time: e.target.value }))}>
              {TIME_SLOTS.map(t => <option key={t}>{t}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Duration (minutes)</label>
            <select className="select" value={form.duration} onChange={e => setForm(p => ({ ...p, duration: +e.target.value }))}>
              {DURATIONS.map(d => <option key={d} value={d}>{d} min</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Focus Area</label>
            <input className="input" value={form.exercises} onChange={e => setForm(p => ({ ...p, exercises: e.target.value }))} placeholder="e.g. Upper Body, HIIT, Cardio" />
          </div>
          <div className="form-group" style={{ gridColumn: '1/-1' }}>
            <label className="form-label">Notes</label>
            <textarea className="textarea" style={{ minHeight: 60 }} value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} placeholder="Any special instructions or goals..." />
          </div>
        </div>
      </Modal>

      {/* Edit Session Modal */}
      {editSession && (
        <Modal open={!!editSession} onClose={() => setEditSession(null)} title="Edit Session"
          footer={<><button className="btn btn-secondary" onClick={() => setEditSession(null)}>Cancel</button><button className="btn btn-primary" onClick={handleEdit}>Save Changes</button></>}
        >
          <div className="grid grid-2" style={{ gap: 14 }}>
            <div className="form-group">
              <label className="form-label">Date</label>
              <input className="input" type="date" value={editSession.date} onChange={e => setEditSession(p => p ? { ...p, date: e.target.value } : null)} />
            </div>
            <div className="form-group">
              <label className="form-label">Time</label>
              <select className="select" value={editSession.time} onChange={e => setEditSession(p => p ? { ...p, time: e.target.value } : null)}>
                {TIME_SLOTS.map(t => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Duration</label>
              <select className="select" value={editSession.duration} onChange={e => setEditSession(p => p ? { ...p, duration: +e.target.value } : null)}>
                {DURATIONS.map(d => <option key={d} value={d}>{d} min</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Focus Area</label>
              <input className="input" value={editSession.exercises} onChange={e => setEditSession(p => p ? { ...p, exercises: e.target.value } : null)} />
            </div>
            <div className="form-group" style={{ gridColumn: '1/-1' }}>
              <label className="form-label">Notes</label>
              <textarea className="textarea" style={{ minHeight: 60 }} value={editSession.notes} onChange={e => setEditSession(p => p ? { ...p, notes: e.target.value } : null)} />
            </div>
          </div>
        </Modal>
      )}

      {/* Mark Complete Modal */}
      {completeSession && (
        <Modal open={!!completeSession} onClose={() => setCompleteSession(null)} title="Mark Session Complete" size="sm"
          footer={<><button className="btn btn-secondary" onClick={() => setCompleteSession(null)}>Cancel</button><button className="btn btn-primary" onClick={handleComplete}><CheckCircle2 size={14} /> Complete</button></>}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ padding: 14, background: 'var(--bg-elevated)', borderRadius: 10 }}>
              <div style={{ fontWeight: 700 }}>{completeSession.memberName} × {completeSession.trainerName}</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{formatDate(completeSession.date)} · {completeSession.time} · {completeSession.duration} min · {completeSession.exercises}</div>
            </div>
            <div className="form-group">
              <label className="form-label">Session Notes / Summary</label>
              <textarea className="textarea" style={{ minHeight: 80 }} value={completeNotes} onChange={e => setCompleteNotes(e.target.value)} placeholder="How did the session go? Any observations..." />
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
