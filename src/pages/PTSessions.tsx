import { useState } from 'react';
import { useApp } from '../store/useStore';
import { formatDate } from '../utils/helpers';
import { Calendar, Clock, User, CheckCircle2, Timer, Plus } from 'lucide-react';
import Modal from '../components/ui/Modal';

export default function PTSessions() {
  const { ptSessions, trainers, members, addToast } = useApp();
  const [filter, setFilter] = useState<string>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);

  const filteredSessions = ptSessions.filter(s => filter === 'all' || s.status.toLowerCase() === filter.toLowerCase());

  const stats = {
    today: ptSessions.filter(s => s.date === new Date().toISOString().split('T')[0]).length,
    completed: ptSessions.filter(s => s.status === 'Completed').length,
    pending: ptSessions.filter(s => s.status === 'Scheduled').length,
  };

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div className="page-header">
        <div>
          <h1 className="page-title">PT Sessions</h1>
          <p className="page-subtitle">Manage personal training schedules and session logs</p>
        </div>
        <div className="page-header-actions">
           <button className="btn btn-primary" onClick={() => setIsModalOpen(true)}>
            <Plus size={18} /> Schedule Session
          </button>
        </div>
      </div>

      <div className="grid grid-3">
        <div className="card card-sm flex items-center gap-4">
          <div className="p-3 rounded-xl bg-primary/10 text-primary"><Calendar size={24} /></div>
          <div>
            <div className="text-2xl font-bold">{stats.today}</div>
            <div className="text-xs text-muted">Sessions Today</div>
          </div>
        </div>
        <div className="card card-sm flex items-center gap-4">
          <div className="p-3 rounded-xl bg-success/10 text-success"><CheckCircle2 size={24} /></div>
          <div>
            <div className="text-2xl font-bold">{stats.completed}</div>
            <div className="text-xs text-muted">Completed (Total)</div>
          </div>
        </div>
        <div className="card card-sm flex items-center gap-4">
          <div className="p-3 rounded-xl bg-warning/10 text-warning"><Clock size={24} /></div>
          <div>
            <div className="text-2xl font-bold">{stats.pending}</div>
            <div className="text-xs text-muted">Upcoming / Scheduled</div>
          </div>
        </div>
      </div>

      <div className="card card-no-padding">
        <div className="card-header border-bottom flex justify-between items-center" style={{ padding: '16px 20px' }}>
          <div className="flex items-center gap-2">
            <Timer size={18} className="text-accent" />
            <h2 style={{ fontSize: 16, fontWeight: 700 }}>Session Schedule</h2>
          </div>
          <div className="tabs-container">
            {['All', 'Scheduled', 'Completed', 'Cancelled'].map(t => (
              <button 
                key={t}
                className={`btn btn-xs ${filter === t.toLowerCase() ? 'btn-primary' : 'btn-ghost'}`}
                onClick={() => setFilter(t.toLowerCase())}
              >
                {t}
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
                <th>Exercise Focus</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredSessions.map(s => (
                <tr key={s.id}>
                  <td>
                    <div className="flex flex-column">
                      <span style={{ fontWeight: 600 }}>{formatDate(s.date)}</span>
                      <span className="text-xs text-muted flex items-center gap-1"><Clock size={10} /> {s.time}</span>
                    </div>
                  </td>
                  <td>
                    <div className="flex items-center gap-2">
                       <div className="avatar avatar-xs" style={{ width: 24, height: 24, fontSize: 10 }}>{s.memberName.charAt(0)}</div>
                       <span style={{ fontSize: 13 }}>{s.memberName}</span>
                    </div>
                  </td>
                  <td>
                    <div className="flex items-center gap-2">
                       <User size={14} className="text-accent" />
                       <span style={{ fontSize: 13 }}>{s.trainerName}</span>
                    </div>
                  </td>
                  <td style={{ fontSize: 13 }}>{s.duration} min</td>
                  <td style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{s.exercises}</td>
                  <td>
                    <span className={`badge ${
                      s.status === 'Completed' ? 'badge-success' : 
                      s.status === 'Scheduled' ? 'badge-warning' : 
                      'badge-danger'
                    }`}>
                      {s.status}
                    </span>
                  </td>
                  <td>
                    <button className="btn btn-ghost btn-xs">Edit</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Schedule Modal */}
      <Modal open={isModalOpen} onClose={() => setIsModalOpen(false)} title="Schedule PT Session"
        footer={<><button className="btn btn-secondary" onClick={() => setIsModalOpen(false)}>Cancel</button><button className="btn btn-primary" onClick={() => { addToast('Session scheduled!', 'success'); setIsModalOpen(false); }}>Schedule</button></>}
      >
        <div className="grid grid-2" style={{ gap: 14 }}>
          <div className="form-group"><label className="form-label">Member</label>
            <select className="select">
              {members.map(m => <option key={m.id}>{m.name}</option>)}
            </select>
          </div>
          <div className="form-group"><label className="form-label">Trainer</label>
            <select className="select">
              {trainers.map(t => <option key={t.id}>{t.name}</option>)}
            </select>
          </div>
          <div className="form-group"><label className="form-label">Date</label>
            <input className="input" type="date" defaultValue={new Date().toISOString().split('T')[0]} />
          </div>
          <div className="form-group"><label className="form-label">Time</label>
            <select className="select">
              {['06:00', '07:00', '08:00', '17:00', '18:00', '19:00', '20:00'].map(t => <option key={t}>{t}</option>)}
            </select>
          </div>
          <div className="form-group" style={{ gridColumn: '1/-1' }}><label className="form-label">Focus Area</label>
            <input className="input" placeholder="e.g., Upper Body Strength" />
          </div>
        </div>
      </Modal>
    </div>
  );
}
