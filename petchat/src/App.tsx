import { useState, useEffect, useRef } from 'react';
import { onEmployeesChange, loginAdmin, loginAnon, logoutAdmin, onAuthChange, createEmployeeWithAuth, logActivity, logLogin, onIncomingMessagesChange, onIncomingMessagesFull, onUserTasksChange, onAnnouncementsChange, filterAnnouncements } from './services/firebase';
import { getDocs, getDoc, doc, collection, query, where } from 'firebase/firestore';
import { sendPasswordResetEmail } from 'firebase/auth';
import type { Department, Role } from './types';
import { db, auth } from './services/firebase';
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
import TeamBoard from './pages/TeamBoard';
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
import ChatDock from './components/ChatDock';
import { InstallPrompt, UpdateBanner } from './components/SystemPrompts';
import NotificationCenter from './components/NotificationCenter';
import { pushNotification, ensureNotifyPermission, randomMotivation } from './services/notifications';

import './index.css';

export default function App() {
  const [employees, setEmployees]             = useState<Employee[]>([]);
  const [currentEmployee, setCurrentEmployee] = useState<Employee | null>(null);
  const [currentPage, setCurrentPage]         = useState<Page>('dashboard');
  const [screentimeId, setScreentimeId]       = useState<string | null>(null);
  const [messageTargetId, setMessageTargetId] = useState<string | undefined>(undefined);
  const [unreadCount, setUnreadCount]         = useState(0);
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
  const [loginEmail, setLoginEmail]   = useState(() => localStorage.getItem('lastEmail') || '');
  const [loginPass, setLoginPass]     = useState('');
  const [loginError, setLoginError]   = useState('');
  const [loginLoading, setLoginLoading] = useState(false);
  const [showPass, setShowPass]       = useState(false);
  const [showSignUpPass, setShowSignUpPass] = useState(false);

  // Sign-up / forgot-password panel: 'none' | 'signup' | 'forgot'
  const [authPanel, setAuthPanel]       = useState<'none' | 'signup' | 'forgot'>('none');
  // Sign-up locked to employee role — founders/admins are created by an admin in AdminTeam
  const [signUpForm, setSignUpForm]     = useState({ name: '', email: '', department: 'Tech' as Department, role: 'employee' as Role, password: '' });
  const [signUpLoading, setSignUpLoading] = useState(false);
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

  // Daily first-open prompt — bottom-right pop-up, once per day, only during the
  // 11:00 → midnight working window. Sticky until they check in / add a task / close.
  useEffect(() => {
    if (!currentEmployee) return;
    if (checkinDoneToday(currentEmployee.id)) return;
    const hour = new Date().getHours();
    if (hour < 11) return; // outside the window — don't nag before 11am
    const firstName = currentEmployee.name.split(' ')[0];
    const t = setTimeout(() => {
      pushNotification({
        kind: 'checkin',
        title: `Welcome back, ${firstName} ☀️`,
        body: `${randomMotivation()}  Check in and set your tasks for today.`,
        autoCloseMs: null, // sticky — needs a decision
        actions: [
          { label: 'Check in', page: 'checkin', primary: true },
          { label: 'Add task', page: 'tasks' },
        ],
      });
    }, 1200);
    return () => clearTimeout(t);
  }, [currentEmployee?.id]);

  // Ask for OS-notification permission once we have a signed-in user (login is a
  // user gesture, so the browser prompt is allowed here).
  useEffect(() => {
    if (currentEmployee) ensureNotifyPermission();
  }, [currentEmployee?.id]);

  // Live pop-up notifications: new tasks, due tasks, new messages, announcements.
  // Fires OS notifications when you're on another tab; in-app cards otherwise.
  useEffect(() => {
    if (!currentEmployee) return;
    const me = currentEmployee;

    // De-dupe state — prime on first snapshot so we don't alert the whole backlog.
    const knownTaskIds = new Set<string>();
    const dueAlerted   = new Set<string>();
    const knownAnnIds  = new Set<string>();
    let tasksPrimed = false;
    let annPrimed   = false;
    let lastMsgTs   = Date.now();

    const unsubTasks = onUserTasksChange(me.id, tasks => {
      for (const t of tasks) {
        // New task assigned to me (after this session started)
        if (!tasksPrimed) {
          knownTaskIds.add(t.id);
        } else if (!knownTaskIds.has(t.id)) {
          knownTaskIds.add(t.id);
          if (t.status !== 'done' && t.assignedById !== me.id) {
            pushNotification({
              kind: 'task', title: 'New task assigned', body: t.title,
              actions: [{ label: 'View', page: 'tasks', primary: true }],
            });
          }
        }
        // Due within the next 60 min (or overdue) and not done — alert once.
        if (t.dueDate && t.status !== 'done' && !dueAlerted.has(t.id)) {
          const mins = (t.dueDate - Date.now()) / 60000;
          if (mins <= 60) {
            dueAlerted.add(t.id);
            pushNotification({
              kind: 'task_due',
              title: mins < 0 ? 'Task overdue' : 'Task due soon',
              body: t.title,
              actions: [{ label: 'View', page: 'tasks', primary: true }],
            });
          }
        }
      }
      tasksPrimed = true;
    });

    const unsubMsg = onIncomingMessagesFull(me.id, msgs => {
      const fresh = msgs.filter(m => m.timestamp > lastMsgTs);
      lastMsgTs = msgs.reduce((mx, m) => Math.max(mx, m.timestamp), lastMsgTs);
      // Don't buzz for a chat you're actively looking at.
      for (const m of fresh.slice(-3)) {
        if (currentPageRef.current === 'messages' && messageTargetRef.current === m.senderId) continue;
        pushNotification({
          kind: 'message',
          title: m.senderName || 'New message',
          body: (m.content || 'Sent you a message').slice(0, 140),
          actions: [{ label: 'Open chat', page: 'messages', targetId: m.senderId, primary: true }],
        });
      }
    });

    const unsubAnn = onAnnouncementsChange(items => {
      const mine = filterAnnouncements(items, me);
      for (const a of mine) {
        if (!annPrimed) {
          knownAnnIds.add(a.id);
        } else if (!knownAnnIds.has(a.id)) {
          knownAnnIds.add(a.id);
          pushNotification({
            kind: 'announcement', title: a.title, body: (a.body || '').slice(0, 140),
            actions: [{ label: 'View', page: 'announcements', primary: true }],
          });
        }
      }
      annPrimed = true;
    });

    return () => { unsubTasks(); unsubMsg(); unsubAnn(); };
    // messageTargetId/currentPage read via closure refresh on their own deps below
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentEmployee?.id]);

  // Live unread badge: count incoming 1:1 messages newer than the last time the
  // user opened the Messages page (stored in localStorage per navigate()).
  useEffect(() => {
    if (!currentEmployee) { setUnreadCount(0); return; }
    return onIncomingMessagesChange(currentEmployee.id, msgs => {
      const seenAt = Number(localStorage.getItem('messagesSeenAt') || 0);
      setUnreadCount(msgs.filter(m => m.timestamp > seenAt).length);
    });
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

  // Fresh refs for the long-lived notification listeners (which only re-bind on
  // login) so the "don't buzz for the chat I'm viewing" check stays current.
  const currentPageRef = useRef(currentPage);
  const messageTargetRef = useRef(messageTargetId);
  useEffect(() => { currentPageRef.current = currentPage; }, [currentPage]);
  useEffect(() => { messageTargetRef.current = messageTargetId; }, [messageTargetId]);

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
    let firebaseSignedIn = false;
    try {
      const email = loginEmail.trim();

      // Try Firebase Auth FIRST — if the account has an authUid this gives us a
      // valid token for Firestore reads, avoiding the anonymous-auth dependency
      // that was causing "Missing or insufficient permissions" errors.
      // Block the auth listener with a sentinel so it doesn't race-navigate.
      currentEmpRef.current = { id: '_pending' } as Employee;
      try {
        await loginAdmin(email, loginPass);
        firebaseSignedIn = true;
      } catch {
        // No Firebase Auth account, or wrong password — fall back to anonymous
        // so stored-password accounts can still look up their Firestore doc.
        currentEmpRef.current = null;
        try { await loginAnon(); } catch { /* ignore */ }
      }

      const snap = await getDocs(query(collection(db, 'employees'), where('email', '==', email)));
      currentEmpRef.current = null; // clear sentinel regardless

      if (snap.empty) {
        if (firebaseSignedIn) { try { await logoutAdmin(); } catch {} }
        setLoginError('No account found for this email. Ask your admin to add you.');
        return;
      }
      const empDoc = snap.docs[0];
      const emp = { id: empDoc.id, ...empDoc.data() } as Employee;

      let verified = firebaseSignedIn;

      if (!verified && emp.authUid) {
        // Has Firebase Auth but loginAdmin failed → wrong password
        setLoginError('Incorrect password. Try again or reset via Forgot password.');
        return;
      }
      if (!verified && emp.password) {
        verified = loginPass === emp.password;
      }
      if (!verified) {
        if (firebaseSignedIn) { try { await logoutAdmin(); } catch {} }
        setLoginError(emp.password || emp.authUid
          ? 'Incorrect password. Try again or ask your admin to reset it.'
          : 'No password set for this account. Ask your admin to set one.');
        return;
      }

      // Success — persist session
      localStorage.setItem('lastEmail', email);
      saveProfile(emp);
      if (!emp.authUid) {
        localStorage.setItem('savedEmpId', emp.id);
        try { await loginAnon(); } catch { }
      }
      currentEmpRef.current = emp;
      setCurrentEmployee(emp);
      setCurrentPage(emp.role === 'founder' ? 'founder' : emp.role === 'admin' ? 'admin' : 'dashboard');
      startEmpListener();
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
    const pw   = signUpForm.password.trim();
    const name = signUpForm.name.trim();
    const email = signUpForm.email.trim();
    if (!name || !email) { setSignUpError('Please fill in all fields.'); return; }
    if (pw.length < 6) { setSignUpError('Password must be at least 6 characters.'); return; }
    setSignUpLoading(true);
    try {
      await createEmployeeWithAuth({
        name, email,
        department: signUpForm.department,
        role: 'employee',
        password: pw,
        permissions: [],
      }, { signInAfter: true });
      // signInAfter:true → new user is signed into the main app → the auth
      // listener picks them up and sets currentEmployee (logs them straight in)
    } catch (err: any) {
      setSignUpError(err.message || 'Failed to create account. Try again.');
    } finally {
      setSignUpLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setForgotResult(null);
    setForgotLoading(true);
    try {
      await sendPasswordResetEmail(auth, forgotEmail.trim());
      setForgotResult({ sent: true });
    } catch (err: any) {
      if (err.code === 'auth/user-not-found') {
        setForgotResult({ error: 'No account found for this email. It may use a stored password — ask your admin to reset it in Admin → Team.' });
      } else {
        setForgotResult({ error: err.message || 'Failed to send reset email. Try again.' });
      }
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
    if (page === 'checkin') { setShowCheckin(true); return; } // Quick Action → open the modal, no dead page
    setCurrentPage(page as Page);
    if (page === 'screentime') {
      setScreentimeId(id ?? null); // no target → show own data
    } else if (page === 'messages') {
      setMessageTargetId(id);
      localStorage.setItem('messagesSeenAt', String(Date.now())); // mark read
      setUnreadCount(0);
    }
  };

  // ── Login screen ──────────────────────────────────────────────────────────
  if (!currentEmployee) {
    return (
      <div style={{ width: '100vw', height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--surface2)' }}>
        <div style={{ width: 380, animation: 'fadeIn 220ms ease both' }}>
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, padding: 40, boxShadow: '0 4px 24px rgba(0,0,0,0.06),0 1px 4px rgba(0,0,0,0.04)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 32 }}>
              <div style={{ width: 30, height: 30, background: 'var(--text)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--surface)', fontSize: 14, fontWeight: 700, flexShrink: 0 }}>Z</div>
              <span style={{ fontSize: 16, fontWeight: 600, color: 'var(--text)', letterSpacing: '-0.01em' }}>Zypit</span>
            </div>

            {authPanel === 'none' && (
              <>
                <div style={{ fontSize: 22, fontWeight: 600, color: 'var(--text)', letterSpacing: '-0.02em', marginBottom: 6 }}>Sign in</div>
                <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: savedProfiles.length > 0 ? 16 : 24 }}>Enter your email and password to continue</div>

                {savedProfiles.length > 0 && (
                  <div style={{ marginBottom: 20 }}>
                    <div style={{ fontSize: 11, fontWeight: 500, color: 'var(--text-faint)', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 10 }}>Recent accounts</div>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      {savedProfiles.map(p => (
                        <button key={p.email} type="button"
                          onClick={() => { setLoginEmail(p.email); setLoginPass(''); }}
                          style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 12px 6px 6px', background: loginEmail === p.email ? '#F0F4FF' : 'var(--surface2)', border: `1px solid ${loginEmail === p.email ? 'var(--accent)' : 'var(--border)'}`, borderRadius: 99, cursor: 'pointer', transition: 'all 150ms' }}>
                          <div style={{ width: 26, height: 26, borderRadius: '50%', background: 'var(--text)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--surface)', fontSize: 10, fontWeight: 600, flexShrink: 0 }}>{p.initials}</div>
                          <div style={{ textAlign: 'left' }}>
                            <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--text)', lineHeight: 1.3 }}>{p.name}</div>
                            <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>{p.department}</div>
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
                    <label style={{ display: 'block', fontSize: 11, fontWeight: 500, color: 'var(--text-muted)', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 6 }}>Email</label>
                    <input
                      type="email"
                      value={loginEmail}
                      onChange={e => setLoginEmail(e.target.value)}
                      placeholder="you@company.com"
                      required
                      style={{ width: '100%', height: 42, padding: '0 14px', background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 14, fontFamily: 'inherit', color: 'var(--text)', outline: 'none', transition: 'border-color 150ms' }}
                      onFocus={e => (e.target.style.borderColor = 'var(--accent)')}
                      onBlur={e => (e.target.style.borderColor = 'var(--border)')}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: 11, fontWeight: 500, color: 'var(--text-muted)', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 6 }}>Password</label>
                    <div style={{ position: 'relative' }}>
                      <input
                        type={showPass ? 'text' : 'password'}
                        value={loginPass}
                        onChange={e => setLoginPass(e.target.value)}
                        placeholder="••••••••"
                        required
                        style={{ width: '100%', height: 42, padding: '0 42px 0 14px', background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 14, fontFamily: 'inherit', color: 'var(--text)', outline: 'none', transition: 'border-color 150ms', boxSizing: 'border-box' }}
                        onFocus={e => (e.target.style.borderColor = 'var(--accent)')}
                        onBlur={e => (e.target.style.borderColor = 'var(--border)')}
                      />
                      <button type="button" onClick={() => setShowPass(v => !v)}
                        style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: 'var(--text-faint)', display: 'flex', alignItems: 'center' }}>
                        {showPass
                          ? <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                          : <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                        }
                      </button>
                    </div>
                  </div>
                  <button
                    type="submit"
                    disabled={loginLoading}
                    style={{ width: '100%', height: 44, marginTop: 4, background: loginLoading ? '#888' : 'var(--accent)', color: '#fff', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 500, letterSpacing: '-0.01em', cursor: loginLoading ? 'not-allowed' : 'pointer', transition: 'background 150ms' }}
                    onMouseOver={e => { if (!loginLoading) (e.currentTarget as HTMLButtonElement).style.background = 'var(--accent-pressed)'; }}
                    onMouseOut={e => { if (!loginLoading) (e.currentTarget as HTMLButtonElement).style.background = 'var(--accent)'; }}
                  >
                    {loginLoading ? 'Signing in…' : 'Sign in →'}
                  </button>
                </form>

                <p style={{ textAlign: 'center', fontSize: 12, color: 'var(--text-faint)', marginTop: 20 }}>Zypit · Internal use only</p>

                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 14 }}>
                  <button onClick={() => { setAuthPanel('forgot'); setForgotResult(null); setForgotEmail(''); }}
                    style={{ fontSize: 13, color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer' }}>
                    Forgot password?
                  </button>
                  <button onClick={() => { setAuthPanel('signup'); setSignUpError(''); }}
                    style={{ fontSize: 13, color: 'var(--accent)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 500 }}>
                    Create account →
                  </button>
                </div>
              </>
            )}

            {authPanel === 'forgot' && (
              <>
                <button onClick={() => { setAuthPanel('none'); setForgotResult(null); }}
                  style={{ fontSize: 13, color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer', marginBottom: 20, padding: 0 }}>
                  ← Back to sign in
                </button>
                <div style={{ fontSize: 22, fontWeight: 600, color: 'var(--text)', letterSpacing: '-0.02em', marginBottom: 6 }}>Reset Password</div>
                <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 24 }}>Enter your email and we'll send a reset link instantly.</div>
                {!forgotResult ? (
                  <form onSubmit={handleForgotPassword} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <input type="email" required placeholder="you@company.com" value={forgotEmail}
                      onChange={e => setForgotEmail(e.target.value)}
                      style={{ width: '100%', height: 42, padding: '0 14px', background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 14, fontFamily: 'inherit', color: 'var(--text)', outline: 'none' }}
                      onFocus={e => (e.target.style.borderColor = 'var(--accent)')} onBlur={e => (e.target.style.borderColor = 'var(--border)')} />
                    <button type="submit" disabled={forgotLoading}
                      style={{ width: '100%', height: 42, background: forgotLoading ? '#888' : 'var(--accent)', color: '#fff', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 500, cursor: forgotLoading ? 'not-allowed' : 'pointer' }}>
                      {forgotLoading ? 'Sending…' : 'Send reset link →'}
                    </button>
                  </form>
                ) : forgotResult.error ? (
                  <div>
                    <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: '#DC2626' }}>{forgotResult.error}</div>
                    <button onClick={() => setForgotResult(null)} style={{ marginTop: 10, fontSize: 13, color: 'var(--accent)', background: 'none', border: 'none', cursor: 'pointer' }}>Try again</button>
                  </div>
                ) : (
                  <div style={{ background: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: 10, padding: '16px 18px' }}>
                    <div style={{ fontSize: 14, color: '#16A34A', fontWeight: 600, marginBottom: 6 }}>✉️ Check your inbox</div>
                    <div style={{ fontSize: 13, color: '#555', marginBottom: 14, lineHeight: 1.5 }}>
                      A password reset link has been sent to <strong>{forgotEmail}</strong>.<br/>
                      <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>Click the link in the email to set a new password. Check your spam folder if you don't see it.</span>
                    </div>
                    <button onClick={() => { setAuthPanel('none'); setForgotResult(null); setLoginEmail(forgotEmail); }}
                      style={{ marginTop: 4, width: '100%', height: 38, background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 500, cursor: 'pointer' }}>
                      Back to sign in →
                    </button>
                  </div>
                )}
              </>
            )}

            {authPanel === 'signup' && (
              <>
                <button onClick={() => setAuthPanel('none')}
                  style={{ fontSize: 13, color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer', marginBottom: 20, padding: 0 }}>
                  ← Back to sign in
                </button>
                <div style={{ fontSize: 22, fontWeight: 600, color: 'var(--text)', letterSpacing: '-0.02em', marginBottom: 6 }}>Create Account</div>
                <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 24 }}>Fill in your details — your account is created immediately.</div>
                {signUpError && <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: '#DC2626', marginBottom: 12 }}>{signUpError}</div>}
                <form onSubmit={handleSignUp} style={{ display: 'flex', flexDirection: 'column', gap: 11 }}>
                  {[
                    { label: 'Full Name', key: 'name', type: 'text', placeholder: 'Your full name' },
                    { label: 'Work Email', key: 'email', type: 'email', placeholder: 'you@company.com' },
                  ].map(f => (
                    <div key={f.key}>
                      <label style={{ display: 'block', fontSize: 11, fontWeight: 500, color: 'var(--text-muted)', letterSpacing: '0.06em', textTransform: 'uppercase' as const, marginBottom: 5 }}>{f.label}</label>
                      <input type={f.type} required placeholder={f.placeholder} value={(signUpForm as any)[f.key]}
                        onChange={e => setSignUpForm(s => ({ ...s, [f.key]: e.target.value }))}
                        style={{ width: '100%', height: 40, padding: '0 12px', background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 14, fontFamily: 'inherit', color: 'var(--text)', outline: 'none' }}
                        onFocus={e => (e.target.style.borderColor = 'var(--accent)')} onBlur={e => (e.target.style.borderColor = 'var(--border)')} />
                    </div>
                  ))}
                  <div>
                    <label style={{ display: 'block', fontSize: 11, fontWeight: 500, color: 'var(--text-muted)', letterSpacing: '0.06em', textTransform: 'uppercase' as const, marginBottom: 5 }}>Password</label>
                    <div style={{ position: 'relative' }}>
                      <input type={showSignUpPass ? 'text' : 'password'} required placeholder="Min. 6 characters"
                        value={signUpForm.password}
                        onChange={e => setSignUpForm(s => ({ ...s, password: e.target.value }))}
                        style={{ width: '100%', height: 40, padding: '0 42px 0 12px', background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 14, fontFamily: 'inherit', color: 'var(--text)', outline: 'none', boxSizing: 'border-box' }}
                        onFocus={e => (e.target.style.borderColor = 'var(--accent)')} onBlur={e => (e.target.style.borderColor = 'var(--border)')} />
                      <button type="button" onClick={() => setShowSignUpPass(v => !v)}
                        style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: 'var(--text-faint)', display: 'flex', alignItems: 'center' }}>
                        {showSignUpPass
                          ? <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                          : <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                        }
                      </button>
                    </div>
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: 11, fontWeight: 500, color: 'var(--text-muted)', letterSpacing: '0.06em', textTransform: 'uppercase' as const, marginBottom: 5 }}>Department</label>
                    <select value={signUpForm.department} onChange={e => setSignUpForm(s => ({ ...s, department: e.target.value as Department }))}
                      style={{ width: '100%', height: 40, padding: '0 10px', background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 13, fontFamily: 'inherit', color: 'var(--text)', outline: 'none' }}>
                      {['Tech','Marketing','Operations','Sales','CEO','CFO','CMO','Design','Engineering','Other'].map(d => <option key={d}>{d}</option>)}
                    </select>
                  </div>
                  <button type="submit" disabled={signUpLoading}
                    style={{ width: '100%', height: 42, marginTop: 2, background: signUpLoading ? '#888' : 'var(--accent)', color: '#fff', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 500, cursor: signUpLoading ? 'not-allowed' : 'pointer' }}>
                    {signUpLoading ? 'Creating account…' : 'Create Account →'}
                  </button>
                </form>
              </>
            )}
          </div>

          <div style={{ display: 'flex', justifyContent: 'center', marginTop: 16 }}>
            <button
              onClick={() => setDarkMode(v => !v)}
              style={{ fontSize: 12, color: 'var(--text-faint)', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}
            >
              {darkMode ? '☀️ Light mode' : '🌙 Dark mode'}
            </button>
          </div>
        </div>
        <UpdateBanner />
        <InstallPrompt />
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
        onNavigate={navigate}
        employee={currentEmployee}
        onSignOut={handleSignOut}
        unreadCount={unreadCount}
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
            <MessagesPage employee={currentEmployee} allEmployees={employees} targetEmployeeId={messageTargetId} />
          )}
          {currentPage === 'groups' && (
            <GroupsPage employee={currentEmployee} allEmployees={employees} />
          )}
          {currentPage === 'tasks' && (
            <TasksPage employee={currentEmployee} />
          )}
          {currentPage === 'team-board' && (
            <TeamBoard employee={currentEmployee} allEmployees={employees} />
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

      <ChatDock employee={currentEmployee} employees={employees} />

      <NotificationCenter onNavigate={navigate} />

      <UpdateBanner />
      <InstallPrompt />

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


