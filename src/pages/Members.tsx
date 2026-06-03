import { useState, useMemo } from 'react';
import {
  Search, Plus, Download, Eye, Edit2, Trash2,
  Phone, Mail, MapPin, Calendar, CreditCard, User, RefreshCw
} from 'lucide-react';
import { useApp } from '../store/useStore';
import type { Member } from '../types';
import {
  formatDate, getStatusColor, getStatusBg, formatCurrency,
  searchFilter, paginate, exportToCSV, generateId,
  addDays, avatarUrl, daysUntil
} from '../utils/helpers';
import Modal from '../components/ui/Modal';

export default function Members() {
  const { members, addMember, updateMember, deleteMember, addToast, plans, getNextMemberId, renewMember } = useApp();
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [planFilter, setPlanFilter] = useState('All');
  const [page, setPage] = useState(1);
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [detailTab, setDetailTab] = useState('personal');
  const [addOpen, setAddOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<Partial<Member>>({});
  const [step, setStep] = useState(0);
  const [deleteConfirm, setDeleteConfirm] = useState<Member | null>(null);
  const [renewOpen, setRenewOpen] = useState(false);
  const [renewPlanId, setRenewPlanId] = useState('');
  const [renewMode, setRenewMode] = useState('Cash');
  const [newMember, setNewMember] = useState({
    name: '', email: '', phone: '', area: '', gender: 'Male',
    dob: '', planId: '', bloodGroup: 'O+', healthConditions: 'None', emergencyContact: '',
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  const PER_PAGE = 15;

  // Use live plans for filter dropdown — NOT hardcoded list
  const planNames = useMemo(() => plans.map(p => p.name), [plans]);

  const filtered = useMemo(() => {
    let result = searchFilter(members, query, ['name', 'phone', 'memberId', 'area']);
    if (statusFilter !== 'All') result = result.filter(m => m.status === statusFilter);
    if (planFilter !== 'All') result = result.filter(m => m.planName === planFilter);
    return result;
  }, [members, query, statusFilter, planFilter]);

  const { items, totalPages, total } = paginate(filtered, page, PER_PAGE);

  const handleExport = () => {
    exportToCSV(members.map(m => ({
      ID: m.memberId, Name: m.name, Phone: m.phone, Email: m.email,
      Plan: m.planName, Status: m.status, Expiry: formatDate(m.expiryDate),
      Area: m.area, 'Join Date': formatDate(m.joinDate),
    })), 'members');
    addToast('Members exported to CSV', 'success');
  };

  const validateStep0 = () => {
    const errors: Record<string, string> = {};
    if (!newMember.name.trim()) errors.name = 'Full name is required';
    if (!newMember.phone.trim()) errors.phone = 'Phone number is required';
    if (!newMember.area.trim()) errors.area = 'Area is required';
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const validateStep2 = () => {
    if (!newMember.planId) {
      addToast('Please select a plan', 'error');
      return false;
    }
    return true;
  };

  const handleNextStep = () => {
    if (step === 0 && !validateStep0()) return;
    setStep(s => s + 1);
  };

  const handleAddMember = () => {
    if (!validateStep2()) return;
    const plan = plans.find(p => p.id === newMember.planId) ?? plans[0];
    const today = new Date().toISOString().split('T')[0];
    const expiryDate = addDays(today, plan.duration);
    const days = daysUntil(expiryDate);
    const member: Member = {
      id: generateId(),
      memberId: getNextMemberId(), // uses persistent counter — no collision
      name: newMember.name.trim(),
      email: newMember.email.trim(),
      phone: newMember.phone.trim(),
      address: newMember.area.trim(),
      area: newMember.area.trim(),
      gender: newMember.gender as any,
      dob: newMember.dob,
      joinDate: today,
      status: 'Active',
      planId: plan.id,
      planName: plan.name,
      expiryDate,
      photo: avatarUrl(newMember.name),
      bloodGroup: newMember.bloodGroup,
      emergencyContact: newMember.emergencyContact,
      healthConditions: newMember.healthConditions,
      daysRemaining: days, // computed dynamically
    };
    addMember(member);
    addToast(`Member ${member.name} added successfully!`, 'success');
    setAddOpen(false);
    setStep(0);
    setFormErrors({});
    setNewMember({ name: '', email: '', phone: '', area: '', gender: 'Male', dob: '', planId: '', bloodGroup: 'O+', healthConditions: 'None', emergencyContact: '' });
  };

  const handleDelete = (m: Member) => {
    // Use custom modal instead of window.confirm()
    setDeleteConfirm(m);
  };

  const confirmDelete = () => {
    if (!deleteConfirm) return;
    deleteMember(deleteConfirm.id);
    addToast(`${deleteConfirm.name} removed`, 'warning');
    if (selectedMember?.id === deleteConfirm.id) setSelectedMember(null);
    setDeleteConfirm(null);
  };

  const handleUpdateMember = () => {
    if (editingMember.id) {
      updateMember(editingMember.id, editingMember);
      addToast('Member updated', 'success');
      setEditOpen(false);
    }
  };

  const handleRenew = () => {
    if (!selectedMember) return;
    if (!renewPlanId) { addToast('Please select a plan', 'error'); return; }
    renewMember(selectedMember.id, renewPlanId, renewMode);
    addToast(`Membership renewed for ${selectedMember.name}!`, 'success');
    setRenewOpen(false);
    setSelectedMember(null);
  };

  // Compute progress bar % using actual plan duration
  const getProgressPercent = (member: Member): number => {
    const plan = plans.find(p => p.id === member.planId);
    const duration = plan?.duration ?? 30;
    const days = daysUntil(member.expiryDate);
    return Math.max(0, Math.min(100, (days / duration) * 100));
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Members</h1>
          <p className="page-subtitle">{members.length} total · {members.filter(m => m.status === 'Active').length} active</p>
        </div>
        <div className="page-header-actions">
          <button className="btn btn-secondary" onClick={handleExport}>
            <Download size={15} /> Export CSV
          </button>
          <button className="btn btn-primary" onClick={() => setAddOpen(true)}>
            <Plus size={16} /> Add Member
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="card card-sm">
        <div className="flex items-center gap-3" style={{ flexWrap: 'wrap' }}>
          <div className="search-input-wrap" style={{ flex: 1, minWidth: 200 }}>
            <Search size={15} className="search-icon" />
            <input
              className="input" placeholder="Search by name, phone, ID..."
              value={query} onChange={e => { setQuery(e.target.value); setPage(1); }}
              style={{ paddingLeft: 36 }}
            />
          </div>
          <select className="select" style={{ width: 140 }} value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1); }}>
            <option value="All">All Status</option>
            <option>Active</option>
            <option>Expiring Soon</option>
            <option>Expired</option>
            <option>Frozen</option>
          </select>
          <select className="select" style={{ width: 180 }} value={planFilter} onChange={e => { setPlanFilter(e.target.value); setPage(1); }}>
            <option value="All">All Plans</option>
            {planNames.map(p => <option key={p}>{p}</option>)}
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="card card-no-padding">
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>Member</th>
                <th>M.ID</th>
                <th>Contact</th>
                <th>Plan</th>
                <th>Status</th>
                <th>Expiry</th>
                <th>Area</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.length === 0 && (
                <tr><td colSpan={8}><div className="empty-state">No members found matching your filters.</div></td></tr>
              )}
              {items.map(m => (
                <tr key={m.id}>
                  <td>
                    <div className="flex items-center gap-3">
                      <img src={m.photo} alt={m.name} style={{ width: 36, height: 36, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
                      <div style={{ fontWeight: 600, fontSize: 13.5 }}>{m.name}</div>
                    </div>
                  </td>
                  <td>
                    <span className="text-muted text-xs font-bold" style={{ letterSpacing: '0.05em' }}>{m.memberId}</span>
                  </td>
                  <td>
                    <div style={{ fontSize: 13 }}>{m.phone}</div>
                    <div className="text-muted text-xs">{m.email}</div>
                  </td>
                  <td style={{ fontSize: 13, maxWidth: 150 }}><span className="truncate" style={{ display: 'block' }}>{m.planName}</span></td>
                  <td>
                    <span className="badge" style={{ background: getStatusBg(m.status), color: getStatusColor(m.status) }}>
                      {m.status}
                    </span>
                  </td>
                  <td>
                    <div className="flex items-center gap-2" style={{ fontSize: 13 }}>
                      <div style={{
                        width: 8, height: 8, borderRadius: '50%',
                        background: m.daysRemaining <= 0 ? 'var(--accent-danger)' : m.daysRemaining < 15 ? 'var(--accent-warning)' : 'var(--accent-success)'
                      }} />
                      <span>{formatDate(m.expiryDate)}</span>
                    </div>
                  </td>
                  <td style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{m.area}</td>
                  <td>
                    <div className="flex items-center gap-2">
                      <button className="btn btn-ghost btn-icon btn-sm" onClick={() => { setSelectedMember(m); setDetailTab('personal'); }} data-tooltip="View">
                        <Eye size={14} />
                      </button>
                      <button className="btn btn-ghost btn-icon btn-sm" onClick={() => { setEditingMember({ ...m }); setEditOpen(true); }} data-tooltip="Edit">
                        <Edit2 size={14} />
                      </button>
                      <button className="btn btn-ghost btn-icon btn-sm" onClick={() => handleDelete(m)} style={{ color: 'var(--accent-danger)' }} data-tooltip="Delete">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination — fixed "Showing 1–0 of 0" bug */}
        <div className="pagination">
          <span>
            {total === 0
              ? 'No results'
              : `Showing ${Math.min((page - 1) * PER_PAGE + 1, total)}–${Math.min(page * PER_PAGE, total)} of ${total}`}
          </span>
          <div className="pagination-controls">
            <button className="page-btn" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>‹</button>
            {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
              const pg = i + 1;
              return <button key={pg} className={`page-btn ${page === pg ? 'active' : ''}`} onClick={() => setPage(pg)}>{pg}</button>;
            })}
            <button className="page-btn" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages || totalPages === 0}>›</button>
          </div>
        </div>
      </div>

      {/* Member Detail Modal */}
      {selectedMember && (
        <Modal open={!!selectedMember} onClose={() => setSelectedMember(null)} size="lg" title=" ">
          <div>
            {/* Profile Header */}
            <div className="flex items-center gap-4" style={{ marginBottom: 24, paddingBottom: 20, borderBottom: '1px solid var(--glass-border)' }}>
              <img src={selectedMember.photo} alt={selectedMember.name} style={{ width: 72, height: 72, borderRadius: '50%', objectFit: 'cover' }} />
              <div style={{ flex: 1 }}>
                <h2 style={{ fontSize: 20, fontWeight: 800 }}>{selectedMember.name}</h2>
                <div className="flex items-center gap-2" style={{ marginTop: 4 }}>
                  <span className="badge badge-primary">{selectedMember.memberId}</span>
                  <span className="badge" style={{ background: getStatusBg(selectedMember.status), color: getStatusColor(selectedMember.status) }}>
                    {selectedMember.status}
                  </span>
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>Days Remaining</div>
                <div style={{ fontSize: 28, fontWeight: 800, color: selectedMember.daysRemaining < 7 ? 'var(--accent-warning)' : 'var(--accent-success)' }}>
                  {Math.max(0, daysUntil(selectedMember.expiryDate))}
                </div>
              </div>
            </div>

            {/* Tabs */}
            <div className="tabs">
              {['personal', 'subscription', 'payments'].map(t => (
                <button key={t} className={`tab-btn ${detailTab === t ? 'active' : ''}`} onClick={() => setDetailTab(t)}>
                  {t.charAt(0).toUpperCase() + t.slice(1)}
                </button>
              ))}
            </div>

            {/* Personal Tab */}
            {detailTab === 'personal' && (
              <div className="grid grid-2" style={{ gap: 14 }}>
                <InfoRow icon={<Phone size={14} />} label="Phone" value={selectedMember.phone} />
                <InfoRow icon={<Mail size={14} />} label="Email" value={selectedMember.email} />
                <InfoRow icon={<MapPin size={14} />} label="Area" value={selectedMember.area} />
                <InfoRow icon={<Calendar size={14} />} label="Date of Birth" value={formatDate(selectedMember.dob)} />
                <InfoRow icon={<User size={14} />} label="Gender" value={selectedMember.gender} />
                <InfoRow icon={<CreditCard size={14} />} label="Blood Group" value={selectedMember.bloodGroup ?? '-'} />
                <InfoRow icon={<Phone size={14} />} label="Emergency Contact" value={selectedMember.emergencyContact ?? '-'} />
                <InfoRow icon={<Calendar size={14} />} label="Joined On" value={formatDate(selectedMember.joinDate)} />
              </div>
            )}

            {/* Subscription Tab */}
            {detailTab === 'subscription' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div className="card card-sm" style={{ background: 'var(--bg-hover)' }}>
                  <div className="flex items-center justify-between" style={{ marginBottom: 12 }}>
                    <h4 style={{ fontWeight: 700 }}>Current Plan</h4>
                    <span className="badge badge-primary">{selectedMember.planName}</span>
                  </div>
                  <div className="progress-bar" style={{ marginBottom: 8 }}>
                    {/* Fixed: uses actual plan duration, not hardcoded 30 */}
                    <div className="progress-bar-fill" style={{ width: `${getProgressPercent(selectedMember)}%` }} />
                  </div>
                  <div className="flex justify-between text-secondary text-xs">
                    <span>Joined: {formatDate(selectedMember.joinDate)}</span>
                    <span>Expires: {formatDate(selectedMember.expiryDate)}</span>
                  </div>
                </div>
                <button
                  className="btn btn-primary"
                  onClick={() => { setRenewPlanId(selectedMember.planId || plans[0]?.id || ''); setRenewOpen(true); }}
                >
                  <RefreshCw size={15} /> Renew Membership
                </button>
              </div>
            )}

            {/* Payments Tab */}
            {detailTab === 'payments' && (
              <div className="text-secondary text-center" style={{ padding: 32 }}>
                Payment history for this member would display here with all transaction records.
              </div>
            )}
          </div>
        </Modal>
      )}

      {/* Renew Membership Modal */}
      <Modal
        open={renewOpen}
        onClose={() => setRenewOpen(false)}
        title="Renew Membership"
        size="sm"
        footer={<><button className="btn btn-secondary" onClick={() => setRenewOpen(false)}>Cancel</button><button className="btn btn-primary" onClick={handleRenew}><RefreshCw size={14} /> Renew</button></>}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="form-group">
            <label className="form-label required">Select Plan</label>
            <select className="select" value={renewPlanId} onChange={e => setRenewPlanId(e.target.value)}>
              <option value="">-- Select Plan --</option>
              {plans.map(p => <option key={p.id} value={p.id}>{p.name} — {formatCurrency(p.price + Math.round(p.price * 0.18))} / {p.duration} days</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label required">Payment Mode</label>
            <select className="select" value={renewMode} onChange={e => setRenewMode(e.target.value)}>
              {['Cash', 'UPI', 'Card', 'GPay', 'PhonePe'].map(m => <option key={m}>{m}</option>)}
            </select>
          </div>
          {renewPlanId && (() => {
            const plan = plans.find(p => p.id === renewPlanId);
            if (!plan) return null;
            const total = plan.price + Math.round(plan.price * 0.18);
            return (
              <div style={{ padding: 14, background: 'var(--bg-hover)', borderRadius: 'var(--radius-md)', fontSize: 13 }}>
                <div className="flex justify-between"><span className="text-secondary">Plan</span><span>{plan.name}</span></div>
                <div className="flex justify-between"><span className="text-secondary">Duration</span><span>{plan.duration} days</span></div>
                <div className="flex justify-between font-bold" style={{ marginTop: 8, paddingTop: 8, borderTop: '1px solid var(--glass-border)' }}>
                  <span>Total</span><span style={{ color: 'var(--accent-success)' }}>{formatCurrency(total)}</span>
                </div>
              </div>
            );
          })()}
        </div>
      </Modal>

      {/* Edit Member Modal */}
      <Modal open={editOpen} onClose={() => setEditOpen(false)} title="Edit Member" size="sm"
        footer={<><button className="btn btn-secondary" onClick={() => setEditOpen(false)}>Cancel</button><button className="btn btn-primary" onClick={handleUpdateMember}>Save Changes</button></>}
      >
        <div className="grid grid-2" style={{ gap: 14 }}>
          <div className="form-group" style={{ gridColumn: '1/-1' }}>
             <label className="form-label">Name</label>
             <input className="input" value={editingMember.name || ''} onChange={e => setEditingMember(p => ({ ...p, name: e.target.value }))} />
          </div>
          <div className="form-group">
             <label className="form-label">Phone</label>
             <input className="input" value={editingMember.phone || ''} onChange={e => setEditingMember(p => ({ ...p, phone: e.target.value }))} />
          </div>
          <div className="form-group">
             <label className="form-label">Area</label>
             <input className="input" value={editingMember.area || ''} onChange={e => setEditingMember(p => ({ ...p, area: e.target.value }))} />
          </div>
        </div>
      </Modal>

      {/* Custom Delete Confirmation Modal — replaces window.confirm() */}
      <Modal open={!!deleteConfirm} onClose={() => setDeleteConfirm(null)} title="Delete Member" size="sm"
        footer={<><button className="btn btn-secondary" onClick={() => setDeleteConfirm(null)}>Cancel</button><button className="btn btn-danger" onClick={confirmDelete}>🗑️ Delete</button></>}
      >
        <div style={{ textAlign: 'center', padding: '8px 0' }}>
          <div style={{ fontSize: 36, marginBottom: 12 }}>⚠️</div>
          <p style={{ fontSize: 14, color: 'var(--text-secondary)' }}>
            Are you sure you want to delete <strong style={{ color: 'var(--text-primary)' }}>{deleteConfirm?.name}</strong>?
            <br /><span style={{ fontSize: 12, color: 'var(--accent-danger)' }}>This action cannot be undone.</span>
          </p>
        </div>
      </Modal>

      {/* Add Member Modal */}
      <Modal open={addOpen} onClose={() => { setAddOpen(false); setStep(0); setFormErrors({}); }} title="Add New Member" size="lg"
        footer={
          <div className="flex items-center gap-2 ml-auto">
            {step > 0 && <button className="btn btn-secondary" onClick={() => setStep(s => s - 1)}>Back</button>}
            {step < 2 && <button className="btn btn-primary" onClick={handleNextStep}>Next →</button>}
            {step === 2 && <button className="btn btn-primary" onClick={handleAddMember}>✅ Add Member</button>}
          </div>
        }
      >
        {/* Steps indicator */}
        <div className="step-indicator" style={{ marginBottom: 28 }}>
          {['Personal', 'Health', 'Plan'].map((label, i) => (
            <div key={i} className="step" style={{ flexShrink: 0 }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                <div className={`step-circle ${step === i ? 'active' : step > i ? 'completed' : ''}`}
                  style={{ width: 32, height: 32, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 13, border: '2px solid', borderColor: step === i ? 'var(--accent-primary)' : step > i ? 'var(--accent-success)' : 'var(--glass-border)', background: step === i ? 'var(--accent-primary)' : step > i ? 'var(--accent-success)' : 'transparent', color: step >= i ? 'white' : 'var(--text-muted)' }}>
                  {step > i ? '✓' : i + 1}
                </div>
                <div style={{ fontSize: 11, color: step === i ? 'var(--accent-primary)' : 'var(--text-muted)', whiteSpace: 'nowrap' }}>{label}</div>
              </div>
              {i < 2 && <div style={{ flex: 1, height: 2, background: step > i ? 'var(--accent-success)' : 'var(--glass-border)', margin: '0 8px', marginBottom: 20 }} />}
            </div>
          ))}
        </div>

        {step === 0 && (
          <div className="grid grid-2" style={{ gap: 16 }}>
            <div className="form-group">
              <label className="form-label required">Full Name</label>
              <input
                className="input"
                value={newMember.name}
                onChange={e => { setNewMember(p => ({ ...p, name: e.target.value })); setFormErrors(p => ({ ...p, name: '' })); }}
                placeholder="Arjun Kumar"
                style={{ borderColor: formErrors.name ? 'var(--accent-danger)' : undefined }}
              />
              {formErrors.name && <span style={{ fontSize: 11, color: 'var(--accent-danger)' }}>{formErrors.name}</span>}
            </div>
            <div className="form-group">
              <label className="form-label required">Phone Number</label>
              <input
                className="input"
                value={newMember.phone}
                onChange={e => { setNewMember(p => ({ ...p, phone: e.target.value })); setFormErrors(p => ({ ...p, phone: '' })); }}
                placeholder="+91 9876543210"
                style={{ borderColor: formErrors.phone ? 'var(--accent-danger)' : undefined }}
              />
              {formErrors.phone && <span style={{ fontSize: 11, color: 'var(--accent-danger)' }}>{formErrors.phone}</span>}
            </div>
            <div className="form-group">
              <label className="form-label">Email</label>
              <input className="input" type="email" value={newMember.email} onChange={e => setNewMember(p => ({ ...p, email: e.target.value }))} placeholder="member@email.com" />
            </div>
            <div className="form-group">
              <label className="form-label required">Area</label>
              <input
                className="input"
                value={newMember.area}
                onChange={e => { setNewMember(p => ({ ...p, area: e.target.value })); setFormErrors(p => ({ ...p, area: '' })); }}
                placeholder="Koramangala, Bengaluru"
                style={{ borderColor: formErrors.area ? 'var(--accent-danger)' : undefined }}
              />
              {formErrors.area && <span style={{ fontSize: 11, color: 'var(--accent-danger)' }}>{formErrors.area}</span>}
            </div>
            <div className="form-group">
              <label className="form-label">Date of Birth</label>
              <input className="input" type="date" value={newMember.dob} onChange={e => setNewMember(p => ({ ...p, dob: e.target.value }))} />
            </div>
            <div className="form-group">
              <label className="form-label">Gender</label>
              <select className="select" value={newMember.gender} onChange={e => setNewMember(p => ({ ...p, gender: e.target.value }))}>
                <option>Male</option>
                <option>Female</option>
                <option>Other</option>
              </select>
            </div>
          </div>
        )}

        {step === 1 && (
          <div className="grid grid-2" style={{ gap: 16 }}>
            <div className="form-group">
              <label className="form-label">Blood Group</label>
              <select className="select" value={newMember.bloodGroup} onChange={e => setNewMember(p => ({ ...p, bloodGroup: e.target.value }))}>
                {['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'].map(g => <option key={g}>{g}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Emergency Contact</label>
              <input className="input" value={newMember.emergencyContact} onChange={e => setNewMember(p => ({ ...p, emergencyContact: e.target.value }))} placeholder="+91 9876543210" />
            </div>
            <div className="form-group" style={{ gridColumn: '1/-1' }}>
              <label className="form-label">Health Conditions</label>
              <input className="input" value={newMember.healthConditions} onChange={e => setNewMember(p => ({ ...p, healthConditions: e.target.value }))} placeholder="None / Hypertension / Diabetes..." />
            </div>
          </div>
        )}

        {step === 2 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div className="form-group">
              <label className="form-label required">Select Plan</label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {plans.map(p => (
                  <div
                    key={p.id}
                    className="card card-sm"
                    onClick={() => setNewMember(prev => ({ ...prev, planId: p.id }))}
                    style={{ cursor: 'pointer', border: newMember.planId === p.id ? `2px solid ${p.color}` : '1px solid var(--glass-border)', transition: 'all 0.2s' }}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div style={{ width: 10, height: 10, borderRadius: '50%', background: p.color, flexShrink: 0 }} />
                        <span style={{ fontWeight: 600, fontSize: 13.5 }}>{p.name}</span>
                        {p.popular && <span className="badge badge-primary" style={{ fontSize: 10 }}>Popular</span>}
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontWeight: 700 }}>{formatCurrency(p.price + Math.round(p.price * 0.18))}</div>
                        <div className="text-xs text-muted">{p.duration} days</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

function InfoRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4, padding: '12px 0', borderBottom: '1px solid var(--glass-border)' }}>
      <div className="flex items-center gap-2 text-muted text-xs">
        {icon} {label}
      </div>
      <div style={{ fontSize: 13.5, fontWeight: 500 }}>{value}</div>
    </div>
  );
}
