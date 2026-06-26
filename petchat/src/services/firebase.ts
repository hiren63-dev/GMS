import { initializeApp, deleteApp } from 'firebase/app';
import {
  getFirestore, collection, addDoc, query, where, onSnapshot,
  updateDoc, doc, getDocs, deleteDoc, setDoc, orderBy, limit,
  Timestamp, getDoc,
} from 'firebase/firestore';
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signInAnonymously, signOut, onAuthStateChanged } from 'firebase/auth';
import { getStorage, ref as sRef, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import type { Employee, Task, LoginLog, CheckInResponse, Announcement, Objective, ActivityEntry, Shift, Integration, ResourceFile } from '../types';

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
export const storage = getStorage(app);

// ── helpers ───────────────────────────────────────────────────────────────
const snapList = <T>(ref: any, cb: (items: T[]) => void) =>
  onSnapshot(ref, (s: any) => cb(s.docs.map((d: any) => ({ id: d.id, ...d.data() }) as T)));

const toMs = (v: any): number => {
  if (v === null || v === undefined) return 0;
  if (typeof v === 'number') return v;
  if (v instanceof Timestamp) return v.toMillis();
  if (v?.toMillis) return v.toMillis();
  const t = new Date(v).getTime();
  return Number.isNaN(t) ? 0 : t;
};

/** Local-timezone date key (YYYY-MM-DD). Avoids the UTC off-by-one for IST users. */
export const todayKey = (d: Date = new Date()): string => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

// ── Auth ──────────────────────────────────────────────────────────────────
export const registerAdmin = (email: string, pw: string) => createUserWithEmailAndPassword(auth, email, pw);
export const loginAdmin    = (email: string, pw: string) => signInWithEmailAndPassword(auth, email, pw);
export const loginAnon     = () => signInAnonymously(auth);
export const logoutAdmin   = () => signOut(auth);
export const onAuthChange  = (cb: (u: any) => void) => onAuthStateChanged(auth, cb);

// ── Employees ─────────────────────────────────────────────────────────────

/** Generate a readable random password like "Blue7Kite#42" */
export const generatePassword = (): string => {
  const words = ['Blue','Red','Sun','Sky','Fast','Bold','Star','Oak','Fox','Mist','Gold','Jade'];
  const nums  = () => Math.floor(Math.random() * 90 + 10);
  const syms  = ['!','#','@','$','%','&'];
  const sym   = syms[Math.floor(Math.random() * syms.length)];
  const w1    = words[Math.floor(Math.random() * words.length)];
  const w2    = words[Math.floor(Math.random() * words.length)];
  return `${w1}${nums()}${w2}${sym}${nums()}`;
};

/**
 * Create Firebase Auth user + Firestore employee record.
 * Uses a *secondary* Firebase app so creating the account does NOT sign the
 * admin out of their own session (createUserWithEmailAndPassword auto-switches
 * the active user on the app instance it's called against).
 * Stores password in Firestore for admin reference (internal tool).
 */
export const createEmployeeWithAuth = async (
  emp: Omit<Employee, 'id'> & { password: string }
): Promise<string> => {
  const secondaryApp = initializeApp(firebaseConfig, `secondary-${Date.now()}`);
  const secondaryAuth = getAuth(secondaryApp);
  try {
    const cred = await createUserWithEmailAndPassword(secondaryAuth, emp.email, emp.password);
    const ref = await addDoc(collection(db, 'employees'), {
      name: emp.name, email: emp.email, department: emp.department,
      role: emp.role, status: 'offline',
      shiftStart: emp.shiftStart ?? '', shiftEnd: emp.shiftEnd ?? '',
      password: emp.password,   // stored so admin can view/copy it
      authUid: cred.user.uid,
      createdAt: Date.now(),
    });
    await signOut(secondaryAuth).catch(() => {});
    return ref.id;
  } finally {
    await deleteApp(secondaryApp).catch(() => {});
  }
};

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
  addDoc(collection(db, 'messages'), {
    ...msg,
    // `participants` lets us query only a user's own messages via array-contains
    // (single-field index, no composite index needed) instead of scanning the
    // whole collection.
    participants: msg.isGroupChat
      ? []
      : [msg.senderId, msg.recipientId].filter(Boolean),
    timestamp: Date.now(),
  });

export const onMessagesChange = (userId: string, otherId: string, cb: (msgs: any[]) => void) => {
  // Only fetch messages this user is part of, then narrow to the pair + sort
  // client-side (avoids a composite index requirement on participants+timestamp).
  const q = query(collection(db, 'messages'), where('participants', 'array-contains', userId));
  return onSnapshot(q, s => {
    const msgs = s.docs
      .map(d => ({ id: d.id, ...d.data() }))
      .filter((m: any) =>
        !m.isGroupChat && (
          (m.senderId === userId && m.recipientId === otherId) ||
          (m.senderId === otherId && m.recipientId === userId)
        )
      )
      .sort((a: any, b: any) => (a.timestamp ?? 0) - (b.timestamp ?? 0));
    cb(msgs);
  });
};

export const getConversationPartners = async (userId: string, allEmployees: Employee[]): Promise<Employee[]> => {
  const s = await getDocs(query(collection(db, 'messages'), where('participants', 'array-contains', userId)));
  const partnerIds = new Set<string>();
  s.docs.forEach(d => {
    const m = d.data() as any;
    if (m.isGroupChat) return;
    if (m.senderId === userId) partnerIds.add(m.recipientId);
    if (m.recipientId === userId) partnerIds.add(m.senderId);
  });
  return allEmployees.filter(e => partnerIds.has(e.id) && e.id !== userId);
};

/** Live conversation-partner list (real-time, fixes stale contact list). */
export const onConversationPartnersChange = (
  userId: string,
  allEmployees: Employee[],
  cb: (partners: Employee[]) => void,
) => {
  const q = query(collection(db, 'messages'), where('participants', 'array-contains', userId));
  return onSnapshot(q, s => {
    const partnerIds = new Set<string>();
    s.docs.forEach(d => {
      const m = d.data() as any;
      if (m.isGroupChat) return;
      if (m.senderId === userId) partnerIds.add(m.recipientId);
      if (m.recipientId === userId) partnerIds.add(m.senderId);
    });
    cb(allEmployees.filter(e => partnerIds.has(e.id) && e.id !== userId));
  });
};

// ── Tasks ─────────────────────────────────────────────────────────────────
export const createTask = (t: Omit<Task, 'id'>) => {
  const data = Object.fromEntries(
    Object.entries({ ...t, createdAt: Date.now() }).filter(([, v]) => v !== undefined)
  );
  return addDoc(collection(db, 'tasks'), data);
};

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
  const today = todayKey();
  const q = query(collection(db, 'loginLogs'), where('employeeId', '==', employeeId), where('date', '==', today));
  const s = await getDocs(q);
  if (!s.empty) {
    const existing = s.docs[0].data() as any;
    // Return existing log only if still clocked in; if clocked out, fall through to create a new entry
    if (!existing.logoutTime) return s.docs[0].id;
  }
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
  const today = todayKey();
  const q = query(collection(db, 'loginLogs'), where('employeeId', '==', employeeId), where('date', '==', today));
  const s = await getDocs(q);
  if (s.empty) return null;
  // Sort client-side to get the most recent log (handles multiple clock-ins in one day)
  const sorted = [...s.docs].sort((a, b) => ((b.data() as any).loginTime ?? 0) - ((a.data() as any).loginTime ?? 0));
  return { id: sorted[0].id, ...sorted[0].data() } as LoginLog;
};

