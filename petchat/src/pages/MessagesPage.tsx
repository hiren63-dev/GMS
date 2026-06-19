import { useState, useEffect, useRef } from 'react';
import type { Employee, Message } from '../types';
import { sendMessage, onMessagesChange, onConversationPartnersChange } from '../services/firebase';

interface Props {
  employee: Employee;
  allEmployees: Employee[];
}

export default function MessagesPage({ employee, allEmployees }: Props) {
  const [contacts, setContacts]   = useState<Employee[]>([]);
  const [selected, setSelected]   = useState<Employee | null>(null);
  const [messages, setMessages]   = useState<Message[]>([]);
  const [text, setText]           = useState('');
  const [sending, setSending]     = useState(false);
  const [searchNew, setSearchNew] = useState('');
  const [convSearch, setConvSearch] = useState('');
  const [showNew, setShowNew]     = useState(false);
  const [dropOver, setDropOver]   = useState(false);
  const bottomRef                 = useRef<HTMLDivElement>(null);
  const fileRef                   = useRef<HTMLInputElement>(null);

  // Stable ID string so the listener only re-subscribes when employees actually change.
  const allEmpIds = allEmployees.map(e => e.id).join(',');

  // Live conversation partners (updates when a new message arrives, no manual refresh)
  useEffect(() => {
    const unsub = onConversationPartnersChange(employee.id, allEmployees, partners => {
      setContacts(partners);
      setSelected(prev => prev ?? (partners[0] ?? null));
    });
    return unsub;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [employee.id, allEmpIds]);

  useEffect(() => {
    if (!selected) return;
    const unsub = onMessagesChange(employee.id, selected.id, setMessages);
    return unsub;
  }, [selected, employee.id]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!text.trim() || !selected || sending) return;
    setSending(true);
    const msg = text.trim();
    setText('');
    await sendMessage({ senderId: employee.id, senderName: employee.name, recipientId: selected.id, content: msg, isGroupChat: false });
    if (!contacts.find(c => c.id === selected.id)) setContacts(prev => [selected, ...prev]);
    setSending(false);
  };

  const handleFile = async (file: File) => {
    if (!selected) return;
    const sizeMB = (file.size / 1024 / 1024).toFixed(1);
    const ext = file.name.split('.').pop()?.toUpperCase() ?? 'FILE';
    await sendMessage({
      senderId: employee.id, senderName: employee.name, recipientId: selected.id, isGroupChat: false,
      content: `📎 ${file.name}`,
      attachment: { name: file.name, size: `${sizeMB} MB`, ext },
    });
    if (!contacts.find(c => c.id === selected.id)) setContacts(prev => [selected, ...prev]);
  };

  const handleNewChat = (emp: Employee) => {
    if (!contacts.find(c => c.id === emp.id)) setContacts(prev => [emp, ...prev]);
    setSelected(emp); setShowNew(false); setSearchNew('');
  };

  const newResults = allEmployees.filter(e =>
    e.id !== employee.id &&
    (searchNew === '' || e.name.toLowerCase().includes(searchNew.toLowerCase()))
  );

  const initials = (name: string) => name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  const fmtTime  = (ts: number) => new Date(ts).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });

  const STATUS_META: Record<string, { color: string; label: string }> = {
    active:  { color: '#22C55E', label: 'Online' },
    idle:    { color: '#F59E0B', label: 'Idle' },
    blocked: { color: '#EF4444', label: 'Blocked' },
    offline: { color: '#9CA3AF', label: 'Offline' },
  };
  const statusOf = (s?: string) => STATUS_META[s ?? 'offline'] ?? STATUS_META.offline;

  const visibleContacts = contacts.filter(c =>
    !convSearch ||
    c.name.toLowerCase().includes(convSearch.toLowerCase()) ||
    c.department.toLowerCase().includes(convSearch.toLowerCase())
  );

  return (
    <div style={{ height: '100%', display: 'flex', overflow: 'hidden', animation: 'fadeIn 200ms ease' }}>

      {/* Conversation list */}
      <div style={{ width: 260, flexShrink: 0, borderRight: '1px solid var(--border)', display: 'flex', flexDirection: 'column', background: 'var(--surface)' }}>
        <div style={{ padding: '16px 12px 10px', borderBottom: '1px solid var(--sidebar-border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <span style={{ fontSize: 15, fontWeight: 600, color: 'var(--text)' }}>Messages</span>
            <button onClick={() => setShowNew(v => !v)}
              style={{ width: 28, height: 28, borderRadius: 7, background: '#111', border: 'none', color: '#fff', fontSize: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', lineHeight: 1 }}>+</button>
          </div>
          {showNew && (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 7, background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 7, padding: '7px 10px', marginBottom: 6 }}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--text-faint)" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                <input type="text" value={searchNew} onChange={e => setSearchNew(e.target.value)} placeholder="Search teammates…" style={{ flex: 1, border: 'none', background: 'transparent', fontSize: 13, fontFamily: 'inherit', color: 'var(--text)', outline: 'none' }} autoFocus />
              </div>
              <div style={{ maxHeight: 200, overflowY: 'auto', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 8, padding: 4 }}>
                {newResults.map(emp => (
                  <button key={emp.id} onClick={() => handleNewChat(emp)}
                    style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 9, padding: '8px 9px', border: 'none', background: 'transparent', borderRadius: 7, cursor: 'pointer', textAlign: 'left' }}
                    onMouseOver={e => (e.currentTarget as HTMLButtonElement).style.background = 'var(--surface)'}
                    onMouseOut={e => (e.currentTarget as HTMLButtonElement).style.background = 'transparent'}
                  >
                    <div style={{ width: 30, height: 30, borderRadius: '50%', background: '#111', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 600, color: '#fff', flexShrink: 0 }}>{initials(emp.name)}</div>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)' }}>{emp.name}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{emp.department}</div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
          <div style={{ display: 'flex', alignItems: 'center', gap: 7, background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 7, padding: '7px 10px', marginTop: showNew ? 6 : 0 }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--text-faint)" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            <input type="text" value={convSearch} onChange={e => setConvSearch(e.target.value)} placeholder="Search conversations…" style={{ flex: 1, border: 'none', background: 'transparent', fontSize: 13, fontFamily: 'inherit', color: 'var(--text)', outline: 'none' }} />
          </div>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '6px 8px' }}>
          {visibleContacts.length === 0 ? (
            <div style={{ padding: 20, textAlign: 'center', fontSize: 13, color: 'var(--text-muted)' }}>
              {convSearch ? 'No matches.' : <>No conversations.<br />Click + to start one.</>}
            </div>
          ) : visibleContacts.map(c => (
            <div key={c.id} onClick={() => setSelected(c)}
              style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '9px', borderRadius: 8, cursor: 'pointer', background: selected?.id === c.id ? 'var(--bg)' : 'transparent', marginBottom: 1, transition: 'background 120ms' }}
              onMouseOver={e => { if (selected?.id !== c.id) (e.currentTarget as HTMLElement).style.background = 'var(--bg)'; }}
              onMouseOut={e => { if (selected?.id !== c.id) (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
            >
              <div style={{ width: 36, height: 36, borderRadius: '50%', background: '#111', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 600, color: '#fff', flexShrink: 0 }}>{initials(c.name)}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)' }}>{c.name}</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.department}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Thread area */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        {selected ? (
          <>
            {/* Thread header */}
            <div style={{ height: 52, background: 'var(--surface)', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', padding: '0 14px', gap: 10, flexShrink: 0 }}>
              <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#111', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 600, color: '#fff', flexShrink: 0 }}>{initials(selected.name)}</div>
              <div>
                <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--text)' }}>{selected.name}</div>
                <div style={{ fontSize: 11, color: statusOf(selected.status).color }}>● {statusOf(selected.status).label}</div>
              </div>
            </div>

            {/* Messages */}
            <div
              style={{ flex: 1, overflowY: 'auto', padding: 18, display: 'flex', flexDirection: 'column', gap: 8, background: dropOver ? 'rgba(37,99,235,0.03)' : 'var(--bg)', transition: 'background 150ms' }}
              onDragOver={e => { e.preventDefault(); setDropOver(true); }}
              onDragLeave={() => setDropOver(false)}
              onDrop={e => { e.preventDefault(); setDropOver(false); const f = e.dataTransfer.files[0]; if (f) handleFile(f); }}
            >
              {messages.length === 0 && (
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10, color: 'var(--text-faint)' }}>
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                  <span style={{ fontSize: 14, color: 'var(--text-muted)', fontWeight: 500 }}>Say hello to {selected.name.split(' ')[0]}</span>
                  <span style={{ fontSize: 12, color: 'var(--text-faint)' }}>Drop files here to share</span>
                </div>
              )}
              {messages.map((msg, i) => {
                const isMe = msg.senderId === employee.id;
                const showSender = !isMe && (i === 0 || messages[i - 1].senderId !== msg.senderId);
                const att = (msg as any).attachment;
                return (
                  <div key={msg.id} style={{ display: 'flex', flexDirection: 'column', alignItems: isMe ? 'flex-end' : 'flex-start', maxWidth: '78%', alignSelf: isMe ? 'flex-end' : 'flex-start' }}>
                    {showSender && <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 3, paddingLeft: 4 }}>{msg.senderName}</div>}
                    {att ? (
                      <div title="File reference (name & size only — actual upload needs Firebase Storage)" style={{ padding: '9px 12px', borderRadius: 12, background: isMe ? '#111' : 'var(--surface)', border: isMe ? 'none' : '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 10, maxWidth: 240 }}>
                        <span style={{ width: 30, height: 30, borderRadius: 7, background: isMe ? 'rgba(255,255,255,0.15)' : 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'monospace', fontSize: 9, fontWeight: 700, color: isMe ? '#fff' : 'var(--text)', flexShrink: 0 }}>{att.ext}</span>
                        <span style={{ minWidth: 0 }}>
                          <span style={{ display: 'block', fontSize: 12, fontWeight: 500, color: isMe ? '#fff' : 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{att.name}</span>
                          <span style={{ display: 'block', fontSize: 10, color: isMe ? 'rgba(255,255,255,0.6)' : 'var(--text-muted)' }}>{att.size}</span>
                        </span>
                      </div>
                    ) : (
                      <div style={{ padding: '9px 13px', borderRadius: 12, background: isMe ? '#111' : 'var(--surface)', border: isMe ? 'none' : '1px solid var(--border)', color: isMe ? '#fff' : 'var(--text)', fontSize: 13, lineHeight: 1.5, borderBottomRightRadius: isMe ? 4 : 12, borderBottomLeftRadius: isMe ? 12 : 4 }}>
                        {msg.content}
                      </div>
                    )}
                    <div style={{ fontSize: 10, color: 'var(--text-faint)', marginTop: 3, padding: '0 4px' }}>{fmtTime(msg.timestamp)}</div>
                  </div>
                );
              })}
              <div ref={bottomRef} />
            </div>

            {/* Input */}
            <form onSubmit={handleSend} style={{ padding: '12px 14px', background: 'var(--surface)', borderTop: '1px solid var(--border)', display: 'flex', gap: 8, alignItems: 'center', flexShrink: 0 }}>
              <input ref={fileRef} type="file" multiple onChange={e => { if (e.target.files?.[0]) handleFile(e.target.files[0]); }} style={{ display: 'none' }} />
              <button type="button" onClick={() => fileRef.current?.click()} title="Share a file reference (name & size). Actual file upload requires Firebase Storage."
                style={{ width: 40, height: 40, borderRadius: 8, background: 'var(--bg)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', flexShrink: 0, cursor: 'pointer' }}
                onMouseOver={e => (e.currentTarget as HTMLButtonElement).style.color = 'var(--text)'}
                onMouseOut={e => (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-muted)'}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/></svg>
              </button>
              <input type="text" value={text} onChange={e => setText(e.target.value)}
                placeholder={`Message ${selected.name.split(' ')[0]}…`}
                style={{ flex: 1, height: 40, padding: '0 14px', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 13, fontFamily: 'inherit', color: 'var(--text)', outline: 'none', minWidth: 0 }}
                onFocus={e => (e.target.style.borderColor = '#2563EB')}
                onBlur={e => (e.target.style.borderColor = 'var(--border)')}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                disabled={sending}
              />
              <button type="submit" disabled={!text.trim() || sending}
                style={{ width: 40, height: 40, borderRadius: 8, background: '#111', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', flexShrink: 0, cursor: text.trim() ? 'pointer' : 'not-allowed', opacity: text.trim() ? 1 : 0.5 }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
              </button>
            </form>
          </>
        ) : (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10, color: 'var(--text-faint)' }}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
            <span style={{ fontSize: 14, color: 'var(--text-muted)', fontWeight: 500 }}>Select a conversation</span>
          </div>
        )}
      </div>
    </div>
  );
}
