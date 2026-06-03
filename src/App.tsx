import { useState } from 'react';
import { AppProvider, useApp } from './store/useStore';
import Login from './pages/Login';
import Sidebar from './components/layout/Sidebar';
import Header from './components/layout/Header';
import ToastContainer from './components/ui/Toast';
import type { UserRole } from './types';

// Pages
import Dashboard from './pages/Dashboard';
import Members from './pages/Members';
import Subscriptions from './pages/Subscriptions';
import Payments from './pages/Payments';
import Attendance from './pages/Attendance';
import Trainers from './pages/Trainers';
import Enquiries from './pages/Enquiries';
import Reports from './pages/Reports';
import Settings from './pages/Settings';
import Equipment from './pages/Equipment';
import Expenses from './pages/Expenses';
import BodyTracking from './pages/BodyTracking';
import PTSessions from './pages/PTSessions';
import ManagerCalendar from './pages/ManagerCalendar';
import TrainerPortal from './pages/TrainerPortal';

// Page metadata for header titles
const PAGE_NAMES: Record<string, string> = {
  dashboard: 'Dashboard',
  members: 'Members',
  subscriptions: 'Subscriptions',
  payments: 'Payments',
  attendance: 'Attendance',
  trainers: 'Trainers',
  'pt-sessions': 'PT Sessions',
  'manager-calendar': 'Trainer Calendar',
  'trainer-portal': 'Trainer Portal',
  'body-tracking': 'Body Tracking',
  enquiries: 'Enquiries & Leads',
  reports: 'Reports',
  equipment: 'Equipment',
  expenses: 'Expenses',
  settings: 'Settings',
};

// Role-based access control — '*' means all pages accessible
const ALLOWED_PAGES: Record<UserRole, string[] | '*'> = {
  Owner: '*',
  Manager: ['dashboard', 'members', 'subscriptions', 'payments', 'attendance', 'trainers', 'pt-sessions', 'manager-calendar', 'body-tracking', 'enquiries', 'reports', 'equipment', 'expenses', 'settings'],
  Trainer: ['dashboard', 'trainer-portal', 'pt-sessions', 'body-tracking', 'attendance', 'manager-calendar'],
  Receptionist: ['dashboard', 'members', 'subscriptions', 'payments', 'attendance', 'enquiries'],
};

function canAccess(role: UserRole, page: string): boolean {
  const allowed = ALLOWED_PAGES[role];
  if (allowed === '*') return true;
  return allowed.includes(page);
}

function AccessDenied() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 80, gap: 16, textAlign: 'center' }}>
      <div style={{ fontSize: 48 }}>🔒</div>
      <h2 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-primary)' }}>Access Restricted</h2>
      <p style={{ color: 'var(--text-secondary)', fontSize: 14 }}>You don't have permission to view this page.<br />Contact your gym owner to request access.</p>
    </div>
  );
}

function AppContent() {
  const { isAuthenticated, currentUser } = useApp();
  const [activePage, setActivePage] = useState('dashboard');

  if (!isAuthenticated) {
    return (
      <>
        <Login />
        <ToastContainer />
      </>
    );
  }

  const role = currentUser?.role ?? 'Receptionist';

  const renderPage = () => {
    if (!canAccess(role, activePage)) return <AccessDenied />;
    switch (activePage) {
      case 'dashboard': return <Dashboard />;
      case 'members': return <Members />;
      case 'subscriptions': return <Subscriptions />;
      case 'payments': return <Payments />;
      case 'attendance': return <Attendance />;
      case 'trainers': return <Trainers />;
      case 'pt-sessions': return <PTSessions />;
      case 'manager-calendar': return <ManagerCalendar />;
      case 'trainer-portal': return <TrainerPortal />;
      case 'body-tracking': return <BodyTracking />;
      case 'enquiries': return <Enquiries />;
      case 'reports': return <Reports />;
      case 'equipment': return <Equipment />;
      case 'expenses': return <Expenses />;
      case 'settings': return <Settings />;
      default: return <Dashboard />;
    }
  };

  return (
    <div className="app-layout">
      {/* Animated Background */}
      <div className="bg-blobs">
        <div className="blob blob-1" />
        <div className="blob blob-2" />
        <div className="blob blob-3" />
      </div>

      {/* Sidebar */}
      <Sidebar activePage={activePage} onNavigate={setActivePage} />

      {/* Main Content */}
      <div className="main-wrapper">
        <Header pageName={PAGE_NAMES[activePage] ?? 'Dashboard'} />
        <main className="page-content">
          {renderPage()}
        </main>
      </div>

      {/* Toast Notifications */}
      <ToastContainer />
    </div>
  );
}

export default function App() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
}
