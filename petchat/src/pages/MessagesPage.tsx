import { useState, useEffect, useRef } from 'react';
import type { Employee, Message } from '../types';
import { sendMessage, onMessagesChange, getConversationPartners } from '../services/firebase';

interface Props {
  employee: Employee;
  allEmployees: Employee[];
}

export default function MessagesPage({ employee, allEmployees }: Props) {
  const [contacts, setContacts]     = useState<Employee[]>([]);
  const [selected, setSelected]     = useState<Employee | null>(null);
  const [messages, setMessages]     = useState<Message[]>([]);
  const [text, setText]             = useState('');
  const [sending, setSending]       = useState(false);
  const [searchNew, setSearchNew]   = useState('');
  const [showNew, setShowNew]       = useState(false);
  const bottomRef                   = useRef<HTMLDivElement>(null);

  useEffect(() => {
    getConversationPartners(employee.id, allEmployees).then(partners => {
      setContacts(partners);
      if (partners.length > 0 && !selected) setSelected(partners[0]);
    });
  }, [allEmployees, employee.id]);

  useEffect(() => {
    if (!selected) return;
    const unsub = onMessagesChange(employee.id, selected.id, setMessages);
    return unsub;
  }, [selected, employee.id]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    if (!text.trim() || !selected || sending) return;
    setSending(true);
    const msg = text.trim();
    setText('');
    await sendMessage({
      senderId: employee.id, senderName: employee.name,
      recipientId: selected.id, content: msg, isGroupChat: false,
    });
    if (!contacts.find(c => c.id === selected.id)) {
      setContacts(prev => [selected, ...prev]);
    }
    setSending(false);
  };

  const handleNewChat = (emp: Employee) => {
    if (!contacts.find(c => c.id === emp.id)) setContacts(prev => [emp, ...prev]);
    setSelected(emp); setShowNew(false); setSearchNew('');
  };

  const newChatResults = allEmployees.filter(e =>
    e.id !== employee.id &&
    (searchNew === '' || e.name.toLowerCase().includes(searchNew.toLowerCase()))
  );

  const renderAvatar = (emp: Employee, size = 'w-10 h-10') => {
    const initials = emp.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    const ring = { active: 'avatar-active', idle: 'avatar-idle', blocked: 'avatar-blocked', offline: 'avatar-offline' }[emp.status ?? 'offline'];
    return (
      <div className={`${size} rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-sm font-bold flex-shrink-0 ${ring}`}>
        {initials}
      </div>
    );
  };

  return (
    <div className="flex h-full" style={{ height: 'calc(100vh - 57px)' }}>
      {/* Sidebar: contacts */}
      <div className="w-72 flex-shrink-0 border-r flex flex-col" style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
        <div className="p-4 border-b" style={{ borderColor: 'var(--border)' }}>
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-bold" style={{ color: 'var(--text)' }}>Messages</h3>
            <button onClick={() => setShowNew(v => !v)}
              className="w-8 h-8 rounded-lg bg-blue-500 hover:bg-blue-600 text-white flex items-center justify-center text-lg transition">+</button>
          </div>

          {showNew && (
            <div className="mt-2">
              <input value={searchNew} onChange={e => setSearchNew(e.target.value)}
                placeholder="Find a teammate…"
                className="input w-full text-sm" />
              <div className="mt-1 max-h-48 overflow-y-auto rounded-lg border" style={{ borderColor: 'var(--border)', background: 'var(--surface2)' }}>
                {newChatResults.map(emp => (
                  <button key={emp.id} onClick={() => handleNewChat(emp)}
                    className="w-full flex items-center gap-2 px-3 py-2 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition text-left">
                    {renderAvatar(emp, 'w-7 h-7')}
                    <div>
                      <p className="text-sm font-medium" style={{ color: 'var(--text)' }}>{emp.name}</p>
                      <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{emp.department}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="flex-1 overflow-y-auto">
          {contacts.length === 0 ? (
            <div className="p-4 text-center">
              <p className="text-sm" style={{ color: 'var(--text-muted)' }}>No conversations yet.</p>
              <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>Click + to start one</p>
            </div>
          ) : (
            contacts.map(c => (
              <button key={c.id}
                onClick={() => setSelected(c)}
                className={`w-full flex items-center gap-3 px-4 py-3 transition text-left ${
                  selected?.id === c.id ? 'bg-blue-50 dark:bg-blue-900/20' : 'hover:bg-gray-50 dark:hover:bg-white/5'
                }`}
              >
                {renderAvatar(c)}
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate" style={{ color: 'var(--text)' }}>{c.name}</p>
                  <p className="text-xs truncate" style={{ color: 'var(--text-muted)' }}>{c.department} · {c.status ?? 'offline'}</p>
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Chat area */}
      {selected ? (
        <div className="flex-1 flex flex-col min-w-0">
          {/* Chat header */}
          <div className="flex items-center gap-3 px-5 py-3 border-b" style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
            {renderAvatar(selected)}
            <div>
              <p className="font-semibold" style={{ color: 'var(--text)' }}>{selected.name}</p>
              <p className="text-xs capitalize" style={{ color: 'var(--text-muted)' }}>{selected.status ?? 'offline'} · {selected.department}</p>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3" style={{ background: 'var(--bg)' }}>
            {messages.length === 0 && (
              <div className="text-center py-12">
                <p className="text-4xl mb-3">💬</p>
                <p className="font-medium" style={{ color: 'var(--text)' }}>Start the conversation!</p>
                <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>Say hi to {selected.name.split(' ')[0]}</p>
              </div>
            )}
            {messages.map(msg => {
              const isMe = msg.senderId === employee.id;
              const time = new Date(msg.timestamp).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
              return (
                <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[70%] ${isMe ? 'items-end' : 'items-start'} flex flex-col gap-1`}>
                    <div className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed break-words ${
                      isMe
                        ? 'bg-blue-500 text-white rounded-br-sm'
                        : 'rounded-bl-sm'
                    }`} style={isMe ? {} : { background: 'var(--surface)', color: 'var(--text)', border: '1px solid var(--border)' }}>
                      {msg.content}
                    </div>
                    <p className="text-xs px-1" style={{ color: 'var(--text-muted)' }}>{time}</p>
                  </div>
                </div>
              );
            })}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div className="p-4 border-t flex gap-3" style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
            <input
              value={text}
              onChange={e => setText(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
              placeholder={`Message ${selected.name.split(' ')[0]}…`}
              className="input flex-1"
              disabled={sending}
            />
            <button
              onClick={handleSend}
              disabled={!text.trim() || sending}
              className="px-5 py-2 rounded-xl bg-blue-500 hover:bg-blue-600 disabled:opacity-50 text-white font-medium text-sm transition"
            >
              Send ↑
            </button>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center" style={{ background: 'var(--bg)' }}>
          <div className="text-center">
            <p className="text-5xl mb-4">💬</p>
            <p className="font-semibold text-lg" style={{ color: 'var(--text)' }}>Select a conversation</p>
            <p className="text-sm mt-2" style={{ color: 'var(--text-muted)' }}>or click + to start a new one</p>
          </div>
        </div>
      )}
    </div>
  );
}
