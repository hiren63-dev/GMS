import { useState, useEffect, useRef } from 'react';
import type { Employee, Group, Message, Task, ResourceFile } from '../types';
import { getGroups, createGroup, onGroupsChange, sendMessage, onMessagesChange, createTask, onAllTasksChange, updateTask, uploadFile, addResourceFile, onResourceFilesChange } from '../services/firebase';

interface Props { employee: Employee; allEmployees: Employee[]; }

export default function GroupsPage({ employee, allEmployees }: Props) {
  const [groups, setGroups] = useState<Group[]>([]);
  const [activeGroup, setActiveGroup] = useState<Group | null>(null);
  const [showNew, setShowNew] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupDesc, setNewGroupDesc] = useState('');
  const [newGroupMembers, setNewGroupMembers] = useState<string[]>([]);
  const [tab, setTab] = useState<'chat' | 'tasks' | 'files'>('chat');

  // Chat state
  const [messages, setMessages] = useState<Message[]>([]);
  const [chatText, setChatText] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);

  // Tasks state
  const [tasks, setTasks] = useState<Task[]>([]);
  const [newTaskTitle, setNewTaskTitle] = useState('');

  // Files state
  const [files, setFiles] = useState<ResourceFile[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    return onGroupsChange(employee.id, (g) => {
      setGroups(g);
      if (!activeGroup && g.length > 0) setActiveGroup(g[0]);
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [employee.id]);

  useEffect(() => {
    if (!activeGroup) return;
    const u1 = onMessagesChange(employee.id, activeGroup.id, setMessages, activeGroup.id);
    const u2 = onAllTasksChange(setTasks, activeGroup.id);
    const u3 = onResourceFilesChange(setFiles, activeGroup.id);
    return () => { u1(); u2(); u3(); };
  }, [activeGroup, employee.id]);

  useEffect(() => {
    if (tab === 'chat') bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, tab]);

  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGroupName.trim()) return;
    await createGroup({
      name: newGroupName, description: newGroupDesc,
      adminId: employee.id, memberIds: [employee.id, ...newGroupMembers]
    });
    setShowNew(false); setNewGroupName(''); setNewGroupDesc(''); setNewGroupMembers([]);
  };

  const handleSendChat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatText.trim() || !activeGroup) return;
    await sendMessage({
      senderId: employee.id, senderName: employee.name, recipientId: activeGroup.id,
      content: chatText.trim(), isGroupChat: true, groupId: activeGroup.id
    });
    setChatText('');
  };

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim() || !activeGroup) return;
    await createTask({
      title: newTaskTitle.trim(), assigneeId: employee.id, assigneeName: employee.name,
      priority: 'medium', status: 'todo', groupId: activeGroup.id
    });
    setNewTaskTitle('');
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.[0] || !activeGroup) return;
    const file = e.target.files[0];
    setUploading(true);
    try {
      const ext = file.name.split('.').pop()?.toUpperCase() ?? 'FILE';
      const sizeMB = (file.size / 1024 / 1024).toFixed(1) + ' MB';
      const path = `groups/${activeGroup.id}/${Date.now()}_${file.name}`;
      const url = await uploadFile(file, path);
      await addResourceFile({
        name: file.name, ext, size: sizeMB, url, uploadedBy: employee.id,
        uploadedByName: employee.name, uploadedAt: Date.now(), groupId: activeGroup.id,
        mimeType: file.type || 'application/octet-stream'
      });
    } catch (err) {
      console.error(err);
      alert('Upload failed. Note: Storage rules might reject unauthenticated uploads.');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  return (
    <div style={{ display: 'flex', height: '100%', animation: 'fadeIn 200ms ease' }}>
      {/* Sidebar List */}
      <div style={{ width: 260, borderRight: '1px solid var(--border)', background: 'var(--surface)', display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '16px 12px', borderBottom: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <div style={{ fontSize: 15, fontWeight: 600 }}>Groups</div>
            {(employee.role === 'admin' || employee.role === 'founder') && (
              <button onClick={() => setShowNew(true)} style={{ background: '#111', color: '#fff', border: 'none', borderRadius: 4, padding: '2px 8px', cursor: 'pointer', fontSize: 12 }}>+ New</button>
            )}
          </div>
          {showNew && (
            <form onSubmit={handleCreateGroup} style={{ background: 'var(--bg)', padding: 10, borderRadius: 8, marginBottom: 10, border: '1px solid var(--border)' }}>
              <input value={newGroupName} onChange={e => setNewGroupName(e.target.value)} placeholder="Group Name" required style={{ width: '100%', marginBottom: 6, padding: 6, fontSize: 12, borderRadius: 4, border: '1px solid var(--border)' }} />
              <input value={newGroupDesc} onChange={e => setNewGroupDesc(e.target.value)} placeholder="Description" style={{ width: '100%', marginBottom: 6, padding: 6, fontSize: 12, borderRadius: 4, border: '1px solid var(--border)' }} />
              <select multiple value={newGroupMembers} onChange={e => setNewGroupMembers(Array.from(e.target.selectedOptions, o => o.value))} style={{ width: '100%', marginBottom: 6, padding: 6, fontSize: 12, borderRadius: 4, border: '1px solid var(--border)' }}>
                {allEmployees.filter(e => e.id !== employee.id).map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
              </select>
              <div style={{ display: 'flex', gap: 6 }}>
                <button type="button" onClick={() => setShowNew(false)} style={{ flex: 1, padding: '4px', fontSize: 11, cursor: 'pointer' }}>Cancel</button>
                <button type="submit" style={{ flex: 1, padding: '4px', fontSize: 11, background: '#111', color: '#fff', cursor: 'pointer' }}>Create</button>
              </div>
            </form>
          )}
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: 8 }}>
          {groups.length === 0 ? <div style={{ padding: 20, textAlign: 'center', fontSize: 12, color: 'var(--text-muted)' }}>No groups yet.</div> : null}
          {groups.map(g => (
            <div key={g.id} onClick={() => setActiveGroup(g)}
              style={{ padding: 10, borderRadius: 8, background: activeGroup?.id === g.id ? 'var(--bg)' : 'transparent', cursor: 'pointer', marginBottom: 2 }}>
              <div style={{ fontSize: 13, fontWeight: 500 }}>{g.name}</div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{g.memberIds.length} members</div>
            </div>
          ))}
        </div>
      </div>

      {/* Main Workspace */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: 'var(--bg)' }}>
        {activeGroup ? (
          <>
            <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--border)', background: 'var(--surface)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontSize: 18, fontWeight: 600 }}>{activeGroup.name}</div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{activeGroup.description}</div>
              </div>
              <div style={{ display: 'flex', gap: 10, background: 'var(--bg)', padding: 4, borderRadius: 8, border: '1px solid var(--border)' }}>
                {['chat', 'tasks', 'files'].map(t => (
                  <button key={t} onClick={() => setTab(t as any)}
                    style={{ padding: '4px 12px', fontSize: 13, fontWeight: 500, borderRadius: 6, background: tab === t ? 'var(--surface)' : 'transparent', border: 'none', boxShadow: tab === t ? '0 1px 3px rgba(0,0,0,0.1)' : 'none', cursor: 'pointer', textTransform: 'capitalize' }}>
                    {t}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ flex: 1, overflow: 'hidden', position: 'relative' }}>
              {/* Chat Tab */}
              {tab === 'chat' && (
                <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                  <div style={{ flex: 1, overflowY: 'auto', padding: 20 }}>
                    {messages.map(m => (
                      <div key={m.id} style={{ marginBottom: 12 }}>
                        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                          <span style={{ fontSize: 13, fontWeight: 600 }}>{m.senderName}</span>
                          <span style={{ fontSize: 10, color: 'var(--text-faint)' }}>{new Date(m.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                        </div>
                        <div style={{ fontSize: 13, marginTop: 2 }}>{m.content}</div>
                      </div>
                    ))}
                    <div ref={bottomRef} />
                  </div>
                  <form onSubmit={handleSendChat} style={{ padding: 16, borderTop: '1px solid var(--border)', background: 'var(--surface)' }}>
                    <input value={chatText} onChange={e => setChatText(e.target.value)} placeholder={`Message ${activeGroup.name}...`} style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg)', outline: 'none' }} />
                  </form>
                </div>
              )}

              {/* Tasks Tab */}
              {tab === 'tasks' && (
                <div style={{ padding: 24, height: '100%', overflowY: 'auto' }}>
                  <form onSubmit={handleCreateTask} style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
                    <input value={newTaskTitle} onChange={e => setNewTaskTitle(e.target.value)} placeholder="New task title..." style={{ flex: 1, padding: '8px 12px', borderRadius: 6, border: '1px solid var(--border)' }} required />
                    <button type="submit" style={{ padding: '0 16px', borderRadius: 6, background: '#111', color: '#fff', border: 'none', cursor: 'pointer' }}>Add Task</button>
                  </form>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {tasks.length === 0 && <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>No tasks in this group.</div>}
                    {tasks.map(t => (
                      <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: 12, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8 }}>
                        <input type="checkbox" checked={t.status === 'done'} onChange={e => updateTask(t.id, { status: e.target.checked ? 'done' : 'todo' })} />
                        <span style={{ fontSize: 14, textDecoration: t.status === 'done' ? 'line-through' : 'none' }}>{t.title}</span>
                        <span style={{ marginLeft: 'auto', fontSize: 11, background: 'var(--bg)', padding: '2px 6px', borderRadius: 4 }}>{t.assigneeName.split(' ')[0]}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Files Tab */}
              {tab === 'files' && (
                <div style={{ padding: 24, height: '100%', overflowY: 'auto' }}>
                  <div style={{ marginBottom: 20 }}>
                    <input type="file" ref={fileRef} onChange={handleFileUpload} style={{ display: 'none' }} />
                    <button onClick={() => fileRef.current?.click()} disabled={uploading} style={{ padding: '8px 16px', background: uploading ? '#888' : '#111', color: '#fff', borderRadius: 6, border: 'none', cursor: uploading ? 'wait' : 'pointer' }}>
                      {uploading ? 'Uploading...' : 'Upload File'}
                    </button>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 16 }}>
                    {files.length === 0 && <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>No files in this group.</div>}
                    {files.map(f => (
                      <a href={f.url} target="_blank" rel="noopener noreferrer" key={f.id} style={{ display: 'block', padding: 16, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, textDecoration: 'none', color: 'inherit' }}>
                        <div style={{ fontSize: 24, marginBottom: 8 }}>📄</div>
                        <div style={{ fontSize: 13, fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{f.name}</div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>{f.size} · {f.uploadedByName.split(' ')[0]}</div>
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </>
        ) : (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-faint)' }}>
            Select or create a group to start collaborating
          </div>
        )}
      </div>
    </div>
  );
}
