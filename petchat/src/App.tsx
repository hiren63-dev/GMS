import { useState, useEffect } from 'react';
import { onEmployeesChange, loginAdmin, logoutAdmin, onAuthChange } from './services/firebase';
import { getDocs, collection, query, where } from 'firebase/firestore';
import { db } from './services/firebase';
import type { Employee } from './types';
import type { Page } from './components/Sidebar';
import Sidebar from './components/Sidebar';
import TopBar from './components/TopBar';
import Mascot from './components/Mascot';

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

type LoginRole = 'employee' | 'admin' | 'founder';

export default function App() {
  const [employees, setEmployees]             = useState<Employee[]>([]);
  const [currentEmployee, setCurrentEmployee] = useState<Employee | null>(null);
  const [currentPage, setCurrentPage]         = useState<Page>('dashboard');
  const [screentimeId, setScreentimeId]       = useState<string | null>(null);
  const [darkMode, setDarkMode]               = useState(() => localStorage.getItem('theme') === 'dark');
  const [mascotMsg, setMascotMsg]             = useState('');

  // Login form state
  const [loginRole, setLoginRole]   = useState<LoginRole>('employee');
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPass, setLoginPass]   = useState('');
  const [loginError, setLoginError] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);

  useEffect(() => {
    const unsub = onEmployeesChange(setEmployees);
    return unsub;
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode);
    localStorage.setItem('theme', darkMode ? 'dark' : 'light');
  }, [darkMode]);

  useEffect(() => {
    if (currentEmployee) {
      const hour = new Date().getHours();
      const greet = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
      setMascotMsg(`${greet}, ${currentEmployee.name.split(' ')[0]}! 🐾`);
      setTimeout(() => setMascotMsg(''), 4000);
    }
  }, [currentEmployee?.id]);

  // Restore session from Firebase Auth
  useEffect(() => {
    const unsub = onAuthChange(async (user: any) => {
      if (user && !currentEmployee) {
        try {
          const snap = await getDocs(query(collection(db, 'employees'), where('email', '==', user.email)));
          if (!snap.empty) {
            const doc = snap.docs[0];
            setCurrentEmployee({ id: doc.id, ...doc.data() } as Employee);
          }
        } catch { /* ignore */ }
      }
    });
    return unsub;
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    setLoginLoading(true);
    try {
      // Try Firebase Auth first
      try {
        await loginAdmin(loginEmail, loginPass);
      } catch {
        // Auth failed — fall through to email-only lookup (for non-auth employees)
      }
      // Look up employee by email in Firestore
      const snap = await getDocs(query(collection(db, 'employees'), where('email', '==', loginEmail.trim())));
      if (snap.empty) {
        setLoginError('No account found for this email. Ask your admin to add you.');
        setLoginLoading(false);
        return;
      }
      const empDoc = snap.docs[0];
      const emp = { id: empDoc.id, ...empDoc.data() } as Employee;
      // Verify role matches selection (loose check — founders can access admin)
      if (loginRole === 'founder' && emp.role !== 'founder') {
        setLoginError('You don\'t have founder access.');
        setLoginLoading(false);
        return;
      }
      if (loginRole === 'admin' && emp.role === 'employee') {
        setLoginError('You don\'t have admin access.');
        setLoginLoading(false);
        return;
      }
      setCurrentEmployee(emp);
      setCurrentPage(emp.role === 'founder' ? 'founder' : emp.role === 'admin' ? 'admin' : 'dashboard');
    } catch (err: any) {
      setLoginError(err.message || 'Login failed. Check your credentials.');
    } finally {
      setLoginLoading(false);
    }
  };

  const handleSignOut = async () => {
    try { await logoutAdmin(); } catch { /* ignore */ }
    setCurrentEmployee(null);
    setCurrentPage('dashboard');
    setLoginEmail('');
    setLoginPass('');
  };

  const navigate = (page: string, id?: string) => {
    setCurrentPage(page as Page);
    if (id) setScreentimeId(id);
  };

  // ── Login screen ──────────────────────────────────────────────────────────
  if (!currentEmployee) {
    const roleTab = (role: LoginRole, label: string) => {
      const active = loginRole === role;
      return (
        <button
          type="button"
          onClick={() => setLoginRole(role)}
          style={{
            flex: 1, height: 34, borderRadius: 6, border: 'none',
            fontSize: 13, fontWeight: 500, cursor: 'pointer', transition: 'all 150ms',
            background: active ? '#fff' : 'transparent',
            color: active ? '#111' : '#888',
            boxShadow: active ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
          }}
        >{label}</button>
      );
    };

    return (
      <div style={{ width: '100vw', height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#F7F7F6' }}>
        <div style={{ width: 380, animation: 'fadeIn 220ms ease both' }}>
          <div style={{ background: '#fff', border: '1px solid #E9E9E7', borderRadius: 14, padding: 40, boxShadow: '0 4px 24px rgba(0,0,0,0.06),0 1px 4px rgba(0,0,0,0.04)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 32 }}>
              <div style={{ width: 30, height: 30, background: '#111', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 14, fontWeight: 700, flexShrink: 0 }}>B</div>
              <span style={{ fontSize: 16, fontWeight: 600, color: '#111', letterSpacing: '-0.01em' }}>BuddyDesk</span>
            </div>

            <div style={{ fontSize: 22, fontWeight: 600, color: '#111', letterSpacing: '-0.02em', marginBottom: 6 }}>Sign in</div>
            <div style={{ fontSize: 13, color: '#888', marginBottom: 24 }}>Select your role to access your workspace</div>

            {/* Role toggle */}
            <div style={{ display: 'flex', gap: 4, background: '#F3F3F2', padding: 4, borderRadius: 9, marginBottom: 24 }}>
              {roleTab('employee', 'Employee')}
              {roleTab('admin', 'Admin')}
              {roleTab('founder', 'Founder')}
            </div>

            <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {loginError && (
                <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: '#DC2626' }}>
                  {loginError}
                </div>
              )}
              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 500, color: '#999', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 6 }}>Email</label>
                <input
                  type="email"
                  value={loginEmail}
                  onChange={e => setLoginEmail(e.target.value)}
                  placeholder="you@company.com"
                  required
                  style={{ width: '100%', height: 42, padding: '0 14px', background: '#F7F7F6', border: '1px solid #E9E9E7', borderRadius: 8, fontSize: 14, fontFamily: 'inherit', color: '#111', outline: 'none', transition: 'border-color 150ms' }}
                  onFocus={e => (e.target.style.borderColor = '#2563EB')}
                  onBlur={e => (e.target.style.borderColor = '#E9E9E7')}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 500, color: '#999', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 6 }}>Password</label>
                <input
                  type="password"
                  value={loginPass}
                  onChange={e => setLoginPass(e.target.value)}
                  placeholder="••••••••"
                  required
                  style={{ width: '100%', height: 42, padding: '0 14px', background: '#F7F7F6', border: '1px solid #E9E9E7', borderRadius: 8, fontSize: 14, fontFamily: 'inherit', color: '#111', outline: 'none', transition: 'border-color 150ms' }}
                  onFocus={e => (e.target.style.borderColor = '#2563EB')}
                  onBlur={e => (e.target.style.borderColor = '#E9E9E7')}
                />
              </div>
              <button
                type="submit"
                disabled={loginLoading}
                style={{ width: '100%', height: 44, marginTop: 4, background: loginLoading ? '#888' : '#111', color: '#fff', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 500, letterSpacing: '-0.01em', cursor: loginLoading ? 'not-allowed' : 'pointer', transition: 'background 150ms' }}
                onMouseOver={e => { if (!loginLoading) (e.currentTarget as HTMLButtonElement).style.background = '#333'; }}
                onMouseOut={e => { if (!loginLoading) (e.currentTarget as HTMLButtonElement).style.background = '#111'; }}
              >
                {loginLoading ? 'Signing in…' : 'Sign in →'}
              </button>
            </form>

            {/* Quick select for dev/demo */}
            {employees.length > 0 && (
              <div style={{ marginTop: 20, borderTop: '1px solid #F3F3F2', paddingTop: 16 }}>
                <p style={{ fontSize: 11, color: '#BBB', marginBottom: 8, textAlign: 'center' }}>Or pick a demo account</p>
                <select
                  onChange={e => {
                    const emp = employees.find(em => em.id === e.target.value);
                    if (emp) { setCurrentEmployee(emp); setCurrentPage(emp.role === 'founder' ? 'founder' : emp.role === 'admin' ? 'admin' : 'dashboard'); }
                  }}
                  defaultValue=""
                  style={{ width: '100%', height: 38, padding: '0 12px', background: '#F7F7F6', border: '1px solid #E9E9E7', borderRadius: 8, fontSize: 13, color: '#555', cursor: 'pointer', outline: 'none' }}
                >
                  <option value="" disabled>Select account…</option>
                  {employees.map(emp => (
                    <option key={emp.id} value={emp.id}>{emp.name} — {emp.role}</option>
                  ))}
                </select>
              </div>
            )}

            <p style={{ textAlign: 'center', fontSize: 12, color: '#BBB', marginTop: 20 }}>BuddyDesk · Internal use only</p>
          </div>

          <div style={{ display: 'flex', justifyContent: 'center', marginTop: 16 }}>
            <button
              onClick={() => setDarkMode(v => !v)}
              style={{ fontSize: 12, color: '#BBB', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}
            >
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
    <div className={`${darkMode ? 'dark' : ''}`} style={{ display: 'flex', height: '100vh', overflow: 'hidden', background: 'var(--bg)' }}>
      <Sidebar
        currentPage={currentPage}
        onNavigate={page => setCurrentPage(page)}
        employee={currentEmployee}
        onSignOut={handleSignOut}
      />

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, overflow: 'hidden' }}>
        <TopBar
          darkMode={darkMode}
          onToggleDark={() => setDarkMode(v => !v)}
          employees={employees}
          currentEmployee={currentEmployee}
          onNavigateTo={navigate}
        />

        <main style={{ flex: 1, overflowY: 'auto', background: 'var(--bg)' }}>
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
            <ScreentimePage employee={currentEmployee} targetEmployee={targetEmployee} allEmployees={employees} />
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

      <Mascot
        onTap={() => {
          const tips = ['📋 Check your tasks!', '✅ Did you check in today?', '💬 Say hi to a teammate!', '⏱️ Don\'t forget to clock in!'];
          setMascotMsg(tips[Math.floor(Math.random() * tips.length)]);
        }}
        message={mascotMsg}
      />
    </div>
  );
}
