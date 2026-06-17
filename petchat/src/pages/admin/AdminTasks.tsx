import { useState, useEffect } from 'react';
import type { Employee, Task, Priority, TaskStatus } from '../../types';
import { onAllTasksChange, createTask, updateTask, deleteTask } from '../../services/firebase';

interface Props {
  employee: Employee;
  allEmployees: Employee[];
}

const PRIORITY_COLORS: Record<Priority, string> = {
  urgent: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  high:   'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  medium: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  low:    'bg-gray-100 text-gray-600 dark:bg-gray-800',
};
const STATUS_COLORS: Record<TaskStatus, string> = {
  todo:        'bg-gray-100 text-gray-600',
  in_progress: 'bg-blue-100 text-blue-700',
  blocked:     'bg-red-100 text-red-700',
  done:        'bg-green-100 text-green-700',
};

const EMPTY = { title: '', description: '', assigneeId: '', priority: 'medium' as Priority, dueDate: '' };

export default function AdminTasks({ employee, allEmployees }: Props) {
  const [tasks, setTasks]       = useState<Task[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm]         = useState({ ...EMPTY });
  const [saving, setSaving]     = useState(false);
  const [filter, setFilter]     = useState({ assignee: 'all', priority: 'all', status: 'all' });
  const [search, setSearch]     = useState('');

  useEffect(() => { return onAllTasksChange(setTasks); }, []);

  const filtered = tasks.filter(t => {
    const q = search.toLowerCase();
    const matchQ = !q || t.title.toLowerCase().includes(q) || t.assigneeName.toLowerCase().includes(q);
    const matchA = filter.assignee === 'all' || t.assigneeId === filter.assignee;
    const matchP = filter.priority === 'all' || t.priority === filter.priority;
    const matchS = filter.status === 'all' || t.status === filter.status;
    return matchQ && matchA && matchP && matchS;
  });

  const handleCreate = async () => {
    if (!form.title.trim() || !form.assigneeId) return;
    setSaving(true);
    const assignee = allEmployees.find(e => e.id === form.assigneeId)!;
    await createTask({
      title: form.title, description: form.description,
      assigneeId: form.assigneeId, assigneeName: assignee.name,
      assignedById: employee.id,
      priority: form.priority, status: 'todo',
      dueDate: form.dueDate ? new Date(form.dueDate).getTime() : undefined,
    });
    setForm({ ...EMPTY }); setShowForm(false); setSaving(false);
  };

  const handleDelete = (id: string) => { if (confirm('Delete task?')) deleteTask(id); };

  return (
    <div className="p-6 space-y-5 animate-slide-in">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold" style={{ color: 'var(--text)' }}>🎯 Task Assignment</h2>
          <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
            {tasks.filter(t => t.status !== 'done').length} open · {tasks.filter(t => t.status === 'done').length} done
          </p>
        </div>
        <button onClick={() => setShowForm(v => !v)}
          className="px-4 py-2 rounded-xl bg-blue-500 hover:bg-blue-600 text-white text-sm font-medium transition shadow">
          + Assign Task
        </button>
      </div>

      {showForm && (
        <div className="card p-5 border-2 border-blue-300 dark:border-blue-700 space-y-4">
          <h3 className="font-semibold" style={{ color: 'var(--text)' }}>Assign Task</h3>
          <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
            placeholder="Task title *" className="input w-full" />
          <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
            placeholder="Description (optional)" rows={2} className="input w-full resize-none" />
          <div className="grid grid-cols-3 gap-3">
            <select value={form.assigneeId} onChange={e => setForm(f => ({ ...f, assigneeId: e.target.value }))}
              className="input col-span-1">
              <option value="">Assign to… *</option>
              {allEmployees.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
            </select>
            <select value={form.priority} onChange={e => setForm(f => ({ ...f, priority: e.target.value as Priority }))}
              className="input">
              <option value="low">Low</option><option value="medium">Medium</option>
              <option value="high">High</option><option value="urgent">Urgent</option>
            </select>
            <input type="date" value={form.dueDate} onChange={e => setForm(f => ({ ...f, dueDate: e.target.value }))}
              className="input" />
          </div>
          <div className="flex gap-2">
            <button onClick={handleCreate} disabled={saving || !form.title.trim() || !form.assigneeId}
              className="flex-1 py-2 rounded-lg bg-blue-500 hover:bg-blue-600 disabled:opacity-50 text-white text-sm font-medium transition">
              {saving ? 'Assigning…' : 'Assign Task'}
            </button>
            <button onClick={() => setShowForm(false)}
              className="flex-1 py-2 rounded-lg text-sm font-medium transition"
              style={{ background: 'var(--surface2)', color: 'var(--text-muted)' }}>Cancel</button>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <input value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Search tasks…" className="input flex-1 min-w-40" />
        <select value={filter.assignee} onChange={e => setFilter(f => ({ ...f, assignee: e.target.value }))} className="input">
          <option value="all">All Assignees</option>
          {allEmployees.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
        </select>
        <select value={filter.priority} onChange={e => setFilter(f => ({ ...f, priority: e.target.value }))} className="input">
          <option value="all">All Priorities</option>
          <option value="urgent">Urgent</option><option value="high">High</option>
          <option value="medium">Medium</option><option value="low">Low</option>
        </select>
        <select value={filter.status} onChange={e => setFilter(f => ({ ...f, status: e.target.value }))} className="input">
          <option value="all">All Statuses</option>
          <option value="todo">To Do</option><option value="in_progress">In Progress</option>
          <option value="blocked">Blocked</option><option value="done">Done</option>
        </select>
      </div>

      {/* Task table */}
      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr style={{ background: 'var(--surface2)', borderBottom: '1px solid var(--border)' }}>
              <th className="p-3 text-left font-semibold" style={{ color: 'var(--text-muted)' }}>Task</th>
              <th className="p-3 text-left font-semibold" style={{ color: 'var(--text-muted)' }}>Assignee</th>
              <th className="p-3 text-left font-semibold" style={{ color: 'var(--text-muted)' }}>Priority</th>
              <th className="p-3 text-left font-semibold" style={{ color: 'var(--text-muted)' }}>Status</th>
              <th className="p-3 text-left font-semibold" style={{ color: 'var(--text-muted)' }}>Due</th>
              <th className="p-3 text-left font-semibold" style={{ color: 'var(--text-muted)' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(task => {
              const overdue = task.dueDate && task.dueDate < Date.now() && task.status !== 'done';
              return (
                <tr key={task.id} className="border-b hover:bg-gray-50 dark:hover:bg-white/5 transition"
                  style={{ borderColor: 'var(--border)' }}>
                  <td className="p-3">
                    <p className={`font-medium ${task.status === 'done' ? 'line-through opacity-50' : ''}`} style={{ color: 'var(--text)' }}>
                      {task.title}
                    </p>
                    {task.description && (
                      <p className="text-xs mt-0.5 truncate max-w-xs" style={{ color: 'var(--text-muted)' }}>{task.description}</p>
                    )}
                  </td>
                  <td className="p-3" style={{ color: 'var(--text)' }}>{task.assigneeName}</td>
                  <td className="p-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${PRIORITY_COLORS[task.priority]}`}>{task.priority}</span>
                  </td>
                  <td className="p-3">
                    <select value={task.status}
                      onChange={e => updateTask(task.id, { status: e.target.value as TaskStatus })}
                      className={`text-xs px-2 py-0.5 rounded-full border-0 font-medium cursor-pointer ${STATUS_COLORS[task.status]}`}
                    >
                      <option value="todo">Todo</option>
                      <option value="in_progress">In Progress</option>
                      <option value="blocked">Blocked</option>
                      <option value="done">Done</option>
                    </select>
                  </td>
                  <td className={`p-3 text-xs ${overdue ? 'text-red-500 font-semibold' : ''}`}
                    style={!overdue ? { color: 'var(--text-muted)' } : {}}>
                    {task.dueDate
                      ? `${overdue ? '⚠️ ' : ''}${new Date(task.dueDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}`
                      : '—'}
                  </td>
                  <td className="p-3">
                    <button onClick={() => handleDelete(task.id)}
                      className="text-xs text-red-500 hover:text-red-700 font-medium transition">Delete</button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <div className="text-center py-12">
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>No tasks found.</p>
          </div>
        )}
      </div>
    </div>
  );
}
