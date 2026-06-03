import { useState } from 'react';
import { Plus, Phone, Calendar } from 'lucide-react';
import { useApp } from '../store/useStore';
import type { Lead } from '../types';
import { formatDate, generateId } from '../utils/helpers';
import Modal from '../components/ui/Modal';

const STAGES: Lead['status'][] = ['New', 'Contacted', 'Follow-up', 'Trial', 'Converted', 'Lost'];
const STAGE_COLORS: Record<Lead['status'], string> = {
  'New': '#60a5fa',
  'Contacted': '#a78bfa',
  'Follow-up': '#fbbf24',
  'Trial': '#34d399',
  'Converted': '#4ade80',
  'Lost': '#f87171',
};

const SOURCES = ['Walk-in', 'Instagram', 'Google', 'JustDial', 'Referral', 'Other'];

export default function Enquiries() {
  const { leads, addLead, updateLead } = useApp();
  const [addOpen, setAddOpen] = useState(false);
  const [form, setForm] = useState({ name: '', phone: '', source: 'Walk-in', interestedPlan: '', assignedTo: '', followUpDate: '', notes: '' });
  const [dragging, setDragging] = useState<string | null>(null);

  const handleAdd = () => {
    const lead: Lead = {
      id: generateId(),
      ...form,
      source: form.source as Lead['source'],
      status: 'New',
      enquiryDate: new Date().toISOString().split('T')[0],
    };
    addLead(lead);
    setAddOpen(false);
    setForm({ name: '', phone: '', source: 'Walk-in', interestedPlan: '', assignedTo: '', followUpDate: '', notes: '' });
  };

  const handleDrop = (stage: Lead['status'], leadId: string) => {
    updateLead(leadId, { status: stage });
    setDragging(null);
  };

  const today = new Date().toISOString().split('T')[0];
  const overdueFollowUps = leads.filter(l => l.followUpDate < today && l.status !== 'Converted' && l.status !== 'Lost').length;
  const todayFollowUps = leads.filter(l => l.followUpDate === today).length;
  const conversionRate = Math.round(leads.filter(l => l.status === 'Converted').length / leads.length * 100);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div className="page-header">
        <div>
          <p className="page-subtitle" style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-primary)' }}>
            {leads.length} total enquiries · {conversionRate}% conversion rate
          </p>
        </div>
        <div className="page-header-actions">
          <button className="btn btn-primary" onClick={() => setAddOpen(true)}><Plus size={16} /> Add Enquiry</button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-4">
        <div className="card card-sm"><div style={{ fontSize: 26, fontWeight: 800, color: 'var(--accent-primary)' }}>{leads.length}</div><div className="text-muted text-xs mt-1">Total Leads</div></div>
        <div className="card card-sm"><div style={{ fontSize: 26, fontWeight: 800, color: 'var(--accent-danger)' }}>{overdueFollowUps}</div><div className="text-muted text-xs mt-1">Overdue Follow-ups</div></div>
        <div className="card card-sm"><div style={{ fontSize: 26, fontWeight: 800, color: 'var(--accent-warning)' }}>{todayFollowUps}</div><div className="text-muted text-xs mt-1">Today's Follow-ups</div></div>
        <div className="card card-sm"><div style={{ fontSize: 26, fontWeight: 800, color: 'var(--accent-success)' }}>{conversionRate}%</div><div className="text-muted text-xs mt-1">Conversion Rate</div></div>
      </div>

      {/* Kanban Board */}
      <div className="kanban-board">
        {STAGES.map(stage => {
          const stageLeads = leads.filter(l => l.status === stage);
          return (
            <div
              key={stage}
              className="kanban-column"
              onDragOver={e => e.preventDefault()}
              onDrop={() => { if (dragging) handleDrop(stage, dragging); }}
            >
              <div className="kanban-column-header" style={{ borderTop: `3px solid ${STAGE_COLORS[stage]}` }}>
                <div className="flex items-center gap-2">
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: STAGE_COLORS[stage], display: 'inline-block' }} />
                  <span style={{ fontSize: 12 }}>{stage}</span>
                </div>
                <span style={{ fontSize: 11, fontWeight: 700, background: 'var(--bg-hover)', padding: '2px 8px', borderRadius: 'var(--radius-full)' }}>{stageLeads.length}</span>
              </div>
              <div className="kanban-column-body">
                {stageLeads.map(lead => (
                  <div
                    key={lead.id}
                    className="kanban-card"
                    draggable
                    onDragStart={() => setDragging(lead.id)}
                    onDragEnd={() => setDragging(null)}
                  >
                    <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 4 }}>{lead.name}</div>
                    <div className="flex items-center gap-1 text-muted text-xs mb-2"><Phone size={10} /> {lead.phone}</div>
                    {lead.interestedPlan && <div className="badge badge-primary" style={{ fontSize: 10, marginBottom: 8 }}>{lead.interestedPlan}</div>}
                    <div className="flex items-center justify-between">
                      <span className="badge" style={{ background: 'rgba(0,0,0,0.2)', color: 'var(--text-secondary)', fontSize: 10 }}>{lead.source}</span>
                      {lead.followUpDate && (
                        <span style={{ fontSize: 10, color: lead.followUpDate < today ? 'var(--accent-danger)' : lead.followUpDate === today ? 'var(--accent-warning)' : 'var(--text-muted)' }}>
                          📅 {formatDate(lead.followUpDate)}
                        </span>
                      )}
                    </div>
                    {lead.followUpDate < today && stage !== 'Converted' && stage !== 'Lost' && (
                      <div style={{ marginTop: 8, fontSize: 10, color: 'var(--accent-danger)', fontWeight: 700 }}>⚠️ Follow-up overdue!</div>
                    )}
                    <div style={{ marginTop: 8, display: 'flex', gap: 4 }}>
                      {STAGES.filter(s => s !== stage).slice(0, 2).map(s => (
                        <button
                          key={s}
                          className="btn btn-ghost"
                          style={{ fontSize: 10, height: 22, padding: '0 6px' }}
                          onClick={() => updateLead(lead.id, { status: s })}
                        >
                          → {s}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
                {stageLeads.length === 0 && (
                  <div style={{ textAlign: 'center', fontSize: 12, color: 'var(--text-muted)', padding: 16 }}>Drop leads here</div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Source Stats */}
      <div className="grid grid-2">
        <div className="card">
          <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 16 }}>Lead Sources</h3>
          {SOURCES.map(source => {
            const count = leads.filter(l => l.source === source).length;
            const pct = Math.round(count / leads.length * 100);
            return (
              <div key={source} style={{ marginBottom: 12 }}>
                <div className="flex justify-between mb-1">
                  <span style={{ fontSize: 13 }}>{source}</span>
                  <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{count} ({pct}%)</span>
                </div>
                <div className="progress-bar"><div className="progress-bar-fill" style={{ width: `${pct}%` }} /></div>
              </div>
            );
          })}
        </div>
        <div className="card">
          <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 16 }}>Upcoming Follow-ups</h3>
          {leads.filter(l => l.followUpDate >= today && l.status !== 'Converted' && l.status !== 'Lost').slice(0, 6).map(l => (
            <div key={l.id} className="flex items-center gap-3" style={{ padding: '8px 0', borderBottom: '1px solid var(--glass-border)' }}>
              <Calendar size={14} style={{ color: l.followUpDate === today ? 'var(--accent-warning)' : 'var(--text-muted)', flexShrink: 0 }} />
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, fontSize: 13 }}>{l.name}</div>
                <div className="text-muted text-xs">{l.phone} · {l.source}</div>
              </div>
              <span style={{ fontSize: 11, color: l.followUpDate === today ? 'var(--accent-warning)' : 'var(--text-muted)' }}>{formatDate(l.followUpDate)}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Add Lead Modal */}
      <Modal open={addOpen} onClose={() => setAddOpen(false)} title="Add New Lead"
        footer={<>
          <button className="btn btn-secondary" onClick={() => setAddOpen(false)}>Cancel</button>
          <button className="btn btn-primary" onClick={handleAdd}>Add Lead</button>
        </>}
      >
        <div className="grid grid-2" style={{ gap: 14 }}>
          <div className="form-group">
            <label className="form-label required">Name</label>
            <input className="input" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="Full name" />
          </div>
          <div className="form-group">
            <label className="form-label required">Phone</label>
            <input className="input" value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))} placeholder="+91 9876543210" />
          </div>
          <div className="form-group">
            <label className="form-label">Source</label>
            <select className="select" value={form.source} onChange={e => setForm(p => ({ ...p, source: e.target.value }))}>
              {SOURCES.map(s => <option key={s}>{s}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Interested Plan</label>
            <input className="input" value={form.interestedPlan} onChange={e => setForm(p => ({ ...p, interestedPlan: e.target.value }))} placeholder="Monthly, Annual..." />
          </div>
          <div className="form-group">
            <label className="form-label">Assigned To</label>
            <input className="input" value={form.assignedTo} onChange={e => setForm(p => ({ ...p, assignedTo: e.target.value }))} placeholder="Staff name" />
          </div>
          <div className="form-group">
            <label className="form-label">Follow-up Date</label>
            <input className="input" type="date" value={form.followUpDate} onChange={e => setForm(p => ({ ...p, followUpDate: e.target.value }))} />
          </div>
          <div className="form-group" style={{ gridColumn: '1/-1' }}>
            <label className="form-label">Notes</label>
            <textarea className="textarea" value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} placeholder="Any notes..." style={{ minHeight: 60 }} />
          </div>
        </div>
      </Modal>
    </div>
  );
}
