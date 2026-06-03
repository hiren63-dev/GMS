// ============================================================
// GYM MANAGEMENT SYSTEM - GLOBAL STATE STORE (React Context)
// ============================================================
import { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import type { Member, Plan, Payment, AttendanceRecord, Trainer, Lead, Expense, Equipment, Notification, StaffUser, Subscription, PTSession, BodyMeasurement } from '../types';
import { MEMBERS, PLANS, PAYMENTS, ATTENDANCE, TRAINERS, LEADS, EXPENSES, EQUIPMENT, NOTIFICATIONS, STAFF_USERS, GYM_SETTINGS, SUBSCRIPTIONS, PT_SESSIONS, BODY_MEASUREMENTS } from '../data/demoData';
import { daysUntil, addDays, generateId, generateReceiptNo } from '../utils/helpers';

// Safe user type — never stores password
type SafeUser = Omit<StaffUser, 'password'>;

interface AppState {
  // Auth
  currentUser: SafeUser | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => boolean;
  logout: () => void;

  // Theme & Layout
  theme: 'dark' | 'light';
  toggleTheme: () => void;
  isSidebarOpen: boolean;
  toggleSidebar: () => void;

  // Data
  members: Member[];
  plans: Plan[];
  payments: Payment[];
  attendance: AttendanceRecord[];
  trainers: Trainer[];
  leads: Lead[];
  expenses: Expense[];
  equipment: Equipment[];
  notifications: Notification[];
  subscriptions: Subscription[];
  ptSessions: PTSession[];
  bodyMeasurements: BodyMeasurement[];
  settings: typeof GYM_SETTINGS;

  // Member CRUD
  addMember: (member: Member) => void;
  updateMember: (id: string, updates: Partial<Member>) => void;
  deleteMember: (id: string) => void;
  getNextMemberId: () => string;
  renewMember: (memberId: string, planId: string, paymentMode: string) => void;

  // Plan CRUD
  addPlan: (plan: Plan) => void;
  updatePlan: (id: string, updates: Partial<Plan>) => void;
  deletePlan: (id: string) => void;

  // Payment
  addPayment: (payment: Payment) => void;

  // Attendance
  addAttendance: (record: AttendanceRecord) => void;

  // Lead CRUD
  addLead: (lead: Lead) => void;
  updateLead: (id: string, updates: Partial<Lead>) => void;

  // Expense
  addExpense: (expense: Expense) => void;

  // Equipment CRUD
  addEquipment: (asset: Equipment) => void;
  updateEquipment: (id: string, updates: Partial<Equipment>) => void;
  deleteEquipment: (id: string) => void;

  // Trainer CRUD
  addTrainer: (trainer: Trainer) => void;
  updateTrainer: (id: string, updates: Partial<Trainer>) => void;
  deleteTrainer: (id: string) => void;

  // Subscriptions
  addSubscription: (sub: Subscription) => void;
  updateSubscription: (id: string, updates: Partial<Subscription>) => void;

  // PT Sessions
  addPTSession: (session: PTSession) => void;
  updatePTSession: (id: string, updates: Partial<PTSession>) => void;

  // Body Measurements
  addBodyMeasurement: (m: BodyMeasurement) => void;

  // Notification
  markNotificationRead: (id: string) => void;
  markAllRead: () => void;

  // Settings
  updateSettings: (updates: Partial<typeof GYM_SETTINGS>) => void;

  // Toast
  toasts: ToastItem[];
  addToast: (message: string, type: ToastItem['type']) => void;
  removeToast: (id: string) => void;
}

export interface ToastItem {
  id: string;
  message: string;
  type: 'success' | 'error' | 'warning' | 'info';
}

const AppContext = createContext<AppState | null>(null);

const LS_KEY = 'gms_data';
const LS_THEME_KEY = 'gms_theme';
const LS_USER_KEY = 'gms_user';
const LS_MEMBER_COUNTER = 'gms_member_counter';

function loadFromStorage<T>(key: string, fallback: T): T {
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : fallback;
  } catch {
    return fallback;
  }
}

