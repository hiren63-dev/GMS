import { useState, useEffect } from 'react';
import { onEmployeesChange } from './services/firebase';
import type { Employee } from './types';
import type { Page } from './components/Sidebar';
import Sidebar from './components/Sidebar';
import TopBar from './components/TopBar';
import Mascot from './components/Mascot';

// Pages
import Dashboard from './pages/Dashboard';
import FounderView from './pages/FounderView';
import TeamDirectory from './pages/TeamDirectory';
import MessagesPage from './pages/MessagesPage';
import TasksPage from './pages/TasksPage';
import AnnouncementsPage from './pages/AnnouncementsPage';
import ResourcesPage from './pages/ResourcesPage';
import ScreentimePage from './pages/ScreentimePage';
import AdminOverview from './pages/admin/AdminOverview';
import AdminTeam from './pages/admin/AdminTeam';
import AdminTasks from './pages/admin/AdminTasks';
import AdminShifts from './pages/admin/AdminShifts';
import IntegrationHub from './pages/admin/IntegrationHub';
import CheckInForm from './components/CheckInForm';
import TimeTracker from './components/TimeTracker';

import './index.css';

const PAGE_TITLES: Record<Page, string> = {
  dashboard:          'Overview',
  founder:            'Founder Dashboard',
  team:               'Team Directory',
  messages:           'Messages',
  tasks:              'My Tasks',
  time:               'Time Tracker',
  checkin:            'Daily Check-In',
  announcements:      'Announcements',
  resources:          'Resource Allocation',
  screentime:         'Employee Profile',
  admin:              'Admin Overview',
  'admin-team':       'Team Management',
  'admin-tasks':      'Task Assignment',
  'admin-shifts':     'Shift Control',
  'admin-integrations': 'Integration Hub',
};

