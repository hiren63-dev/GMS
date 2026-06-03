import { Star, Clock, CheckCircle2, Navigation, MessageCircle } from 'lucide-react';
import { useApp } from '../store/useStore';
import { formatDate } from '../utils/helpers';

export default function TrainerPortal() {
  const { ptSessions, trainers } = useApp();
  
  // Demoo using the first active trainer
  const trainerId = trainers[0]?.id;
  
  const mySessions = ptSessions.filter(s => s.trainerId === trainerId);
  const completed = mySessions.filter(s => s.status === 'Completed');
  const upcoming = mySessions.filter(s => s.status === 'Scheduled');
  
  // Fake rating calculation based on feedback
  const feedbackSessions = completed.filter(s => s.feedback);
  const avgRating = feedbackSessions.length > 0 
    ? (feedbackSessions.reduce((acc, curr) => acc + (curr.feedback?.rating || 0), 0) / feedbackSessions.length).toFixed(1)
    : 'New';

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div className="page-header">
        <div>
          <h1 className="page-title">Trainer Portal</h1>
          <p className="page-subtitle">Track your performance, feedback, and schedule</p>
        </div>
        <div className="page-header-actions">
           <button className="btn btn-primary" style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
             <Navigation size={16} /> Dashboard View
           </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-3 gap-6">
        <div className="card card-hover" style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
           <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'rgba(245,158,11,0.1)', color: 'var(--accent-warning)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
             <Star size={24} fill="currentColor" />
           </div>
           <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)' }}>Avg Member Rating</div>
              <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--text-primary)' }}>{avgRating} <span style={{ fontSize: 14, color: 'var(--text-muted)' }}>/ 5.0</span></div>
           </div>
        </div>
        
        <div className="card card-hover" style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
           <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'rgba(16,185,129,0.1)', color: 'var(--accent-success)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
             <CheckCircle2 size={24} />
           </div>
           <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)' }}>Completed Sessions</div>
              <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--text-primary)' }}>{completed.length}</div>
           </div>
        </div>
        
        <div className="card card-hover" style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
           <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'rgba(0,43,255,0.1)', color: 'var(--accent-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
             <Clock size={24} />
           </div>
           <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)' }}>Upcoming This Week</div>
              <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--text-primary)' }}>{upcoming.length}</div>
           </div>
        </div>
      </div>

      <div className="grid grid-2 gap-6">
        {/* Recent Feedback */}
        <div className="card">
          <h3 style={{ fontSize: 16, fontWeight: 800, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
            <MessageCircle size={18} className="text-accent" /> 
            Recent Member Feedback
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {feedbackSessions.length === 0 ? (
               <div className="empty-state">No feedback received yet.</div>
            ) : (
               feedbackSessions.slice(0, 4).map(session => (
                 <div key={session.id} style={{ padding: 16, borderRadius: 12, border: '1px solid var(--border-color)', background: 'var(--bg-elevated)' }}>
                   <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                     <div style={{ fontWeight: 700, fontSize: 13 }}>{session.memberName}</div>
                     <div style={{ display: 'flex', gap: 2, color: 'var(--accent-warning)' }}>
                       {Array.from({ length: 5 }).map((_, i) => (
                         <Star key={i} size={12} fill={i < (session.feedback?.rating || 0) ? 'currentColor' : 'none'} opacity={i < (session.feedback?.rating || 0) ? 1 : 0.3} />
                       ))}
                     </div>
                   </div>
                   <p style={{ fontSize: 13, color: 'var(--text-secondary)', fontStyle: 'italic' }}>"{session.feedback?.comment}"</p>
                   <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 8, fontWeight: 600 }}>{formatDate(session.date)} • {session.exercises}</div>
                 </div>
               ))
            )}
          </div>
        </div>

        {/* Schedule */}
        <div className="card">
          <h3 style={{ fontSize: 16, fontWeight: 800, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Clock size={18} className="text-primary" /> 
            My Schedule
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {upcoming.length === 0 ? (
               <div className="empty-state">No upcoming sessions.</div>
            ) : (
               upcoming.slice(0, 5).map(session => (
                 <div key={session.id} className="card-hover" style={{ display: 'flex', alignItems: 'center', justifyItems: 'space-between', padding: 16, borderRadius: 12, border: '1px solid var(--border-color)' }}>
                   <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1 }}>
                     <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'var(--bg-hover)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                       <Clock size={16} />
                     </div>
                     <div>
                       <div style={{ fontWeight: 700, fontSize: 13 }}>{session.memberName}</div>
                       <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{formatDate(session.date)} at {session.time} ({session.duration} min)</div>
                     </div>
                   </div>
                   <div className="badge badge-warning">Upcoming</div>
                 </div>
               ))
            )}
            {upcoming.length > 5 && (
              <button className="btn btn-secondary btn-sm" style={{ width: '100%', marginTop: 8 }}>View Full Schedule</button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
