import { useState, useEffect, useRef } from 'react';
import type { Employee, Message } from '../types';
import { sendMessage, onMessagesChange, onConversationPartnersChange, uploadFile, toggleReaction } from '../services/firebase';
import { sendPush } from '../services/push';
import { avatarColor } from '../lib/avatar';
import { toast } from '../utils/toast';

const EMOJIS = ['👍','❤️','😂','😮','🎉'];

interface Props {
  employee: Employee;
  allEmployees: Employee[];
  targetEmployeeId?: string;
}

type Contact = Employee & { lastMessageAt?: number };

export default function MessagesPage({ employee, allEmployees, targetEmployeeId }: Props) {
  const [contacts, setContacts]   = useState<Contact[]>([]);
  const [selected, setSelected]   = useState<Contact | null>(null);
  const [messages, setMessages]   = useState<Message[]>([]);
  const [text, setText]           = useState('');
  const [sending, setSending]     = useState(false);
  const [uploading, setUploading] = useState(false);
  const [convSearch, setConvSearch] = useState('');
  const [dropOver, setDropOver]   = useState(false);
  const [hoveredMsg, setHoveredMsg] = useState<string | null>(null);
  const [mentionQuery, setMentionQuery] = useState('');
  const [showMentions, setShowMentions] = useState(false);
  const bottomRef                 = useRef<HTMLDivElement>(null);
  const fileRef                   = useRef<HTMLInputElement>(null);

  const mentionResults = showMentions
    ? allEmployees.filter(e => e.id !== employee.id && e.name.toLowerCase().includes(mentionQuery.toLowerCase())).slice(0, 5)
    : [];

  // Stable ID string so the listener only re-subscribes when employees actually change.
  const allEmpIds = allEmployees.map(e => e.id).join(',');

  // Live conversation partners (updates when a new message arrives, no manual refresh)
  useEffect(() => {
    const unsub = onConversationPartnersChange(employee.id, allEmployees, partners => {
      setContacts(partners);
      if (targetEmployeeId) {
        const target = partners.find(p => p.id === targetEmployeeId);
        setSelected(target ?? (partners[0] ?? null));
      } else {
        setSelected(prev => prev ?? (partners[0] ?? null));
      }
    });
    return unsub;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [employee.id, allEmpIds, targetEmployeeId]);

  useEffect(() => {
    if (!selected) return;
    const unsub = onMessagesChange(employee.id, selected.id, setMessages);
    return unsub;
  }, [selected, employee.id]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleTextChange = (val: string) => {
    setText(val);
    const atIdx = val.lastIndexOf('@');
    if (atIdx !== -1 && atIdx === val.length - 1) { setMentionQuery(''); setShowMentions(true); }
    else if (atIdx !== -1 && !val.slice(atIdx + 1).includes(' ')) { setMentionQuery(val.slice(atIdx + 1)); setShowMentions(true); }
    else { setShowMentions(false); }
  };

  const insertMention = (emp: Employee) => {
    const atIdx = text.lastIndexOf('@');
    setText(text.slice(0, atIdx) + `@${emp.name} `);
    setShowMentions(false);
  };

  const handleSend = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!text.trim() || !selected || sending) return;
    setSending(true);
    const msg = text.trim();
    setText(''); setShowMentions(false);
    const mentionedIds = allEmployees.filter(e => msg.includes(`@${e.name}`)).map(e => e.id);
    await sendMessage({
      senderId: employee.id, senderName: employee.name, recipientId: selected.id, content: msg, isGroupChat: false,
      ...(mentionedIds.length ? { mentions: mentionedIds } : {}),
    });
    sendPush([selected.id], { title: employee.name, body: msg.slice(0, 140), tag: 'message', url: '/' });
    setSending(false);
  };

  const handleFile = async (file: File) => {
    if (!selected) return;
    setUploading(true);
    try {
      const sizeMB = (file.size / 1024 / 1024).toFixed(1);
      const ext = file.name.split('.').pop()?.toUpperCase() ?? 'FILE';
      const path = `messages/${[employee.id, selected.id].sort().join('_')}/${Date.now()}_${file.name}`;
      const url = await uploadFile(file, path);
      await sendMessage({
        senderId: employee.id, senderName: employee.name, recipientId: selected.id, isGroupChat: false,
        content: `📎 ${file.name}`,
        attachment: { name: file.name, size: `${sizeMB} MB`, ext, url },
      });
      sendPush([selected.id], { title: employee.name, body: `📎 ${file.name}`, tag: 'message', url: '/' });
    } catch (err: any) {
      // Upload to Firebase Storage failed — don't send a broken, unopenable
      // attachment. Surface the real reason so it can be fixed (usually Storage
      // not enabled, or Storage rules blocking the write).
      console.error('[messages] file upload failed:', err?.code, err?.message ?? err);
      const reason = err?.code === 'storage/unauthorized'
        ? 'file sharing is blocked by Storage rules'
        : err?.code === 'storage/unknown' || err?.code === 'storage/retry-limit-exceeded'
          ? 'file storage is not set up yet'
          : 'the upload failed';
      toast(`Couldn't send “${file.name}” — ${reason}.`);
    } finally {
      setUploading(false);
    }
  };

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

  const renderContent = (content: string) => {
    const names = allEmployees.map(e => e.name);
    if (!names.length) return <>{content}</>;
    const escaped = names.map(n => n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
    const regex = new RegExp(`(@(?:${escaped.join('|')}))`, 'g');
    const parts = content.split(regex);
    return <>{parts.map((p, i) =>
      p.startsWith('@') && names.includes(p.slice(1))
        ? <span key={i} style={{ color: 'var(--accent)', fontWeight: 600, background: 'rgba(0,117,222,0.08)', borderRadius: 3, padding: '0 2px' }}>{p}</span>
        : p
    )}</>;
  };

  return (
    <div style={{ height: '100%', display: 'flex', overflow: 'hidden', animation: 'fadeIn 200ms ease' }}>

      {/* Contact list — every teammate, WhatsApp-style. Active conversations
          float to the top by recency; everyone else is one click away below,
          no separate "start a chat" step. */}
      <div style={{ width: 280, flexShrink: 0, borderRight: '1px solid var(--border)', display: 'flex', flexDirection: 'column', background: 'var(--surface)' }}>
        <div style={{ padding: '16px 12px 10px', borderBottom: '1px solid var(--sidebar-border)' }}>
          <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text)', marginBottom: 10 }}>Messages</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7, background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 7, padding: '7px 10px' }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--text-faint)" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            <input type="text" value={convSearch} onChange={e => setConvSearch(e.target.value)} placeholder="Search people…" style={{ flex: 1, border: 'none', background: 'transparent', fontSize: 13, fontFamily: 'inherit', color: 'var(--text)', outline: 'none' }} />
          </div>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '6px 8px' }}>
          {visibleContacts.length === 0 ? (
            <div style={{ padding: 20, textAlign: 'center', fontSize: 13, color: 'var(--text-muted)' }}>No matches.</div>
          ) : visibleContacts.map(c => {
            const av = avatarColor(c.name);
            return (
              <div key={c.id} onClick={() => setSelected(c)}
                style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '9px', borderRadius: 8, cursor: 'pointer', background: selected?.id === c.id ? 'var(--bg)' : 'transparent', marginBottom: 1, transition: 'background 120ms' }}
                onMouseOver={e => { if (selected?.id !== c.id) (e.currentTarget as HTMLElement).style.background = 'var(--bg)'; }}
                onMouseOut={e => { if (selected?.id !== c.id) (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
              >
                <div style={{ width: 36, height: 36, borderRadius: '50%', background: av.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 600, color: av.fg, flexShrink: 0 }}>{initials(c.name)}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)' }}>{c.name}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {c.lastMessageAt ? fmtTime(c.lastMessageAt) : c.department}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Thread area */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        {selected ? (
          <>
            {/* Thread header */}
            <div style={{ height: 52, background: 'var(--surface)', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', padding: '0 14px', gap: 10, flexShrink: 0 }}>
              <div style={{ width: 32, height: 32, borderRadius: '50%', background: avatarColor(selected.name).bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 600, color: avatarColor(selected.name).fg, flexShrink: 0 }}>{initials(selected.name)}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--text)' }}>{selected.name}</div>
                <div style={{ fontSize: 11, color: statusOf(selected.status).color }}>● {statusOf(selected.status).label}</div>
              </div>
              <a href="https://meet.google.com/new" target="_blank" rel="noopener noreferrer" title="Start Google Meet"
                style={{ width: 34, height: 34, borderRadius: 8, background: 'var(--bg)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', textDecoration: 'none', flexShrink: 0 }}
                onMouseOver={e => { (e.currentTarget as HTMLAnchorElement).style.color = 'var(--accent)'; (e.currentTarget as HTMLAnchorElement).style.borderColor = 'var(--accent)'; }}
                onMouseOut={e => { (e.currentTarget as HTMLAnchorElement).style.color = 'var(--text-muted)'; (e.currentTarget as HTMLAnchorElement).style.borderColor = 'var(--border)'; }}
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2"/></svg>
              </a>
            </div>

            {/* Messages */}
            <div
              style={{ flex: 1, overflowY: 'auto', padding: 18, display: 'flex', flexDirection: 'column', gap: 8, background: dropOver ? 'rgba(0,117,222,0.03)' : 'var(--bg)', transition: 'background 150ms' }}
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
                const msgReactions: Record<string, string[]> = (msg as any).reactions ?? {};
                const reactionEntries = Object.entries(msgReactions).filter(([, uids]) => uids.length > 0);
                return (
                  <div key={msg.id} onMouseEnter={() => setHoveredMsg(msg.id)} onMouseLeave={() => setHoveredMsg(null)}
                    style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: isMe ? 'flex-end' : 'flex-start', maxWidth: '78%', alignSelf: isMe ? 'flex-end' : 'flex-start' }}>
                    {showSender && <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 3, paddingLeft: 4 }}>{msg.senderName}</div>}
                    {/* Hover reaction picker */}
                    {hoveredMsg === msg.id && (
                      <div style={{ position: 'absolute', [isMe ? 'right' : 'left']: 0, bottom: 'calc(100% + 2px)', display: 'flex', gap: 2, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, padding: '3px 5px', boxShadow: '0 2px 8px rgba(0,0,0,0.12)', zIndex: 10 }}>
                        {EMOJIS.map(emoji => (
                          <button key={emoji} onClick={() => toggleReaction(msg.id, emoji, employee.id, msgReactions[emoji] ?? [])}
                            style={{ fontSize: 15, background: 'none', border: 'none', cursor: 'pointer', padding: '2px 4px', borderRadius: 5, opacity: (msgReactions[emoji] ?? []).includes(employee.id) ? 1 : 0.55, transition: 'opacity 100ms' }}
                            onMouseOver={e => (e.currentTarget as HTMLButtonElement).style.opacity = '1'}
                            onMouseOut={e => (e.currentTarget as HTMLButtonElement).style.opacity = (msgReactions[emoji] ?? []).includes(employee.id) ? '1' : '0.55'}
                          >{emoji}</button>
                        ))}
                      </div>
                    )}
                    {att ? (
                      (() => {
                        const isImage = att.url && ['JPG','JPEG','PNG','GIF','WEBP','SVG'].includes(att.ext);
                        return isImage ? (
                          <a href={att.url} target="_blank" rel="noopener noreferrer" style={{ display: 'block', maxWidth: 220, borderRadius: 12, overflow: 'hidden', border: isMe ? 'none' : '1px solid var(--border)' }}>
                            <img src={att.url} alt={att.name} style={{ width: '100%', display: 'block', maxHeight: 200, objectFit: 'cover' }} />
                          </a>
                        ) : (
                          <div style={{ padding: '9px 12px', borderRadius: 12, background: isMe ? 'var(--accent)' : 'var(--surface)', border: isMe ? 'none' : '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 10, maxWidth: 240 }}>
                            <span style={{ width: 30, height: 30, borderRadius: 7, background: isMe ? 'rgba(255,255,255,0.15)' : 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'monospace', fontSize: 9, fontWeight: 700, color: isMe ? '#fff' : 'var(--text)', flexShrink: 0 }}>{att.ext}</span>
                            <span style={{ minWidth: 0, flex: 1 }}>
                              <span style={{ display: 'block', fontSize: 12, fontWeight: 500, color: isMe ? '#fff' : 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{att.name}</span>
                              <span style={{ display: 'block', fontSize: 10, color: isMe ? 'rgba(255,255,255,0.6)' : 'var(--text-muted)' }}>{att.size}</span>
                            </span>
                            {att.url && (
                              <a href={att.url} download={att.name} target="_blank" rel="noopener noreferrer" style={{ color: isMe ? 'rgba(255,255,255,0.7)' : 'var(--text-muted)', flexShrink: 0 }} title="Download">
                                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                              </a>
                            )}
                          </div>
                        );
                      })()
                    ) : (
                      <div style={{ padding: '9px 13px', borderRadius: 12, background: isMe ? 'var(--accent)' : 'var(--surface)', border: isMe ? 'none' : '1px solid var(--border)', color: isMe ? '#fff' : 'var(--text)', fontSize: 13, lineHeight: 1.5, borderBottomRightRadius: isMe ? 4 : 12, borderBottomLeftRadius: isMe ? 12 : 4 }}>
                        {renderContent(msg.content)}
                      </div>
                    )}
                    {/* Reactions row */}
                    {reactionEntries.length > 0 && (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 4 }}>
                        {reactionEntries.map(([emoji, uids]) => (
                          <button key={emoji} onClick={() => toggleReaction(msg.id, emoji, employee.id, uids)}
                            style={{ display: 'flex', alignItems: 'center', gap: 3, padding: '2px 7px', borderRadius: 99, background: uids.includes(employee.id) ? '#EFF6FF' : 'var(--surface)', border: `1px solid ${uids.includes(employee.id) ? 'var(--accent)' : 'var(--border)'}`, cursor: 'pointer', fontSize: 12, color: uids.includes(employee.id) ? 'var(--accent)' : 'var(--text-muted)', fontFamily: 'inherit' }}>
                            {emoji} <span style={{ fontSize: 11 }}>{uids.length}</span>
                          </button>
                        ))}
                      </div>
                    )}
                    <div style={{ fontSize: 10, color: 'var(--text-faint)', marginTop: 3, padding: '0 4px' }}>{fmtTime(msg.timestamp)}</div>
                  </div>
                );
              })}
              <div ref={bottomRef} />
            </div>

            {/* Input + @mention autocomplete wrapper */}
            <div style={{ position: 'relative', flexShrink: 0 }}>
              {showMentions && mentionResults.length > 0 && (
                <div style={{ position: 'absolute', bottom: '100%', left: 0, right: 0, marginBottom: 4, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, boxShadow: '0 4px 16px rgba(0,0,0,0.1)', zIndex: 20, overflow: 'hidden' }}>
                  {mentionResults.map(emp => (
                    <button key={emp.id} onMouseDown={e => { e.preventDefault(); insertMention(emp); }}
                      style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 9, padding: '8px 12px', border: 'none', background: 'transparent', cursor: 'pointer', textAlign: 'left' }}
                      onMouseOver={e => (e.currentTarget as HTMLButtonElement).style.background = 'var(--bg)'}
                      onMouseOut={e => (e.currentTarget as HTMLButtonElement).style.background = 'transparent'}
                    >
                      <div style={{ width: 26, height: 26, borderRadius: '50%', background: avatarColor(emp.name).bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 600, color: avatarColor(emp.name).fg, flexShrink: 0 }}>{initials(emp.name)}</div>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)' }}>{emp.name}</div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{emp.department}</div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            {/* Input */}
            <form onSubmit={handleSend} style={{ padding: '12px 14px', background: 'var(--surface)', borderTop: '1px solid var(--border)', display: 'flex', gap: 8, alignItems: 'center' }}>
              <input ref={fileRef} type="file" multiple onChange={e => { if (e.target.files?.[0]) { handleFile(e.target.files[0]); e.target.value = ''; } }} style={{ display: 'none' }} />
              <button type="button" onClick={() => fileRef.current?.click()} disabled={uploading} title="Upload a file"
                style={{ width: 40, height: 40, borderRadius: 8, background: 'var(--bg)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: uploading ? 'var(--accent)' : 'var(--text-muted)', flexShrink: 0, cursor: uploading ? 'wait' : 'pointer' }}
                onMouseOver={e => { if (!uploading) (e.currentTarget as HTMLButtonElement).style.color = 'var(--text)'; }}
                onMouseOut={e => { if (!uploading) (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-muted)'; }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/></svg>
              </button>
              <input type="text" value={text} onChange={e => handleTextChange(e.target.value)}
                placeholder={`Message ${selected.name.split(' ')[0]}… (type @ to mention)`}
                style={{ flex: 1, height: 40, padding: '0 14px', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 13, fontFamily: 'inherit', color: 'var(--text)', outline: 'none', minWidth: 0 }}
                onFocus={e => (e.target.style.borderColor = 'var(--accent)')}
                onBlur={e => { (e.target.style.borderColor = 'var(--border)'); setTimeout(() => setShowMentions(false), 150); }}
                onKeyDown={e => {
                  if (e.key === 'Escape') { setShowMentions(false); return; }
                  if (e.key === 'Enter' && !e.shiftKey && !showMentions) { e.preventDefault(); handleSend(); }
                }}
                disabled={sending}
              />
              <button type="submit" disabled={!text.trim() || sending}
                style={{ width: 40, height: 40, borderRadius: 8, background: 'var(--accent)', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', flexShrink: 0, cursor: text.trim() ? 'pointer' : 'not-allowed', opacity: text.trim() ? 1 : 0.5 }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
              </button>
            </form>
            </div>
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
