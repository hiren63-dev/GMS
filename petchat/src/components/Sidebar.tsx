import type { Employee } from '../types';

type Page =
  | 'dashboard' | 'founder' | 'team' | 'team-board' | 'messages' | 'tasks' | 'groups'
  | 'time' | 'announcements' | 'resources' | 'screentime'
  | 'org-chart' | 'one-on-one'
  | 'admin' | 'admin-team' | 'admin-tasks' | 'admin-shifts' | 'admin-integrations' | 'admin-health';

interface SidebarProps {
  currentPage: Page;
  onNavigate: (page: Page) => void;
  employee: Employee;
  onSignOut: () => void;
  unreadCount?: number;
}

const NavBtn = ({ icon, label, active, onClick, badge }: {
  icon: React.ReactNode; label: string; active: boolean; onClick: () => void; badge?: number;
}) => (
  <button
    onClick={onClick}
    className={`nav-btn ${active ? 'active' : ''}`}
  >
    {icon}
    <span className="flex-1">{label}</span>
    {badge != null && badge > 0 && (
      <span style={{ background: 'var(--accent)', color: '#fff', borderRadius: 99, fontSize: 10, fontWeight: 600, padding: '1px 6px', minWidth: 18, textAlign: 'center' }}>
        {badge > 99 ? '99+' : badge}
      </span>
    )}
  </button>
);

const Icon = ({ path, viewBox = '0 0 24 24' }: { path: string; viewBox?: string }) => (
  <svg width="15" height="15" viewBox={viewBox} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d={path} />
  </svg>
);

