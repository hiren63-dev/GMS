import { useState, useEffect, useRef } from 'react';
import type { Employee } from '../types';

interface TopBarProps {
  title: string;
  subtitle?: string;
  darkMode: boolean;
  onToggleDark: () => void;
  employees: Employee[];
  onNavigateTo?: (page: string, id?: string) => void;
}

export default function TopBar({ title, subtitle, darkMode, onToggleDark, employees, onNavigateTo }: TopBarProps) {
  const [search, setSearch] = useState('');
  const [results, setResults] = useState<Employee[]>([]);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  useEffect(() => {
    if (!search.trim()) { setResults([]); setOpen(false); return; }
    const q = search.toLowerCase();
    setResults(employees.filter(e =>
      e.name.toLowerCase().includes(q) ||
      e.email.toLowerCase().includes(q) ||
      e.department.toLowerCase().includes(q)
    ).slice(0, 6));
    setOpen(true);
  }, [search, employees]);

  const now = new Date();
  const timeStr = now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
  const dateStr = now.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'short' });

  return (
    <header className="sticky top-0 z-30 flex items-center gap-4 px-6 py-3 border-b"
      style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}
    >
      {/* Title */}
      <div className="flex-1 min-w-0">
        <h1 className="text-lg font-bold truncate" style={{ color: 'var(--text)' }}>{title}</h1>
        {subtitle && <p className="text-xs truncate" style={{ color: 'var(--text-muted)' }}>{subtitle}</p>}
      </div>

      {/* Smart Search */}
      <div ref={ref} className="relative w-64">
        <div className="flex items-center gap-2 px-3 py-2 rounded-xl border text-sm"
          style={{ background: 'var(--surface2)', borderColor: 'var(--border)', color: 'var(--text-muted)' }}
        >
          <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search people, tasks…"
            className="bg-transparent outline-none flex-1 text-sm w-full placeholder-[var(--text-muted)]"
            style={{ color: 'var(--text)' }}
            onFocus={() => search && setOpen(true)}
          />
          {search && (
            <button onClick={() => { setSearch(''); setResults([]); setOpen(false); }}
              className="text-[var(--text-muted)] hover:text-[var(--text)]">✕</button>
          )}
        </div>

        {open && results.length > 0 && (
          <div className="absolute top-full left-0 right-0 mt-1 rounded-xl shadow-xl border z-50 overflow-hidden animate-scale-in"
            style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}
          >
            {results.map(emp => {
              const initials = emp.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
              const statusColor = { active: '#10B981', idle: '#F59E0B', blocked: '#EF4444', offline: '#94A3B8' }[emp.status ?? 'offline'];
              return (
                <button key={emp.id}
                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-[var(--surface2)] transition text-left"
                  onClick={() => { onNavigateTo?.('screentime', emp.id); setSearch(''); setOpen(false); }}
                >
                  <div className="relative">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-xs font-bold">
                      {initials}
                    </div>
                    <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-[var(--surface)]"
                      style={{ background: statusColor }} />
                  </div>
                  <div>
                    <p className="text-sm font-medium" style={{ color: 'var(--text)' }}>{emp.name}</p>
                    <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{emp.department} · {emp.role}</p>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Clock */}
      <div className="hidden md:block text-right text-xs" style={{ color: 'var(--text-muted)' }}>
        <div className="font-semibold" style={{ color: 'var(--text)' }}>{timeStr}</div>
        <div>{dateStr}</div>
      </div>

      {/* Dark mode toggle */}
      <button
        onClick={onToggleDark}
        className="p-2 rounded-lg border transition hover:scale-105"
        style={{ background: 'var(--surface2)', borderColor: 'var(--border)', color: 'var(--text)' }}
        title={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
      >
        {darkMode ? '☀️' : '🌙'}
      </button>
    </header>
  );
}
