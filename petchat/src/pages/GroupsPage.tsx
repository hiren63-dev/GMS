import { useState, useEffect, useRef } from 'react';
import type { Employee, Group, Task, Priority, TaskStatus } from '../types';
import {
  onGroupsChange, createGroup,
  sendGroupMessage, onGroupMessagesChange,
  onGroupTasksChange, createTask, updateTask, uploadFile,
} from '../services/firebase';

interface Props { employee: Employee; allEmployees: Employee[]; }

type Tab = 'chat' | 'tasks' | 'files';

const COLS: { key: TaskStatus; label: string; dot: string }[] = [
  { key: 'todo',        label: 'To Do',      dot: '#D1D5DB' },
  { key: 'in_progress', label: 'In Progress', dot: '#CA8A04' },
  { key: 'blocked',     label: 'Blocked',     dot: '#DC2626' },
  { key: 'done',        label: 'Done',        dot: '#16A34A' },
];

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

const initials = (name: string) => name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
const fmtTime  = (ts: number) => new Date(ts).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });

export default function GroupsPage({ employee, allEmployees }: Props) {
  const [groups, setGroups]           = useState<Group[]>([]);
  const [selected, setSelected]       = useState<Group | null>(null);
  const [activeTab, setActiveTab]     = useState<Tab>('chat');
  const [messages, setMessages]       = useState<any[]>([]);
  const [tasks, setTasks]             = useState<Task[]>([]);
  const [text, setText]               = useState('');
  const [sending, setSending]         = useState(false);
  const [uploading, setUploading]     = useState(false);
  const [showCreate, setShowCreate]   = useState(false);
  const [showMembers, setShowMembers] = useState(false);
  const [dragId, setDragId]           = useState<string | null>(null);
  const [overCol, setOverCol]         = useState<TaskStatus | null>(null);
  const [showNewTask, setShowNewTask] = useState(false);
  const [taskForm, setTaskForm]       = useState({ title: '', priority: 'medium' as Priority });
  const bottomRef = useRef<HTMLDivElement>(null);
  const fileRef   = useRef<HTMLInputElement>(null);

  // Create group form state
  const [newName, setNewName]       = useState('');
  const [newDesc, setNewDesc]       = useState('');
  const [newMembers, setNewMembers] = useState<string[]>([employee.id]);
  const [creating, setCreating]     = useState(false);

  useEffect(() => {
    const unsub = onGroupsChange(employee.id, gs => {
      setGroups(gs.sort((a, b) => b.createdAt - a.createdAt));
      setSelected(prev => prev ? (gs.find(g => g.id === prev.id) ?? gs[0] ?? null) : (gs[0] ?? null));
    });
    return unsub;
  }, [employee.id]);

  useEffect(() => {
    if (!selected) return;
    const unsub = onGroupMessagesChange(selected.id, setMessages);
    return unsub;
  }, [selected?.id]);

  useEffect(() => {
    if (!selected) return;
    const unsub = onGroupTasksChange(selected.id, raw =>
      setTasks(raw.map(t => ({ ...t, status: normalizeStatus(t.status as string) })))
    );
    return unsub;
  }, [selected?.id]);

  useEffect(() => {
    if (activeTab === 'chat') bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, activeTab]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    setCreating(true);
    try {
      await createGroup({
        name: newName.trim(), description: newDesc.trim() || undefined,
        memberIds: Array.from(new Set([employee.id, ...newMembers])),
        createdBy: employee.id, createdByName: employee.name,
        createdAt: Date.now(),
      });
      setNewName(''); setNewDesc(''); setNewMembers([employee.id]);
      setShowCreate(false);
    } catch { /* ignore */ } finally { setCreating(false); }
  };

  const handleSend = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!text.trim() || !selected || sending) return;
    setSending(true);
    const msg = text.trim();
    setText('');
    await sendGroupMessage({ groupId: selected.id, senderId: employee.id, senderName: employee.name, content: msg });
    setSending(false);
  };

  const handleFile = async (file: File) => {
    if (!selected) return;
    setUploading(true);
    try {
      const sizeMB = (file.size / 1024 / 1024).toFixed(1);
      const ext = file.name.split('.').pop()?.toUpperCase() ?? 'FILE';
      const path = `groups/${selected.id}/${Date.now()}_${file.name}`;
      const url = await uploadFile(file, path);
      await sendGroupMessage({
        groupId: selected.id, senderId: employee.id, senderName: employee.name,
        content: `📎 ${file.name}`,
        attachment: { name: file.name, size: `${sizeMB} MB`, ext, url },
      });
    } catch {
      const sizeMB = (file.size / 1024 / 1024).toFixed(1);
      const ext = file.name.split('.').pop()?.toUpperCase() ?? 'FILE';
      await sendGroupMessage({
        groupId: selected.id, senderId: employee.id, senderName: employee.name,
        content: `📎 ${file.name}`,
        attachment: { name: file.name, size: `${sizeMB} MB`, ext },
      });
    } finally { setUploading(false); }
  };

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskForm.title.trim() || !selected) return;
    await createTask({
      title: taskForm.title.trim(), assigneeId: employee.id, assigneeName: employee.name,
      priority: taskForm.priority, status: 'todo', groupId: selected.id, createdAt: Date.now(),
    });
    setTaskForm({ title: '', priority: 'medium' }); setShowNewTask(false);
  };

  const moveTask = (task: Task, status: TaskStatus) => {
    updateTask(task.id, { status, ...(status === 'done' ? { completedAt: Date.now() } : {}) }).catch(() => {});
  };

  const toggleMember = (id: string) => {
    if (id === employee.id) return;
    setNewMembers(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const files = messages.filter((m: any) => m.attachment);
  const groupMembers = selected ? allEmployees.filter(e => selected.memberIds.includes(e.id)) : [];
  const priorityColor = (p: Priority) => ({ urgent: '#EF4444', high: '#F97316', medium: '#CA8A04', low: '#6B7280' }[p]);

  return (
    <div style={{ display: 'flex', height: '100%', overflow: 'hidden' }}>
      {/* Left sidebar — group list */}
      <div style={{ width: 240, flexShrink: 0, borderRight: '1px solid var(--border)', display: 'flex', flexDirection: 'column', background: 'var(--surface)' }}>
        <div style={{ padding: '14px 14px 10px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>Groups</span>
          <button onClick={() => setShowCreate(true)}
            style={{ width: 26, height: 26, borderRadius: 6, background: '#111', color: '#fff', border: 'none', fontSize: 16, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            +
          </button>
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: '8px 6px' }}>
          {groups.length === 0 && (
            <div style={{ padding: '24px 12px', textAlign: 'center', fontSize: 12, color: 'var(--text-faint)' }}>
              No groups yet.<br />Create one to get started.
            </div>
          )}
          {groups.map(g => (
            <button key={g.id} onClick={() => { setSelected(g); setActiveTab('chat'); }}
              style={{
                width: '100%', padding: '9px 10px', borderRadius: 8, border: 'none', textAlign: 'left',
                background: selected?.id === g.id ? 'rgba(37,99,235,0.08)' : 'transparent',
                cursor: 'pointer', marginBottom: 2,
              }}
              onMouseOver={e => { if (selected?.id !== g.id) (e.currentTarget as HTMLButtonElement).style.background = 'var(--bg)'; }}
              onMouseOut={e => { if (selected?.id !== g.id) (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#6366F1', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 12, fontWeight: 600, flexShrink: 0 }}>
                  {g.name.slice(0, 2).toUpperCase()}
                </div>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{g.name}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-faint)' }}>{g.memberIds.length} members</div>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Right panel */}
      {!selected ? (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-faint)', fontSize: 13 }}>
          Select or create a group
        </div>
      ) : (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
          {/* Group header */}
          <div style={{ padding: '12px 20px', borderBottom: '1px solid var(--border)', background: 'var(--surface)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 34, height: 34, borderRadius: '50%', background: '#6366F1', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 13, fontWeight: 600 }}>
                {selected.name.slice(0, 2).toUpperCase()}
              </div>
              <div>
                <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>{selected.name}</div>
                <button onClick={() => setShowMembers(v => !v)} style={{ fontSize: 11, color: '#2563EB', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                  {selected.memberIds.length} members
                </button>
              </div>
            </div>
            {/* Tabs */}
            <div style={{ display: 'flex', gap: 2, background: 'var(--bg)', borderRadius: 8, padding: 3 }}>
              {(['chat', 'tasks', 'files'] as Tab[]).map(tab => (
                <button key={tab} onClick={() => setActiveTab(tab)}
                  style={{
                    padding: '5px 14px', borderRadius: 6, border: 'none', fontSize: 12, fontWeight: 500, cursor: 'pointer',
                    background: activeTab === tab ? 'var(--surface)' : 'transparent',
                    color: activeTab === tab ? 'var(--text)' : 'var(--text-muted)',
                    boxShadow: activeTab === tab ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                  }}>
                  {tab.charAt(0).toUpperCase() + tab.slice(1)}
                  {tab === 'files' && files.length > 0 && (
                    <span style={{ marginLeft: 5, background: '#6366F1', color: '#fff', borderRadius: 99, fontSize: 10, padding: '0 5px' }}>{files.length}</span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Member list */}
          {showMembers && (
            <div style={{ padding: '10px 20px', borderBottom: '1px solid var(--border)', background: 'var(--surface)', display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {groupMembers.map(m => (
                <span key={m.id} style={{ fontSize: 12, padding: '2px 10px', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 99, color: 'var(--text)' }}>
                  {m.name}{m.id === employee.id ? ' (you)' : ''}
                </span>
              ))}
            </div>
          )}

          {/* ── CHAT TAB ── */}
          {activeTab === 'chat' && (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
              <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                {messages.length === 0 && (
                  <div style={{ textAlign: 'center', color: 'var(--text-faint)', fontSize: 13, marginTop: 40 }}>No messages yet. Say hello!</div>
                )}
                {messages.map((msg: any) => {
                  const mine = msg.senderId === employee.id;
                  return (
                    <div key={msg.id} style={{ display: 'flex', gap: 10, alignItems: 'flex-end', flexDirection: mine ? 'row-reverse' : 'row' }}>
                      {!mine && (
                        <div style={{ width: 28, height: 28, borderRadius: '50%', background: '#6366F1', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 10, fontWeight: 600, flexShrink: 0 }}>
                          {initials(msg.senderName || '?')}
                        </div>
                      )}
                      <div style={{ maxWidth: '65%' }}>
                        {!mine && <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 3 }}>{msg.senderName}</div>}
                        <div style={{
                          padding: '9px 13px', borderRadius: mine ? '12px 12px 3px 12px' : '12px 12px 12px 3px',
                          background: mine ? '#111' : 'var(--surface)',
                          border: mine ? 'none' : '1px solid var(--border)',
                          color: mine ? '#fff' : 'var(--text)',
                          fontSize: 13, lineHeight: 1.5,
                        }}>
                          {msg.attachment ? (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <span style={{ fontSize: 10, fontWeight: 600, background: mine ? 'rgba(255,255,255,0.2)' : '#E9E9E7', padding: '2px 6px', borderRadius: 4 }}>{msg.attachment.ext}</span>
                              <span style={{ fontSize: 12 }}>{msg.attachment.name}</span>
                              {msg.attachment.url && (
                                <a href={msg.attachment.url} target="_blank" rel="noreferrer"
                                  style={{ fontSize: 11, color: mine ? 'rgba(255,255,255,0.8)' : '#2563EB' }}>↓</a>
                              )}
                            </div>
                          ) : msg.content}
                        </div>
                        <div style={{ fontSize: 10, color: 'var(--text-faint)', marginTop: 3, textAlign: mine ? 'right' : 'left' }}>{fmtTime(msg.timestamp)}</div>
                      </div>
                    </div>
                  );
                })}
                <div ref={bottomRef} />
              </div>
              {/* Input */}
              <div style={{ padding: '12px 16px', borderTop: '1px solid var(--border)', background: 'var(--surface)', flexShrink: 0 }}>
                <form onSubmit={handleSend} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <button type="button" onClick={() => fileRef.current?.click()}
                    style={{ width: 36, height: 36, borderRadius: 8, background: 'var(--bg)', border: '1px solid var(--border)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/></svg>
                  </button>
                  <input type="file" ref={fileRef} style={{ display: 'none' }} onChange={e => { if (e.target.files?.[0]) { handleFile(e.target.files[0]); e.target.value = ''; } }} />
                  <input
                    value={text} onChange={e => setText(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                    placeholder={`Message #${selected.name}…`}
                    style={{ flex: 1, height: 36, padding: '0 12px', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 13, fontFamily: 'inherit', color: 'var(--text)', outline: 'none' }}
                  />
                  <button type="submit" disabled={sending || uploading || !text.trim()}
                    style={{ width: 36, height: 36, borderRadius: 8, background: '#111', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: (!text.trim() || sending) ? 0.4 : 1 }}>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
                  </button>
                </form>
                {uploading && <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 6 }}>Uploading file…</div>}
              </div>
            </div>
          )}

          {/* ── TASKS TAB ── */}
          {activeTab === 'tasks' && (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
              <div style={{ padding: '10px 16px', borderBottom: '1px solid var(--border)', background: 'var(--surface)', display: 'flex', justifyContent: 'flex-end', flexShrink: 0 }}>
                <button onClick={() => setShowNewTask(v => !v)}
                  style={{ height: 32, padding: '0 14px', background: '#111', color: '#fff', border: 'none', borderRadius: 7, fontSize: 12, fontWeight: 500, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5 }}>
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                  New Task
                </button>
              </div>
              {showNewTask && (
                <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', background: 'var(--surface)' }}>
                  <form onSubmit={handleCreateTask} style={{ display: 'flex', gap: 8 }}>
                    <input required value={taskForm.title} onChange={e => setTaskForm(f => ({ ...f, title: e.target.value }))}
                      placeholder="Task title…" autoFocus
                      style={{ flex: 1, height: 36, padding: '0 12px', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 13, fontFamily: 'inherit', color: 'var(--text)', outline: 'none' }} />
                    <select value={taskForm.priority} onChange={e => setTaskForm(f => ({ ...f, priority: e.target.value as Priority }))}
                      style={{ height: 36, padding: '0 8px', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12, color: 'var(--text)', outline: 'none' }}>
                      {['urgent','high','medium','low'].map(p => <option key={p} value={p}>{p.charAt(0).toUpperCase()+p.slice(1)}</option>)}
                    </select>
                    <button type="submit" style={{ height: 36, padding: '0 14px', background: '#111', color: '#fff', border: 'none', borderRadius: 8, fontSize: 12, cursor: 'pointer' }}>Add</button>
                    <button type="button" onClick={() => setShowNewTask(false)} style={{ height: 36, padding: '0 10px', background: 'transparent', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12, color: 'var(--text-muted)', cursor: 'pointer' }}>Cancel</button>
                  </form>
                </div>
              )}
              <div style={{ flex: 1, display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, padding: 14, overflowY: 'auto', minHeight: 0 }}>
                {COLS.map(col => {
                  const colTasks = tasks.filter(t => t.status === col.key);
                  const isOver = overCol === col.key;
                  return (
                    <div key={col.key}
                      onDragOver={e => { e.preventDefault(); setOverCol(col.key); }}
                      onDragLeave={e => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setOverCol(null); }}
                      onDrop={() => { if (dragId) { const t = tasks.find(t => t.id === dragId); if (t && t.status !== col.key) moveTask(t, col.key); } setDragId(null); setOverCol(null); }}
                      style={{ background: isOver ? 'rgba(37,99,235,0.03)' : 'var(--surface)', border: `1px solid ${isOver ? '#2563EB' : 'var(--border)'}`, borderRadius: 10, display: 'flex', flexDirection: 'column', minHeight: 120, overflow: 'hidden' }}>
                      <div style={{ padding: '12px 14px 8px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 6 }}>
                        <div style={{ width: 7, height: 7, borderRadius: '50%', background: col.dot }} />
                        <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{col.label}</span>
                        <span style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--text-faint)', background: 'var(--bg)', padding: '1px 6px', borderRadius: 99 }}>{colTasks.length}</span>
                      </div>
                      <div style={{ flex: 1, overflowY: 'auto', padding: '8px 8px' }}>
                        {colTasks.map(task => (
                          <div key={task.id} draggable
                            onDragStart={() => setDragId(task.id)}
                            onDragEnd={() => { setDragId(null); setOverCol(null); }}
                            style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 7, padding: '10px 11px', marginBottom: 6, cursor: 'grab', opacity: dragId === task.id ? 0.5 : 1 }}>
                            <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--text)', marginBottom: 5 }}>{task.title}</div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                              <span style={{ fontSize: 10, fontWeight: 600, color: priorityColor(task.priority), textTransform: 'uppercase' }}>{task.priority}</span>
                              <span style={{ fontSize: 10, color: 'var(--text-faint)' }}>{task.assigneeName}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ── FILES TAB ── */}
          {activeTab === 'files' && (
            <div style={{ flex: 1, overflowY: 'auto', padding: 16 }}>
              {files.length === 0 ? (
                <div style={{ textAlign: 'center', color: 'var(--text-faint)', fontSize: 13, marginTop: 40 }}>No files shared yet. Upload one in the chat.</div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 10 }}>
                  {files.map((msg: any) => (
                    <div key={msg.id} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, padding: '14px 14px 12px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                      <div style={{ width: 36, height: 36, borderRadius: 8, background: '#F3F4F6', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: '#6366F1' }}>
                        {msg.attachment.ext}
                      </div>
                      <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{msg.attachment.name}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-faint)' }}>{msg.senderName} · {msg.attachment.size}</div>
                      {msg.attachment.url && (
                        <a href={msg.attachment.url} target="_blank" rel="noreferrer"
                          style={{ fontSize: 11, color: '#2563EB', textDecoration: 'none', fontWeight: 500 }}>↓ Download</a>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Create group modal */}
      {showCreate && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }}
          onClick={e => { if (e.target === e.currentTarget) setShowCreate(false); }}>
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, padding: 28, width: 420, boxShadow: '0 8px 32px rgba(0,0,0,0.12)', animation: 'fadeIn 150ms ease' }}>
            <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--text)', marginBottom: 18 }}>Create Group</div>
            <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 500, color: 'var(--text-muted)', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 5 }}>Name *</label>
                <input required value={newName} onChange={e => setNewName(e.target.value)} placeholder="e.g. Product Team"
                  style={{ width: '100%', height: 40, padding: '0 12px', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 13, fontFamily: 'inherit', color: 'var(--text)', outline: 'none' }}
                  onFocus={e => (e.target.style.borderColor = '#2563EB')} onBlur={e => (e.target.style.borderColor = 'var(--border)')} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 500, color: 'var(--text-muted)', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 5 }}>Description</label>
                <input value={newDesc} onChange={e => setNewDesc(e.target.value)} placeholder="Optional description"
                  style={{ width: '100%', height: 40, padding: '0 12px', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 13, fontFamily: 'inherit', color: 'var(--text)', outline: 'none' }}
                  onFocus={e => (e.target.style.borderColor = '#2563EB')} onBlur={e => (e.target.style.borderColor = 'var(--border)')} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 500, color: 'var(--text-muted)', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 8 }}>Members</label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, maxHeight: 130, overflowY: 'auto', padding: 4 }}>
                  {allEmployees.map(e => (
                    <button key={e.id} type="button" onClick={() => toggleMember(e.id)}
                      style={{
                        padding: '4px 11px', borderRadius: 99, border: '1px solid', fontSize: 12, cursor: e.id === employee.id ? 'default' : 'pointer',
                        background: newMembers.includes(e.id) ? '#111' : 'transparent',
                        color: newMembers.includes(e.id) ? '#fff' : 'var(--text-muted)',
                        borderColor: newMembers.includes(e.id) ? '#111' : 'var(--border)',
                        opacity: e.id === employee.id ? 0.6 : 1,
                      }}>
                      {e.name}{e.id === employee.id ? ' (you)' : ''}
                    </button>
                  ))}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 4 }}>
                <button type="button" onClick={() => setShowCreate(false)}
                  style={{ height: 38, padding: '0 16px', background: 'transparent', border: '1px solid var(--border)', borderRadius: 8, fontSize: 13, color: 'var(--text-muted)', cursor: 'pointer' }}>Cancel</button>
                <button type="submit" disabled={creating}
                  style={{ height: 38, padding: '0 20px', background: creating ? '#888' : '#111', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 500, cursor: creating ? 'not-allowed' : 'pointer' }}>
                  {creating ? 'Creating…' : 'Create Group'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
