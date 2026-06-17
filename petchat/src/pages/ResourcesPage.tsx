import { useState, useEffect } from 'react';
import type { Employee, Task, WorkloadEntry } from '../types';
import { onAllTasksChange, updateTask } from '../services/firebase';

interface Props {
  employee: Employee;
  allEmployees: Employee[];
}

export default function ResourcesPage({ employee, allEmployees }: Props) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [dragTask, setDragTask] = useState<Task | null>(null);
  const [dragOver, setDragOver] = useState<string | null>(null);
  const canManage = employee.role === 'admin' || employee.role === 'founder';

  useEffect(() => {
    return onAllTasksChange(setTasks);
  }, []);

  // Build workload entries
  const workload: WorkloadEntry[] = allEmployees.map(emp => {
    const empTasks = tasks.filter(t => t.assigneeId === emp.id && t.status !== 'done');
    const urgentCount = empTasks.filter(t => t.priority === 'urgent').length;
    const capacity = Math.min(100, Math.round((empTasks.length / 10) * 100));
    const status: WorkloadEntry['status'] = capacity > 80 ? 'overloaded' : capacity < 30 ? 'available' : 'balanced';
    return { employee: emp, taskCount: empTasks.length, urgentCount, capacity, status };
  });

  const overloaded = workload.filter(w => w.status === 'overloaded');
  const available  = workload.filter(w => w.status === 'available');
  const balanced   = workload.filter(w => w.status === 'balanced');

  const handleDrop = async (employeeId: string) => {
    if (!dragTask || !canManage) return;
    const targetEmp = allEmployees.find(e => e.id === employeeId);
    if (!targetEmp) return;
    await updateTask(dragTask.id, { assigneeId: employeeId, assigneeName: targetEmp.name });
    setDragTask(null); setDragOver(null);
  };

  const WorkloadCard = ({ entry }: { entry: WorkloadEntry }) => {
    const { employee: emp, taskCount, urgentCount, capacity, status } = entry;
    const initials = emp.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    const ring = { active: 'avatar-active', idle: 'avatar-idle', blocked: 'avatar-blocked', offline: 'avatar-offline' }[emp.status ?? 'offline'];
    const isDraggingOver = dragOver === emp.id;
    const barColor = status === 'overloaded' ? '#EF4444' : status === 'available' ? '#10B981' : '#6366F1';
    const statusBadge = {
      overloaded: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
      available:  'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
      balanced:   'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    }[status];

    return (
      <div
        className={`card p-4 transition-all duration-200 ${isDraggingOver ? 'ring-2 ring-blue-400 scale-[1.02]' : ''}`}
        onDragOver={e => { e.preventDefault(); setDragOver(emp.id); }}
        onDragLeave={() => setDragOver(null)}
        onDrop={() => handleDrop(emp.id)}
      >
        <div className="flex items-center gap-3 mb-3">
          <div className={`w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-sm font-bold flex-shrink-0 ${ring}`}>
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm truncate" style={{ color: 'var(--text)' }}>{emp.name}</p>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{emp.department}</p>
          </div>
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusBadge}`}>{status}</span>
        </div>

        <div className="mb-2">
          <div className="flex justify-between text-xs mb-1" style={{ color: 'var(--text-muted)' }}>
            <span>Workload</span>
            <span className="font-semibold" style={{ color: 'var(--text)' }}>{capacity}%</span>
          </div>
          <div className="h-2 rounded-full overflow-hidden" style={{ background: 'var(--surface2)' }}>
            <div className="h-full rounded-full transition-all duration-700" style={{ width: `${capacity}%`, background: barColor }} />
          </div>
        </div>

        <div className="flex gap-3 text-xs" style={{ color: 'var(--text-muted)' }}>
          <span>📋 {taskCount} tasks</span>
          {urgentCount > 0 && <span className="text-red-500">🚨 {urgentCount} urgent</span>}
        </div>

        {isDraggingOver && canManage && (
          <div className="mt-2 text-xs text-blue-500 font-medium text-center">
            Drop to reassign here
          </div>
        )}
      </div>
    );
  };

  const unassignedTasks = tasks.filter(t => !t.assigneeId && t.status !== 'done');

  return (
    <div className="p-6 space-y-6 animate-slide-in">
      <div>
        <h2 className="text-2xl font-bold" style={{ color: 'var(--text)' }}>📦 Resource Allocation</h2>
        <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
          Team workload overview · {canManage ? 'Drag tasks to reassign' : 'Read-only view'}
        </p>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-4">
        <div className="card p-4 text-center border-t-4 border-red-400">
          <p className="text-3xl font-bold text-red-500">{overloaded.length}</p>
          <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>Overloaded</p>
        </div>
        <div className="card p-4 text-center border-t-4 border-blue-400">
          <p className="text-3xl font-bold text-blue-500">{balanced.length}</p>
          <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>Balanced</p>
        </div>
        <div className="card p-4 text-center border-t-4 border-green-400">
          <p className="text-3xl font-bold text-green-500">{available.length}</p>
          <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>Available</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <div className="space-y-6">
            {overloaded.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold uppercase tracking-wide mb-3 text-red-500">🔥 Overloaded</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {overloaded.map(e => <WorkloadCard key={e.employee.id} entry={e} />)}
                </div>
              </div>
            )}
            {balanced.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold uppercase tracking-wide mb-3 text-blue-500">⚖️ Balanced</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {balanced.map(e => <WorkloadCard key={e.employee.id} entry={e} />)}
                </div>
              </div>
            )}
            {available.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold uppercase tracking-wide mb-3 text-green-500">✅ Available</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {available.map(e => <WorkloadCard key={e.employee.id} entry={e} />)}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Draggable tasks sidebar */}
        {canManage && (
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wide mb-3" style={{ color: 'var(--text-muted)' }}>
              🎯 All Active Tasks
            </h3>
            <div className="space-y-2 max-h-[60vh] overflow-y-auto">
              {tasks.filter(t => t.status !== 'done').map(task => (
                <div key={task.id}
                  draggable
                  onDragStart={() => setDragTask(task)}
                  onDragEnd={() => { setDragTask(null); setDragOver(null); }}
                  className={`p-3 rounded-xl border text-sm cursor-grab active:cursor-grabbing transition hover:shadow-md ${dragTask?.id === task.id ? 'opacity-50' : ''}`}
                  style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}
                >
                  <p className="font-medium truncate" style={{ color: 'var(--text)' }}>{task.title}</p>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                    {task.assigneeName} · {task.priority}
                  </p>
                </div>
              ))}
              {tasks.filter(t => t.status !== 'done').length === 0 && (
                <p className="text-sm text-center py-4" style={{ color: 'var(--text-muted)' }}>No active tasks</p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
