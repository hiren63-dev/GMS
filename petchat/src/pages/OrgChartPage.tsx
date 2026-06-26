import { useState } from 'react';
import type { Employee } from '../types';

interface Props {
  employee: Employee;
  allEmployees: Employee[];
}

function EmployeeCard({ emp, isCurrentUser }: { emp: Employee; isCurrentUser: boolean }) {
  const initials = emp.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  const roleColor = emp.role === 'founder' ? { bg: '#F3E8FF', fg: '#7C3AED' } :
    emp.role === 'admin' ? { bg: '#EFF6FF', fg: '#2563EB' } : { bg: '#F3F3F2', fg: '#555' };
  return (
    <div style={{
      background: 'var(--surface)',
      border: isCurrentUser ? '2px solid #2563EB' : '1px solid var(--border)',
      borderRadius: 10,
      padding: '12px 14px',
      display: 'flex',
      alignItems: 'center',
      gap: 10,
      minWidth: 180,
      maxWidth: 220,
      boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
    }}>
      <div style={{ width: 34, height: 34, borderRadius: '50%', background: '#111', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 12, fontWeight: 700, flexShrink: 0 }}>
        {initials}
      </div>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{emp.name}</div>
        <div style={{ fontSize: 11, color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{emp.jobTitle || emp.department}</div>
        <span style={{ display: 'inline-block', marginTop: 2, padding: '1px 6px', background: roleColor.bg, color: roleColor.fg, borderRadius: 4, fontSize: 10, fontWeight: 500 }}>
          {emp.role.charAt(0).toUpperCase() + emp.role.slice(1)}
        </span>
      </div>
    </div>
  );
}

function OrgNode({ emp, reports, allEmployees, currentUserId, depth = 0 }: {
  emp: Employee;
  reports: Employee[];
  allEmployees: Employee[];
  currentUserId: string;
  depth?: number;
}) {
  const [collapsed, setCollapsed] = useState(false);
  const directReports = reports.filter(e => e.managerId === emp.id);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0 }}>
      {/* Node */}
      <div style={{ position: 'relative', cursor: directReports.length ? 'pointer' : 'default' }}
        onClick={() => directReports.length && setCollapsed(v => !v)}>
        <EmployeeCard emp={emp} isCurrentUser={emp.id === currentUserId} />
        {directReports.length > 0 && (
          <span style={{ position: 'absolute', top: -8, right: -8, width: 18, height: 18, background: '#2563EB', color: '#fff', borderRadius: '50%', fontSize: 10, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {collapsed ? '+' : '−'}
          </span>
        )}
      </div>

      {/* Children */}
      {!collapsed && directReports.length > 0 && (
        <>
          {/* Vertical line down */}
          <div style={{ width: 2, height: 20, background: 'var(--border)' }} />
          {/* Horizontal bar */}
          {directReports.length > 1 && (
            <div style={{ height: 2, background: 'var(--border)', width: `calc(${directReports.length} * 220px + ${(directReports.length - 1)} * 16px - 220px)`, maxWidth: '90vw' }} />
          )}
          <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
            {directReports.map(child => (
              <div key={child.id} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                {directReports.length > 1 && <div style={{ width: 2, height: 20, background: 'var(--border)' }} />}
                <OrgNode emp={child} reports={reports} allEmployees={allEmployees} currentUserId={currentUserId} depth={depth + 1} />
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

export default function OrgChartPage({ employee, allEmployees }: Props) {
  const [search, setSearch] = useState('');
  const [dept, setDept] = useState('all');

  const departments = ['all', ...Array.from(new Set(allEmployees.map(e => e.department).filter(Boolean)))];

  // Find roots: employees with no managerId, or managerId points to nobody
  const empIds = new Set(allEmployees.map(e => e.id));
  const roots = allEmployees.filter(e => !e.managerId || !empIds.has(e.managerId));

  const filtered = search || dept !== 'all'
    ? allEmployees.filter(e =>
        (dept === 'all' || e.department === dept) &&
        (!search || e.name.toLowerCase().includes(search.toLowerCase()) || (e.jobTitle || '').toLowerCase().includes(search.toLowerCase()))
      )
    : null;

  return (
    <div className="p-6 animate-slide-in" style={{ minHeight: '100%' }}>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-bold" style={{ color: 'var(--text)' }}>🏢 Org Chart</h2>
          <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>{allEmployees.length} team member{allEmployees.length !== 1 ? 's' : ''}</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search name or title…"
            className="input"
            style={{ width: 200 }}
          />
          <select value={dept} onChange={e => setDept(e.target.value)} className="input">
            {departments.map(d => <option key={d} value={d}>{d === 'all' ? 'All departments' : d}</option>)}
          </select>
        </div>
      </div>

      {filtered ? (
        /* Flat list view when searching/filtering */
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
          {filtered.length === 0 ? (
            <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>No results found.</p>
          ) : (
            filtered.map(e => <EmployeeCard key={e.id} emp={e} isCurrentUser={e.id === employee.id} />)
          )}
        </div>
      ) : (
        /* Tree view */
        <div style={{ overflowX: 'auto', paddingBottom: 32 }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0, minWidth: 'max-content' }}>
            {roots.map((root, i) => (
              <div key={root.id} style={{ marginBottom: i < roots.length - 1 ? 32 : 0 }}>
                <OrgNode emp={root} reports={allEmployees} allEmployees={allEmployees} currentUserId={employee.id} />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Legend */}
      <div className="flex gap-4 mt-8 flex-wrap" style={{ borderTop: '1px solid var(--border)', paddingTop: 16 }}>
        <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
          <span style={{ display: 'inline-block', width: 10, height: 10, borderRadius: '50%', background: '#7C3AED', marginRight: 4 }} />Founder
        </span>
        <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
          <span style={{ display: 'inline-block', width: 10, height: 10, borderRadius: '50%', background: '#2563EB', marginRight: 4 }} />Admin
        </span>
        <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
          <span style={{ display: 'inline-block', width: 10, height: 10, borderRadius: '50%', background: '#555', marginRight: 4 }} />Employee
        </span>
        <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>· Click a node to expand/collapse direct reports</span>
      </div>
    </div>
  );
}
