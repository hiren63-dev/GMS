import { useState, useEffect } from 'react';
import type { Employee, Task, Priority, TaskStatus } from '../types';
import { onUserTasksChange, createTask, updateTask, deleteTask, logTaskDone } from '../services/firebase';

interface Props { employee: Employee; }

type Col = { key: TaskStatus; label: string; dot: string };
const COLS: Col[] = [
  { key: 'todo',        label: 'To Do',       dot: '#D1D5DB' },
  { key: 'in_progress', label: 'In Progress',  dot: '#CA8A04' },
  { key: 'blocked',    label: 'Blocked',       dot: '#DC2626' },
  { key: 'done',       label: 'Done',          dot: '#16A34A' },
];

interface NewTask { title: string; description: string; priority: Priority; dueDate: string; }
const EMPTY: NewTask = { title: '', description: '', priority: 'medium', dueDate: '' };

export default function TasksPage({ employee }: Props) {
  const [tasks, setTasks]       = useState<Task[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm]         = useState<NewTask>(EMPTY);
  const [saving, setSaving]     = useState(false);
  const [createError, setCreateError] = useState('');
  const [dragId, setDragId]     = useState<string | null>(null);
  const [overCol, setOverCol]   = useState<TaskStatus | null>(null);

  useEffect(() => onUserTasksChange(employee.id, setTasks), [employee.id]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) return;
    setSaving(true);
    try {
      await createTask({
        title: form.title.trim(), description: form.description,
        assigneeId: employee.id, assigneeName: employee.name,
        priority: form.priority, status: 'todo',
        dueDate: form.dueDate ? new Date(form.dueDate).getTime() : undefined,
      });
      setForm(EMPTY); setShowModal(false); setCreateError('');
    } catch (err) {
      console.error('Failed to create task:', err);
      setCreateError('Could not create the task. Check your connection and try again.');
    } finally {
      setSaving(false);
    }
  };

  const moveTo = (task: Task, status: TaskStatus) => {
    updateTask(task.id, { status, ...(status === 'done' ? { completedAt: Date.now() } : {}) })
      .catch(err => console.error('Failed to update task:', err));
    // Feed the Founder "Tasks Done" metric + activity log on completion.
    if (status === 'done' && task.status !== 'done') {
      logTaskDone(employee.id, employee.name, task.title);
    }
  };

  const onDrop = (col: TaskStatus) => {
    if (dragId) {
      const task = tasks.find(t => t.id === dragId);
      if (task && task.status !== col) moveTo(task, col);
    }
    setDragId(null); setOverCol(null);
  };

  const todo       = tasks.filter(t => t.status === 'todo').length;
  const inProgress = tasks.filter(t => t.status === 'in_progress').length;
  const done       = tasks.filter(t => t.status === 'done').length;

  const formatDate = (ts?: number) => ts ? new Date(ts).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : '';

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', animation: 'fadeIn 200ms ease' }}>
      {/* Toolbar */}
      <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--surface)', flexShrink: 0 }}>
        <div style={{ display: 'flex', gap: 16 }}>
          <span style={{ fontSize: 13, color: 'var(--text-muted)' }}><strong style={{ color: 'var(--text)' }}>{todo}</strong> to do</span>
          <span style={{ fontSize: 13, color: 'var(--text-muted)' }}><strong style={{ color: '#CA8A04' }}>{inProgress}</strong> in progress</span>
          <span style={{ fontSize: 13, color: 'var(--text-muted)' }}><strong style={{ color: '#16A34A' }}>{done}</strong> done</span>
        </div>
        <button onClick={() => setShowModal(true)}
          style={{ display: 'flex', alignItems: 'center', gap: 6, height: 34, padding: '0 16px', background: '#111', color: '#fff', border: 'none', borderRadius: 7, fontSize: 13, fontWeight: 500, cursor: 'pointer' }}
          onMouseOver={e => (e.currentTarget as HTMLButtonElement).style.background = '#333'}
          onMouseOut={e => (e.currentTarget as HTMLButtonElement).style.background = '#111'}
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          New Task
        </button>
      </div>

      {/* Kanban columns */}
      <div style={{ flex: 1, display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, padding: 16, overflowY: 'auto', minHeight: 0 }}>
        {COLS.map(col => {
          const colTasks = tasks.filter(t => t.status === col.key);
          const isOver = overCol === col.key;
          return (
            <div key={col.key}
              onDragOver={e => { e.preventDefault(); setOverCol(col.key); }}
              onDragLeave={e => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setOverCol(null); }}
              onDrop={() => onDrop(col.key)}
              className="kanban-col"
              style={{ background: isOver ? 'rgba(37,99,235,0.03)' : 'var(--surface)', borderColor: isOver ? '#2563EB' : 'var(--border)', transition: 'background 150ms, border-color 150ms' }}
            >
              {/* Column header */}
              <div style={{ padding: '14px 16px 10px', flexShrink: 0, background: 'rgba(250,250,250,0.7)', borderBottom: '1px solid var(--border)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: col.dot }} />
                  <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', letterSpacing: '0.02em', textTransform: 'uppercase' }}>{col.label}</span>
                  <span style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--text-muted)', background: 'var(--bg)', padding: '1px 7px', borderRadius: 99 }}>{colTasks.length}</span>
                </div>
              </div>

              {/* Cards */}
              <div style={{ flex: 1, overflowY: 'auto', padding: '10px 10px' }}>
                {colTasks.length === 0 && (
                  <div style={{ padding: '20px 0', textAlign: 'center', fontSize: 12, color: 'var(--text-faint)' }}>No tasks</div>
                )}
                {colTasks.map(task => {
                  const overdue = task.dueDate && task.dueDate < Date.now() && task.status !== 'done';
                  return (
                    <div key={task.id}
                      draggable
                      onDragStart={() => setDragId(task.id)}
                      onDragEnd={() => { setDragId(null); setOverCol(null); }}
                      style={{
                        background: 'var(--surface)',
                        border: '1px solid var(--border)',
                        borderRadius: 8, padding: '12px 13px', marginBottom: 7,
                        cursor: 'grab',
                        opacity: dragId === task.id ? 0.5 : 1,
                        transition: 'border-color 150ms, box-shadow 150ms',
                      }}
                      onMouseOver={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--border-hover)'; (e.currentTarget as HTMLElement).style.boxShadow = '0 2px 8px rgba(0,0,0,0.06)'; }}
                      onMouseOut={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--border)'; (e.currentTarget as HTMLElement).style.boxShadow = 'none'; }}
                    >
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 7, marginBottom: 8 }}>
                        {/* drag grip */}
                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#CBD5E1" strokeWidth="2" strokeLinecap="round" style={{ marginTop: 3, flexShrink: 0 }}>
                          <circle cx="9" cy="6" r="1"/><circle cx="9" cy="12" r="1"/><circle cx="9" cy="18" r="1"/>
                          <circle cx="15" cy="6" r="1"/><circle cx="15" cy="12" r="1"/><circle cx="15" cy="18" r="1"/>
                        </svg>
                        <div style={{ flex: 1, fontSize: 13, fontWeight: 500, color: '#111', lineHeight: 1.4, textDecoration: task.status === 'done' ? 'line-through' : 'none', opacity: task.status === 'done' ? 0.5 : 1 }}>
                          {task.title}
                        </div>
                        <button onClick={() => { if (confirm(`Delete "${task.title}"?`)) deleteTask(task.id).catch(err => console.error('Failed to delete task:', err)); }}
                          style={{ background: 'none', border: 'none', color: 'var(--text-faint)', cursor: 'pointer', padding: 0, lineHeight: 1, flexShrink: 0, fontSize: 14 }}
                          onMouseOver={e => (e.currentTarget as HTMLButtonElement).style.color = '#DC2626'}
                          onMouseOut={e => (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-faint)'}
                          title="Delete task"
                        >×</button>
                      </div>

                      {task.description && (
                        <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 8, lineHeight: 1.4 }}>{task.description}</div>
                      )}

                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span className={`badge-${task.priority}`} style={{ textTransform: 'capitalize' }}>{task.priority}</span>
                        {task.dueDate && (
                          <span style={{ fontSize: 11, color: overdue ? '#DC2626' : 'var(--text-faint)', fontWeight: overdue ? 600 : 400 }}>
                            {overdue ? '⚠ ' : ''}{formatDate(task.dueDate)}
                          </span>
                        )}
                      </div>

                      {/* Move buttons */}
                      <div style={{ display: 'flex', gap: 4, marginTop: 8, flexWrap: 'wrap' }}>
                        {COLS.filter(c => c.key !== col.key).map(c => (
                          <button key={c.key} onClick={() => moveTo(task, c.key)}
                            style={{ fontSize: 10, padding: '2px 7px', borderRadius: 4, background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--text-muted)', cursor: 'pointer' }}
                            onMouseOver={e => { (e.currentTarget as HTMLButtonElement).style.background = 'var(--border)'; (e.currentTarget as HTMLButtonElement).style.color = 'var(--text)'; }}
                            onMouseOut={e => { (e.currentTarget as HTMLButtonElement).style.background = 'var(--bg)'; (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-muted)'; }}
                          >
                            → {c.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* New Task Modal */}
      {showModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}
          onClick={e => { if (e.target === e.currentTarget) { setShowModal(false); setForm(EMPTY); setCreateError(''); } }}>
          <div style={{ width: 420, background: 'var(--surface)', borderRadius: 12, padding: 28, boxShadow: '0 20px 60px rgba(0,0,0,0.2)', animation: 'fadeIn 150ms ease' }}>
            <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--text)', marginBottom: 20 }}>New Task</div>
            <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {createError && (
                <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: '#DC2626' }}>
                  {createError}
                </div>
              )}
              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 500, color: 'var(--text-muted)', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 6 }}>Title *</label>
                <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                  placeholder="What needs to be done?" required autoFocus
                  style={{ width: '100%', height: 40, padding: '0 12px', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 14, fontFamily: 'inherit', color: 'var(--text)', outline: 'none' }}
                  onFocus={e => (e.target.style.borderColor = '#2563EB')}
                  onBlur={e => (e.target.style.borderColor = 'var(--border)')}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 500, color: 'var(--text-muted)', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 6 }}>Description</label>
                <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  placeholder="Optional details…" rows={3}
                  style={{ width: '100%', padding: '10px 12px', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 13, fontFamily: 'inherit', color: 'var(--text)', outline: 'none', resize: 'none' }}
                  onFocus={e => (e.target.style.borderColor = '#2563EB')}
                  onBlur={e => (e.target.style.borderColor = 'var(--border)')}
                />
              </div>
              <div style={{ display: 'flex', gap: 12 }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 500, color: 'var(--text-muted)', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 6 }}>Priority</label>
                  <select value={form.priority} onChange={e => setForm(f => ({ ...f, priority: e.target.value as Priority }))}
                    style={{ width: '100%', height: 40, padding: '0 12px', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 13, fontFamily: 'inherit', color: 'var(--text)', outline: 'none', cursor: 'pointer' }}>
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 500, color: 'var(--text-muted)', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 6 }}>Due Date</label>
                  <input type="date" value={form.dueDate} onChange={e => setForm(f => ({ ...f, dueDate: e.target.value }))}
                    style={{ width: '100%', height: 40, padding: '0 12px', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 13, fontFamily: 'inherit', color: 'var(--text)', outline: 'none', cursor: 'pointer' }} />
                </div>
              </div>
              <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
                <button type="button" onClick={() => { setShowModal(false); setForm(EMPTY); setCreateError(''); }}
                  style={{ flex: 1, height: 40, background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 13, fontWeight: 500, color: 'var(--text-muted)', cursor: 'pointer' }}>
                  Cancel
                </button>
                <button type="submit" disabled={saving || !form.title.trim()}
                  style={{ flex: 1, height: 40, background: saving || !form.title.trim() ? '#888' : '#111', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 500, cursor: saving || !form.title.trim() ? 'not-allowed' : 'pointer' }}>
                  {saving ? 'Creating…' : 'Create Task'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
