import { useState, useEffect } from 'react';
import type { Employee, Task, Priority, TaskStatus } from '../../types';
import { onAllTasksChange, createTask, updateTask, deleteTask, logTaskDone } from '../../services/firebase';

interface Props {
  employee: Employee;
  allEmployees: Employee[];
}

const EMPTY = { title: '', description: '', assigneeId: '', priority: 'medium' as Priority, dueDate: '' };

const STATUS_LABEL: Record<TaskStatus, string> = {
  todo: 'To Do', in_progress: 'In Progress', blocked: 'Blocked', done: 'Done',
};

export default function AdminTasks({ employee, allEmployees }: Props) {
  const [tasks, setTasks]       = useState<Task[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm]         = useState({ ...EMPTY });
  const [saving, setSaving]     = useState(false);
  const [error, setError]       = useState('');
  const [filter, setFilter]     = useState({ assignee: 'all', priority: 'all', status: 'all' });
  const [search, setSearch]     = useState('');

  useEffect(() => onAllTasksChange(setTasks), []);

  const filtered = tasks.filter(t => {
    const q = search.toLowerCase();
    const matchQ = !q || t.title.toLowerCase().includes(q) || (t.assigneeName ?? '').toLowerCase().includes(q);
    const matchA = filter.assignee === 'all' || t.assigneeId === filter.assignee;
    const matchP = filter.priority === 'all' || t.priority === filter.priority;
    const matchS = filter.status === 'all' || t.status === filter.status;
    return matchQ && matchA && matchP && matchS;
  });

  const handleCreate = async () => {
    if (!form.title.trim() || !form.assigneeId) return;
    const assignee = allEmployees.find(e => e.id === form.assigneeId);
    if (!assignee) { setError('That assignee no longer exists. Pick someone else.'); return; }
    setSaving(true);
    setError('');
    try {
      await createTask({
        title: form.title.trim(), description: form.description,
        assigneeId: form.assigneeId, assigneeName: assignee.name,
        assignedById: employee.id,
        priority: form.priority, status: 'todo',
        dueDate: form.dueDate ? new Date(form.dueDate).getTime() : undefined,
      });
      setForm({ ...EMPTY }); setShowForm(false);
    } catch (err: any) {
      console.error('Failed to assign task:', err);
      setError(err.message ?? 'Could not assign the task. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleStatusChange = (task: Task, status: TaskStatus) => {
    updateTask(task.id, { status, ...(status === 'done' ? { completedAt: Date.now() } : {}) })
      .catch(err => console.error('Failed to update task:', err));
    if (status === 'done' && task.status !== 'done') {
      logTaskDone(task.assigneeId, task.assigneeName ?? 'Someone', task.title);
    }
  };

  const handleDelete = (id: string, title: string) => {
    if (confirm(`Delete "${title}"?`)) deleteTask(id).catch(err => console.error('Failed to delete task:', err));
  };

  const inputStyle: React.CSSProperties = {
    height: 38, padding: '0 12px', background: 'var(--bg)', border: '1px solid var(--border)',
    borderRadius: 8, fontSize: 13, fontFamily: 'inherit', color: 'var(--text)', outline: 'none',
  };

  // Status via the Notion contract: blue = active signal; sticker orange/green
  // carry warning/affirmative — no separate semantic ramp.
  const statusColors: Record<TaskStatus, { bg: string; fg: string }> = {
    todo:        { bg: 'var(--bg)',            fg: 'var(--text-muted)' },
    in_progress: { bg: 'rgba(0,117,222,0.08)', fg: 'var(--accent)' },
    blocked:     { bg: 'rgba(221,91,0,0.10)',  fg: '#dd5b00' },
    done:        { bg: 'rgba(26,174,57,0.10)', fg: '#1aae39' },
  };

  const openCount = tasks.filter(t => t.status !== 'done').length;
  const doneCount = tasks.filter(t => t.status === 'done').length;

  return (
    <div style={{ padding: 24, animation: 'fadeIn 200ms ease' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <div style={{ fontSize: 20, fontWeight: 600, color: 'var(--text)', letterSpacing: '-0.01em' }}>Task Assignment</div>
          <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 3 }}>{openCount} open · {doneCount} done</div>
        </div>
        <button onClick={() => { setShowForm(v => !v); setError(''); }}
          style={{ height: 36, padding: '0 16px', background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 500, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}
          onMouseOver={e => (e.currentTarget as HTMLButtonElement).style.background = 'var(--accent-pressed)'}
          onMouseOut={e => (e.currentTarget as HTMLButtonElement).style.background = 'var(--accent)'}
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Assign Task
        </button>
      </div>

      {/* Form */}
      {showForm && (
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: 24, marginBottom: 20 }}>
          <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text)', marginBottom: 16 }}>Assign Task</div>
          {error && (
            <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: '#DC2626', marginBottom: 14 }}>{error}</div>
          )}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
              placeholder="Task title *" style={{ ...inputStyle, width: '100%' }} />
            <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              placeholder="Description (optional)" rows={2}
              style={{ ...inputStyle, width: '100%', height: 'auto', padding: '10px 12px', resize: 'none' }} />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
              <select value={form.assigneeId} onChange={e => setForm(f => ({ ...f, assigneeId: e.target.value }))}
                style={{ ...inputStyle, cursor: 'pointer' }}>
                <option value="">Assign to… *</option>
                {allEmployees.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
              </select>
              <select value={form.priority} onChange={e => setForm(f => ({ ...f, priority: e.target.value as Priority }))}
                style={{ ...inputStyle, cursor: 'pointer' }}>
                <option value="low">Low</option><option value="medium">Medium</option>
                <option value="high">High</option><option value="urgent">Urgent</option>
              </select>
              <input type="date" value={form.dueDate} onChange={e => setForm(f => ({ ...f, dueDate: e.target.value }))}
                style={{ ...inputStyle, cursor: 'pointer' }} />
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={handleCreate} disabled={saving || !form.title.trim() || !form.assigneeId}
                style={{ flex: 1, height: 40, background: saving || !form.title.trim() || !form.assigneeId ? '#888' : 'var(--accent)', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 500, cursor: saving ? 'not-allowed' : 'pointer' }}>
                {saving ? 'Assigning…' : 'Assign Task'}
              </button>
              <button onClick={() => { setShowForm(false); setError(''); }}
                style={{ flex: 1, height: 40, background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 13, fontWeight: 500, color: 'var(--text-muted)', cursor: 'pointer' }}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, padding: '7px 12px', flex: 1, minWidth: 200 }}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--text-faint)" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search tasks…"
            style={{ flex: 1, border: 'none', background: 'transparent', fontSize: 13, fontFamily: 'inherit', color: 'var(--text)', outline: 'none' }} />
        </div>
        <select value={filter.assignee} onChange={e => setFilter(f => ({ ...f, assignee: e.target.value }))} style={{ ...inputStyle, cursor: 'pointer' }}>
          <option value="all">All Assignees</option>
          {allEmployees.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
        </select>
        <select value={filter.priority} onChange={e => setFilter(f => ({ ...f, priority: e.target.value }))} style={{ ...inputStyle, cursor: 'pointer' }}>
          <option value="all">All Priorities</option>
          <option value="urgent">Urgent</option><option value="high">High</option>
          <option value="medium">Medium</option><option value="low">Low</option>
        </select>
        <select value={filter.status} onChange={e => setFilter(f => ({ ...f, status: e.target.value }))} style={{ ...inputStyle, cursor: 'pointer' }}>
          <option value="all">All Statuses</option>
          <option value="todo">To Do</option><option value="in_progress">In Progress</option>
          <option value="blocked">Blocked</option><option value="done">Done</option>
        </select>
      </div>

      {/* Table */}
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden' }}>
        <table style={{ width: '100%', fontSize: 13, borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: 'var(--bg)', borderBottom: '1px solid var(--border)' }}>
              {['Task', 'Assignee', 'Priority', 'Status', 'Due', 'Actions'].map(h => (
                <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', letterSpacing: '0.04em', textTransform: 'uppercase' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map(task => {
              const overdue = task.dueDate && task.dueDate < Date.now() && task.status !== 'done';
              const sc = statusColors[task.status];
              return (
                <tr key={task.id} style={{ borderBottom: '1px solid var(--border)' }}
                  onMouseOver={e => (e.currentTarget as HTMLElement).style.background = 'var(--bg)'}
                  onMouseOut={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}>
                  <td style={{ padding: '12px 14px' }}>
                    <div style={{ fontWeight: 500, color: 'var(--text)', textDecoration: task.status === 'done' ? 'line-through' : 'none', opacity: task.status === 'done' ? 0.5 : 1 }}>{task.title}</div>
                    {task.description && <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2, maxWidth: 280, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{task.description}</div>}
                  </td>
                  <td style={{ padding: '12px 14px', color: 'var(--text)' }}>{task.assigneeName}</td>
                  <td style={{ padding: '12px 14px' }}><span className={`badge-${task.priority}`} style={{ textTransform: 'capitalize' }}>{task.priority}</span></td>
                  <td style={{ padding: '12px 14px' }}>
                    <select value={task.status} onChange={e => handleStatusChange(task, e.target.value as TaskStatus)}
                      style={{ fontSize: 11, fontWeight: 500, padding: '3px 8px', borderRadius: 99, border: 'none', cursor: 'pointer', background: sc.bg, color: sc.fg, outline: 'none' }}>
                      {(Object.keys(STATUS_LABEL) as TaskStatus[]).map(s => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
                    </select>
                  </td>
                  <td style={{ padding: '12px 14px', fontSize: 12, color: overdue ? '#DC2626' : 'var(--text-muted)', fontWeight: overdue ? 600 : 400 }}>
                    {task.dueDate ? `${overdue ? '⚠ ' : ''}${new Date(task.dueDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}` : '—'}
                  </td>
                  <td style={{ padding: '12px 14px' }}>
                    <button onClick={() => handleDelete(task.id, task.title)}
                      style={{ fontSize: 12, color: '#DC2626', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 500 }}>Delete</button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <div style={{ padding: '40px 0', textAlign: 'center', fontSize: 13, color: 'var(--text-muted)' }}>No tasks found.</div>
        )}
      </div>
    </div>
  );
}
