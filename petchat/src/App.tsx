import { useState, useEffect, useRef } from 'react';
import { onEmployeesChange, loginAdmin, loginAnon, logoutAdmin, onAuthChange, createPendingAccount, generatePassword } from './services/firebase';
import { getDocs, getDoc, doc, collection, query, where } from 'firebase/firestore';
import type { Department, Role } from './types';
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
import AdminHealth from './pages/admin/AdminHealth';
import OrgChartPage from './pages/OrgChartPage';
import OneOnOnePage from './pages/OneOnOnePage';
import CheckInForm from './components/CheckInForm';
import TimeTracker from './components/TimeTracker';

import './index.css';

export default function App() {
  const [employees, setEmployees]             = useState<Employee[]>([]);
  const [currentEmployee, setCurrentEmployee] = useState<Employee | null>(null);
  const [currentPage, setCurrentPage]         = useState<Page>('dashboard');
  const [screentimeId, setScreentimeId]       = useState<string | null>(null);
  const [darkMode, setDarkMode]               = useState(() => localStorage.getItem('theme') === 'dark');
  const [mascotMsg, setMascotMsg]             = useState('');

  // Login form state — pre-fill email from last session
  const [loginEmail, setLoginEmail] = useState(() => localStorage.getItem('lastEmail') || '');
  const [loginPass, setLoginPass]   = useState('');
  const [loginError, setLoginError] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);

  // Sign-up form state
  const [showSignUp, setShowSignUp]     = useState(false);
  const [signUpForm, setSignUpForm]     = useState({ name: '', email: '', department: 'Tech' as Department, role: 'employee' as Role, password: '', note: '' });
  const [signUpLoading, setSignUpLoading] = useState(false);
  const [signUpDone, setSignUpDone]     = useState(false);
  const [signUpError, setSignUpError]   = useState('');

  // Employees listener — only safe to start after auth (rules require auth).
  // We hold the unsubscribe in a ref so we can swap it on login/logout.
  const empUnsubRef = useRef<(() => void) | null>(null);
  const startEmpListener = () => {
    empUnsubRef.current?.();
    empUnsubRef.current = onEmployeesChange(setEmployees);
  };

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

  // Keep a ref of the current employee so the auth listener reads fresh state
  // (avoids the stale-closure race between handleLogin and onAuthChange).
  const currentEmpRef = useRef<Employee | null>(currentEmployee);
  useEffect(() => { currentEmpRef.current = currentEmployee; }, [currentEmployee]);

  // Restore session from Firebase Auth (only if not already signed in via the form)
  useEffect(() => {
    const unsub = onAuthChange(async (user: any) => {
      if (user && !currentEmpRef.current) {
        if (user.isAnonymous) {
          // Anonymous = stored-password employee session restored — look up by savedEmpId
          const savedId = localStorage.getItem('savedEmpId');
          if (savedId) {
            try {
              const snap = await getDoc(doc(db, 'employees', savedId));
              if (snap.exists()) {
                const empData = { id: snap.id, ...snap.data() } as Employee;
                currentEmpRef.current = empData;
                startEmpListener();
                setCurrentEmployee(empData);
                setCurrentPage(empData.role === 'founder' ? 'founder' : empData.role === 'admin' ? 'admin' : 'dashboard');
              } else {
                localStorage.removeItem('savedEmpId');
              }
            } catch { localStorage.removeItem('savedEmpId'); }
          }
        } else {
          startEmpListener();
          try {
            const snap = await getDocs(query(collection(db, 'employees'), where('email', '==', user.email)));
            if (!snap.empty) {
              const d = snap.docs[0];
              const empData = { id: d.id, ...d.data() } as Employee;
              setCurrentEmployee(empData);
              setCurrentPage(empData.role === 'founder' ? 'founder' : empData.role === 'admin' ? 'admin' : 'dashboard');
            }
          } catch { /* ignore */ }
        }
      } else if (!user && !currentEmpRef.current) {
        // No auth at all — try savedEmpId as last resort (rules must allow unauthenticated reads)
        const savedId = localStorage.getItem('savedEmpId');
        if (savedId) {
          try {
            const snap = await getDoc(doc(db, 'employees', savedId));
            if (snap.exists()) {
              const empData = { id: snap.id, ...snap.data() } as Employee;
              currentEmpRef.current = empData;
              startEmpListener();
              setCurrentEmployee(empData);
              setCurrentPage(empData.role === 'founder' ? 'founder' : empData.role === 'admin' ? 'admin' : 'dashboard');
            } else {
              localStorage.removeItem('savedEmpId');
            }
          } catch { localStorage.removeItem('savedEmpId'); }
        }
      }
    });
    return unsub;
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    setLoginLoading(true);
    // Tracks whether we successfully signed into Firebase Auth during this attempt,
    // so we can sign back out if the role check or password check fails.
    let firebaseSignedIn = false;
    try {
      const email = loginEmail.trim();
      // Sign in anonymously first so Firestore rules (which require auth) allow
      // the employee email lookup below. We'll swap to real auth if the account
      // has a Firebase Auth UID; stored-password accounts keep the anon session.
      try { await loginAnon(); } catch { /* continue even if anon auth fails */ }
      // Look up the employee first so we know whether to use Firebase Auth.
      const snap = await getDocs(query(collection(db, 'employees'), where('email', '==', email)));
      if (snap.empty) {
        setLoginError('No account found for this email. Ask your admin to add you.');
        return;
      }
      const empDoc = snap.docs[0];
      const emp = { id: empDoc.id, ...empDoc.data() } as Employee;

      // Verify the password. Accounts with a Firebase Auth UID verify through
      // Auth; otherwise we verify against the stored password.
      let verified = false;
      if (emp.authUid) {
        // Pre-assign the ref so that the onAuthStateChanged callback triggered by
        // loginAdmin() sees a non-null value and skips session-restore logic.
        // Without this, the auth listener would race ahead and log the user in
        // before the role check below can run.
        currentEmpRef.current = emp;
        try {
          await loginAdmin(email, loginPass);
          verified = true;
          firebaseSignedIn = true;
        } catch {
          // Firebase Auth failed; fall through to stored-password check.
          currentEmpRef.current = null;
        }
      }
      if (!verified && emp.password) {
        verified = loginPass === emp.password;
      }
      if (!verified) {
        currentEmpRef.current = null;
        if (firebaseSignedIn) { try { await logoutAdmin(); } catch {} }
        setLoginError(emp.password || emp.authUid
          ? 'Incorrect password. Try again or ask your admin to reset it.'
          : 'No password set for this account. Ask your admin to set one.');
        return;
      }

      // Persist session for next visit
      localStorage.setItem('lastEmail', email);
      if (!emp.authUid) {
        localStorage.setItem('savedEmpId', emp.id);
        try { await loginAnon(); } catch { /* anonymous auth optional — writes still work if rules allow */ }
      }
      setCurrentEmployee(emp);
      setCurrentPage(emp.role === 'founder' ? 'founder' : emp.role === 'admin' ? 'admin' : 'dashboard');
      startEmpListener(); // start employees listener now that auth is active
    } catch (err: any) {
      currentEmpRef.current = null;
      if (firebaseSignedIn) { try { await logoutAdmin(); } catch {} }
      setLoginError(err.message || 'Login failed. Check your credentials.');
    } finally {
      setLoginLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setSignUpError('');
    setSignUpLoading(true);
    try {
      await loginAnon();
      await createPendingAccount({
        name: signUpForm.name.trim(),
        email: signUpForm.email.trim(),
        department: signUpForm.department,
        role: signUpForm.role,
        password: signUpForm.password || generatePassword(),
        note: signUpForm.note.trim(),
        requestedAt: Date.now(),
      });
      setSignUpDone(true);
    } catch (err: any) {
      setSignUpError(err.message || 'Failed to submit request. Try again.');
    } finally {
      setSignUpLoading(false);
    }
  };

  const handleSignOut = async () => {
    try { await logoutAdmin(); } catch { /* ignore */ }
    localStorage.removeItem('savedEmpId');
    empUnsubRef.current?.();
    empUnsubRef.current = null;
    setEmployees([]);
    setCurrentEmployee(null);
    setCurrentPage('dashboard');
    setLoginPass('');
  };

  const navigate = (page: string, id?: string) => {
    setCurrentPage(page as Page);
    if (id) {
      setScreentimeId(id);
    } else if (page === 'screentime') {
      setScreentimeId(null); // navigating to screentime without a target → show own data
    }
  };

  // ── Login screen ──────────────────────────────────────────────────────────
  if (!currentEmployee) {
    return (
      <div style={{ width: '100vw', height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#F7F7F6' }}>
        <div style={{ width: 380, animation: 'fadeIn 220ms ease both' }}>
          <div style={{ background: '#fff', border: '1px solid #E9E9E7', borderRadius: 14, padding: 40, boxShadow: '0 4px 24px rgba(0,0,0,0.06),0 1px 4px rgba(0,0,0,0.04)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 32 }}>
              <div style={{ width: 30, height: 30, background: '#111', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 14, fontWeight: 700, flexShrink: 0 }}>B</div>
              <span style={{ fontSize: 16, fontWeight: 600, color: '#111', letterSpacing: '-0.01em' }}>BuddyDesk</span>
            </div>

            <div style={{ fontSize: 22, fontWeight: 600, color: '#111', letterSpacing: '-0.02em', marginBottom: 6 }}>Sign in</div>
            <div style={{ fontSize: 13, color: '#888', marginBottom: 24 }}>Enter your email and password to continue</div>

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

            <p style={{ textAlign: 'center', fontSize: 12, color: '#BBB', marginTop: 20 }}>BuddyDesk · Internal use only</p>

            <div style={{ textAlign: 'center', marginTop: 16 }}>
              <button onClick={() => { setShowSignUp(v => !v); setSignUpDone(false); setSignUpError(''); }}
                style={{ fontSize: 13, color: '#2563EB', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}>
                {showSignUp ? 'Already have an account? Sign in' : "Don't have an account? Request access"}
              </button>
            </div>
          </div>

          {/* Sign-up form */}
          {showSignUp && (
            <div style={{ background: '#fff', border: '1px solid #E9E9E7', borderRadius: 14, padding: 32, boxShadow: '0 4px 24px rgba(0,0,0,0.06)', marginTop: 12 }}>
              {signUpDone ? (
                <div style={{ textAlign: 'center', padding: '16px 0' }}>
                  <div style={{ fontSize: 36, marginBottom: 12 }}>✅</div>
                  <div style={{ fontSize: 16, fontWeight: 600, color: '#111', marginBottom: 8 }}>Request submitted!</div>
                  <div style={{ fontSize: 13, color: '#888' }}>An admin will review and approve your account. You'll be able to log in once approved.</div>
                  <button onClick={() => { setShowSignUp(false); setSignUpDone(false); }}
                    style={{ marginTop: 16, fontSize: 13, color: '#2563EB', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}>
                    Back to sign in
                  </button>
                </div>
              ) : (
                <>
                  <div style={{ fontSize: 18, fontWeight: 600, color: '#111', marginBottom: 4 }}>Request Access</div>
                  <div style={{ fontSize: 13, color: '#888', marginBottom: 20 }}>Fill in your details. An admin will approve your account.</div>
                  {signUpError && (
                    <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: '#DC2626', marginBottom: 14 }}>{signUpError}</div>
                  )}
                  <form onSubmit={handleSignUp} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {([
                      { label: 'Full Name', key: 'name', type: 'text', placeholder: 'Your full name', required: true },
                      { label: 'Work Email', key: 'email', type: 'email', placeholder: 'you@company.com', required: true },
                    ] as const).map(f => (
                      <div key={f.key}>
                        <label style={{ display: 'block', fontSize: 11, fontWeight: 500, color: '#999', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 5 }}>{f.label}</label>
                        <input type={f.type} required={f.required} placeholder={f.placeholder}
                          value={(signUpForm as any)[f.key]}
                          onChange={e => setSignUpForm(s => ({ ...s, [f.key]: e.target.value }))}
                          style={{ width: '100%', height: 42, padding: '0 14px', background: '#F7F7F6', border: '1px solid #E9E9E7', borderRadius: 8, fontSize: 14, fontFamily: 'inherit', color: '#111', outline: 'none' }}
                          onFocus={e => (e.target.style.borderColor = '#2563EB')}
                          onBlur={e => (e.target.style.borderColor = '#E9E9E7')}
                        />
                      </div>
                    ))}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                      <div>
                        <label style={{ display: 'block', fontSize: 11, fontWeight: 500, color: '#999', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 5 }}>Department</label>
                        <select value={signUpForm.department} onChange={e => setSignUpForm(s => ({ ...s, department: e.target.value as Department }))}
                          style={{ width: '100%', height: 42, padding: '0 12px', background: '#F7F7F6', border: '1px solid #E9E9E7', borderRadius: 8, fontSize: 14, fontFamily: 'inherit', color: '#111', outline: 'none' }}>
                          {['Tech','Marketing','Operations','Sales','CEO','CFO','CMO','Design','Engineering','Other'].map(d => <option key={d} value={d}>{d}</option>)}
                        </select>
                      </div>
                      <div>
                        <label style={{ display: 'block', fontSize: 11, fontWeight: 500, color: '#999', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 5 }}>Role</label>
                        <select value={signUpForm.role} onChange={e => setSignUpForm(s => ({ ...s, role: e.target.value as Role }))}
                          style={{ width: '100%', height: 42, padding: '0 12px', background: '#F7F7F6', border: '1px solid #E9E9E7', borderRadius: 8, fontSize: 14, fontFamily: 'inherit', color: '#111', outline: 'none' }}>
                          <option value="employee">Employee</option>
                          <option value="admin">Admin</option>
                        </select>
                      </div>
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: 11, fontWeight: 500, color: '#999', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 5 }}>Note to admin (optional)</label>
                      <input type="text" placeholder="e.g. Joining the engineering team on July 1st"
                        value={signUpForm.note}
                        onChange={e => setSignUpForm(s => ({ ...s, note: e.target.value }))}
                        style={{ width: '100%', height: 42, padding: '0 14px', background: '#F7F7F6', border: '1px solid #E9E9E7', borderRadius: 8, fontSize: 14, fontFamily: 'inherit', color: '#111', outline: 'none' }}
                        onFocus={e => (e.target.style.borderColor = '#2563EB')}
                        onBlur={e => (e.target.style.borderColor = '#E9E9E7')}
                      />
                    </div>
                    <button type="submit" disabled={signUpLoading}
                      style={{ width: '100%', height: 44, marginTop: 4, background: signUpLoading ? '#888' : '#111', color: '#fff', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 500, cursor: signUpLoading ? 'not-allowed' : 'pointer' }}>
                      {signUpLoading ? 'Submitting…' : 'Submit Request →'}
                    </button>
                  </form>
                </>
              )}
            </div>
          )}

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
          {currentPage === 'org-chart' && (
            <OrgChartPage employee={currentEmployee} allEmployees={employees} />
          )}
          {currentPage === 'one-on-one' && (currentEmployee.role === 'admin' || currentEmployee.role === 'founder') && (
            <OneOnOnePage employee={currentEmployee} allEmployees={employees} />
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
          {currentPage === 'admin' && (currentEmployee.role === 'admin' || currentEmployee.role === 'founder' || currentEmployee.permissions?.includes('view_reports')) && (
            <AdminOverview employee={currentEmployee} allEmployees={employees} />
          )}
          {currentPage === 'admin-team' && (currentEmployee.role === 'admin' || currentEmployee.role === 'founder') && (
            <AdminTeam employee={currentEmployee} allEmployees={employees} />
          )}
          {currentPage === 'admin-tasks' && (currentEmployee.role === 'admin' || currentEmployee.role === 'founder' || currentEmployee.permissions?.includes('assign_tasks')) && (
            <AdminTasks employee={currentEmployee} allEmployees={employees} />
          )}
          {currentPage === 'admin-shifts' && (currentEmployee.role === 'admin' || currentEmployee.role === 'founder' || currentEmployee.permissions?.includes('manage_shifts')) && (
            <AdminShifts employee={currentEmployee} allEmployees={employees} />
          )}
          {currentPage === 'admin-integrations' && (currentEmployee.role === 'admin' || currentEmployee.role === 'founder') && (
            <IntegrationHub employee={currentEmployee} />
          )}
          {currentPage === 'admin-health' && (currentEmployee.role === 'admin' || currentEmployee.role === 'founder' || currentEmployee.permissions?.includes('view_reports')) && (
            <AdminHealth employee={currentEmployee} allEmployees={employees} />
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