export default function App() {
  const [employees, setEmployees]         = useState<Employee[]>([]);
  const [currentEmployee, setCurrentEmployee] = useState<Employee | null>(null);
  const [currentPage, setCurrentPage]     = useState<Page>('dashboard');
  const [screentimeId, setScreentimeId]   = useState<string | null>(null);
  const [darkMode, setDarkMode]           = useState(() => localStorage.getItem('theme') === 'dark');
  const [mascotMsg, setMascotMsg]         = useState('');

  // Load employees
  useEffect(() => {
    const unsub = onEmployeesChange(setEmployees);
    return unsub;
  }, []);

  // Dark mode
  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode);
    localStorage.setItem('theme', darkMode ? 'dark' : 'light');
  }, [darkMode]);

  // Welcome mascot message
  useEffect(() => {
    if (currentEmployee) {
      const hour = new Date().getHours();
      const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
      setMascotMsg(`${greeting}, ${currentEmployee.name.split(' ')[0]}! 🐾`);
      setTimeout(() => setMascotMsg(''), 4000);
    }
  }, [currentEmployee?.id]);

  const navigate = (page: string, id?: string) => {
    setCurrentPage(page as Page);
    if (id) setScreentimeId(id);
  };

  const handleSignOut = () => {
    setCurrentEmployee(null);
    setCurrentPage('dashboard');
  };

  // ── Login screen ──────────────────────────────────────────────────────────
  if (!currentEmployee) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6"
        style={{ background: 'var(--bg)' }}>
        <div className="w-full max-w-sm space-y-6">
          {/* Brand */}
          <div className="text-center">
            <div className="w-16 h-16 rounded-2xl founder-gradient flex items-center justify-center text-white text-3xl font-bold mx-auto mb-4 shadow-lg">B</div>
            <h1 className="text-3xl font-extrabold" style={{ color: 'var(--text)' }}>BuddyDesk</h1>
            <p className="text-sm mt-2" style={{ color: 'var(--text-muted)' }}>Your workplace companion 🐾</p>
          </div>

          <div className="card p-6 space-y-4">
            <p className="text-sm font-medium" style={{ color: 'var(--text)' }}>Who are you?</p>
            {employees.length === 0 ? (
              <p className="text-sm text-center py-4" style={{ color: 'var(--text-muted)' }}>
                No employees yet. Ask your admin to add you!
              </p>
            ) : (
              <select
                className="input w-full"
                defaultValue=""
                onChange={e => {
                  const emp = employees.find(em => em.id === e.target.value);
                  if (emp) setCurrentEmployee(emp);
                }}
              >
                <option value="" disabled>Select your name…</option>
                {employees.map(emp => (
                  <option key={emp.id} value={emp.id}>
                    {emp.name} — {emp.department} ({emp.role})
                  </option>
                ))}
              </select>
            )}
            <p className="text-xs text-center" style={{ color: 'var(--text-muted)' }}>
              No account needed — just select your name
            </p>
          </div>

          {/* Dark mode toggle on login */}
          <div className="flex justify-center">
            <button onClick={() => setDarkMode(v => !v)}
              className="text-sm flex items-center gap-2 px-4 py-2 rounded-lg border transition"
              style={{ background: 'var(--surface)', borderColor: 'var(--border)', color: 'var(--text-muted)' }}>
              {darkMode ? '☀️ Light mode' : '🌙 Dark mode'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  const targetEmployee = screentimeId
    ? (employees.find(e => e.id === screentimeId) ?? currentEmployee)
    : currentEmployee;

  // ── Main app shell ────────────────────────────────────────────────────────
  return (
    <div className={`flex h-screen overflow-hidden ${darkMode ? 'dark' : ''}`} style={{ background: 'var(--bg)' }}>
      {/* Sidebar */}
      <Sidebar
        currentPage={currentPage}
        onNavigate={(page) => { setCurrentPage(page); }}
        employee={currentEmployee}
        onSignOut={handleSignOut}
      />

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <TopBar
          title={PAGE_TITLES[currentPage] ?? 'BuddyDesk'}
          subtitle={currentEmployee.department}
          darkMode={darkMode}
          onToggleDark={() => setDarkMode(v => !v)}
          employees={employees}
          onNavigateTo={navigate}
        />

        <main className="flex-1 overflow-y-auto" style={{ background: 'var(--bg)' }}>
          {currentPage === 'dashboard' && (
            <Dashboard employee={currentEmployee} allEmployees={employees} onNavigate={navigate} />
          )}
          {currentPage === 'founder' && currentEmployee.role === 'founder' && (
            <FounderView employee={currentEmployee} allEmployees={employees} />
          )}
          {currentPage === 'team' && (
            <TeamDirectory employee={currentEmployee} allEmployees={employees} onNavigate={navigate} />
          )}
          {currentPage === 'messages' && (
            <MessagesPage employee={currentEmployee} allEmployees={employees} />
          )}
          {currentPage === 'tasks' && (
            <TasksPage employee={currentEmployee} />
          )}
          {currentPage === 'time' && (
            <TimeTracker employee={currentEmployee} />
          )}
          {currentPage === 'checkin' && (
            <CheckInForm employee={currentEmployee} onDone={() => setCurrentPage('dashboard')} />
          )}
          {currentPage === 'announcements' && (
            <AnnouncementsPage employee={currentEmployee} allEmployees={employees} />
          )}
          {currentPage === 'resources' && (
            <ResourcesPage employee={currentEmployee} allEmployees={employees} />
          )}
          {currentPage === 'screentime' && (
            <ScreentimePage
              employee={currentEmployee}
              targetEmployee={targetEmployee}
              allEmployees={employees}
            />
          )}
          {currentPage === 'admin' && (
            <AdminOverview employee={currentEmployee} allEmployees={employees} />
          )}
          {currentPage === 'admin-team' && (
            <AdminTeam employee={currentEmployee} allEmployees={employees} />
          )}
          {currentPage === 'admin-tasks' && (
            <AdminTasks employee={currentEmployee} allEmployees={employees} />
          )}
          {currentPage === 'admin-shifts' && (
            <AdminShifts employee={currentEmployee} allEmployees={employees} />
          )}
          {currentPage === 'admin-integrations' && (
            <IntegrationHub employee={currentEmployee} />
          )}
        </main>
      </div>

      {/* Floating mascot */}
      <Mascot
        onTap={() => {
          const tips = [
            '📋 Check your tasks!',
            '✅ Did you check in today?',
            '💬 Say hi to a teammate!',
            '⏱️ Don\'t forget to clock in!',
          ];
          setMascotMsg(tips[Math.floor(Math.random() * tips.length)]);
        }}
        message={mascotMsg}
      />
    </div>
  );
}
