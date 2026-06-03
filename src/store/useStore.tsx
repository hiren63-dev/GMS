// ============================================================
// GYM MANAGEMENT SYSTEM - GLOBAL STATE STORE (React Context)
// ============================================================
import { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import type { Member, Plan, Payment, AttendanceRecord, Trainer, Lead, Expense, Equipment, Notification, StaffUser, Subscription, PTSession, BodyMeasurement } from '../types';
import { MEMBERS, PLANS, PAYMENTS, ATTENDANCE, TRAINERS, LEADS, EXPENSES, EQUIPMENT, NOTIFICATIONS, STAFF_USERS, GYM_SETTINGS, SUBSCRIPTIONS, PT_SESSIONS, BODY_MEASUREMENTS } from '../data/demoData';

interface AppState {
  // Auth
  currentUser: StaffUser | null;
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

export function AppProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUser] = useState<StaffUser | null>(
    loadFromStorage<StaffUser | null>(LS_USER_KEY, null)
  );
  const [theme, setTheme] = useState<'dark' | 'light'>(
    loadFromStorage<'dark' | 'light'>(LS_THEME_KEY, 'dark')
  );
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Load data from localStorage or use demo data as initial
  const [members, setMembers] = useState<Member[]>(
    loadFromStorage(`${LS_KEY}_members`, MEMBERS)
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
  const [trainers] = useState<Trainer[]>(TRAINERS);
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
  const [subscriptions] = useState<Subscription[]>(SUBSCRIPTIONS);
  const [ptSessions] = useState<PTSession[]>(PT_SESSIONS);
  const [bodyMeasurements] = useState<BodyMeasurement[]>(BODY_MEASUREMENTS);
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

  const login = (email: string, password: string): boolean => {
    const user = STAFF_USERS.find(u => u.email === email && u.password === password);
    if (user) {
      setCurrentUser(user);
      saveToStorage(LS_USER_KEY, user);
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

  const addMember = (member: Member) => setMembers(prev => [member, ...prev]);
  const updateMember = (id: string, updates: Partial<Member>) =>
    setMembers(prev => prev.map(m => m.id === id ? { ...m, ...updates } : m));
  const deleteMember = (id: string) => setMembers(prev => prev.filter(m => m.id !== id));

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
    addMember, updateMember, deleteMember,
    addPlan, updatePlan, deletePlan,
    addPayment, addAttendance,
    addLead, updateLead,
    addExpense,
    addEquipment, updateEquipment, deleteEquipment,
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
