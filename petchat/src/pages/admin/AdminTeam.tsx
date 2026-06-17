import { useState } from 'react';
import type { Employee, Department, Role } from '../../types';
import { addEmployee, updateEmployee, deleteEmployee } from '../../services/firebase';

interface Props {
  employee: Employee;
  allEmployees: Employee[];
}

const DEPARTMENTS: Department[] = ['Tech', 'Marketing', 'Operations', 'Sales', 'CEO', 'CFO', 'CMO', 'Design', 'Engineering', 'Other'];
const ROLES: Role[] = ['employee', 'admin', 'founder'];
const EMPTY = { name: '', email: '', department: 'Tech' as Department, role: 'employee' as Role, shiftStart: '', shiftEnd: '' };

export default function AdminTeam({ employee, allEmployees }: Props) {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm]         = useState({ ...EMPTY });
  const [saving, setSaving]     = useState(false);
  const [editId, setEditId]     = useState<string | null>(null);
  const [search, setSearch]     = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [deptFilter, setDeptFilter] = useState('all');

  const filtered = allEmployees.filter(e => {
    const q = search.toLowerCase();
    const matchQ = !q || e.name.toLowerCase().includes(q) || e.email.toLowerCase().includes(q);
    const matchD = deptFilter === 'all' || e.department === deptFilter;
    return matchQ && matchD;
  });

  const handleSubmit = async () => {
    if (!form.name.trim() || !form.email.trim()) return;
    setSaving(true);
    try {
      if (editId) {
        await updateEmployee(editId, form);
        setEditId(null);
      } else {
        await addEmployee({ ...form, status: 'offline', createdAt: Date.now() });
      }
      setForm({ ...EMPTY });
      setShowForm(false);
    } finally { setSaving(false); }
  };

  const handleEdit = (emp: Employee) => {
    setForm({ name: emp.name, email: emp.email, department: emp.department, role: emp.role, shiftStart: emp.shiftStart ?? '', shiftEnd: emp.shiftEnd ?? '' });
    setEditId(emp.id);
    setShowForm(true);
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Remove ${name} from the team?`)) return;
    await deleteEmployee(id);
  };

  const handleBulkDelete = async () => {
    if (!confirm(`Remove ${selected.size} employees?`)) return;
    await Promise.all([...selected].map(id => deleteEmployee(id)));
    setSelected(new Set());
  };

  const toggleSelect = (id: string) => {
    setSelected(s => {
      const n = new Set(s);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  };

  const toggleAll = () => {
    setSelected(s => s.size === filtered.length ? new Set() : new Set(filtered.map(e => e.id)));
  };

  const STATUS_DOT: Record<string, string> = { active: 'bg-green-400', idle: 'bg-yellow-400', blocked: 'bg-red-400', offline: 'bg-gray-400' };

  return (
    <div className="p-6 space-y-5 animate-slide-in">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold" style={{ color: 'var(--text)' }}>🧑‍🤝‍🧑 Team Management</h2>
          <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>{allEmployees.length} employees</p>
        </div>
        <div className="flex gap-2">
          {selected.size > 0 && (
            <button onClick={handleBulkDelete}
              className="px-4 py-2 rounded-xl bg-red-500 hover:bg-red-600 text-white text-sm font-medium transition">
              🗑️ Remove {selected.size}
            </button>
          )}
          <button onClick={() => { setShowForm(v => !v); setEditId(null); setForm({ ...EMPTY }); }}
            className="px-4 py-2 rounded-xl bg-blue-500 hover:bg-blue-600 text-white text-sm font-medium transition shadow">
            + Add Employee
          </button>
        </div>
      </div>

      {/* Form */}
      {showForm && (
        <div className="card p-5 border-2 border-blue-300 dark:border-blue-700 space-y-4">
          <h3 className="font-semibold" style={{ color: 'var(--text)' }}>{editId ? 'Edit Employee' : 'Add Employee'}</h3>
          <div className="grid grid-cols-2 gap-3">
            <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              placeholder="Full Name *" className="input" />
            <input value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
              placeholder="Email *" type="email" className="input" />
            <select value={form.department} onChange={e => setForm(f => ({ ...f, department: e.target.value as Department }))}
              className="input">
              {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
            <select value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value as Role }))}
              className="input">
              {ROLES.map(r => <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>)}
            </select>
            <input value={form.shiftStart} onChange={e => setForm(f => ({ ...f, shiftStart: e.target.value }))}
              placeholder="Shift Start (HH:MM)" type="time" className="input" />
            <input value={form.shiftEnd} onChange={e => setForm(f => ({ ...f, shiftEnd: e.target.value }))}
              placeholder="Shift End (HH:MM)" type="time" className="input" />
          </div>
          <div className="flex gap-2">
            <button onClick={handleSubmit} disabled={saving || !form.name.trim() || !form.email.trim()}
              className="flex-1 py-2 rounded-lg bg-blue-500 hover:bg-blue-600 disabled:opacity-50 text-white text-sm font-medium transition">
              {saving ? 'Saving…' : editId ? 'Save Changes' : 'Add Employee'}
            </button>
            <button onClick={() => { setShowForm(false); setEditId(null); }}
              className="flex-1 py-2 rounded-lg text-sm font-medium transition"
              style={{ background: 'var(--surface2)', color: 'var(--text-muted)' }}>Cancel</button>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <input value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Search name or email…" className="input flex-1 min-w-48" />
        <select value={deptFilter} onChange={e => setDeptFilter(e.target.value)} className="input">
          <option value="all">All Departments</option>
          {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
        </select>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr style={{ background: 'var(--surface2)', borderBottom: '1px solid var(--border)' }}>
              <th className="p-3 text-left w-10">
                <input type="checkbox" checked={selected.size === filtered.length && filtered.length > 0}
                  onChange={toggleAll} className="w-4 h-4 rounded" />
              </th>
              <th className="p-3 text-left font-semibold" style={{ color: 'var(--text-muted)' }}>Name</th>
              <th className="p-3 text-left font-semibold" style={{ color: 'var(--text-muted)' }}>Department</th>
              <th className="p-3 text-left font-semibold" style={{ color: 'var(--text-muted)' }}>Role</th>
              <th className="p-3 text-left font-semibold" style={{ color: 'var(--text-muted)' }}>Status</th>
              <th className="p-3 text-left font-semibold" style={{ color: 'var(--text-muted)' }}>Shift</th>
              <th className="p-3 text-left font-semibold" style={{ color: 'var(--text-muted)' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((emp, idx) => {
              const initials = emp.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
              const isMe = emp.id === employee.id;
              return (
                <tr key={emp.id}
                  className={`border-b transition hover:bg-gray-50 dark:hover:bg-white/5 ${selected.has(emp.id) ? 'bg-blue-50 dark:bg-blue-900/10' : ''}`}
                  style={{ borderColor: 'var(--border)' }}>
                  <td className="p-3">
                    <input type="checkbox" checked={selected.has(emp.id)}
                      onChange={() => toggleSelect(emp.id)} className="w-4 h-4 rounded" />
                  </td>
                  <td className="p-3">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                        {initials}
                      </div>
                      <div>
                        <p className="font-medium" style={{ color: 'var(--text)' }}>{emp.name}{isMe ? ' (You)' : ''}</p>
                        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{emp.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="p-3">
                    <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ background: 'var(--surface2)', color: 'var(--text-muted)' }}>
                      {emp.department}
                    </span>
                  </td>
                  <td className="p-3 capitalize" style={{ color: 'var(--text-muted)' }}>{emp.role}</td>
                  <td className="p-3">
                    <div className="flex items-center gap-1.5">
                      <span className={`w-2 h-2 rounded-full ${STATUS_DOT[emp.status ?? 'offline']}`} />
                      <span className="text-xs capitalize" style={{ color: 'var(--text-muted)' }}>{emp.status ?? 'offline'}</span>
                    </div>
                  </td>
                  <td className="p-3 text-xs" style={{ color: 'var(--text-muted)' }}>
                    {emp.shiftStart ? `${emp.shiftStart} – ${emp.shiftEnd ?? '?'}` : '—'}
                  </td>
                  <td className="p-3">
                    <div className="flex gap-2">
                      <button onClick={() => handleEdit(emp)}
                        className="text-xs text-blue-500 hover:text-blue-700 font-medium transition">Edit</button>
                      {!isMe && (
                        <button onClick={() => handleDelete(emp.id, emp.name)}
                          className="text-xs text-red-500 hover:text-red-700 font-medium transition">Remove</button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <div className="text-center py-12">
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>No employees found.</p>
          </div>
        )}
      </div>
    </div>
  );
}