function saveToStorage(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.error('LocalStorage error:', e);
  }
}

/** Load + validate user session — verify against STAFF_USERS to prevent localStorage injection */
function loadValidatedUser(): SafeUser | null {
  try {
    const stored = localStorage.getItem(LS_USER_KEY);
    if (!stored) return null;
    const parsed = JSON.parse(stored) as SafeUser;
    // Validate: must be a real user in STAFF_USERS with matching id, email, and active=true
    const realUser = STAFF_USERS.find(u => u.id === parsed.id && u.email === parsed.email && u.active);
    if (!realUser) {
      localStorage.removeItem(LS_USER_KEY);
      return null;
    }
    // Return safe user (no password)
    const { password: _, ...safe } = realUser;
    return safe;
  } catch {
    localStorage.removeItem(LS_USER_KEY);
    return null;
  }
}

/** Compute member status dynamically from expiryDate */
function computeMemberStatus(expiryDate: string): Member['status'] {
  const days = daysUntil(expiryDate);
  if (days <= 0) return 'Expired';
  if (days <= 7) return 'Expiring Soon';
  return 'Active';
}

/** Hydrate members with live daysRemaining + status so stale data is never shown */
function hydrateMember(m: Member): Member {
  const days = daysUntil(m.expiryDate);
  return { ...m, daysRemaining: days, status: m.status === 'Frozen' ? 'Frozen' : computeMemberStatus(m.expiryDate) };
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUser] = useState<SafeUser | null>(loadValidatedUser);
  const [theme, setTheme] = useState<'dark' | 'light'>(
    loadFromStorage<'dark' | 'light'>(LS_THEME_KEY, 'dark')
  );
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Load data — hydrate members with live daysRemaining on load
  const [members, setMembers] = useState<Member[]>(() =>
    loadFromStorage<Member[]>(`${LS_KEY}_members`, MEMBERS).map(hydrateMember)
  );
  const [plans, setPlans] = useState<Plan[]>(
    loadFromStorage(`${LS_KEY}_plans`, PLANS)
  );
  const [payments, setPayments] = useState<Payment[]>(
    loadFromStorage(`${LS_KEY}_payments`, PAYMENTS)
  );
  const [attendance, setAttendance] = useState<AttendanceRecord[]>(
    loadFromStorage(`${LS_KEY}_attendance`, ATTENDANCE)
  );
  const [trainers, setTrainers] = useState<Trainer[]>(
    loadFromStorage(`${LS_KEY}_trainers`, TRAINERS)
  );
  const [leads, setLeads] = useState<Lead[]>(
    loadFromStorage(`${LS_KEY}_leads`, LEADS)
  );
  const [expenses, setExpenses] = useState<Expense[]>(
    loadFromStorage(`${LS_KEY}_expenses`, EXPENSES)
  );
  const [equipment, setEquipment] = useState<Equipment[]>(
    loadFromStorage(`${LS_KEY}_equipment`, EQUIPMENT)
  );
  const [notifications, setNotifications] = useState<Notification[]>(
    loadFromStorage(`${LS_KEY}_notifications`, NOTIFICATIONS)
  );
  const [settings, setSettings] = useState(
    loadFromStorage(`${LS_KEY}_settings`, GYM_SETTINGS)
  );
  const [subscriptions, setSubscriptions] = useState<Subscription[]>(
    loadFromStorage(`${LS_KEY}_subscriptions`, SUBSCRIPTIONS)
  );
  const [ptSessions, setPtSessions] = useState<PTSession[]>(
    loadFromStorage(`${LS_KEY}_ptSessions`, PT_SESSIONS)
  );
  const [bodyMeasurements, setBodyMeasurements] = useState<BodyMeasurement[]>(
    loadFromStorage(`${LS_KEY}_bodyMeasurements`, BODY_MEASUREMENTS)
  );
  const [memberCounter, setMemberCounter] = useState<number>(
    loadFromStorage<number>(LS_MEMBER_COUNTER, 1004) // start after demo data (GMS-1001, 1002, 1003)
  );
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  // Apply theme to document
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    saveToStorage(LS_THEME_KEY, theme);
  }, [theme]);

  // Persist data
  useEffect(() => { saveToStorage(`${LS_KEY}_members`, members); }, [members]);
  useEffect(() => { saveToStorage(`${LS_KEY}_payments`, payments); }, [payments]);
  useEffect(() => { saveToStorage(`${LS_KEY}_attendance`, attendance); }, [attendance]);
  useEffect(() => { saveToStorage(`${LS_KEY}_leads`, leads); }, [leads]);
  useEffect(() => { saveToStorage(`${LS_KEY}_expenses`, expenses); }, [expenses]);
  useEffect(() => { saveToStorage(`${LS_KEY}_equipment`, equipment); }, [equipment]);
  useEffect(() => { saveToStorage(`${LS_KEY}_notifications`, notifications); }, [notifications]);
  useEffect(() => { saveToStorage(`${LS_KEY}_settings`, settings); }, [settings]);
  useEffect(() => { saveToStorage(`${LS_KEY}_trainers`, trainers); }, [trainers]);
  useEffect(() => { saveToStorage(`${LS_KEY}_subscriptions`, subscriptions); }, [subscriptions]);
  useEffect(() => { saveToStorage(`${LS_KEY}_ptSessions`, ptSessions); }, [ptSessions]);
  useEffect(() => { saveToStorage(`${LS_KEY}_bodyMeasurements`, bodyMeasurements); }, [bodyMeasurements]);
  useEffect(() => { saveToStorage(LS_MEMBER_COUNTER, memberCounter); }, [memberCounter]);

  const login = (email: string, password: string): boolean => {
    const user = STAFF_USERS.find(u => u.email === email && u.password === password && u.active);
    if (user) {
      // NEVER store password in localStorage — strip it first
      const { password: _, ...safeUser } = user;
      setCurrentUser(safeUser);
      saveToStorage(LS_USER_KEY, safeUser);
      return true;
    }
    return false;
  };

  const logout = () => {
    setCurrentUser(null);
    localStorage.removeItem(LS_USER_KEY);
  };

  const toggleTheme = () => setTheme(prev => prev === 'dark' ? 'light' : 'dark');
  const toggleSidebar = () => setIsSidebarOpen(prev => !prev);

  /** Get next unique member ID using a persistent counter */
  const getNextMemberId = (): string => {
    const id = `GMS-${String(memberCounter).padStart(4, '0')}`;
    setMemberCounter(c => c + 1);
    return id;
  };

  const addMember = (member: Member) => setMembers(prev => [hydrateMember(member), ...prev]);
  const updateMember = (id: string, updates: Partial<Member>) =>
    setMembers(prev => prev.map(m => m.id === id ? hydrateMember({ ...m, ...updates }) : m));
  const deleteMember = (id: string) => setMembers(prev => prev.filter(m => m.id !== id));

  /** Renew a member's membership */
  const renewMember = (memberId: string, planId: string, paymentMode: string) => {
    const plan = plans.find(p => p.id === planId);
    if (!plan) return;
    const today = new Date().toISOString().split('T')[0];
    const newExpiry = addDays(today, plan.duration);
    const member = members.find(m => m.id === memberId);
    if (!member) return;
    updateMember(memberId, {
      planId: plan.id,
      planName: plan.name,
      expiryDate: newExpiry,
      status: 'Active',
      daysRemaining: plan.duration,
    });
    const base = plan.price;
    const gst = Math.round(plan.price * 0.18);
    const total = base + gst;
    const payment: Payment = {
      id: generateId(),
      receiptNo: generateReceiptNo(),
      memberId,
      memberName: member.name,
      memberPhone: member.phone,
      planName: plan.name,
      amount: base,
      discount: 0,
      gst,
      totalAmount: total,
      paymentMode: paymentMode as Payment['paymentMode'],
      date: today,
      time: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
      category: 'Membership',
      collectedBy: currentUser?.name ?? 'Staff',
    };
    addPayment(payment);
  };

  const addPlan = (plan: Plan) => setPlans(prev => [...prev, plan]);
  const updatePlan = (id: string, updates: Partial<Plan>) =>
    setPlans(prev => prev.map(p => p.id === id ? { ...p, ...updates } : p));
  const deletePlan = (id: string) => setPlans(prev => prev.filter(p => p.id !== id));

  const addPayment = (payment: Payment) => setPayments(prev => [payment, ...prev]);
  const addAttendance = (record: AttendanceRecord) => setAttendance(prev => [record, ...prev]);

  const addLead = (lead: Lead) => setLeads(prev => [lead, ...prev]);
  const updateLead = (id: string, updates: Partial<Lead>) =>
    setLeads(prev => prev.map(l => l.id === id ? { ...l, ...updates } : l));

  const addExpense = (expense: Expense) => setExpenses(prev => [expense, ...prev]);

  const addEquipment = (asset: Equipment) => setEquipment(prev => [asset, ...prev]);
  const updateEquipment = (id: string, updates: Partial<Equipment>) =>
    setEquipment(prev => prev.map(e => e.id === id ? { ...e, ...updates } : e));
  const deleteEquipment = (id: string) => setEquipment(prev => prev.filter(e => e.id !== id));

  const addTrainer = (trainer: Trainer) => setTrainers(prev => [...prev, trainer]);
  const updateTrainer = (id: string, updates: Partial<Trainer>) =>
    setTrainers(prev => prev.map(t => t.id === id ? { ...t, ...updates } : t));
  const deleteTrainer = (id: string) => setTrainers(prev => prev.filter(t => t.id !== id));

  const addSubscription = (sub: Subscription) => setSubscriptions(prev => [sub, ...prev]);
  const updateSubscription = (id: string, updates: Partial<Subscription>) =>
    setSubscriptions(prev => prev.map(s => s.id === id ? { ...s, ...updates } : s));

  const addPTSession = (session: PTSession) => setPtSessions(prev => [session, ...prev]);
  const updatePTSession = (id: string, updates: Partial<PTSession>) =>
    setPtSessions(prev => prev.map(s => s.id === id ? { ...s, ...updates } : s));

  const addBodyMeasurement = (m: BodyMeasurement) => setBodyMeasurements(prev => [m, ...prev]);

  const markNotificationRead = (id: string) =>
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  const markAllRead = () => setNotifications(prev => prev.map(n => ({ ...n, read: true })));

  const updateSettings = (updates: Partial<typeof GYM_SETTINGS>) =>
    setSettings((prev: typeof GYM_SETTINGS) => ({ ...prev, ...updates }));

  const addToast = (message: string, type: ToastItem['type']) => {
    const id = Date.now().toString();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => removeToast(id), 4000);
  };
  const removeToast = (id: string) => setToasts(prev => prev.filter(t => t.id !== id));

  const value: AppState = {
    currentUser, isAuthenticated: !!currentUser, login, logout,
    theme, toggleTheme, isSidebarOpen, toggleSidebar,
    members, plans, payments, attendance, trainers, leads, expenses, equipment,
    notifications, subscriptions, ptSessions, bodyMeasurements, settings,
    addMember, updateMember, deleteMember, getNextMemberId, renewMember,
    addPlan, updatePlan, deletePlan,
    addPayment, addAttendance,
    addLead, updateLead,
    addExpense,
    addEquipment, updateEquipment, deleteEquipment,
    addTrainer, updateTrainer, deleteTrainer,
    addSubscription, updateSubscription,
    addPTSession, updatePTSession,
    addBodyMeasurement,
    markNotificationRead, markAllRead,
    updateSettings,
    toasts, addToast, removeToast,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp(): AppState {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
