import { useState, useEffect, useRef } from 'react';
import { onEmployeesChange, loginAdmin, loginAnon, logoutAdmin, onAuthChange, createEmployeeWithAuth, generatePassword, createPendingAccount, logActivity, logLogin } from './services/firebase';
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
import GroupsPage from './pages/GroupsPage';
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
import DailyCheckInModal, { checkinDoneToday } from './components/DailyCheckInModal';
import TimeTracker from './components/TimeTracker';

import './index.css';

export default function App() {
  const [employees, setEmployees]             = useState<Employee[]>([]);
  const [currentEmployee, setCurrentEmployee] = useState<Employee | null>(null);
  const [currentPage, setCurrentPage]         = useState<Page>('dashboard');
  const [screentimeId, setScreentimeId]       = useState<string | null>(null);
  const [darkMode, setDarkMode]               = useState(() => localStorage.getItem('theme') === 'dark');
  const [mascotMsg, setMascotMsg]             = useState('');
  const [showCheckin, setShowCheckin]         = useState(false);

  // Profile picker — cached profiles for 1-click login
  type SavedProfile = { name: string; email: string; initials: string; department: string; lastLogin: number };
  const [savedProfiles] = useState<SavedProfile[]>(() => {
    try { return JSON.parse(localStorage.getItem('buddydesk_profiles') || '[]'); } catch { return []; }
  });
  const saveProfile = (emp: Employee) => {
    try {
      const ini = emp.name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2);
      const profiles: SavedProfile[] = JSON.parse(localStorage.getItem('buddydesk_profiles') || '[]');
      const idx = profiles.findIndex(p => p.email === emp.email);
      const entry: SavedProfile = { name: emp.name, email: emp.email, initials: ini, department: emp.department, lastLogin: Date.now() };
      if (idx >= 0) profiles[idx] = entry; else profiles.unshift(entry);
      localStorage.setItem('buddydesk_profiles', JSON.stringify(profiles.slice(0, 5)));
    } catch { /* non-critical */ }
  };

  // Login form state — pre-fill email from last session
  const [loginEmail, setLoginEmail] = useState(() => localStorage.getItem('lastEmail') || '');
  const [loginPass, setLoginPass]   = useState('');
  const [loginError, setLoginError] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);

  // Sign-up / forgot-password panel: 'none' | 'signup' | 'forgot'
  const [authPanel, setAuthPanel]       = useState<'none' | 'signup' | 'forgot'>('none');
  // Sign-up locked to employee role — founders/admins are created by an admin in AdminTeam
  const [signUpForm, setSignUpForm]     = useState({ name: '', email: '', department: 'Tech' as Department, role: 'employee' as Role, password: '' });
  const [signUpLoading, setSignUpLoading] = useState(false);
  const [signUpDone, setSignUpDone]     = useState(false);
  const [showLogin, setShowLogin]       = useState(false);
  const [signUpPending, setSignUpPending] = useState(false); // true = sent to pending-approval queue
  const [signUpError, setSignUpError]   = useState('');
  // Forgot password — never shows stored passwords; contacts admin instead
  const [forgotEmail, setForgotEmail]   = useState('');
  const [forgotResult, setForgotResult] = useState<{ sent?: boolean; error?: string } | null>(null);
  const [forgotLoading, setForgotLoading] = useState(false);

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

  // Show daily check-in popup once per day on first login
  useEffect(() => {
    if (!currentEmployee) return;
    setShowCheckin(!checkinDoneToday(currentEmployee.id));
  }, [currentEmployee?.id]);

  useEffect(() => {
    const handleToast = (e: any) => {
      setMascotMsg(e.detail);
      setTimeout(() => setMascotMsg(''), 4000);
    };
    window.addEventListener('toast', handleToast);
    return () => window.removeEventListener('toast', handleToast);
  }, []);

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
                logLogin(empData.id, empData.name).catch(() => {});
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
              logLogin(empData.id, empData.name).catch(() => {});
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
              logLogin(empData.id, empData.name).catch(() => {});
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
      saveProfile(emp);
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
      const pw = signUpForm.password.trim() || generatePassword();
      const name = signUpForm.name.trim();
      const email = signUpForm.email.trim();
      if (!name || !email) { setSignUpError('Please fill in all fields.'); return; }
      
      const empId = await createEmployeeWithAuth({
        name, email,
        department: signUpForm.department,
        role: signUpForm.role,
        password: pw,
        permissions: [],
      });
      
      // Save profile to localStorage for Chrome-like selector
      const profiles = JSON.parse(localStorage.getItem('savedProfiles') || '[]');
      if (!profiles.find((p: any) => p.email === email)) {
        profiles.push({ id: empId, name, email, password: pw, role: signUpForm.role, initial: name.charAt(0).toUpperCase() });
        localStorage.setItem('savedProfiles', JSON.stringify(profiles));
      }
      
      // Login directly
      setLoginEmail(email);
      setLoginPass(pw);
      await loginAdmin(email, pw);
      // It will transition via the auth listener automatically.
    } catch (err: any) {
      setSignUpError(err.message || 'Failed to submit request. Try again.');
    } finally {
      setSignUpLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setForgotResult(null);
    setForgotLoading(true);
    try {
      await loginAnon();
      const snap = await getDocs(query(collection(db, 'employees'), where('email', '==', forgotEmail.trim())));
      if (snap.empty) {
        setForgotResult({ error: 'No account found with this email. Ask your admin to add you.' });
        return;
      }
      // Never display the stored password — just confirm the account exists
      // and tell them to contact their admin for a reset
      setForgotResult({ sent: true });
    } catch (err: any) {
      setForgotResult({ error: err.message || 'Failed. Try again.' });
    } finally {
      setForgotLoading(false);
    }
  };

  const handleSignOut = async () => {
    if (currentEmployee) {
      // Log the logout activity so founders can see when people clocked off
      logActivity({
        employeeId: currentEmployee.id,
        employeeName: currentEmployee.name,
        type: 'logout',
        detail: 'Signed out',
        timestamp: Date.now(),
      }).catch(() => {});
    }
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
            <div style={{ fontSize: 13, color: '#888', marginBottom: savedProfiles.length > 0 ? 16 : 24 }}>Enter your email and password to continue</div>

            {savedProfiles.length > 0 && (
              <div style={{ marginBottom: 20 }}>
                <div style={{ fontSize: 11, fontWeight: 500, color: '#AAA', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 10 }}>Recent accounts</div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {savedProfiles.map(p => (
                    <button key={p.email} type="button"
                      onClick={() => { setLoginEmail(p.email); setLoginPass(''); }}
                      style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 12px 6px 6px', background: loginEmail === p.email ? '#F0F4FF' : '#F7F7F6', border: `1px solid ${loginEmail === p.email ? '#2563EB' : '#E9E9E7'}`, borderRadius: 99, cursor: 'pointer', transition: 'all 150ms' }}>
                      <div style={{ width: 26, height: 26, borderRadius: '50%', background: '#111', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 10, fontWeight: 600, flexShrink: 0 }}>{p.initials}</div>
                      <div style={{ textAlign: 'left' }}>
                        <div style={{ fontSize: 12, fontWeight: 500, color: '#111', lineHeight: 1.3 }}>{p.name}</div>
                        <div style={{ fontSize: 10, color: '#888' }}>{p.department}</div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

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

            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 14 }}>
              <button onClick={() => { setAuthPanel(p => p === 'forgot' ? 'none' : 'forgot'); setForgotResult(null); setForgotEmail(''); }}
                style={{ fontSize: 13, color: '#888', background: 'none', border: 'none', cursor: 'pointer' }}>
                Forgot password?
              </button>
              <button onClick={() => { setAuthPanel(p => p === 'signup' ? 'none' : 'signup'); setSignUpDone(false); setSignUpError(''); }}
                style={{ fontSize: 13, color: '#2563EB', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 500 }}>
                {authPanel === 'signup' ? '← Back to sign in' : 'Create account →'}
              </button>
            </div>
          </div>

          {/* Forgot password panel */}
          {authPanel === 'forgot' && (
            <div style={{ background: '#fff', border: '1px solid #E9E9E7', borderRadius: 14, padding: 28, boxShadow: '0 4px 24px rgba(0,0,0,0.06)', marginTop: 12 }}>
              <div style={{ fontSize: 17, fontWeight: 600, color: '#111', marginBottom: 4 }}>Reset Password</div>
              <div style={{ fontSize: 13, color: '#888', marginBottom: 18 }}>Enter your email and your admin will reset your password.</div>
              {!forgotResult ? (
                <form onSubmit={handleForgotPassword} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <input type="email" required placeholder="you@company.com" value={forgotEmail}
                    onChange={e => setForgotEmail(e.target.value)}
                    style={{ width: '100%', height: 42, padding: '0 14px', background: '#F7F7F6', border: '1px solid #E9E9E7', borderRadius: 8, fontSize: 14, fontFamily: 'inherit', color: '#111', outline: 'none' }}
                    onFocus={e => (e.target.style.borderColor = '#2563EB')} onBlur={e => (e.target.style.borderColor = '#E9E9E7')} />
                  <button type="submit" disabled={forgotLoading}
                    style={{ width: '100%', height: 42, background: forgotLoading ? '#888' : '#111', color: '#fff', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 500, cursor: forgotLoading ? 'not-allowed' : 'pointer' }}>
                    {forgotLoading ? 'Checking…' : 'Verify account →'}
                  </button>
                </form>
              ) : forgotResult.error ? (
                <div>
                  <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: '#DC2626' }}>{forgotResult.error}</div>
                  <button onClick={() => setForgotResult(null)} style={{ marginTop: 10, fontSize: 13, color: '#2563EB', background: 'none', border: 'none', cursor: 'pointer' }}>Try again</button>
                </div>
              ) : (
                <div style={{ background: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: 10, padding: '16px 18px' }}>
                  <div style={{ fontSize: 12, color: '#16A34A', fontWeight: 600, marginBottom: 6 }}>✓ Account found</div>
                  <div style={{ fontSize: 13, color: '#555', marginBottom: 14 }}>
                    We found an account for <strong>{forgotEmail}</strong>.<br/>
                    <span style={{ color: '#888', fontSize: 12 }}>Contact your admin to get your password reset. They can view and update it in the Admin Team panel.</span>
                  </div>
                  <button onClick={() => { setAuthPanel('none'); setForgotResult(null); setLoginEmail(forgotEmail); }}
                    style={{ marginTop: 4, width: '100%', height: 38, background: '#111', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 500, cursor: 'pointer' }}>
                    Back to sign in →
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Create account panel */}
          {authPanel === 'signup' && (
            <div style={{ background: '#fff', border: '1px solid #E9E9E7', borderRadius: 14, padding: 28, boxShadow: '0 4px 24px rgba(0,0,0,0.06)', marginTop: 12 }}>
              {signUpDone ? (
                <div style={{ textAlign: 'center', padding: '12px 0' }}>
                  <div style={{ fontSize: 36, marginBottom: 10 }}>⏳</div>
                  <div style={{ fontSize: 16, fontWeight: 600, color: '#111', marginBottom: 6 }}>Request submitted!</div>
                  <div style={{ fontSize: 13, color: '#555', marginBottom: 6, lineHeight: 1.5 }}>
                    Your account request for <strong>{signUpForm.email}</strong> has been sent to your admin for approval.
                  </div>
                  <div style={{ fontSize: 12, color: '#888', marginBottom: 16, background: '#F7F7F6', borderRadius: 8, padding: '10px 14px', textAlign: 'left' }}>
                    ℹ️ You will receive your login credentials once an admin approves your request. This typically takes a few hours.
                  </div>
                  <button onClick={() => { setAuthPanel('none'); setSignUpDone(false); setSignUpPending(false); }}
                    style={{ width: '100%', height: 40, background: '#F7F7F6', color: '#111', border: '1px solid #E9E9E7', borderRadius: 8, fontSize: 14, fontWeight: 500, cursor: 'pointer' }}>
                    ← Back to sign in
                  </button>
                </div>
              ) : (
                <>
                  <div style={{ fontSize: 17, fontWeight: 600, color: '#111', marginBottom: 4 }}>Request Access</div>
                  <div style={{ fontSize: 13, color: '#888', marginBottom: 18 }}>Fill in your details — an admin will approve your account.</div>
                  {signUpError && <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: '#DC2626', marginBottom: 12 }}>{signUpError}</div>}
                  <form onSubmit={handleSignUp} style={{ display: 'flex', flexDirection: 'column', gap: 11 }}>
                    {[{ label: 'Full Name', key: 'name', type: 'text', placeholder: 'Your full name' }, { label: 'Work Email', key: 'email', type: 'email', placeholder: 'you@company.com' }].map(f => (
                      <div key={f.key}>
                        <label style={{ display: 'block', fontSize: 11, fontWeight: 500, color: '#999', letterSpacing: '0.06em', textTransform: 'uppercase' as const, marginBottom: 5 }}>{f.label}</label>
                        <input type={f.type} required placeholder={f.placeholder} value={(signUpForm as any)[f.key]}
                          onChange={e => setSignUpForm(s => ({ ...s, [f.key]: e.target.value }))}
                          style={{ width: '100%', height: 40, padding: '0 12px', background: '#F7F7F6', border: '1px solid #E9E9E7', borderRadius: 8, fontSize: 14, fontFamily: 'inherit', color: '#111', outline: 'none' }}
                          onFocus={e => (e.target.style.borderColor = '#2563EB')} onBlur={e => (e.target.style.borderColor = '#E9E9E7')} />
                      </div>
                    ))}
                    <div>
                      <label style={{ display: 'block', fontSize: 11, fontWeight: 500, color: '#999', letterSpacing: '0.06em', textTransform: 'uppercase' as const, marginBottom: 5 }}>Department</label>
                      <select value={signUpForm.department} onChange={e => setSignUpForm(s => ({ ...s, department: e.target.value as Department }))}
                        style={{ width: '100%', height: 40, padding: '0 10px', background: '#F7F7F6', border: '1px solid #E9E9E7', borderRadius: 8, fontSize: 13, fontFamily: 'inherit', color: '#111', outline: 'none' }}>
                        {['Tech','Marketing','Operations','Sales','CEO','CFO','CMO','Design','Engineering','Other'].map(d => <option key={d}>{d}</option>)}
                      </select>
                    </div>
                    <button type="submit" disabled={signUpLoading}
                      style={{ width: '100%', height: 42, marginTop: 2, background: signUpLoading ? '#888' : '#111', color: '#fff', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 500, cursor: signUpLoading ? 'not-allowed' : 'pointer' }}>
                      {signUpLoading ? 'Submitting…' : 'Request Access →'}
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
          {currentPage === 'groups' && (
            <GroupsPage employee={currentEmployee} allEmployees={employees} />
          )}
          {currentPage === 'tasks' && (
            <TasksPage employee={currentEmployee} />
          )}
          {currentPage === 'time' && (
            <TimeTracker employee={currentEmployee} />
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

      {showCheckin && (
        <DailyCheckInModal employee={currentEmployee} onDone={() => setShowCheckin(false)} />
      )}

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


