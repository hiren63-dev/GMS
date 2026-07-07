import { useState, useEffect } from 'react';
import type { Employee, Task, Priority, TaskStatus, Recurrence, TaskComment } from '../types';
import { onUserTasksChange, createTask, updateTask, deleteTask, logTaskDone, onTaskCommentsChange, addTaskComment } from '../services/firebase';
import { toast } from '../utils/toast';

interface Props { employee: Employee; }

// Normalize legacy status strings (e.g. "To Do", "In Progress") to enum values
const normalizeStatus = (s: string): TaskStatus => {
  const key = s.toLowerCase().replace(/[\s-]+/g, '_');
  const map: Record<string, TaskStatus> = {
    todo: 'todo', to_do: 'todo',
    in_progress: 'in_progress', inprogress: 'in_progress',
    blocked: 'blocked',
    done: 'done', completed: 'done', complete: 'done',
  };
  return map[key] ?? 'todo';
};

type Col = { key: TaskStatus; label: string; dot: string };
const COLS: Col[] = [
  { key: 'todo',        label: 'To Do',       dot: '#D1D5DB' },
  { key: 'in_progress', label: 'In Progress',  dot: '#CA8A04' },
  { key: 'blocked',    label: 'Blocked',       dot: '#DC2626' },
  { key: 'done',       label: 'Done',          dot: '#16A34A' },
];

interface NewTask { title: string; description: string; priority: Priority; dueDate: string; recurrence: Recurrence | ''; blockedBy: string[]; }
const EMPTY: NewTask = { title: '', description: '', priority: 'medium', dueDate: '', recurrence: '', blockedBy: [] };

