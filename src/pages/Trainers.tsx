import { useState } from 'react';
import { Star, Phone, Mail } from 'lucide-react';
import { useApp } from '../store/useStore';
import { formatCurrency } from '../utils/helpers';
import Modal from '../components/ui/Modal';
import type { Trainer } from '../types';

export default function Trainers() {
  const { trainers, members, ptSessions } = useApp();
  const [selected, setSelected] = useState<Trainer | null>(null);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div className="page-header">
        <div>
          <h1 className="page-title">Trainers</h1>
          <p className="page-subtitle">{trainers.length} trainers · {trainers.filter(t => t.status === 'Active').length} active</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-4">
        {trainers.map(t => {
          const assigned = members.filter(m => m.trainerId === t.id).length;
          const sessions = ptSessions.filter(p => p.trainerId === t.id && p.status === 'Completed').length;
          return (
            <div key={t.id} className="card card-hover cursor-pointer" onClick={() => setSelected(t)}>
              <div style={{ textAlign: 'center', marginBottom: 16 }}>
                <img src={t.photo} alt={t.name} style={{ width: 72, height: 72, borderRadius: '50%', objectFit: 'cover', margin: '0 auto 12px' }} />
                <h3 style={{ fontSize: 16, fontWeight: 700 }}>{t.name}</h3>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, marginTop: 4 }}>
                  {Array.from({ length: 5 }, (_, i) => (
                    <Star key={i} size={12} fill={i < Math.floor(t.rating) ? '#fbbf24' : 'none'} color="#fbbf24" />
                  ))}
                  <span style={{ fontSize: 12, color: 'var(--text-muted)', marginLeft: 4 }}>{t.rating}</span>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', justifyContent: 'center', marginBottom: 12 }}>
                {t.specialization.map(s => <span key={s} className="badge badge-primary" style={{ fontSize: 10 }}>{s}</span>)}
              </div>
              <div className="divider" />
              <div className="grid grid-2" style={{ gap: 8, marginTop: 12, textAlign: 'center' }}>
                <div>
                  <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--accent-primary)' }}>{assigned}</div>
                  <div className="text-muted text-xs">Clients</div>
                </div>
                <div>
                  <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--accent-success)' }}>{sessions}</div>
                  <div className="text-muted text-xs">Sessions</div>
                </div>
              </div>
              <div style={{ marginTop: 12 }}>
                <span className="badge badge-success" style={{ width: '100%', justifyContent: 'center' }}>{t.status}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* PT Sessions table */}
      <div className="card card-no-padding">
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--glass-border)' }}>
          <h3 style={{ fontSize: 14, fontWeight: 700 }}>PT Sessions</h3>
        </div>
        <div className="table-container">
          <table className="table">
            <thead><tr><th>Member</th><th>Trainer</th><th>Date</th><th>Time</th><th>Duration</th><th>Exercises</th><th>Status</th></tr></thead>
            <tbody>
              {ptSessions.slice(0, 15).map(s => (
                <tr key={s.id}>
                  <td style={{ fontWeight: 600, fontSize: 13 }}>{s.memberName}</td>
                  <td style={{ fontSize: 13 }}>{s.trainerName}</td>
                  <td style={{ fontSize: 13 }}>{s.date}</td>
                  <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>{s.time}</td>
                  <td style={{ fontSize: 12 }}>{s.duration} min</td>
                  <td style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{s.exercises}</td>
                  <td><span className={`badge ${s.status === 'Completed' ? 'badge-success' : s.status === 'Scheduled' ? 'badge-info' : 'badge-danger'}`}>{s.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Trainer detail */}
      {selected && (
        <Modal open={!!selected} onClose={() => setSelected(null)} title={selected.name}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div className="flex items-center gap-4">
              <img src={selected.photo} style={{ width: 80, height: 80, borderRadius: '50%', objectFit: 'cover' }} />
              <div>
                <h2 style={{ fontSize: 20, fontWeight: 800 }}>{selected.name}</h2>
                <div className="flex items-center gap-4 mt-2 text-secondary text-sm">
                  <span><Phone size={12} style={{ display: 'inline', marginRight: 4 }} />{selected.phone}</span>
                  <span><Mail size={12} style={{ display: 'inline', marginRight: 4 }} />{selected.email}</span>
                </div>
                <div style={{ marginTop: 8, display: 'flex', gap: 6 }}>
                  {selected.specialization.map(s => <span key={s} className="badge badge-primary" style={{ fontSize: 11 }}>{s}</span>)}
                </div>
              </div>
            </div>
            <div className="grid grid-3 text-center" style={{ gap: 12 }}>
              <div className="card card-sm"><div style={{ fontSize: 22, fontWeight: 800, color: 'var(--accent-primary)' }}>{selected.experience}</div><div className="text-muted text-xs">Years Exp.</div></div>
              <div className="card card-sm"><div style={{ fontSize: 22, fontWeight: 800, color: 'var(--accent-success)' }}>{members.filter(m => m.trainerId === selected.id).length}</div><div className="text-muted text-xs">Active Clients</div></div>
              <div className="card card-sm"><div style={{ fontSize: 22, fontWeight: 800, color: 'var(--accent-warning)' }}>{selected.rating}</div><div className="text-muted text-xs">Rating</div></div>
            </div>
            <div className="card card-sm" style={{ background: 'var(--bg-hover)' }}>
              <div className="text-secondary text-xs mb-1">Monthly Salary</div>
              <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--accent-success)' }}>{formatCurrency(selected.salary)}</div>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
