import { useState } from 'react';
import type { Employee } from '../types';

interface Props {
  employee: Employee;
  allEmployees: Employee[];
  onNavigate: (page: string, id?: string) => void;
}

const STATUS_LABELS = { active: 'Active', idle: 'Idle', blocked: 'Blocked', offline: 'Offline' };
const STATUS_COLORS = {
  active:  'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  idle:    'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  blocked: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  offline: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
};

export default function TeamDirectory({ employee, allEmployees, onNavigate }: Props) {
  const [search, setSearch]       = useState('');
  const [deptFilter, setDeptFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [layout, setLayout]       = useState<'grid' | 'list'>('grid');

  const departments = Array.from(new Set(allEmployees.map(e => e.department)));

  const filtered = allEmployees.filter(e => {
    const q = search.toLowerCase();
    const matchSearch = !q || e.name.toLowerCase().includes(q) || e.email.toLowerCase().includes(q) || e.department.toLowerCase().includes(q);
    const matchDept   = deptFilter === 'all' || e.department === deptFilter;
    const matchStatus = statusFilter === 'all' || (e.status ?? 'offline') === statusFilter;
    return matchSearch && matchDept && matchStatus;
  });

  const renderCard = (emp: Employee) => {
    const initials   = emp.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    const statusKey  = emp.status ?? 'offline';
    const ringClass  = { active: 'avatar-active', idle: 'avatar-idle', blocked: 'avatar-blocked', offline: 'avatar-offline' }[statusKey];
    const isMe       = emp.id === employee.id;

    if (layout === 'list') {
      return (
        <div key={emp.id}
          className="flex items-center gap-4 p-4 rounded-xl border transition hover:shadow-md cursor-pointer"
          style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}
          onClick={() => onNavigate('screentime', emp.id)}
        >
          <div className={`w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-sm font-bold flex-shrink-0 ${ringClass}`}>
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm truncate" style={{ color: 'var(--text)' }}>
              {emp.name}{isMe ? ' (You)' : ''}
            </p>
            <p className="text-xs truncate" style={{ color: 'var(--text-muted)' }}>{emp.email}</p>
          </div>
          <div className="flex items-center gap-3 flex-shrink-0">
            <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: 'var(--surface2)', color: 'var(--text-muted)' }}>{emp.department}</span>
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[statusKey]}`}>{STATUS_LABELS[statusKey]}</span>
            {!isMe && (
              <button onClick={e => { e.stopPropagation(); onNavigate('messages'); }}
                className="text-xs text-blue-500 hover:text-blue-600 font-medium">DM</button>
            )}
          </div>
        </div>
      );
    }

    return (
      <div key={emp.id}
        className="card p-5 flex flex-col items-center text-center transition hover:shadow-lg hover:-translate-y-1 cursor-pointer"
        onClick={() => onNavigate('screentime', emp.id)}
      >
        <div className={`w-14 h-14 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-lg font-bold mb-3 ${ringClass}`}>
          {initials}
        </div>
        <p className="font-semibold text-sm" style={{ color: 'var(--text)' }}>{emp.name}{isMe ? ' (You)' : ''}</p>
        <p className="text-xs mt-0.5 truncate max-w-full" style={{ color: 'var(--text-muted)' }}>{emp.department} · {emp.role}</p>
        <span className={`mt-2 text-xs px-2.5 py-0.5 rounded-full font-medium ${STATUS_COLORS[statusKey]}`}>
          {STATUS_LABELS[statusKey]}
        </span>
        {emp.shiftStart && (
          <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
            {emp.shiftStart} – {emp.shiftEnd ?? '?'}
          </p>
        )}
        {!isMe && (
          <button onClick={e => { e.stopPropagation(); onNavigate('messages'); }}
            className="mt-3 text-xs text-blue-500 hover:text-blue-600 font-medium border border-blue-200 dark:border-blue-800 px-3 py-1 rounded-lg transition">
            💬 Message
          </button>
        )}
      </div>
    );
  };

  return (
    <div className="p-6 space-y-5 animate-slide-in">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold" style={{ color: 'var(--text)' }}>👥 Team Directory</h2>
          <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>{allEmployees.length} members</p>
        </div>
        <div className="flex gap-1 p-1 rounded-lg" style={{ background: 'var(--surface2)' }}>
          <button onClick={() => setLayout('grid')}
            className={`p-2 rounded-md text-sm transition ${layout === 'grid' ? 'bg-white dark:bg-gray-700 shadow' : ''}`}
            style={{ color: layout === 'grid' ? 'var(--text)' : 'var(--text-muted)' }}>⊞</button>
          <button onClick={() => setLayout('list')}
            className={`p-2 rounded-md text-sm transition ${layout === 'list' ? 'bg-white dark:bg-gray-700 shadow' : ''}`}
            style={{ color: layout === 'list' ? 'var(--text)' : 'var(--text-muted)' }}>☰</button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <input value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Search by name, email, dept…"
          className="input flex-1 min-w-48" />
        <select value={deptFilter} onChange={e => setDeptFilter(e.target.value)} className="input">
          <option value="all">All Departments</option>
          {departments.map(d => <option key={d} value={d}>{d}</option>)}
        </select>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="input">
          <option value="all">All Statuses</option>
          <option value="active">Active</option>
          <option value="idle">Idle</option>
          <option value="blocked">Blocked</option>
          <option value="offline">Offline</option>
        </select>
      </div>

      {/* Status Legend */}
      <div className="flex flex-wrap gap-3">
        {Object.entries(STATUS_LABELS).map(([k, v]) => (
          <div key={k} className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--text-muted)' }}>
            <span className={`w-2 h-2 rounded-full ${
              k==='active'?'bg-green-400':k==='idle'?'bg-yellow-400':k==='blocked'?'bg-red-400':'bg-gray-400'}`} />
            {v}: {allEmployees.filter(e => (e.status ?? 'offline') === k).length}
          </div>
        ))}
      </div>

      {/* Results */}
      {filtered.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-4xl mb-3">🔍</p>
          <p className="font-medium" style={{ color: 'var(--text)' }}>No team members found</p>
        </div>
      ) : layout === 'grid' ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {filtered.map(renderCard)}
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(renderCard)}
        </div>
      )}
    </div>
  );
}