export default function TasksPage({ employee }: Props) {
  const [tasks, setTasks]       = useState<Task[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [expandedTask, setExpandedTask] = useState<string | null>(null);
  const [comments, setComments]  = useState<TaskComment[]>([]);
  const [commentText, setCommentText] = useState('');
  const [form, setForm]         = useState<NewTask>(EMPTY);
  const [saving, setSaving]     = useState(false);
  const [createError, setCreateError] = useState('');
  const [dragId, setDragId]     = useState<string | null>(null);
  const [overCol, setOverCol]   = useState<TaskStatus | null>(null);

  useEffect(() => onUserTasksChange(employee.id, raw =>
    setTasks(raw.map(t => ({ ...t, status: normalizeStatus(t.status as string) })))
  ), [employee.id]);

  useEffect(() => {
    if (!expandedTask) { setComments([]); return; }
    return onTaskCommentsChange(expandedTask, setComments);
  }, [expandedTask]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) return;
    setSaving(true);
    try {
      const parsedDate = form.dueDate ? new Date(form.dueDate).getTime() : undefined;
      const safeDate = Number.isNaN(parsedDate) ? undefined : parsedDate;
      await createTask({
        title: form.title.trim(), 
        description: form.description || '',
        assigneeId: employee.id, 
        assigneeName: employee.name,
        priority: form.priority || 'medium', 
        status: 'todo',
        ...(safeDate ? { dueDate: safeDate } : {}),
        ...(form.recurrence ? { recurrence: form.recurrence } : {}),
        ...(form.blockedBy && form.blockedBy.length ? { blockedBy: form.blockedBy } : {}),
      });
      setForm(EMPTY); setShowModal(false); setCreateError('');
      toast('Task created successfully!');
    } catch (err) {
      console.error('Failed to create task:', err);
      setCreateError('Could not create the task. Check your connection and try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleAddComment = async (taskId: string) => {
    if (!commentText.trim()) return;
    await addTaskComment({ taskId, authorId: employee.id, authorName: employee.name, content: commentText.trim(), createdAt: Date.now() });
    setCommentText('');
  };

  const moveTo = (task: Task, status: TaskStatus) => {
    if (status === 'done' && task.blockedBy?.length) {
      const blockers = task.blockedBy.filter(bid => {
        const blocker = tasks.find(t => t.id === bid);
        return blocker && blocker.status !== 'done';
      });
      if (blockers.length) {
        const blockerTitles = blockers.map(bid => tasks.find(t => t.id === bid)?.title ?? bid).join(', ');
        alert(`Cannot complete this task. It is blocked by: ${blockerTitles}`);
        return;
      }
    }
    updateTask(task.id, { status, ...(status === 'done' ? { completedAt: Date.now() } : {}) })
      .catch(err => console.error('Failed to update task:', err));
    if (status === 'done' && task.status !== 'done') {
      logTaskDone(employee.id, employee.name, task.title);
      toast(`Task completed: ${task.title}`);
      // Auto-recreate recurring tasks
      if (task.recurrence) {
        const next = new Date();
        if (task.recurrence === 'daily') next.setDate(next.getDate() + 1);
        else if (task.recurrence === 'weekly') next.setDate(next.getDate() + 7);
        else if (task.recurrence === 'monthly') next.setMonth(next.getMonth() + 1);
        createTask({ title: task.title, description: task.description, assigneeId: task.assigneeId, assigneeName: task.assigneeName, priority: task.priority, status: 'todo', recurrence: task.recurrence, dueDate: next.getTime() }).catch(() => {});
      }
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
          style={{ display: 'flex', alignItems: 'center', gap: 6, height: 34, padding: '0 16px', background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 7, fontSize: 13, fontWeight: 500, cursor: 'pointer' }}
          onMouseOver={e => (e.currentTarget as HTMLButtonElement).style.background = 'var(--accent-pressed)'}
          onMouseOut={e => (e.currentTarget as HTMLButtonElement).style.background = 'var(--accent)'}
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          New Task
        </button>
      </div>

      {/* Kanban columns */}
      <div style={{ flex: 1, display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, padding: 16, overflowY: 'auto', minHeight: 0 }}>
        {COLS.map(col => {
          const colTasks = tasks.filter(t => {
            const s = (t.status || '').toLowerCase().replace(/[\s-]/g, '_');
            const normalized = 
              (s === 'in_progress' || s === 'inprogress') ? 'in_progress' :
              (s === 'done' || s === 'completed') ? 'done' :
              (s === 'blocked') ? 'blocked' : 'todo';
            return normalized === col.key;
          });
          const isOver = overCol === col.key;
          return (
            <div key={col.key}
              onDragOver={e => { e.preventDefault(); setOverCol(col.key); }}
              onDragLeave={e => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setOverCol(null); }}
              onDrop={() => onDrop(col.key)}
              className="kanban-col"
              style={{ background: isOver ? 'rgba(0,117,222,0.03)' : 'var(--surface)', borderColor: isOver ? 'var(--accent)' : 'var(--border)', transition: 'background 150ms, border-color 150ms' }}
            >
              {/* Column header */}
              <div style={{ padding: '14px 16px 10px', flexShrink: 0, background: 'rgba(250,250,250,0.7)', borderBottom: '1px solid var(--border)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: col.dot }} />
                  <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', letterSpacing: '0.02em', textTransform: 'uppercase' }}>{col.label}</span>
                  <div style={{ marginLeft: 'auto', display: 'flex', gap: 4 }}>
                    {colTasks.filter(t => t.priority === 'urgent').length > 0 && <span style={{ fontSize: 10, color: '#DC2626', background: '#FEF2F2', padding: '1px 6px', borderRadius: 99, fontWeight: 600 }}>{colTasks.filter(t => t.priority === 'urgent').length}</span>}
                    {colTasks.filter(t => t.priority === 'high').length > 0 && <span style={{ fontSize: 10, color: '#C2410C', background: '#FFF7ED', padding: '1px 6px', borderRadius: 99, fontWeight: 600 }}>{colTasks.filter(t => t.priority === 'high').length}</span>}
                    <span style={{ fontSize: 11, color: 'var(--text-muted)', background: 'var(--bg)', padding: '1px 7px', borderRadius: 99 }}>{colTasks.length}</span>
                  </div>
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
                        <div style={{ flex: 1, fontSize: 13, fontWeight: 500, color: 'var(--text)', lineHeight: 1.4, textDecoration: task.status === 'done' ? 'line-through' : 'none', opacity: task.status === 'done' ? 0.5 : 1 }}>
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
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span style={{
                            textTransform: 'capitalize',
                            fontSize: 10, fontWeight: 600,
                            padding: '2px 7px', borderRadius: 4,
                            ...(task.priority === 'urgent' ? { background: '#FEF2F2', color: '#DC2626', border: '1px solid #FECACA' } :
                               task.priority === 'high' ? { background: '#FFF7ED', color: '#C2410C', border: '1px solid #FED7AA' } :
                               task.priority === 'medium' ? { background: '#FFFBEB', color: '#B45309', border: '1px solid #FDE68A' } :
                               { background: '#F3F4F6', color: '#6B7280', border: '1px solid #E5E7EB' })
                          }}>{task.priority}</span>
                          {task.recurrence && <span style={{ fontSize: 9, padding: '1px 5px', borderRadius: 4, background: '#EFF6FF', color: 'var(--accent)', fontWeight: 600, textTransform: 'uppercase' }}>↻ {task.recurrence}</span>}
                          <button onClick={e => { e.stopPropagation(); setExpandedTask(expandedTask === task.id ? null : task.id); setCommentText(''); }}
                            style={{ fontSize: 10, padding: '1px 6px', borderRadius: 4, background: expandedTask === task.id ? 'var(--accent)' : 'var(--bg)', border: '1px solid var(--border)', color: expandedTask === task.id ? '#fff' : 'var(--text-muted)', cursor: 'pointer' }}>
                            💬{task.commentCount ? ` ${task.commentCount}` : ''}
                          </button>
                        </div>
                        {task.dueDate && (
                          <span style={{ fontSize: 11, color: overdue ? '#DC2626' : 'var(--text-faint)', fontWeight: overdue ? 600 : 400 }}>
                            {overdue ? '⚠ ' : ''}{formatDate(task.dueDate)}
                          </span>
                        )}
                      </div>

                      {/* Comments panel */}
                      {expandedTask === task.id && (
                        <div style={{ marginTop: 10, padding: '10px', background: 'var(--bg)', borderRadius: 8, border: '1px solid var(--border)' }} onClick={e => e.stopPropagation()}>
                          <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Comments</div>
                          {comments.length === 0 && <div style={{ fontSize: 11, color: 'var(--text-faint)', marginBottom: 8 }}>No comments yet.</div>}
                          {comments.map(c => (
                            <div key={c.id} style={{ marginBottom: 6 }}>
                              <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text)' }}>{c.authorName}: </span>
                              <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{c.content}</span>
                            </div>
                          ))}
                          <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
                            <input value={commentText} onChange={e => setCommentText(e.target.value)}
                              placeholder="Add a comment…"
                              onKeyDown={e => { if (e.key === 'Enter') handleAddComment(task.id); }}
                              style={{ flex: 1, height: 28, padding: '0 8px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 6, fontSize: 11, fontFamily: 'inherit', color: 'var(--text)', outline: 'none' }}
                            />
                            <button onClick={() => handleAddComment(task.id)} style={{ height: 28, padding: '0 10px', background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 6, fontSize: 11, cursor: 'pointer' }}>Post</button>
                          </div>
                        </div>
                      )}

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
                  onFocus={e => (e.target.style.borderColor = 'var(--accent)')}
                  onBlur={e => (e.target.style.borderColor = 'var(--border)')}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 500, color: 'var(--text-muted)', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 6 }}>Description</label>
                <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  placeholder="Optional details…" rows={3}
                  style={{ width: '100%', padding: '10px 12px', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 13, fontFamily: 'inherit', color: 'var(--text)', outline: 'none', resize: 'none' }}
                  onFocus={e => (e.target.style.borderColor = 'var(--accent)')}
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
              <div style={{ display: 'flex', gap: 12 }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 500, color: 'var(--text-muted)', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 6 }}>Recurrence</label>
                  <select value={form.recurrence} onChange={e => setForm(f => ({ ...f, recurrence: e.target.value as Recurrence | '' }))}
                    style={{ width: '100%', height: 40, padding: '0 12px', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 13, fontFamily: 'inherit', color: 'var(--text)', outline: 'none', cursor: 'pointer' }}>
                    <option value="">None</option>
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                    <option value="monthly">Monthly</option>
                  </select>
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 500, color: 'var(--text-muted)', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 6 }}>Blocked By</label>
                  <select multiple value={form.blockedBy} onChange={e => setForm(f => ({ ...f, blockedBy: Array.from(e.target.selectedOptions, o => o.value) }))}
                    style={{ width: '100%', height: 40, padding: '0 12px', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12, fontFamily: 'inherit', color: 'var(--text)', outline: 'none', cursor: 'pointer' }}>
                    {tasks.filter(t => t.status !== 'done').map(t => <option key={t.id} value={t.id}>{t.title.slice(0, 28)}</option>)}
                  </select>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
                <button type="button" onClick={() => { setShowModal(false); setForm(EMPTY); setCreateError(''); }}
                  style={{ flex: 1, height: 40, background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 13, fontWeight: 500, color: 'var(--text-muted)', cursor: 'pointer' }}>
                  Cancel
                </button>
                <button type="submit" disabled={saving || !form.title.trim()}
                  style={{ flex: 1, height: 40, background: saving || !form.title.trim() ? '#888' : 'var(--accent)', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 500, cursor: saving || !form.title.trim() ? 'not-allowed' : 'pointer' }}>
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
