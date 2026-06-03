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
  const { leads, addLead, updateLead, plans, trainers, addToast } = useApp();
  const [addOpen, setAddOpen] = useState(false);
  const [form, setForm] = useState({ name: '', phone: '', source: 'Walk-in', interestedPlan: '', assignedTo: '', followUpDate: '', notes: '' });
  const [dragging, setDragging] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Staff list for "Assigned To" dropdown
  const staffNames = trainers.map(t => t.name);

  const validateForm = (): boolean => {
    const errs: Record<string, string> = {};
    if (!form.name.trim() || form.name.trim().length < 2) errs.name = 'Name is required (min 2 chars)';
    if (!form.phone.trim()) errs.phone = 'Phone is required';
    else if (!/^\+?[\d\s()-]{7,15}$/.test(form.phone.trim())) errs.phone = 'Enter a valid phone number';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleAdd = () => {
    if (!validateForm()) {
      addToast('Please fix the errors in the form', 'error');
      return;
    }
    const lead: Lead = {
      id: generateId(),
      ...form,
      source: form.source as Lead['source'],
      status: 'New',
      enquiryDate: new Date().toISOString().split('T')[0],
    };
    addLead(lead);
    addToast(`Lead "${form.name}" added successfully!`, 'success');
    setAddOpen(false);
    setForm({ name: '', phone: '', source: 'Walk-in', interestedPlan: '', assignedTo: '', followUpDate: '', notes: '' });
    setErrors({});
  };

  const handleDrop = (stage: Lead['status'], leadId: string) => {
    updateLead(leadId, { status: stage });
    setDragging(null);
  };

  const today = new Date().toISOString().split('T')[0];
  const overdueFollowUps = leads.filter(l => l.followUpDate < today && l.status !== 'Converted' && l.status !== 'Lost').length;
  const todayFollowUps = leads.filter(l => l.followUpDate === today).length;
  const totalLeads = leads.length;
  const conversionRate = totalLeads > 0 ? Math.round(leads.filter(l => l.status === 'Converted').length / totalLeads * 100) : 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div className="page-header">
        <div>
          <p className="page-subtitle" style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-primary)' }}>
            {totalLeads} total enquiries · {conversionRate}% conversion rate
          </p>
        </div>
        <div className="page-header-actions">
          <button className="btn btn-primary" onClick={() => setAddOpen(true)}><Plus size={16} /> Add Enquiry</button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-4">
        <div className="card card-sm"><div style={{ fontSize: 26, fontWeight: 800, color: 'var(--accent-primary)' }}>{totalLeads}</div><div className="text-muted text-xs mt-1">Total Leads</div></div>
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
            const pct = totalLeads > 0 ? Math.round(count / totalLeads * 100) : 0;
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

      {/* Add Lead Modal — VALIDATED + DROPDOWNS */}
      <Modal open={addOpen} onClose={() => { setAddOpen(false); setErrors({}); }} title="Add New Lead"
        footer={<>
          <button className="btn btn-secondary" onClick={() => { setAddOpen(false); setErrors({}); }}>Cancel</button>
          <button className="btn btn-primary" onClick={handleAdd}>Add Lead</button>
        </>}
      >
        <div className="grid grid-2" style={{ gap: 14 }}>
          {/* Name — REQUIRED with validation */}
          <div className="form-group">
            <label className="form-label required">Name</label>
            <input
              className={`input ${errors.name ? 'input-error' : ''}`}
              value={form.name}
              onChange={e => { setForm(p => ({ ...p, name: e.target.value })); setErrors(e2 => ({ ...e2, name: '' })); }}
              placeholder="Full name"
            />
            {errors.name && <span style={{ color: 'var(--accent-danger)', fontSize: 11, marginTop: 4 }}>{errors.name}</span>}
          </div>

          {/* Phone — REQUIRED with validation */}
          <div className="form-group">
            <label className="form-label required">Phone</label>
            <input
              className={`input ${errors.phone ? 'input-error' : ''}`}
              value={form.phone}
              onChange={e => { setForm(p => ({ ...p, phone: e.target.value })); setErrors(e2 => ({ ...e2, phone: '' })); }}
              placeholder="+91 9876543210"
            />
            {errors.phone && <span style={{ color: 'var(--accent-danger)', fontSize: 11, marginTop: 4 }}>{errors.phone}</span>}
          </div>

          {/* Source — dropdown */}
          <div className="form-group">
            <label className="form-label">Source</label>
            <select className="select" value={form.source} onChange={e => setForm(p => ({ ...p, source: e.target.value }))}>
              {SOURCES.map(s => <option key={s}>{s}</option>)}
            </select>
          </div>

          {/* Interested Plan — DROPDOWN from live plans */}
          <div className="form-group">
            <label className="form-label">Interested Plan</label>
            <select className="select" value={form.interestedPlan} onChange={e => setForm(p => ({ ...p, interestedPlan: e.target.value }))}>
              <option value="">-- Select Plan --</option>
              {plans.map(p => <option key={p.id} value={p.name}>{p.name} (₹{p.price})</option>)}
            </select>
          </div>

          {/* Assigned To — DROPDOWN from staff/trainers */}
          <div className="form-group">
            <label className="form-label">Assigned To</label>
            <select className="select" value={form.assignedTo} onChange={e => setForm(p => ({ ...p, assignedTo: e.target.value }))}>
              <option value="">-- Select Staff --</option>
              {staffNames.map(n => <option key={n} value={n}>{n}</option>)}
            </select>
          </div>

          {/* Follow-up Date */}
          <div className="form-group">
            <label className="form-label">Follow-up Date</label>
            <input className="input" type="date" value={form.followUpDate} min={today} onChange={e => setForm(p => ({ ...p, followUpDate: e.target.value }))} />
          </div>

          {/* Notes */}
          <div className="form-group" style={{ gridColumn: '1/-1' }}>
            <label className="form-label">Notes</label>
            <textarea className="textarea" value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} placeholder="Any notes..." style={{ minHeight: 60 }} />
          </div>
        </div>
      </Modal>
    </div>
  );
}
