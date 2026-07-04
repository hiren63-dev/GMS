import { useState, useEffect, useRef } from 'react';
import type { Employee, Task, WorkloadEntry, ResourceFile } from '../types';
import { onAllTasksChange, updateTask, uploadFile, addResourceFile, onResourceFilesChange, deleteResourceFile } from '../services/firebase';

interface Props {
  employee: Employee;
  allEmployees: Employee[];
}

interface WorkloadCardProps {
  entry: WorkloadEntry;
  isDraggingOver: boolean;
  canManage: boolean;
  onDragOver: (id: string) => void;
  onDragLeave: () => void;
  onDrop: (id: string) => void;
}

function WorkloadCard({ entry, isDraggingOver, canManage, onDragOver, onDragLeave, onDrop }: WorkloadCardProps) {
  const { employee: emp, taskCount, urgentCount, capacity, status } = entry;
  const initials = emp.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  const ring = { active: 'avatar-active', idle: 'avatar-idle', blocked: 'avatar-blocked', offline: 'avatar-offline' }[emp.status ?? 'offline'];
  const barColor = status === 'overloaded' ? '#EF4444' : status === 'available' ? '#10B981' : '#6366F1';
  const statusBadge = {
    overloaded: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    available:  'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    balanced:   'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  }[status];

  return (
    <div
      className={`card p-4 transition-all duration-200 ${isDraggingOver ? 'ring-2 ring-blue-400 scale-[1.02]' : ''}`}
      onDragOver={e => { e.preventDefault(); onDragOver(emp.id); }}
      onDragLeave={onDragLeave}
      onDrop={() => onDrop(emp.id)}
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
}

export default function ResourcesPage({ employee, allEmployees }: Props) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [dragTask, setDragTask] = useState<Task | null>(null);
  const [dragOver, setDragOver] = useState<string | null>(null);
  const [tab, setTab] = useState<'workload' | 'files'>('workload');
  const [files, setFiles] = useState<ResourceFile[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const canManage = employee.role === 'admin' || employee.role === 'founder' || !!employee.permissions?.includes('assign_tasks');

  useEffect(() => {
    const u1 = onAllTasksChange(setTasks);
    const u2 = onResourceFilesChange(setFiles);
    return () => { u1(); u2(); };
  }, []);

  const handleFileUpload = async (file: File) => {
    setUploading(true);
    setUploadError('');
    try {
      const ext = file.name.split('.').pop()?.toUpperCase() ?? 'FILE';
      const sizeMB = (file.size / 1024 / 1024).toFixed(1);
      const path = `resources/${Date.now()}_${file.name}`;
      const url = await uploadFile(file, path);
      await addResourceFile({
        name: file.name, url, size: `${sizeMB} MB`, ext,
        mimeType: file.type, uploadedBy: employee.id,
        uploadedByName: employee.name, uploadedAt: Date.now(),
      });
    } catch (err: any) {
      const code: string = err?.code ?? '';
      if (code === 'storage/unknown' || code === 'storage/retry-limit-exceeded' || code.includes('object-not-found')) {
        setUploadError('Storage is not set up for this Firebase project yet — an admin must enable it in Firebase Console → Storage → Get Started.');
      } else if (code === 'storage/unauthorized') {
        setUploadError('You do not have permission to upload. Sign in with a full account, or ask an admin to update Storage rules.');
      } else {
        setUploadError(`Upload failed${code ? ` (${code})` : ''}. ${err?.message ?? ''}`);
      }
    } finally {
      setUploading(false);
    }
  };

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

  const unassignedTasks = tasks.filter(t => !t.assigneeId && t.status !== 'done');

  return (
    <div className="p-6 space-y-6 animate-slide-in">
      {/* Header + tabs */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-bold" style={{ color: 'var(--text)' }}>📦 Resources</h2>
          <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
            {tab === 'workload' ? `Team workload · ${canManage ? 'Drag tasks to reassign' : 'Read-only view'}` : 'Shared files & documents'}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 4, background: 'var(--surface2)', padding: 4, borderRadius: 9 }}>
          {(['workload', 'files'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)}
              style={{ height: 32, padding: '0 14px', borderRadius: 6, border: 'none', fontSize: 13, fontWeight: 500, cursor: 'pointer', transition: 'all 150ms',
                background: tab === t ? 'var(--surface)' : 'transparent',
                color: tab === t ? 'var(--text)' : 'var(--text-muted)',
                boxShadow: tab === t ? '0 1px 3px rgba(0,0,0,0.08)' : 'none' }}>
              {t === 'workload' ? '⚖️ Workload' : '📁 Files'}
            </button>
          ))}
        </div>
      </div>

      {/* ── Files tab ── */}
      {tab === 'files' && (
        <div className="space-y-4">
          <input ref={fileInputRef} type="file" multiple style={{ display: 'none' }}
            onChange={e => { Array.from(e.target.files ?? []).forEach(handleFileUpload); e.target.value = ''; }} />
          <div className="flex items-center gap-3">
            <button onClick={() => fileInputRef.current?.click()} disabled={uploading}
              className="px-4 py-2 rounded-xl text-sm font-medium text-white transition"
              style={{ background: uploading ? '#888' : '#111', cursor: uploading ? 'wait' : 'pointer' }}>
              {uploading ? '⏳ Uploading…' : '+ Upload File'}
            </button>
            {uploadError && <span style={{ fontSize: 12, color: '#DC2626' }}>{uploadError}</span>}
          </div>

          {files.length === 0 ? (
            <div className="card p-12 text-center">
              <p style={{ fontSize: 40, marginBottom: 12 }}>📂</p>
              <p className="font-semibold" style={{ color: 'var(--text)' }}>No files yet</p>
              <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>Upload documents, images, or any file to share with the team</p>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12 }}>
              {files.map(f => {
                const isImage = ['JPG','JPEG','PNG','GIF','WEBP','SVG'].includes(f.ext);
                const isMe = f.uploadedBy === employee.id;
                return (
                  <div key={f.id} className="card p-4 flex flex-col gap-2 group" style={{ position: 'relative' }}>
                    {isImage ? (
                      <a href={f.url} target="_blank" rel="noopener noreferrer" style={{ display: 'block', height: 100, borderRadius: 8, overflow: 'hidden', background: 'var(--surface2)' }}>
                        <img src={f.url} alt={f.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      </a>
                    ) : (
                      <div style={{ height: 100, borderRadius: 8, background: 'var(--surface2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <span style={{ fontFamily: 'monospace', fontSize: 22, fontWeight: 700, color: 'var(--text-muted)' }}>{f.ext}</span>
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate" style={{ color: 'var(--text)' }} title={f.name}>{f.name}</p>
                      <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{f.size} · {f.uploadedByName.split(' ')[0]}</p>
                    </div>
                    <div className="flex gap-2">
                      <a href={f.url} download={f.name} target="_blank" rel="noopener noreferrer"
                        className="flex-1 text-center py-1.5 rounded-lg text-xs font-medium transition"
                        style={{ background: 'var(--surface2)', color: 'var(--text-muted)' }}>
                        ↓ Download
                      </a>
                      {(isMe || canManage) && (
                        <button onClick={() => { if (confirm(`Delete "${f.name}"?`)) deleteResourceFile(f.id); }}
                          className="px-2 py-1.5 rounded-lg text-xs transition hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-500"
                          style={{ color: 'var(--text-muted)' }}>🗑️</button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── Workload tab ── */}
      {tab === 'workload' && (
        <>
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
                      {overloaded.map(e => <WorkloadCard key={e.employee.id} entry={e} isDraggingOver={dragOver === e.employee.id} canManage={canManage} onDragOver={setDragOver} onDragLeave={() => setDragOver(null)} onDrop={handleDrop} />)}
                    </div>
                  </div>
                )}
                {balanced.length > 0 && (
                  <div>
                    <h3 className="text-sm font-semibold uppercase tracking-wide mb-3 text-blue-500">⚖️ Balanced</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {balanced.map(e => <WorkloadCard key={e.employee.id} entry={e} isDraggingOver={dragOver === e.employee.id} canManage={canManage} onDragOver={setDragOver} onDragLeave={() => setDragOver(null)} onDrop={handleDrop} />)}
                    </div>
                  </div>
                )}
                {available.length > 0 && (
                  <div>
                    <h3 className="text-sm font-semibold uppercase tracking-wide mb-3 text-green-500">✅ Available</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {available.map(e => <WorkloadCard key={e.employee.id} entry={e} isDraggingOver={dragOver === e.employee.id} canManage={canManage} onDragOver={setDragOver} onDragLeave={() => setDragOver(null)} onDrop={handleDrop} />)}
                    </div>
                  </div>
                )}
              </div>
            </div>

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
        </>
      )}
    </div>
  );
}
