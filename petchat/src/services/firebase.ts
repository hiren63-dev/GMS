import { initializeApp } from 'firebase/app';
import {
  getFirestore, collection, addDoc, query, where, onSnapshot,
  updateDoc, doc, getDocs, deleteDoc, setDoc, orderBy, limit,
  Timestamp, getDoc,
} from 'firebase/firestore';
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, onAuthStateChanged } from 'firebase/auth';
import type { Employee, Task, LoginLog, CheckInResponse, Announcement, Objective, ActivityEntry, Shift, Integration } from '../types';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);

// ── helpers ───────────────────────────────────────────────────────────────
const snapList = <T>(ref: any, cb: (items: T[]) => void) =>
  onSnapshot(ref, (s: any) => cb(s.docs.map((d: any) => ({ id: d.id, ...d.data() }) as T)));

const toMs = (v: any): number => {
  if (!v) return Date.now();
  if (typeof v === 'number') return v;
  if (v instanceof Timestamp) return v.toMillis();
  if (v?.toMillis) return v.toMillis();
  return new Date(v).getTime();
};

// ── Auth ──────────────────────────────────────────────────────────────────
export const registerAdmin = (email: string, pw: string) => createUserWithEmailAndPassword(auth, email, pw);
export const loginAdmin    = (email: string, pw: string) => signInWithEmailAndPassword(auth, email, pw);
export const logoutAdmin   = () => signOut(auth);
export const onAuthChange  = (cb: (u: any) => void) => onAuthStateChanged(auth, cb);

// ── Employees ─────────────────────────────────────────────────────────────
export const addEmployee = (e: Omit<Employee, 'id'>) =>
  addDoc(collection(db, 'employees'), { ...e, createdAt: Date.now() });

export const getEmployees = async (): Promise<Employee[]> => {
  const s = await getDocs(collection(db, 'employees'));
  return s.docs.map(d => ({ id: d.id, ...d.data() } as Employee));
};

export const updateEmployee = (id: string, data: Partial<Employee>) =>
  updateDoc(doc(db, 'employees', id), data as any);

export const deleteEmployee = (id: string) => deleteDoc(doc(db, 'employees', id));

export const onEmployeesChange = (cb: (employees: Employee[]) => void) =>
  snapList<Employee>(collection(db, 'employees'), cb);

export const updateEmployeeStatus = (id: string, status: Employee['status']) =>
  updateDoc(doc(db, 'employees', id), { status, lastSeen: Date.now() });

// ── Messages ──────────────────────────────────────────────────────────────
export const sendMessage = (msg: Record<string, any>) =>
  addDoc(collection(db, 'messages'), { ...msg, timestamp: Date.now() });

export const onMessagesChange = (userId: string, otherId: string, cb: (msgs: any[]) => void) => {
  const q = query(collection(db, 'messages'), orderBy('timestamp', 'asc'));
  return onSnapshot(q, s => {
    const msgs = s.docs
      .map(d => ({ id: d.id, ...d.data() }))
      .filter((m: any) =>
        !m.isGroupChat && (
          (m.senderId === userId && m.recipientId === otherId) ||
          (m.senderId === otherId && m.recipientId === userId)
        )
      );
    cb(msgs);
  });
};

export const getConversationPartners = async (userId: string, allEmployees: Employee[]): Promise<Employee[]> => {
  const s = await getDocs(query(collection(db, 'messages'), where('isGroupChat', '==', false)));
  const partnerIds = new Set<string>();
  s.docs.forEach(d => {
    const m = d.data() as any;
    if (m.senderId === userId) partnerIds.add(m.recipientId);
    if (m.recipientId === userId) partnerIds.add(m.senderId);
  });
  return allEmployees.filter(e => partnerIds.has(e.id) && e.id !== userId);
};

// ── Tasks ─────────────────────────────────────────────────────────────────
export const createTask = (t: Omit<Task, 'id'>) =>
  addDoc(collection(db, 'tasks'), { ...t, createdAt: Date.now() });

export const updateTask = (id: string, data: Partial<Task>) =>
  updateDoc(doc(db, 'tasks', id), data as any);

export const deleteTask = (id: string) => deleteDoc(doc(db, 'tasks', id));

export const getAllTasks = async (): Promise<Task[]> => {
  const s = await getDocs(collection(db, 'tasks'));
  return s.docs.map(d => ({ id: d.id, ...d.data() } as Task));
};

export const onUserTasksChange = (userId: string, cb: (tasks: Task[]) => void) =>
  snapList<Task>(query(collection(db, 'tasks'), where('assigneeId', '==', userId)), cb);

export const onAllTasksChange = (cb: (tasks: Task[]) => void) =>
  snapList<Task>(collection(db, 'tasks'), cb);

// ── Login / Time Tracking ─────────────────────────────────────────────────
export const logLogin = async (employeeId: string, employeeName: string): Promise<string> => {
  const today = new Date().toISOString().split('T')[0];
  const q = query(collection(db, 'loginLogs'), where('employeeId', '==', employeeId), where('date', '==', today));
  const s = await getDocs(q);
  if (!s.empty) return s.docs[0].id;
  const ref = await addDoc(collection(db, 'loginLogs'), {
    employeeId, employeeName,
    loginTime: Date.now(), logoutTime: null, date: today,
  });
  await updateEmployeeStatus(employeeId, 'active').catch(() => {});
  await logActivity({ employeeId, employeeName, type: 'login', detail: 'Clocked in', timestamp: Date.now() });
  return ref.id;
};

