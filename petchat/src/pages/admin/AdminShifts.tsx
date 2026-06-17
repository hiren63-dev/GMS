import { useState, useEffect } from 'react';
import type { Employee, Shift, Department } from '../../types';
import { onShiftsChange, setShift, updateEmployee } from '../../services/firebase';

interface Props {
  employee: Employee;
  allEmployees: Employee[];
}

export default function AdminShifts({ employee, allEmployees }: Props) {
  const [shifts, setShifts] = useState<Record<string, Shift>>({});
  const [editing, setEditing] = useState<string | null>(null);
  const [form, setForm] = useState({ shiftStart: '09:00', shiftEnd: '18:00', allowedLoginBuffer: 15 });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    return onShiftsChange(setShifts);
  }, []);

  const handleSave = async (emp: Employee) => {
    setSaving(true);
    await setShift(emp.id, {
      employeeId: emp.id, employeeName: emp.name,
      department: emp.department,
      shiftStart: form.shiftStart, shiftEnd: form.shiftEnd,
      allowedLoginBuffer: form.allowedLoginBuffer,
    });
    await updateEmployee(emp.id, { shiftStart: form.shiftStart, shiftEnd: form.shiftEnd });
    setEditing(null); setSaving(false);
  };

  const handleEdit = (emp: Employee) => {
    const existing = shifts[emp.id];
    setForm({
      shiftStart: existing?.shiftStart ?? emp.shiftStart ?? '09:00',
      shiftEnd: existing?.shiftEnd ?? emp.shiftEnd ?? '18:00',
      allowedLoginBuffer: existing?.allowedLoginBuffer ?? 15,
    });
    setEditing(emp.id);
  };

  const depts = Array.from(new Set(allEmployees.map(e => e.department)));

  return (
    <div className="p-6 space-y-5 animate-slide-in">
      <div>
        <h2 className="text-2xl font-bold" style={{ color: 'var(--text)' }}>🕐 Shift Control</h2>
        <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>Set work hours for each team member</p>
      </div>

      {depts.map(dept => {
        const members = allEmployees.filter(e => e.department === dept);
        return (
          <div key={dept}>
            <h3 className="text-sm font-semibold uppercase tracking-wide mb-3" style={{ color: 'var(--text-muted)' }}>{dept}</h3>
            <div className="space-y-3">
              {members.map(emp => {
                const shift = shifts[emp.id];
                const isEditing = editing === emp.id;
                const initials = emp.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
                return (
                  <div key={emp.id} className="card p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-xs font-bold">
                          {initials}
                        </div>
                        <div>
                          <p className="font-semibold text-sm" style={{ color: 'var(--text)' }}>{emp.name}</p>
                          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                            {shift ? `${shift.shiftStart} – ${shift.shiftEnd} · ±${shift.allowedLoginBuffer}min` : 'No shift set'}
                          </p>
                        </div>
                      </div>
                      <button onClick={() => isEditing ? setEditing(null) : handleEdit(emp)}
                        className="text-sm text-blue-500 hover:text-blue-600 font-medium transition">
                        {isEditing ? 'Cancel' : 'Edit'}
                      </button>
                    </div>

                    {isEditing && (
                      <div className="mt-4 pt-4 border-t space-y-3" style={{ borderColor: 'var(--border)' }}>
                        <div className="grid grid-cols-3 gap-3">
                          <div>
                            <label className="text-xs font-medium block mb-1" style={{ color: 'var(--text-muted)' }}>Start Time</label>
                            <input type="time" value={form.shiftStart}
                              onChange={e => setForm(f => ({ ...f, shiftStart: e.target.value }))}
                              className="input w-full" />
                          </div>
                          <div>
                            <label className="text-xs font-medium block mb-1" style={{ color: 'var(--text-muted)' }}>End Time</label>
                            <input type="time" value={form.shiftEnd}
                              onChange={e => setForm(f => ({ ...f, shiftEnd: e.target.value }))}
                              className="input w-full" />
                          </div>
                          <div>
                            <label className="text-xs font-medium block mb-1" style={{ color: 'var(--text-muted)' }}>Late Buffer (min)</label>
                            <input type="number" value={form.allowedLoginBuffer} min={0} max={60}
                              onChange={e => setForm(f => ({ ...f, allowedLoginBuffer: parseInt(e.target.value) || 0 }))}
                              className="input w-full" />
                          </div>
                        </div>

                        {/* Preview */}
                        <div className="p-3 rounded-lg text-xs" style={{ background: 'var(--surface2)', color: 'var(--text-muted)' }}>
                          {emp.name} works {form.shiftStart}–{form.shiftEnd} with ±{form.allowedLoginBuffer}min grace period
                        </div>

                        <button onClick={() => handleSave(emp)} disabled={saving}
                          className="w-full py-2 rounded-lg bg-blue-500 hover:bg-blue-600 disabled:opacity-50 text-white text-sm font-medium transition">
                          {saving ? 'Saving…' : 'Save Shift'}
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}

      {allEmployees.length === 0 && (
        <div className="text-center py-16">
          <p className="text-4xl mb-4">🕐</p>
          <p className="font-medium" style={{ color: 'var(--text)' }}>No employees to configure</p>
          <p className="text-sm mt-2" style={{ color: 'var(--text-muted)' }}>Add employees in Team Management first</p>
        </div>
      )}
    </div>
  );
}
