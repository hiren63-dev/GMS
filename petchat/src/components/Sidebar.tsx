import { useState } from 'react';
import type { Employee } from '../types';

type Page =
  | 'dashboard' | 'founder' | 'team' | 'messages' | 'tasks'
  | 'time' | 'checkin' | 'announcements' | 'resources' | 'screentime'
  | 'admin' | 'admin-team' | 'admin-tasks' | 'admin-shifts' | 'admin-integrations';

interface SidebarProps {
  currentPage: Page;
  onNavigate: (page: Page) => void;
  employee: Employee;
  onSignOut: () => void;
  unreadCount?: number;
}

const NavItem = ({ icon, label, active, onClick, badge }: {
  icon: string; label: string; active: boolean; onClick: () => void; badge?: number;
}) => (
  <button
    onClick={onClick}
    className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 relative ${
      active
        ? 'bg-white/10 text-white'
        : 'text-[var(--sidebar-muted)] hover:text-[var(--sidebar-text)] hover:bg-white/5'
    }`}
  >
    <span className="text-base w-5 text-center">{icon}</span>
    <span>{label}</span>
    {badge != null && badge > 0 && (
      <span className="ml-auto bg-red-500 text-white text-xs font-bold rounded-full min-w-5 h-5 flex items-center justify-center px-1">
        {badge > 99 ? '99+' : badge}
      </span>
    )}
    {active && <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-blue-400 rounded-r-full" />}
  </button>
);

const SectionLabel = ({ label }: { label: string }) => (
  <div className="px-4 pt-4 pb-1">
    <p className="text-[10px] uppercase tracking-widest font-semibold text-[var(--sidebar-muted)]">{label}</p>
  </div>
);

export default function Sidebar({ currentPage, onNavigate, employee, onSignOut, unreadCount = 0 }: SidebarProps) {
  const isAdmin    = employee.role === 'admin' || employee.role === 'founder';
  const isFounder  = employee.role === 'founder';
  const initials   = employee.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

  const statusColor = {
    active: 'bg-green-400', idle: 'bg-yellow-400',
    blocked: 'bg-red-400',  offline: 'bg-gray-400',
  }[employee.status ?? 'offline'];

  return (
    <aside className="sidebar flex flex-col h-full select-none">
      {/* Brand */}
      <div className="flex items-center gap-3 px-4 py-5 border-b border-white/5">
        <div className="w-8 h-8 rounded-lg founder-gradient flex items-center justify-center text-white font-bold text-sm">B</div>
        <span className="text-white font-bold text-base tracking-tight">BuddyDesk</span>
      </div>

      {/* Nav */}
      <nav className="flex-1 py-3 px-2 space-y-0.5 overflow-y-auto">
        <SectionLabel label="Main" />
        {isFounder && (
          <NavItem icon="👑" label="Founder View" active={currentPage === 'founder'}   onClick={() => onNavigate('founder')} />
        )}
        <NavItem icon="🏠" label="Overview"     active={currentPage === 'dashboard'}    onClick={() => onNavigate('dashboard')} />
        <NavItem icon="👥" label="Team"         active={currentPage === 'team'}         onClick={() => onNavigate('team')} />
        <NavItem icon="💬" label="Messages"     active={currentPage === 'messages'}     onClick={() => onNavigate('messages')} badge={unreadCount} />
        <NavItem icon="📋" label="My Tasks"     active={currentPage === 'tasks'}        onClick={() => onNavigate('tasks')} />
        <NavItem icon="⏱️" label="Time Tracker" active={currentPage === 'time'}         onClick={() => onNavigate('time')} />
        <NavItem icon="✅" label="Daily Check‑In" active={currentPage === 'checkin'}   onClick={() => onNavigate('checkin')} />
        <NavItem icon="📢" label="Announcements" active={currentPage === 'announcements'} onClick={() => onNavigate('announcements')} />

        {isAdmin && (
          <>
            <SectionLabel label="Admin" />
            <NavItem icon="📊" label="Admin Overview"  active={currentPage === 'admin'}             onClick={() => onNavigate('admin')} />
            <NavItem icon="🧑‍🤝‍🧑" label="Team Mgmt"   active={currentPage === 'admin-team'}       onClick={() => onNavigate('admin-team')} />
            <NavItem icon="🎯" label="Assign Tasks"    active={currentPage === 'admin-tasks'}       onClick={() => onNavigate('admin-tasks')} />
            <NavItem icon="🕐" label="Shift Control"   active={currentPage === 'admin-shifts'}      onClick={() => onNavigate('admin-shifts')} />
            <NavItem icon="🔗" label="Integrations"   active={currentPage === 'admin-integrations'} onClick={() => onNavigate('admin-integrations')} />
            <NavItem icon="📦" label="Resources"      active={currentPage === 'resources'}          onClick={() => onNavigate('resources')} />
          </>
        )}
      </nav>

      {/* User footer */}
      <div className="p-3 border-t border-white/5">
        <div className="flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-white/5 transition cursor-pointer">
          <div className="relative">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-pink-500 to-purple-600 flex items-center justify-center text-white text-xs font-bold">
              {initials}
            </div>
            <span className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 ${statusColor} rounded-full border-2 border-[var(--sidebar-bg)]`} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white text-sm font-medium truncate">{employee.name}</p>
            <p className="text-[var(--sidebar-muted)] text-xs capitalize truncate">{employee.role} · {employee.department}</p>
          </div>
          <button
            onClick={onSignOut}
            className="text-[var(--sidebar-muted)] hover:text-red-400 transition p-1 rounded"
            title="Sign out"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
          </button>
        </div>
      </div>
    </aside>
  );
}

export type { Page };