export const logLogout = async (logId: string, employeeId: string) => {
  const ref = doc(db, 'loginLogs', logId);
  const s = await getDoc(ref);
  if (!s.exists()) return;
  const loginTime = toMs((s.data() as any).loginTime);
  const duration = parseFloat(((Date.now() - loginTime) / 3600000).toFixed(2));
  await updateDoc(ref, { logoutTime: Date.now(), duration });
  await updateEmployeeStatus(employeeId, 'offline').catch(() => {});
};

export const getTodaysLog = async (employeeId: string): Promise<LoginLog | null> => {
  const today = new Date().toISOString().split('T')[0];
  const q = query(collection(db, 'loginLogs'), where('employeeId', '==', employeeId), where('date', '==', today));
  const s = await getDocs(q);
  if (s.empty) return null;
  return { id: s.docs[0].id, ...s.docs[0].data() } as LoginLog;
};

export const getTimeLogs = async (employeeId: string, limitN = 7): Promise<LoginLog[]> => {
  const q = query(collection(db, 'loginLogs'), where('employeeId', '==', employeeId), orderBy('loginTime', 'desc'), limit(limitN));
  const s = await getDocs(q);
  return s.docs.map(d => ({ id: d.id, ...d.data() } as LoginLog));
};

export const onLoginLogsChange = (cb: (logs: LoginLog[]) => void) =>
  snapList<LoginLog>(collection(db, 'loginLogs'), cb);

export const getTodaysActiveCount = async (): Promise<number> => {
  const today = new Date().toISOString().split('T')[0];
  const q = query(collection(db, 'loginLogs'), where('date', '==', today));
  const s = await getDocs(q);
  return s.docs.filter(d => !(d.data() as any).logoutTime).length;
};

// ── Check-Ins ─────────────────────────────────────────────────────────────
export const submitCheckIn = (ci: Omit<CheckInResponse, 'id'>) =>
  addDoc(collection(db, 'checkIns'), { ...ci, date: Date.now(), status: 'completed' });

export const getTodaysCheckIn = async (employeeId: string): Promise<CheckInResponse | null> => {
  const todayStr = new Date().toDateString();
  const q = query(collection(db, 'checkIns'), where('employeeId', '==', employeeId));
  const s = await getDocs(q);
  const d = s.docs.find(x => new Date(toMs((x.data() as any).date)).toDateString() === todayStr);
  return d ? ({ id: d.id, ...d.data() } as CheckInResponse) : null;
};

export const onCheckInsChange = (cb: (cis: CheckInResponse[]) => void) =>
  snapList<CheckInResponse>(collection(db, 'checkIns'), cb);

// ── Announcements ─────────────────────────────────────────────────────────
export const createAnnouncement = (a: Omit<Announcement, 'id'>) =>
  addDoc(collection(db, 'announcements'), { ...a, createdAt: Date.now() });

export const updateAnnouncement = (id: string, data: Partial<Announcement>) =>
  updateDoc(doc(db, 'announcements', id), data as any);

export const deleteAnnouncement = (id: string) =>
  deleteDoc(doc(db, 'announcements', id));

export const onAnnouncementsChange = (cb: (items: Announcement[]) => void) => {
  const q = query(collection(db, 'announcements'), orderBy('createdAt', 'desc'));
  return snapList<Announcement>(q, cb);
};

export const filterAnnouncements = (items: Announcement[], employee: Employee): Announcement[] =>
  items.filter(a =>
    a.audience.includes('all') ||
    a.audience.includes(employee.department) ||
    a.audience.includes(employee.id)
  );

// ── OKRs ──────────────────────────────────────────────────────────────────
export const createObjective = (o: Omit<Objective, 'id'>) =>
  addDoc(collection(db, 'objectives'), { ...o, createdAt: Date.now() });

export const updateObjective = (id: string, data: Partial<Objective>) =>
  updateDoc(doc(db, 'objectives', id), data as any);

export const deleteObjective = (id: string) =>
  deleteDoc(doc(db, 'objectives', id));

export const onObjectivesChange = (cb: (items: Objective[]) => void) =>
  snapList<Objective>(collection(db, 'objectives'), cb);

// ── Activity Feed ─────────────────────────────────────────────────────────
export const logActivity = (entry: Omit<ActivityEntry, 'id'>) =>
  addDoc(collection(db, 'activity'), entry).catch(() => {});

export const onActivityChange = (cb: (items: ActivityEntry[]) => void) => {
  const q = query(collection(db, 'activity'), orderBy('timestamp', 'desc'), limit(50));
  return snapList<ActivityEntry>(q, cb);
};

// ── Shifts ────────────────────────────────────────────────────────────────
export const setShift = (employeeId: string, data: Partial<Shift>) =>
  setDoc(doc(db, 'shifts', employeeId), data, { merge: true });

export const onShiftsChange = (cb: (shifts: Record<string, Shift>) => void) =>
  onSnapshot(collection(db, 'shifts'), s => {
    const map: Record<string, Shift> = {};
    s.docs.forEach(d => { map[d.id] = d.data() as Shift; });
    cb(map);
  });

// ── Integrations ──────────────────────────────────────────────────────────
export const saveIntegration = (id: string, data: Partial<Integration>) =>
  setDoc(doc(db, 'integrations', id), data, { merge: true });

export const onIntegrationsChange = (cb: (items: Integration[]) => void) =>
  snapList<Integration>(collection(db, 'integrations'), cb);

// ── Admin Settings ────────────────────────────────────────────────────────
export const saveAdminSettings = (data: any) =>
  setDoc(doc(db, 'adminSettings', 'config'), data, { merge: true });

export const getAdminSettings = async () => {
  const s = await getDoc(doc(db, 'adminSettings', 'config'));
  return s.exists() ? s.data() : {};
};

export const onAdminSettingsChange = (cb: (s: any) => void) =>
  onSnapshot(doc(db, 'adminSettings', 'config'), s => cb(s.exists() ? s.data() : {}));
