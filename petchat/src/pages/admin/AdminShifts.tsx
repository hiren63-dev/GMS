import { useState, useEffect } from 'react';
import type { Employee, Shift } from '../../types';
import { onShiftsChange, setShift, updateEmployee } from '../../services/firebase';

interface Props {
  employee: Employee;
  allEmployees: Employee[];
}

export default function AdminShifts({ allEmployees }: Props) {
  const [shifts, setShifts]   = useState<Record<string, Shift>>({});
  const [editing, setEditing] = useState<string | null>(null);
  const [form, setForm]       = useState({ shiftStart: '09:00', shiftEnd: '18:00', allowedLoginBuffer: 15 });
  const [saving, setSaving]   = useState(false);
  const [error, setError]     = useState('');

  useEffect(() => onShiftsChange(setShifts), []);

  const handleSave = async (emp: Employee) => {
    setSaving(true);
    setError('');
    try {
      await setShift(emp.id, {
        employeeId: emp.id, employeeName: emp.name,
        department: emp.department,
        shiftStart: form.shiftStart, shiftEnd: form.shiftEnd,
        allowedLoginBuffer: form.allowedLoginBuffer,
      });
      await updateEmployee(emp.id, { shiftStart: form.shiftStart, shiftEnd: form.shiftEnd });
      setEditing(null);
    } catch (err: any) {
      console.error('Failed to save shift:', err);
      setError(`Could not save ${emp.name}'s shift. Please try again.`);
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (emp: Employee) => {
    const existing = shifts[emp.id];
    setForm({
      shiftStart: existing?.shiftStart ?? emp.shiftStart ?? '09:00',
      shiftEnd: existing?.shiftEnd ?? emp.shiftEnd ?? '18:00',
      allowedLoginBuffer: existing?.allowedLoginBuffer ?? 15,
    });
    setError('');
    setEditing(emp.id);
  };

  const depts = Array.from(new Set(allEmployees.map(e => e.department)));

  const inputStyle: React.CSSProperties = {
    width: '100%', height: 38, padding: '0 12px', background: 'var(--bg)',
    border: '1px solid var(--border)', borderRadius: 8, fontSize: 13,
    fontFamily: 'inherit', color: 'var(--text)', outline: 'none',
  };

  return (
    <div style={{ padding: 24, animation: 'fadeIn 200ms ease' }}>
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 20, fontWeight: 600, color: 'var(--text)', letterSpacing: '-0.01em' }}>Shift Control</div>
        <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 3 }}>Set work hours for each team member</div>
      </div>

      {error && (
        <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: '#DC2626', marginBottom: 16 }}>{error}</div>
      )}

      {depts.map(dept => {
        const members = allEmployees.filter(e => e.department === dept);
        return (
          <div key={dept} style={{ marginBottom: 24 }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 10 }}>{dept}</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {members.map(emp => {
                const shift = shifts[emp.id];
                const isEditing = editing === emp.id;
                const initials = emp.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
                return (
                  <div key={emp.id} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, padding: 16 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div style={{ width: 36, height: 36, borderRadius: '50%', background: '#111', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 12, fontWeight: 600, flexShrink: 0 }}>{initials}</div>
                        <div>
                          <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--text)' }}>{emp.name}</div>
                          <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                            {shift ? `${shift.shiftStart} – ${shift.shiftEnd} · ±${shift.allowedLoginBuffer}min` : 'No shift set'}
                          </div>
                        </div>
                      </div>
                      <button onClick={() => isEditing ? setEditing(null) : handleEdit(emp)}
                        style={{ fontSize: 13, color: '#2563EB', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 500 }}>
                        {isEditing ? 'Cancel' : 'Edit'}
                      </button>
                    </div>

                    {isEditing && (
                      <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: 12 }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
                          <div>
                            <label style={{ display: 'block', fontSize: 11, fontWeight: 500, color: 'var(--text-muted)', marginBottom: 6 }}>Start Time</label>
                            <input type="time" value={form.shiftStart} onChange={e => setForm(f => ({ ...f, shiftStart: e.target.value }))} style={{ ...inputStyle, cursor: 'pointer' }} />
                          </div>
                          <div>
                            <label style={{ display: 'block', fontSize: 11, fontWeight: 500, color: 'var(--text-muted)', marginBottom: 6 }}>End Time</label>
                            <input type="time" value={form.shiftEnd} onChange={e => setForm(f => ({ ...f, shiftEnd: e.target.value }))} style={{ ...inputStyle, cursor: 'pointer' }} />
                          </div>
                          <div>
                            <label style={{ display: 'block', fontSize: 11, fontWeight: 500, color: 'var(--text-muted)', marginBottom: 6 }}>Late Buffer (min)</label>
                            <input type="number" value={form.allowedLoginBuffer} min={0} max={60}
                              onChange={e => setForm(f => ({ ...f, allowedLoginBuffer: parseInt(e.target.value) || 0 }))} style={inputStyle} />
                          </div>
                        </div>
                        <div style={{ padding: 12, borderRadius: 8, fontSize: 12, background: 'var(--bg)', color: 'var(--text-muted)' }}>
                          {emp.name} works {form.shiftStart}–{form.shiftEnd} with ±{form.allowedLoginBuffer}min grace period
                        </div>
                        <button onClick={() => handleSave(emp)} disabled={saving}
                          style={{ width: '100%', height: 40, background: saving ? '#888' : '#111', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 500, cursor: saving ? 'not-allowed' : 'pointer' }}>
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
        <div style={{ padding: '60px 0', textAlign: 'center' }}>
          <div style={{ fontSize: 15, fontWeight: 500, color: 'var(--text)' }}>No employees to configure</div>
          <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 6 }}>Add employees in Team Management first</div>
        </div>
      )}
    </div>
  );
}
