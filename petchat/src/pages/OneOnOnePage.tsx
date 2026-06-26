import { useState, useEffect } from 'react';
import type { Employee, OneOnOneNote } from '../types';
import { onOneOnOneNotesChange, saveOneOnOneNote, updateOneOnOneNote, deleteOneOnOneNote } from '../services/firebase';

interface Props {
  employee: Employee;
  allEmployees: Employee[];
}

export default function OneOnOnePage({ employee, allEmployees }: Props) {
  const [selectedEmpId, setSelectedEmpId] = useState<string>('');
  const [notes, setNotes] = useState<OneOnOneNote[]>([]);
  const [draft, setDraft] = useState('');
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');

  const subordinates = allEmployees.filter(e => e.id !== employee.id);

  useEffect(() => {
    if (!selectedEmpId) { setNotes([]); return; }
    return onOneOnOneNotesChange(employee.id, selectedEmpId, setNotes);
  }, [employee.id, selectedEmpId]);

  const handleSave = async () => {
    if (!draft.trim() || !selectedEmpId) return;
    setSaving(true);
    await saveOneOnOneNote({
      managerId: employee.id,
      managerName: employee.name,
      employeeId: selectedEmpId,
      employeeName: allEmployees.find(e => e.id === selectedEmpId)?.name ?? '',
      content: draft.trim(),
      createdAt: Date.now(),
    });
    setDraft('');
    setSaving(false);
  };

  const handleUpdate = async (id: string) => {
    if (!editText.trim()) return;
    await updateOneOnOneNote(id, editText.trim());
    setEditingId(null);
    setEditText('');
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this note?')) return;
    await deleteOneOnOneNote(id);
  };

  const selectedEmp = allEmployees.find(e => e.id === selectedEmpId);

  return (
    <div className="p-6 animate-slide-in" style={{ maxWidth: 720, margin: '0 auto' }}>
      <div className="mb-6">
        <h2 className="text-2xl font-bold" style={{ color: 'var(--text)' }}>📝 1-on-1 Notes</h2>
        <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>Private notes for your 1-on-1 meetings. Only visible to you.</p>
      </div>

      {/* Employee selector */}
      <div className="card p-4 mb-5">
        <label className="text-xs font-semibold uppercase tracking-wide block mb-2" style={{ color: 'var(--text-muted)' }}>Select team member</label>
        <select
          value={selectedEmpId}
          onChange={e => setSelectedEmpId(e.target.value)}
          className="input w-full"
        >
          <option value="">— Choose a person —</option>
          {subordinates.map(e => (
            <option key={e.id} value={e.id}>{e.name} · {e.department}</option>
          ))}
        </select>
      </div>

      {selectedEmpId && (
        <>
          {/* Header */}
          <div className="flex items-center gap-3 mb-4">
            <div style={{ width: 36, height: 36, borderRadius: '50%', background: '#111', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 12, fontWeight: 700, flexShrink: 0 }}>
              {(selectedEmp?.name ?? '').split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
            </div>
            <div>
              <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text)' }}>{selectedEmp?.name}</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{selectedEmp?.jobTitle || selectedEmp?.department}</div>
            </div>
            <span style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--text-muted)' }}>{notes.length} note{notes.length !== 1 ? 's' : ''}</span>
          </div>

          {/* Add note */}
          <div className="card p-4 mb-5 space-y-3">
            <label className="text-xs font-semibold uppercase tracking-wide block" style={{ color: 'var(--text-muted)' }}>Add a note</label>
            <textarea
              value={draft}
              onChange={e => setDraft(e.target.value)}
              placeholder="What was discussed? Action items, concerns, praise…"
              rows={4}
              className="input w-full resize-none"
              onKeyDown={e => { if (e.key === 'Enter' && e.metaKey) handleSave(); }}
            />
            <div className="flex items-center justify-between">
              <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>⌘↵ to save</span>
              <button
                onClick={handleSave}
                disabled={saving || !draft.trim()}
                className="px-4 py-2 rounded-lg text-sm font-medium transition"
                style={{ background: '#111', color: '#fff', opacity: draft.trim() ? 1 : 0.5, cursor: draft.trim() ? 'pointer' : 'not-allowed', border: 'none' }}
              >
                {saving ? 'Saving…' : 'Save Note'}
              </button>
            </div>
          </div>

          {/* Notes list */}
          {notes.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-4xl mb-3">📋</p>
              <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>No notes yet. Start by adding one above.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {notes.map(note => (
                <div key={note.id} className="card p-4">
                  {editingId === note.id ? (
                    <div className="space-y-2">
                      <textarea
                        value={editText}
                        onChange={e => setEditText(e.target.value)}
                        rows={4}
                        className="input w-full resize-none"
                        autoFocus
                      />
                      <div className="flex gap-2">
                        <button onClick={() => handleUpdate(note.id)}
                          className="px-3 py-1.5 rounded-lg text-xs font-medium"
                          style={{ background: '#111', color: '#fff', border: 'none', cursor: 'pointer' }}>
                          Save
                        </button>
                        <button onClick={() => { setEditingId(null); setEditText(''); }}
                          className="px-3 py-1.5 rounded-lg text-xs font-medium"
                          style={{ background: 'var(--surface2)', color: 'var(--text-muted)', border: 'none', cursor: 'pointer' }}>
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <p className="text-sm leading-relaxed whitespace-pre-wrap" style={{ color: 'var(--text)' }}>{note.content}</p>
                      <div className="flex items-center justify-between mt-3">
                        <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                          {new Date(note.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                          {note.updatedAt && <span> · edited</span>}
                        </span>
                        <div className="flex gap-1">
                          <button onClick={() => { setEditingId(note.id); setEditText(note.content); }}
                            style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, color: 'var(--text-muted)', padding: '2px 6px', borderRadius: 5 }}
                            title="Edit">✏️</button>
                          <button onClick={() => handleDelete(note.id)}
                            style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, color: 'var(--text-muted)', padding: '2px 6px', borderRadius: 5 }}
                            title="Delete">🗑️</button>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {!selectedEmpId && (
        <div className="text-center py-16">
          <p className="text-5xl mb-4">👥</p>
          <p className="font-semibold text-lg" style={{ color: 'var(--text)' }}>Select a team member</p>
          <p className="text-sm mt-2" style={{ color: 'var(--text-muted)' }}>Choose someone above to view or add 1-on-1 notes.</p>
        </div>
      )}
    </div>
  );
}
