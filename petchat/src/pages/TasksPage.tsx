import { useState, useEffect } from 'react';
import type { Employee, Task, Priority, TaskStatus } from '../types';
import { onUserTasksChange, createTask, updateTask, deleteTask } from '../services/firebase';

interface Props { employee: Employee; }

const COLUMNS: { key: TaskStatus; label: string; color: string }[] = [
  { key: 'todo',        label: '📋 To Do',       color: 'border-gray-300 dark:border-gray-600' },
  { key: 'in_progress', label: '🔄 In Progress',  color: 'border-blue-400' },
  { key: 'blocked',    label: '🚫 Blocked',       color: 'border-red-400' },
  { key: 'done',       label: '✅ Done',          color: 'border-green-400' },
];

const PRIORITY_COLORS: Record<Priority, string> = {
  urgent: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  high:   'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  medium: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  low:    'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
};

interface NewTask { title: string; description: string; priority: Priority; dueDate: string; }
const EMPTY: NewTask = { title: '', description: '', priority: 'medium', dueDate: '' };

export default function TasksPage({ employee }: Props) {
  const [tasks, setTasks]       = useState<Task[]>([]);
  const [showNew, setShowNew]   = useState(false);
  const [form, setForm]         = useState<NewTask>(EMPTY);
  const [saving, setSaving]     = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  useEffect(() => {
    return onUserTasksChange(employee.id, setTasks);
  }, [employee.id]);

  const handleCreate = async () => {
    if (!form.title.trim()) return;
    setSaving(true);
    await createTask({
      title: form.title, description: form.description,
      assigneeId: employee.id, assigneeName: employee.name,
      priority: form.priority, status: 'todo',
      dueDate: form.dueDate ? new Date(form.dueDate).getTime() : undefined,
    });
    setForm(EMPTY); setShowNew(false); setSaving(false);
  };

  const handleStatusChange = (task: Task, status: TaskStatus) => {
    updateTask(task.id, { status, ...(status === 'done' ? { completedAt: Date.now() } : {}) });
  };

  const handlePriorityChange = (task: Task, priority: Priority) => updateTask(task.id, { priority });

  const handleDelete = (id: string) => { if (confirm('Delete this task?')) deleteTask(id); };

  const total = tasks.length;
  const done  = tasks.filter(t => t.status === 'done').length;

  return (
    <div className="p-6 space-y-5 animate-slide-in">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold" style={{ color: 'var(--text)' }}>📋 My Tasks</h2>
          <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
            {done} of {total} done · {tasks.filter(t => t.priority === 'urgent' && t.status !== 'done').length} urgent
          </p>
        </div>
        <button onClick={() => setShowNew(v => !v)}
          className="px-4 py-2 rounded-xl bg-blue-500 hover:bg-blue-600 text-white font-medium text-sm transition shadow">
          + New Task
        </button>
      </div>

      {/* Create form */}
      {showNew && (
        <div className="card p-5 space-y-4 border-2 border-blue-300 dark:border-blue-700">
          <h3 className="font-semibold" style={{ color: 'var(--text)' }}>New Task</h3>
          <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
            placeholder="Task title *" className="input w-full" />
          <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
            placeholder="Description (optional)" rows={2}
            className="input w-full resize-none" />
          <div className="flex gap-3">
            <select value={form.priority} onChange={e => setForm(f => ({ ...f, priority: e.target.value as Priority }))}
              className="input flex-1">
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="urgent">Urgent</option>
            </select>
            <input type="date" value={form.dueDate} onChange={e => setForm(f => ({ ...f, dueDate: e.target.value }))}
              className="input flex-1" />
          </div>
          <div className="flex gap-2">
            <button onClick={handleCreate} disabled={saving || !form.title.trim()}
              className="flex-1 py-2 rounded-lg bg-blue-500 hover:bg-blue-600 disabled:opacity-50 text-white text-sm font-medium transition">
              {saving ? 'Creating…' : 'Create Task'}
            </button>
            <button onClick={() => { setShowNew(false); setForm(EMPTY); }}
              className="flex-1 py-2 rounded-lg text-sm font-medium transition"
              style={{ background: 'var(--surface2)', color: 'var(--text-muted)' }}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Progress bar */}
      {total > 0 && (
        <div className="h-2 rounded-full overflow-hidden" style={{ background: 'var(--surface2)' }}>
          <div className="h-full rounded-full transition-all duration-500"
            style={{ width: `${total ? (done / total) * 100 : 0}%`, background: 'linear-gradient(90deg,#6366F1,#8B5CF6)' }} />
        </div>
      )}

      {/* Kanban */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {COLUMNS.map(col => {
          const colTasks = tasks.filter(t => t.status === col.key);
          return (
            <div key={col.key} className={`rounded-xl border-2 ${col.color} flex flex-col`} style={{ background: 'var(--surface2)', minHeight: 200 }}>
              <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: 'inherit' }}>
                <span className="font-semibold text-sm" style={{ color: 'var(--text)' }}>{col.label}</span>
                <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ background: 'var(--surface)', color: 'var(--text-muted)' }}>{colTasks.length}</span>
              </div>

              <div className="p-2 space-y-2 flex-1">
                {colTasks.length === 0 && (
                  <p className="text-xs text-center py-4" style={{ color: 'var(--text-muted)' }}>No tasks</p>
                )}
                {colTasks.map(task => {
                  const isEditing = editingId === task.id;
                  const overdue = task.dueDate && task.dueDate < Date.now() && task.status !== 'done';
                  return (
                    <div key={task.id} className="p-3 rounded-lg shadow-sm border transition hover:shadow-md"
                      style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
                      {isEditing ? (
                        <div className="space-y-2">
                          <select value={task.status} onChange={e => { handleStatusChange(task, e.target.value as TaskStatus); setEditingId(null); }}
                            className="input w-full text-xs">
                            {COLUMNS.map(c => <option key={c.key} value={c.key}>{c.label}</option>)}
                          </select>
                          <select value={task.priority} onChange={e => { handlePriorityChange(task, e.target.value as Priority); setEditingId(null); }}
                            className="input w-full text-xs">
                            <option value="low">Low</option>
                            <option value="medium">Medium</option>
                            <option value="high">High</option>
                            <option value="urgent">Urgent</option>
                          </select>
                          <button onClick={() => setEditingId(null)}
                            className="w-full text-xs py-1 rounded-lg" style={{ background: 'var(--surface2)', color: 'var(--text-muted)' }}>Done</button>
                        </div>
                      ) : (
                        <>
                          <div className="flex items-start justify-between gap-2">
                            <p className={`text-sm font-medium leading-snug flex-1 ${task.status === 'done' ? 'line-through opacity-60' : ''}`}
                              style={{ color: 'var(--text)' }}>
                              {task.title}
                            </p>
                            <div className="flex gap-1 flex-shrink-0">
                              <button onClick={() => setEditingId(task.id)}
                                className="text-xs hover:text-blue-500 transition" style={{ color: 'var(--text-muted)' }}>✏️</button>
                              <button onClick={() => handleDelete(task.id)}
                                className="text-xs hover:text-red-500 transition" style={{ color: 'var(--text-muted)' }}>🗑️</button>
                            </div>
                          </div>
                          {task.description && (
                            <p className="text-xs mt-1 line-clamp-2" style={{ color: 'var(--text-muted)' }}>{task.description}</p>
                          )}
                          <div className="flex items-center justify-between mt-2">
                            <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${PRIORITY_COLORS[task.priority]}`}>{task.priority}</span>
                            {task.dueDate && (
                              <span className={`text-xs ${overdue ? 'text-red-500 font-semibold' : ''}`} style={!overdue ? { color: 'var(--text-muted)' } : {}}>
                                {overdue ? '⚠️ ' : ''}
                                {new Date(task.dueDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                              </span>
                            )}
                          </div>
                          {/* Quick status buttons */}
                          <div className="flex gap-1 mt-2">
                            {COLUMNS.filter(c => c.key !== col.key).map(c => (
                              <button key={c.key} onClick={() => handleStatusChange(task, c.key)}
                                className="text-[10px] px-1.5 py-0.5 rounded transition hover:opacity-80"
                                style={{ background: 'var(--surface2)', color: 'var(--text-muted)' }}>
                                → {c.key.replace('_', ' ')}
                              </button>
                            ))}
                          </div>
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
