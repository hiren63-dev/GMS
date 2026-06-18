import { useState, useEffect, useRef } from 'react';
import type { Employee } from '../types';

interface TopBarProps {
  darkMode: boolean;
  onToggleDark: () => void;
  employees: Employee[];
  currentEmployee: Employee;
  onNavigateTo?: (page: string, id?: string) => void;
}

export default function TopBar({ darkMode, onToggleDark, employees, currentEmployee, onNavigateTo }: TopBarProps) {
  const [search, setSearch]           = useState('');
  const [results, setResults]         = useState<Employee[]>([]);
  const [searchOpen, setSearchOpen]   = useState(false);
  const [aiText, setAiText]           = useState('');
  const [aiCounting, setAiCounting]   = useState(false);
  const [aiCountdown, setAiCountdown] = useState(4);
  const [aiResponse, setAiResponse]   = useState('');
  const [showQA, setShowQA]           = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const qaRef     = useRef<HTMLDivElement>(null);
  const timerRef  = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) setSearchOpen(false);
      if (qaRef.current && !qaRef.current.contains(e.target as Node)) setShowQA(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  useEffect(() => {
    if (!search.trim()) { setResults([]); setSearchOpen(false); return; }
    const q = search.toLowerCase();
    setResults(employees.filter(e =>
      e.name.toLowerCase().includes(q) ||
      e.email.toLowerCase().includes(q) ||
      e.department.toLowerCase().includes(q)
    ).slice(0, 6));
    setSearchOpen(true);
  }, [search, employees]);

  const startAi = (e: React.FormEvent) => {
    e.preventDefault();
    if (!aiText.trim() || aiCounting) return;
    setAiCounting(true);
    setAiCountdown(4);
    timerRef.current = setInterval(() => {
      setAiCountdown(prev => {
        if (prev <= 1) {
          clearInterval(timerRef.current!);
          setAiCounting(false);
          setAiResponse(`Got it! Processing: "${aiText}"`);
          setAiText('');
          setTimeout(() => setAiResponse(''), 3000);
          return 4;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const cancelAi = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    setAiCounting(false);
    setAiCountdown(4);
  };

  const ringDash = `${((aiCountdown / 4) * 44).toFixed(1)} 44`;

  const quickActions = [
    { label: 'New Task', glyph: '＋', page: 'tasks' as const },
    { label: 'Send Message', glyph: '✉', page: 'messages' as const },
    { label: 'Post Announcement', glyph: '📢', page: 'announcements' as const },
    { label: 'Check-In', glyph: '✓', page: 'checkin' as const },
    { label: 'Team Directory', glyph: '👥', page: 'team' as const },
    { label: 'Resources', glyph: '📁', page: 'resources' as const },
  ];

  return (
    <header style={{ height: 58, background: 'var(--surface)', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 12, padding: '0 18px', flexShrink: 0, position: 'relative', zIndex: 60 }}>

      {/* Search */}
      <div ref={searchRef} style={{ position: 'relative', width: 260, flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 12px' }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--text-faint)" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            onFocus={() => search && setSearchOpen(true)}
            placeholder="Search people, tasks…"
            style={{ flex: 1, border: 'none', background: 'transparent', fontSize: 13, fontFamily: 'inherit', color: 'var(--text)', outline: 'none', minWidth: 0 }}
          />
          <span style={{ fontSize: 10, color: 'var(--text-faint)', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 4, padding: '1px 5px', flexShrink: 0 }}>⌘K</span>
        </div>
        {searchOpen && results.length > 0 && (
          <div style={{ position: 'absolute', top: 46, left: 0, width: 340, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, boxShadow: '0 12px 40px rgba(0,0,0,0.12)', padding: 6, zIndex: 200 }} className="animate-scale-in">
            {results.map(emp => {
              const initials = emp.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
              return (
                <div key={emp.id}
                  onMouseDown={() => { onNavigateTo?.('screentime', emp.id); setSearch(''); setSearchOpen(false); }}
                  style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', borderRadius: 7, cursor: 'pointer' }}
                  onMouseOver={e => (e.currentTarget as HTMLElement).style.background = 'var(--bg)'}
                  onMouseOut={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}
                >
                  <span style={{ width: 42, flexShrink: 0, fontSize: 9, fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase', color: '#888' }}>Person</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{emp.name}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{emp.department} · {emp.role}</div>
                  </div>
                  <div style={{ width: 28, height: 28, borderRadius: '50%', background: '#111', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 600, color: '#fff', flexShrink: 0 }}>{initials}</div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* AI Command Bar */}
      <form onSubmit={startAi} style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 8, maxWidth: 500 }}>
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 8, background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 12px', minWidth: 0 }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#7C5CFC" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3l1.9 4.6L18.5 9l-3.6 3 1.1 4.8L12 14.5 7.9 16.8 9 12 5.5 9l4.6-1.4z"/></svg>
          <input
            type="text"
            value={aiText}
            onChange={e => setAiText(e.target.value)}
            placeholder={aiResponse || 'Ask AI… e.g. "Summarize today\'s tasks"'}
            style={{ flex: 1, border: 'none', background: 'transparent', fontSize: 13, fontFamily: 'inherit', color: 'var(--text)', outline: 'none', minWidth: 0 }}
          />
        </div>
        {!aiCounting ? (
          <button type="submit" style={{ height: 38, padding: '0 18px', background: '#111', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 500, flexShrink: 0, transition: 'background 150ms', cursor: 'pointer' }}
            onMouseOver={e => (e.currentTarget as HTMLButtonElement).style.background = '#333'}
            onMouseOut={e => (e.currentTarget as HTMLButtonElement).style.background = '#111'}>
            Send
          </button>
        ) : (
          <button type="button" onClick={cancelAi} style={{ height: 38, padding: '0 16px', background: '#FEF2F2', color: '#DC2626', border: '1px solid #FECACA', borderRadius: 8, fontSize: 13, fontWeight: 600, flexShrink: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ position: 'relative', width: 18, height: 18, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="18" height="18" viewBox="0 0 18 18" style={{ transform: 'rotate(-90deg)' }}>
                <circle cx="9" cy="9" r="7" fill="none" stroke="#FECACA" strokeWidth="2"/>
                <circle cx="9" cy="9" r="7" fill="none" stroke="#DC2626" strokeWidth="2" strokeLinecap="round" strokeDasharray={ringDash} style={{ transition: 'stroke-dasharray 1s linear' }}/>
              </svg>
            </span>
            Cancel · {aiCountdown}s
          </button>
        )}
      </form>

      {/* Quick Actions */}
      <div ref={qaRef} style={{ position: 'relative', flexShrink: 0 }}>
        <button
          onClick={() => setShowQA(v => !v)}
          style={{ height: 38, padding: '0 14px', background: showQA ? 'var(--bg)' : 'var(--surface)', color: 'var(--text-muted)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 13, fontWeight: 500, display: 'flex', alignItems: 'center', gap: 7 }}
          onMouseOver={e => (e.currentTarget as HTMLButtonElement).style.background = 'var(--bg)'}
          onMouseOut={e => { if (!showQA) (e.currentTarget as HTMLButtonElement).style.background = 'var(--surface)'; }}
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
          Quick actions
        </button>
        {showQA && (
          <div style={{ position: 'absolute', top: 46, right: 0, width: 220, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, boxShadow: '0 12px 40px rgba(0,0,0,0.12)', padding: 6, zIndex: 200 }} className="animate-scale-in">
            <div style={{ padding: '5px 10px 4px', fontSize: 10, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-faint)' }}>Actions</div>
            {quickActions.map(qa => (
              <button key={qa.page} onClick={() => { onNavigateTo?.(qa.page); setShowQA(false); }}
                style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', border: 'none', background: 'transparent', borderRadius: 7, fontSize: 13, fontWeight: 500, color: 'var(--text)', textAlign: 'left', cursor: 'pointer' }}
                onMouseOver={e => (e.currentTarget as HTMLButtonElement).style.background = 'var(--bg)'}
                onMouseOut={e => (e.currentTarget as HTMLButtonElement).style.background = 'transparent'}
              >
                <span style={{ width: 24, height: 24, borderRadius: 6, background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, flexShrink: 0 }}>{qa.glyph}</span>
                {qa.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Dark mode */}
      <button onClick={onToggleDark} title="Toggle theme"
        style={{ width: 38, height: 38, borderRadius: 8, background: 'var(--bg)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', flexShrink: 0 }}>
        {darkMode ? (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.2" y1="4.2" x2="5.6" y2="5.6"/><line x1="18.4" y1="18.4" x2="19.8" y2="19.8"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.2" y1="19.8" x2="5.6" y2="18.4"/><line x1="18.4" y1="5.6" x2="19.8" y2="4.2"/></svg>
        ) : (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
        )}
      </button>
    </header>
  );
}
