
import {
  LayoutDashboard, Users, CreditCard, DollarSign, Calendar, Dumbbell,
  Target, TrendingUp, MessageSquare, BarChart3, Wrench, Receipt,
  Settings, LogOut, CalendarDays, BookOpen
} from 'lucide-react';
import { useApp } from '../../store/useStore';

interface NavItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  badge?: number;
  section?: string;
}

const NAV_ITEMS: NavItem[] = [
  { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard size={18} />, section: 'MAIN' },
  { id: 'members', label: 'Members', icon: <Users size={18} />, section: 'MAIN' },
  { id: 'subscriptions', label: 'Subscriptions', icon: <CreditCard size={18} />, section: 'MAIN' },
  { id: 'payments', label: 'Payments', icon: <DollarSign size={18} />, section: 'MAIN' },
  { id: 'attendance', label: 'Attendance', icon: <Calendar size={18} />, section: 'OPERATIONS' },
  { id: 'trainers', label: 'Trainers', icon: <Dumbbell size={18} />, section: 'OPERATIONS' },
  { id: 'pt-sessions', label: 'PT Sessions', icon: <Target size={18} />, section: 'OPERATIONS' },
  { id: 'manager-calendar', label: 'Trainer Calendar', icon: <CalendarDays size={18} />, section: 'OPERATIONS' },
  { id: 'trainer-portal', label: 'Trainer Portal', icon: <BookOpen size={18} />, section: 'OPERATIONS' },
  { id: 'body-tracking', label: 'Body Tracking', icon: <TrendingUp size={18} />, section: 'OPERATIONS' },
  { id: 'enquiries', label: 'Enquiries', icon: <MessageSquare size={18} />, section: 'BUSINESS' },
  { id: 'reports', label: 'Reports', icon: <BarChart3 size={18} />, section: 'BUSINESS' },
  { id: 'equipment', label: 'Equipment', icon: <Wrench size={18} />, section: 'MANAGEMENT' },
  { id: 'expenses', label: 'Expenses', icon: <Receipt size={18} />, section: 'MANAGEMENT' },
  { id: 'settings', label: 'Settings', icon: <Settings size={18} />, section: 'MANAGEMENT' },
];

interface SidebarProps {
  activePage: string;
  onNavigate: (page: string) => void;
}

export default function Sidebar({ activePage, onNavigate }: SidebarProps) {
  const { notifications, logout, isSidebarOpen, toggleSidebar } = useApp();
  const unreadCount = notifications.filter(n => !n.read).length;
  const collapsed = false; // Forced expanded for the new premium layout



  return (
    <>
      {/* Mobile Overlay Background */}
      <div className={`sidebar-overlay ${isSidebarOpen ? 'open' : ''}`} onClick={toggleSidebar} />
      
      <nav className={`sidebar ${isSidebarOpen ? 'open' : ''} ${collapsed ? 'collapsed' : ''}`}>
        {/* Logo */}
      <div className="sidebar-logo pb-8" style={{ display: 'flex', justifyContent: 'center', width: '100%' }}>
        {!collapsed && (
          <div className="sidebar-logo-text w-full" style={{ textAlign: 'center' }}>
            <div className="sidebar-gym-name" style={{ textAlign: 'center', margin: '0 auto' }}>LOGO</div>
          </div>
        )}
      </div>

      {/* Navigation */}
      <div className="sidebar-nav">
        {NAV_ITEMS.map(item => (
          <button
            key={item.id}
            className={`nav-item ${activePage === item.id ? 'active' : ''}`}
            onClick={() => { 
              onNavigate(item.id); 
              if (isSidebarOpen) toggleSidebar(); 
            }}
            data-tooltip={collapsed ? item.label : undefined}
            style={{ justifyContent: collapsed ? 'center' : undefined }}
          >
            <span className="nav-icon">{item.icon}</span>
            {!collapsed && <span className="nav-label">{item.label}</span>}
            {!collapsed && item.id === 'communications' && unreadCount > 0 && (
              <span className="nav-badge">{unreadCount}</span>
            )}
          </button>
        ))}
      </div>

      {/* Footer / Logout */}
      <div className="sidebar-footer">
        <button className="logout-btn" onClick={logout}>
          <LogOut size={16} />
          {!collapsed && <span>LOGOUT</span>}
        </button>
      </div>
    </nav>
    </>
  );
}