export const getTimeLogs = async (employeeId: string, limitN = 7): Promise<LoginLog[]> => {
  const q = query(collection(db, 'loginLogs'), where('employeeId', '==', employeeId), orderBy('loginTime', 'desc'), limit(limitN));
  const s = await getDocs(q);
  return s.docs.map(d => ({ id: d.id, ...d.data() } as LoginLog));
};

export const onLoginLogsChange = (cb: (logs: LoginLog[]) => void) =>
  snapList<LoginLog>(query(collection(db, 'loginLogs'), orderBy('loginTime', 'desc'), limit(300)), cb);

export const getTodaysActiveCount = async (): Promise<number> => {
  const today = todayKey();
  const q = query(collection(db, 'loginLogs'), where('date', '==', today));
  const s = await getDocs(q);
  return s.docs.filter(d => !(d.data() as any).logoutTime).length;
};

// ── Check-Ins ─────────────────────────────────────────────────────────────
/** Upserts today's check-in — submitting twice in one day overwrites, never duplicates. */
export const submitCheckIn = async (ci: Omit<CheckInResponse, 'id'>) => {
  const payload = { ...ci, date: Date.now(), dateKey: todayKey(), status: 'completed' as const };
  const existing = await getTodaysCheckIn(ci.employeeId);
  if (existing) return updateDoc(doc(db, 'checkIns', existing.id), payload as any);
  return addDoc(collection(db, 'checkIns'), payload);
};

export const getTodaysCheckIn = async (employeeId: string): Promise<CheckInResponse | null> => {
  // Query only this employee's check-ins (single-field index), then match today.
  const q = query(collection(db, 'checkIns'), where('employeeId', '==', employeeId));
  const s = await getDocs(q);
  const key = todayKey();
  const d = s.docs.find(x => {
    const data = x.data() as any;
    return data.dateKey === key || todayKey(new Date(toMs(data.date))) === key;
  });
  return d ? ({ id: d.id, ...d.data() } as CheckInResponse) : null;
};

export const onCheckInsChange = (cb: (cis: CheckInResponse[]) => void) =>
  snapList<CheckInResponse>(query(collection(db, 'checkIns'), orderBy('date', 'desc'), limit(300)), cb);

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
  addDoc(collection(db, 'activity'), entry).catch(e => console.warn('logActivity failed:', e));

/** Log a completed task to the activity feed (feeds Founder "Tasks Done" metric). */
export const logTaskDone = (employeeId: string, employeeName: string, taskTitle: string) =>
  logActivity({ employeeId, employeeName, type: 'task_done', detail: `Completed "${taskTitle}"`, timestamp: Date.now() });

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

// ── File Storage ──────────────────────────────────────────────────────────
/** Upload a file to Firebase Storage and return its public download URL. */
export const uploadFile = async (file: File, path: string): Promise<string> => {
  const r = sRef(storage, path);
  await uploadBytes(r, file);
  return getDownloadURL(r);
};

/** Delete a file from Firebase Storage by its full gs:// or download path. */
export const deleteStorageFile = async (url: string) => {
  try {
    const r = sRef(storage, url);
    await deleteObject(r);
  } catch { /* already deleted or path-based — ignore */ }
};

// ── Resource Library ──────────────────────────────────────────────────────
export const addResourceFile = (data: Omit<ResourceFile, 'id'>) =>
  addDoc(collection(db, 'resourceFiles'), data);

export const deleteResourceFile = async (id: string) => {
  await deleteDoc(doc(db, 'resourceFiles', id));
};

export const onResourceFilesChange = (cb: (files: ResourceFile[]) => void) => {
  const q = query(collection(db, 'resourceFiles'), orderBy('uploadedAt', 'desc'));
  return snapList<ResourceFile>(q, cb);
};
