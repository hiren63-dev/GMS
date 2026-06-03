import { useState } from 'react';
import { Star, Clock, CheckCircle2, MessageCircle, Calendar, User } from 'lucide-react';
import { useApp } from '../store/useStore';
import { formatDate } from '../utils/helpers';
import Modal from '../components/ui/Modal';
import type { PTSession } from '../types';

export default function TrainerPortal() {
  const { ptSessions, trainers, currentUser, updatePTSession, addToast } = useApp();
  
  // Match trainer to logged-in user by name or email
  const myTrainer = trainers.find(
    t => t.name === currentUser?.name || t.email === currentUser?.email
  ) ?? trainers[0]; // Fallback to first trainer for Owner/Manager view

  const trainerId = myTrainer?.id;
  const trainerName = myTrainer?.name ?? 'Unknown';
  
  const mySessions = ptSessions.filter(s => s.trainerId === trainerId);
  const completed = mySessions.filter(s => s.status === 'Completed');
  const upcoming = mySessions.filter(s => s.status === 'Scheduled')
    .sort((a, b) => a.date.localeCompare(b.date));

  // Feedback & rating
  const feedbackSessions = completed.filter(s => s.feedback);
  const avgRating = feedbackSessions.length > 0
    ? (feedbackSessions.reduce((acc, curr) => acc + (curr.feedback?.rating || 0), 0) / feedbackSessions.length).toFixed(1)
    : 'N/A';

  // Complete session modal
  const [completeSession, setCompleteSession] = useState<PTSession | null>(null);
  const [completeNotes, setCompleteNotes] = useState('');
  const [viewingSession, setViewingSession] = useState<PTSession | null>(null);

  const handleComplete = () => {
    if (!completeSession) return;
    updatePTSession(completeSession.id, {
      status: 'Completed',
      notes: completeNotes || 'Session completed',
    });
    addToast('Session marked as completed!', 'success');
    setCompleteSession(null);
    setCompleteNotes('');
  };

  const handleCancel = (session: PTSession) => {
    updatePTSession(session.id, { status: 'Cancelled' });
    addToast('Session cancelled', 'warning');
  };

  const todayStr = new Date().toISOString().split('T')[0];
  const todaySessions = mySessions.filter(s => s.date === todayStr && s.status === 'Scheduled');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div className="page-header">
        <div>
          <h1 className="page-title">Trainer Portal</h1>
          <p className="page-subtitle">Welcome, {trainerName}! Track your performance and schedule.</p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-4">
        {[
          { icon: <Star size={22} fill="currentColor" />, value: avgRating, sub: '/ 5.0', label: 'Avg Member Rating', color: '#ffd60a', bg: 'rgba(255,214,10,0.12)' },
          { icon: <CheckCircle2 size={22} />, value: completed.length, sub: '', label: 'Completed Sessions', color: '#32d74b', bg: 'rgba(50,215,75,0.12)' },
          { icon: <Clock size={22} />, value: upcoming.length, sub: '', label: 'Upcoming Sessions', color: '#0A84FF', bg: 'rgba(10,132,255,0.12)' },
          { icon: <Calendar size={22} />, value: todaySessions.length, sub: '', label: "Today's Sessions", color: '#ff9f0a', bg: 'rgba(255,159,10,0.12)' },
        ].map((s, i) => (
          <div key={i} className="card card-hover" style={{ display: 'flex', alignItems: 'center', gap: 14, padding: 18 }}>
            <div style={{ width: 46, height: 46, borderRadius: 14, background: s.bg, color: s.color, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              {s.icon}
            </div>
            <div>
              <div style={{ fontSize: 24, fontWeight: 800, lineHeight: 1 }}>
                {s.value} <span style={{ fontSize: 13, color: 'var(--text-muted)', fontWeight: 500 }}>{s.sub}</span>
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 3, fontWeight: 600 }}>{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Today's Sessions */}
      {todaySessions.length > 0 && (
        <div className="card" style={{ borderLeft: '4px solid var(--accent-primary)' }}>
          <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Calendar size={16} style={{ color: 'var(--accent-primary)' }} />
            Today's Sessions
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {todaySessions.map(session => (
              <div key={session.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', background: 'var(--bg-elevated)', borderRadius: 10, justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--accent-primary)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 14, flexShrink: 0 }}>
                    {session.memberName.charAt(0)}
                  </div>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 14 }}>{session.memberName}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{session.time} · {session.duration} min · {session.exercises}</div>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button className="btn btn-success btn-sm" onClick={() => { setCompleteSession(session); setCompleteNotes(''); }}>
                    <CheckCircle2 size={13} /> Done
                  </button>
                  <button className="btn btn-danger btn-sm" onClick={() => handleCancel(session)}>Cancel</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-2" style={{ gap: 20 }}>
        {/* Upcoming Schedule */}
        <div className="card">
          <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Clock size={16} style={{ color: 'var(--accent-primary)' }} /> Upcoming Schedule
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {upcoming.length === 0 ? (
              <div className="empty-state" style={{ padding: 32 }}>
                <div style={{ fontSize: 28 }}>📅</div>
                <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>No upcoming sessions scheduled.</p>
              </div>
            ) : (
              upcoming.slice(0, 6).map(session => (
                <div key={session.id} className="card-hover" style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', borderRadius: 10, border: '1px solid var(--border-color)' }}>
                  <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--bg-hover)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <User size={16} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: 13 }}>{session.memberName}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
                      {formatDate(session.date)} at {session.time} · {session.duration} min
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{session.exercises}</div>
                  </div>
                  <div style={{ display: 'flex', gap: 4 }}>
                    <button className="btn btn-success btn-sm" onClick={() => { setCompleteSession(session); setCompleteNotes(''); }} title="Mark Complete">
                      <CheckCircle2 size={12} />
                    </button>
                    <button className="btn btn-ghost btn-sm" onClick={() => setViewingSession(session)} title="View Details">👁️</button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Recent Feedback */}
        <div className="card">
          <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
            <MessageCircle size={16} style={{ color: 'var(--accent-warning)' }} /> Member Feedback
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {feedbackSessions.length === 0 ? (
              <div className="empty-state" style={{ padding: 32 }}>
                <div style={{ fontSize: 28 }}>💬</div>
                <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>No member feedback yet.</p>
              </div>
            ) : (
              feedbackSessions.slice(0, 4).map(session => (
                <div key={session.id} style={{ padding: 14, borderRadius: 10, border: '1px solid var(--border-color)', background: 'var(--bg-elevated)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                    <div style={{ fontWeight: 700, fontSize: 13 }}>{session.memberName}</div>
                    <div style={{ display: 'flex', gap: 2, color: 'var(--accent-warning)' }}>
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star key={i} size={12} fill={i < (session.feedback?.rating || 0) ? 'currentColor' : 'none'} opacity={i < (session.feedback?.rating || 0) ? 1 : 0.3} />
                      ))}
                    </div>
                  </div>
                  <p style={{ fontSize: 12, color: 'var(--text-secondary)', fontStyle: 'italic', margin: '4px 0' }}>"{session.feedback?.comment}"</p>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600 }}>{formatDate(session.date)} · {session.exercises}</div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Session History */}
      <div className="card card-no-padding">
        <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border-color)' }}>
          <h3 style={{ fontSize: 15, fontWeight: 700 }}>Session History ({mySessions.length} total)</h3>
        </div>
        <div className="table-container">
          <table className="table">
            <thead>
              <tr><th>Date</th><th>Member</th><th>Time</th><th>Duration</th><th>Focus</th><th>Status</th></tr>
            </thead>
            <tbody>
              {mySessions.sort((a, b) => b.date.localeCompare(a.date)).slice(0, 10).map(s => (
                <tr key={s.id}>
                  <td style={{ fontSize: 13 }}>{formatDate(s.date)}</td>
                  <td style={{ fontWeight: 600, fontSize: 13 }}>{s.memberName}</td>
                  <td style={{ fontSize: 13 }}>{s.time}</td>
                  <td style={{ fontSize: 13 }}>{s.duration} min</td>
                  <td style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{s.exercises}</td>
                  <td>
                    <span className={`badge ${s.status === 'Completed' ? 'badge-success' : s.status === 'Scheduled' ? 'badge-warning' : 'badge-danger'}`}>
                      {s.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Complete Session Modal */}
      {completeSession && (
        <Modal open={!!completeSession} onClose={() => setCompleteSession(null)} title="Complete Session" size="sm"
          footer={<><button className="btn btn-secondary" onClick={() => setCompleteSession(null)}>Cancel</button><button className="btn btn-primary" onClick={handleComplete}><CheckCircle2 size={14} /> Mark Complete</button></>}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ padding: 14, background: 'var(--bg-elevated)', borderRadius: 10 }}>
              <div style={{ fontWeight: 700 }}>{completeSession.memberName}</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                {formatDate(completeSession.date)} · {completeSession.time} · {completeSession.duration} min · {completeSession.exercises}
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Session Notes</label>
              <textarea className="textarea" style={{ minHeight: 80 }} value={completeNotes} onChange={e => setCompleteNotes(e.target.value)} placeholder="How did the session go?" />
            </div>
          </div>
        </Modal>
      )}

      {/* View Session Details */}
      {viewingSession && (
        <Modal open={!!viewingSession} onClose={() => setViewingSession(null)} title="Session Details" size="sm">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {[
              { label: 'Member', value: viewingSession.memberName },
              { label: 'Date', value: formatDate(viewingSession.date) },
              { label: 'Time', value: viewingSession.time },
              { label: 'Duration', value: `${viewingSession.duration} min` },
              { label: 'Focus', value: viewingSession.exercises || 'General' },
              { label: 'Status', value: viewingSession.status },
              { label: 'Notes', value: viewingSession.notes || '-' },
            ].map(row => (
              <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--glass-border)', fontSize: 13 }}>
                <span style={{ color: 'var(--text-muted)', fontWeight: 600 }}>{row.label}</span>
                <span style={{ fontWeight: 500, textAlign: 'right', maxWidth: '60%' }}>{row.value}</span>
              </div>
            ))}
          </div>
        </Modal>
      )}
    </div>
  );
}