export default function Sidebar({ currentPage, onNavigate, employee, onSignOut, unreadCount = 0 }: SidebarProps) {
  const isAdmin   = employee.role === 'admin' || employee.role === 'founder';
  const isFounder = employee.role === 'founder';
  const perms     = employee.permissions ?? [];
  const isTeamLead = !isAdmin && perms.length > 0;
  const initials  = employee.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

  const roleBadge = { founder: { bg: 'rgba(33,49,131,0.08)', fg: '#213183' }, admin: { bg: 'rgba(0,117,222,0.08)', fg: 'var(--accent)' }, employee: { bg: 'rgba(var(--text-rgb),0.06)', fg: 'var(--text-muted)' } }[employee.role];

  return (
    <aside className="sidebar select-none">
      {/* Brand + role */}
      <div style={{ padding: '20px 16px 12px', borderBottom: '1px solid var(--sidebar-border)', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 10 }}>
          <div style={{ width: 28, height: 28, background: 'var(--text)', borderRadius: 7, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--surface)', fontSize: 13, fontWeight: 700, flexShrink: 0 }}>Z</div>
          <span style={{ fontSize: 15, fontWeight: 600, color: 'var(--text)', letterSpacing: '-0.01em' }}>Zypit</span>
        </div>
        <span style={{ display: 'inline-block', padding: '2px 8px', background: roleBadge.bg, borderRadius: 5, fontSize: 11, fontWeight: 500, color: roleBadge.fg }}>
          {employee.role.charAt(0).toUpperCase() + employee.role.slice(1)}
        </span>
      </div>

      {/* Navigation */}
      <nav style={{ padding: '10px 8px', display: 'flex', flexDirection: 'column', gap: 1, flex: 1, overflowY: 'auto' }}>
        {isFounder && (
          <NavBtn active={currentPage === 'founder'} onClick={() => onNavigate('founder')} label="Dashboard" icon={
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 13h2l3 7 4-16 3 9h6"/></svg>
          } />
        )}
        {!isFounder && (
          <NavBtn active={currentPage === 'dashboard'} onClick={() => onNavigate('dashboard')} label="Dashboard" icon={
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>
          } />
        )}
        <NavBtn active={currentPage === 'messages'} onClick={() => onNavigate('messages')} label="Messages" badge={unreadCount} icon={
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
        } />
        <NavBtn active={currentPage === 'groups'} onClick={() => onNavigate('groups')} label="Groups" icon={
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/><line x1="19" y1="8" x2="23" y2="8"/></svg>
        } />
        <NavBtn active={currentPage === 'tasks'} onClick={() => onNavigate('tasks')} label="My Tasks" icon={
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>
        } />
        <NavBtn active={currentPage === 'team-board'} onClick={() => onNavigate('team-board')} label="Team Board" icon={
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M9 3v18"/><path d="M15 3v18"/></svg>
        } />
        <NavBtn active={currentPage === 'team'} onClick={() => onNavigate('team')} label="Team" icon={
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
        } />
        <NavBtn active={currentPage === 'org-chart'} onClick={() => onNavigate('org-chart')} label="Org Chart" icon={
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="8" y="2" width="8" height="4" rx="1"/><rect x="1" y="18" width="6" height="4" rx="1"/><rect x="9" y="18" width="6" height="4" rx="1"/><rect x="17" y="18" width="6" height="4" rx="1"/><path d="M4 18v-3h16v3"/><path d="M12 6v9"/></svg>
        } />
        <NavBtn active={currentPage === 'announcements'} onClick={() => onNavigate('announcements')} label="Announcements" icon={
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 11l18-5v12L3 14v-3z"/><path d="M11.6 16.8a3 3 0 1 1-5.8-1.6"/></svg>
        } />
        <NavBtn active={currentPage === 'time'} onClick={() => onNavigate('time')} label="Time Tracker" icon={
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
        } />
        <NavBtn active={currentPage === 'resources'} onClick={() => onNavigate('resources')} label="Resources" icon={
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>
        } />

        {isTeamLead && (
          <>
            <div style={{ margin: '8px 2px 4px', fontSize: 10, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-faint)', padding: '0 8px' }}>Team Lead</div>
            {perms.includes('view_reports') && (
              <NavBtn active={currentPage === 'admin'} onClick={() => onNavigate('admin')} label="Overview" icon={
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>
              } />
            )}
            {perms.includes('assign_tasks') && (
              <NavBtn active={currentPage === 'admin-tasks'} onClick={() => onNavigate('admin-tasks')} label="Assign Tasks" icon={
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><polyline points="3 6 4 7 6 5"/><polyline points="3 12 4 13 6 11"/><polyline points="3 18 4 19 6 17"/></svg>
              } />
            )}
            {perms.includes('manage_shifts') && (
              <NavBtn active={currentPage === 'admin-shifts'} onClick={() => onNavigate('admin-shifts')} label="Shift Control" icon={
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
              } />
            )}
            {perms.includes('view_reports') && (
              <NavBtn active={currentPage === 'admin-health'} onClick={() => onNavigate('admin-health')} label="System Health" icon={
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
              } />
            )}
          </>
        )}

        {isAdmin && (
          <>
            <div style={{ margin: '8px 2px 4px', fontSize: 10, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-faint)', padding: '0 8px' }}>Admin</div>
            <NavBtn active={currentPage === 'admin'} onClick={() => onNavigate('admin')} label="Overview" icon={
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>
            } />
            <NavBtn active={currentPage === 'admin-team'} onClick={() => onNavigate('admin-team')} label="Team" icon={
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
            } />
            <NavBtn active={currentPage === 'one-on-one'} onClick={() => onNavigate('one-on-one')} label="1-on-1 Notes" icon={
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M14 15h2a2 2 0 0 1 2 2v2"/><line x1="18" y1="8" x2="22" y2="8"/><line x1="20" y1="6" x2="20" y2="10"/></svg>
            } />
            <NavBtn active={currentPage === 'admin-tasks'} onClick={() => onNavigate('admin-tasks')} label="Assign Tasks" icon={
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><polyline points="3 6 4 7 6 5"/><polyline points="3 12 4 13 6 11"/><polyline points="3 18 4 19 6 17"/></svg>
            } />
            <NavBtn active={currentPage === 'admin-shifts'} onClick={() => onNavigate('admin-shifts')} label="Shift Control" icon={
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
            } />
            <NavBtn active={currentPage === 'admin-integrations'} onClick={() => onNavigate('admin-integrations')} label="Integrations" icon={
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
            } />
            <NavBtn active={currentPage === 'admin-health'} onClick={() => onNavigate('admin-health')} label="System Health" icon={
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
            } />
          </>
        )}
      </nav>

      {/* User footer */}
      <div style={{ flexShrink: 0, padding: '10px 10px 14px', borderTop: '1px solid var(--sidebar-border)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px', borderRadius: 8, marginBottom: 6 }}>
          <div style={{ width: 30, height: 30, borderRadius: '50%', background: 'var(--text)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--surface)', fontSize: 11, fontWeight: 600, flexShrink: 0 }}>
            {initials}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{employee.name}</div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{employee.department}</div>
          </div>
        </div>
        <button
          onClick={onSignOut}
          style={{ width: '100%', height: 34, background: 'transparent', border: '1px solid var(--border)', borderRadius: 7, fontSize: 12, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, transition: 'all 150ms' }}
          onMouseOver={e => { (e.currentTarget as HTMLButtonElement).style.background = 'var(--bg)'; (e.currentTarget as HTMLButtonElement).style.color = 'var(--text)'; }}
          onMouseOut={e => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-muted)'; }}
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
          Sign out
        </button>
      </div>
    </aside>
  );
}

export type { Page };
