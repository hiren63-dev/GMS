import { useState } from 'react';
import type { Employee, Department, Role } from '../../types';
import {
  updateEmployee, deleteEmployee,
  createEmployeeWithAuth, generatePassword,
} from '../../services/firebase';

interface Props {
  employee: Employee;
  allEmployees: Employee[];
}

const DEPARTMENTS: Department[] = ['Tech', 'Marketing', 'Operations', 'Sales', 'CEO', 'CFO', 'CMO', 'Design', 'Engineering', 'Other'];
const ROLES: Role[] = ['employee', 'admin', 'founder'];
const EMPTY = { name: '', email: '', department: 'Tech' as Department, role: 'employee' as Role, shiftStart: '', shiftEnd: '', password: '' };

type EmpWithPw = Employee & { password?: string };

export default function AdminTeam({ employee, allEmployees }: Props) {
  const [showForm, setShowForm]       = useState(false);
  const [form, setForm]               = useState({ ...EMPTY });
  const [saving, setSaving]           = useState(false);
  const [editId, setEditId]           = useState<string | null>(null);
  const [search, setSearch]           = useState('');
  const [selected, setSelected]       = useState<Set<string>>(new Set());
  const [deptFilter, setDeptFilter]   = useState('all');
  const [revealPw, setRevealPw]       = useState<Set<string>>(new Set());
  const [toast, setToast]             = useState('');
  const [createError, setCreateError] = useState('');

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 2500); };

  const filtered = (allEmployees as EmpWithPw[]).filter(e => {
    const q = search.toLowerCase();
    const matchQ = !q || e.name.toLowerCase().includes(q) || e.email.toLowerCase().includes(q);
    const matchD = deptFilter === 'all' || e.department === deptFilter;
    return matchQ && matchD;
  });

  const resetForm = () => { setForm({ ...EMPTY }); setEditId(null); setCreateError(''); };

  const handleGenPw = () => setForm(f => ({ ...f, password: generatePassword() }));

  const handleSubmit = async () => {
    if (!form.name.trim() || !form.email.trim()) return;
    setSaving(true);
    setCreateError('');
    try {
      if (editId) {
        const patch: Partial<EmpWithPw> = {
          name: form.name, email: form.email, department: form.department,
          role: form.role, shiftStart: form.shiftStart, shiftEnd: form.shiftEnd,
        };
        if (form.password) patch.password = form.password;
        await updateEmployee(editId, patch);
        setEditId(null);
      } else {
        if (!form.password) { setCreateError('Generate or enter a password first.'); setSaving(false); return; }
        await createEmployeeWithAuth({
          name: form.name, email: form.email, department: form.department,
          role: form.role, status: 'offline',
          shiftStart: form.shiftStart, shiftEnd: form.shiftEnd,
          password: form.password,
        });
        // Don't print the password on screen (shoulder-surfing / screen-share risk).
        // Copy it to the clipboard instead; it also stays visible in the table for the admin.
        navigator.clipboard?.writeText(form.password).catch(() => {});
        showToast(`✓ ${form.name} added. Password copied to clipboard.`);
      }
      resetForm();
      setShowForm(false);
    } catch (err: any) {
      setCreateError(err.message ?? 'Failed to create account.');
    } finally { setSaving(false); }
  };

  const handleEdit = (emp: EmpWithPw) => {
    setForm({
      name: emp.name, email: emp.email, department: emp.department,
      role: emp.role, shiftStart: emp.shiftStart ?? '', shiftEnd: emp.shiftEnd ?? '',
      password: emp.password ?? '',
    });
    setEditId(emp.id);
    setShowForm(true);
    setCreateError('');
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Remove ${name} from the team?\n\nNote: their login (Firebase Auth) will remain — they just won't appear in BuddyDesk.`)) return;
    await deleteEmployee(id);
    showToast(`${name} removed.`);
  };

  const handleBulkDelete = async () => {
    // Never bulk-delete your own account — you'd be removed from the team you're managing.
    const ids = [...selected].filter(id => id !== employee.id);
    if (ids.length === 0) { showToast("You can't remove your own account here."); return; }
    const count = ids.length;
    if (!confirm(`Remove ${count} employee${count > 1 ? 's' : ''}?`)) return;
    try {
      await Promise.all(ids.map(id => deleteEmployee(id)));
      setSelected(new Set());
      showToast(`${count} employee${count > 1 ? 's' : ''} removed.`);
    } catch (err) {
      console.error('Bulk delete failed:', err);
      showToast('Some removals failed. Please try again.');
    }
  };

  const copyPw = (pw: string) => { navigator.clipboard.writeText(pw); showToast('Password copied!'); };

  const toggleReveal = (id: string) => setRevealPw(s => {
    const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n;
  });

  const toggleSelect = (id: string) => setSelected(s => {
    const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n;
  });

  const toggleAll = () => setSelected(s => s.size === filtered.length ? new Set() : new Set(filtered.map(e => e.id)));

  const statusDot: Record<string, string> = { active: '#22C55E', idle: '#F59E0B', blocked: '#EF4444', offline: '#D1D5DB' };

  const inputStyle: React.CSSProperties = {
    width: '100%', height: 38, padding: '0 12px',
    background: 'var(--bg)', border: '1px solid var(--border)',
    borderRadius: 8, fontSize: 13, fontFamily: 'inherit',
    color: 'var(--text)', outline: 'none',
  };

  return (
    <div style={{ padding: 24, animation: 'fadeIn 200ms ease' }}>
      {/* Toast */}
      {toast && <div className="toast">{toast}</div>}

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <div style={{ fontSize: 20, fontWeight: 600, color: 'var(--text)', letterSpacing: '-0.01em' }}>Team Management</div>
          <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 3 }}>{allEmployees.length} employees</div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {selected.size > 0 && (
            <button onClick={handleBulkDelete}
              style={{ height: 36, padding: '0 16px', background: '#FEF2F2', color: '#DC2626', border: '1px solid #FECACA', borderRadius: 8, fontSize: 13, fontWeight: 500, cursor: 'pointer' }}>
              Remove {selected.size}
            </button>
          )}
          <button onClick={() => { setShowForm(v => !v); resetForm(); }}
            style={{ height: 36, padding: '0 16px', background: '#111', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 500, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}
            onMouseOver={e => (e.currentTarget as HTMLButtonElement).style.background = '#333'}
            onMouseOut={e => (e.currentTarget as HTMLButtonElement).style.background = '#111'}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            Add Employee
          </button>
        </div>
      </div>

      {/* Add / Edit Form */}
      {showForm && (
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: 24, marginBottom: 20 }}>
          <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text)', marginBottom: 16 }}>
            {editId ? 'Edit Employee' : 'New Employee'}
          </div>

          {createError && (
            <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: '#DC2626', marginBottom: 14 }}>
              {createError}
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
            <div>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 500, color: 'var(--text-muted)', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 6 }}>Full Name *</label>
              <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Priya Sharma" style={inputStyle}
                onFocus={e => (e.target.style.borderColor = '#2563EB')} onBlur={e => (e.target.style.borderColor = 'var(--border)')} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 500, color: 'var(--text-muted)', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 6 }}>Email *</label>
              <input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="priya@company.com" style={inputStyle} disabled={!!editId}
                onFocus={e => (e.target.style.borderColor = '#2563EB')} onBlur={e => (e.target.style.borderColor = 'var(--border)')} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 500, color: 'var(--text-muted)', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 6 }}>Department</label>
              <select value={form.department} onChange={e => setForm(f => ({ ...f, department: e.target.value as Department }))} style={{ ...inputStyle, cursor: 'pointer' }}>
                {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 500, color: 'var(--text-muted)', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 6 }}>Role</label>
              <select value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value as Role }))} style={{ ...inputStyle, cursor: 'pointer' }}>
                {ROLES.map(r => <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>)}
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 500, color: 'var(--text-muted)', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 6 }}>Shift Start</label>
              <input type="time" value={form.shiftStart} onChange={e => setForm(f => ({ ...f, shiftStart: e.target.value }))} style={{ ...inputStyle, cursor: 'pointer' }} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 500, color: 'var(--text-muted)', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 6 }}>Shift End</label>
              <input type="time" value={form.shiftEnd} onChange={e => setForm(f => ({ ...f, shiftEnd: e.target.value }))} style={{ ...inputStyle, cursor: 'pointer' }} />
            </div>
          </div>

          {/* Password row */}
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 500, color: 'var(--text-muted)', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 6 }}>
              {editId ? 'New Password (leave blank to keep current)' : 'Login Password *'}
            </label>
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                type="text"
                value={form.password}
                onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                placeholder={editId ? 'Leave blank to keep current…' : 'Generate or type a password…'}
                style={{ ...inputStyle, flex: 1, fontFamily: 'ui-monospace, monospace', letterSpacing: '0.04em' }}
                onFocus={e => (e.target.style.borderColor = '#2563EB')}
                onBlur={e => (e.target.style.borderColor = 'var(--border)')}
              />
              <button type="button" onClick={handleGenPw}
                style={{ height: 38, padding: '0 14px', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12, fontWeight: 500, color: 'var(--text-muted)', cursor: 'pointer', flexShrink: 0, whiteSpace: 'nowrap' }}
                onMouseOver={e => (e.currentTarget as HTMLButtonElement).style.color = 'var(--text)'}
                onMouseOut={e => (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-muted)'}
              >
                ⟳ Generate
              </button>
              {form.password && (
                <button type="button" onClick={() => copyPw(form.password)}
                  style={{ height: 38, padding: '0 14px', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12, fontWeight: 500, color: 'var(--text-muted)', cursor: 'pointer', flexShrink: 0 }}
                  onMouseOver={e => (e.currentTarget as HTMLButtonElement).style.color = 'var(--text)'}
                  onMouseOut={e => (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-muted)'}
                >
                  Copy
                </button>
              )}
            </div>
            {!editId && (
              <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 6 }}>
                The password is stored so you can share it with the employee and look it up later.
              </p>
            )}
            {editId && (
              <p style={{ fontSize: 11, color: '#CA8A04', marginTop: 6, lineHeight: 1.5 }}>
                ⚠ This updates the stored password shown in the table. The employee's actual
                login will accept the new password too — but if their account also has a Firebase
                Auth record, the old Auth password keeps working until reset from Firebase Console →
                Authentication (or via “forgot password”).
              </p>
            )}
          </div>

          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={handleSubmit} disabled={saving || !form.name.trim() || !form.email.trim()}
              style={{ flex: 1, height: 40, background: saving ? '#888' : '#111', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 500, cursor: saving ? 'not-allowed' : 'pointer' }}>
              {saving ? 'Saving…' : editId ? 'Save Changes' : 'Create Employee'}
            </button>
            <button onClick={() => { setShowForm(false); resetForm(); }}
              style={{ flex: 1, height: 40, background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 13, fontWeight: 500, color: 'var(--text-muted)', cursor: 'pointer' }}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Filters */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, padding: '7px 12px', flex: 1, minWidth: 200 }}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--text-faint)" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search name or email…"
            style={{ flex: 1, border: 'none', background: 'transparent', fontSize: 13, fontFamily: 'inherit', color: 'var(--text)', outline: 'none' }} />
        </div>
        <select value={deptFilter} onChange={e => setDeptFilter(e.target.value)}
          style={{ height: 38, padding: '0 12px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 13, color: 'var(--text)', cursor: 'pointer', outline: 'none', fontFamily: 'inherit' }}>
          <option value="all">All Departments</option>
          {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
        </select>
      </div>

      {/* Table */}
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden' }}>
        <table style={{ width: '100%', fontSize: 13, borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: 'var(--bg)', borderBottom: '1px solid var(--border)' }}>
              <th style={{ padding: '10px 14px', textAlign: 'left', width: 40 }}>
                <input type="checkbox" checked={selected.size === filtered.length && filtered.length > 0} onChange={toggleAll} style={{ cursor: 'pointer' }} />
              </th>
              {['Employee', 'Department', 'Role', 'Status', 'Shift', 'Password', 'Actions'].map(h => (
                <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', letterSpacing: '0.04em', textTransform: 'uppercase' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map(emp => {
              const e = emp as EmpWithPw;
              const initials = e.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
              const isMe = e.id === employee.id;
              const showPw = revealPw.has(e.id);
              return (
                <tr key={e.id} style={{ borderBottom: '1px solid var(--border)', background: selected.has(e.id) ? 'rgba(37,99,235,0.04)' : 'transparent', transition: 'background 120ms' }}
                  onMouseOver={ev => { if (!selected.has(e.id)) (ev.currentTarget as HTMLElement).style.background = 'var(--bg)'; }}
                  onMouseOut={ev => { if (!selected.has(e.id)) (ev.currentTarget as HTMLElement).style.background = 'transparent'; }}>
                  <td style={{ padding: '12px 14px' }}>
                    <input type="checkbox" checked={selected.has(e.id)} onChange={() => toggleSelect(e.id)} style={{ cursor: 'pointer' }} />
                  </td>
                  <td style={{ padding: '12px 14px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#111', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 11, fontWeight: 600, flexShrink: 0 }}>{initials}</div>
                      <div>
                        <div style={{ fontWeight: 500, color: 'var(--text)' }}>{e.name}{isMe ? ' (You)' : ''}</div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{e.email}</div>
                      </div>
                    </div>
                  </td>
                  <td style={{ padding: '12px 14px' }}>
                    <span style={{ fontSize: 11, padding: '2px 8px', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 99, color: 'var(--text-muted)' }}>{e.department}</span>
                  </td>
                  <td style={{ padding: '12px 14px', color: 'var(--text-muted)', textTransform: 'capitalize' }}>{e.role}</td>
                  <td style={{ padding: '12px 14px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ width: 7, height: 7, borderRadius: '50%', background: statusDot[e.status ?? 'offline'], flexShrink: 0, display: 'inline-block' }} />
                      <span style={{ fontSize: 12, color: 'var(--text-muted)', textTransform: 'capitalize' }}>{e.status ?? 'offline'}</span>
                    </div>
                  </td>
                  <td style={{ padding: '12px 14px', fontSize: 12, color: 'var(--text-muted)' }}>
                    {e.shiftStart ? `${e.shiftStart} – ${e.shiftEnd ?? '?'}` : '—'}
                  </td>
                  {/* Password column */}
                  <td style={{ padding: '12px 14px' }}>
                    {e.password ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ fontFamily: 'ui-monospace, monospace', fontSize: 12, color: 'var(--text)', letterSpacing: '0.04em' }}>
                          {showPw ? e.password : '••••••••'}
                        </span>
                        <button onClick={() => toggleReveal(e.id)}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 0, fontSize: 13, lineHeight: 1 }}
                          title={showPw ? 'Hide' : 'Show'}>
                          {showPw ? '🙈' : '👁'}
                        </button>
                        <button onClick={() => copyPw(e.password!)}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 0, fontSize: 11 }}
                          title="Copy password">
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
                        </button>
                      </div>
                    ) : (
                      <span style={{ fontSize: 11, color: 'var(--text-faint)' }}>not set</span>
                    )}
                  </td>
                  <td style={{ padding: '12px 14px' }}>
                    <div style={{ display: 'flex', gap: 10 }}>
                      <button onClick={() => handleEdit(e)}
                        style={{ fontSize: 12, color: '#2563EB', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 500 }}>Edit</button>
                      {!isMe && (
                        <button onClick={() => handleDelete(e.id, e.name)}
                          style={{ fontSize: 12, color: '#DC2626', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 500 }}>Remove</button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <div style={{ padding: '40px 0', textAlign: 'center', fontSize: 13, color: 'var(--text-muted)' }}>
            {search || deptFilter !== 'all' ? 'No employees match your filters.' : 'No employees yet — add one above.'}
          </div>
        )}
      </div>

      <p style={{ fontSize: 11, color: 'var(--text-faint)', marginTop: 12 }}>
        ⚠ Removing an employee deletes their BuddyDesk profile but does not remove their Firebase Auth login. To fully revoke access, go to the Firebase Console → Authentication.
      </p>
    </div>
  );
}
