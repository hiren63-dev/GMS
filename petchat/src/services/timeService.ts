import { db } from './firebase';
import { collection, addDoc, query, where, getDocs, updateDoc, doc, Timestamp, orderBy } from 'firebase/firestore';

export interface TimeLog {
  id: string;
  userId: string;
  date: string;
  loginTime: Timestamp;
  logoutTime?: Timestamp;
  duration: number;
  breakTime: number;
  location: 'office' | 'remote';
  notes: string;
}

export const logLogin = async (userId: string) => {
  const today = new Date().toISOString().split('T')[0];
  
  // Check if already logged in
  const existing = await getTodaysLog(userId);
  if (existing) {
    return existing;
  }

  const docRef = await addDoc(collection(db, 'timeLogs'), {
    userId,
    date: today,
    loginTime: Timestamp.now(),
    duration: 0,
    breakTime: 0,
    location: 'office',
    notes: '',
  });

  return {
    id: docRef.id,
    userId,
    date: today,
    loginTime: Timestamp.now(),
    duration: 0,
    breakTime: 0,
    location: 'office' as const,
    notes: '',
  };
};

export const logLogout = async (timeLogId: string) => {
  const logDoc = await getDocs(query(collection(db, 'timeLogs'), where('__name__', '==', timeLogId)));
  
  if (logDoc.empty) return null;

  const log = logDoc.docs[0].data();
  const loginTime = log.loginTime.toMillis();
  const logoutTime = Date.now();
  const duration = (logoutTime - loginTime) / (1000 * 60 * 60);

  await updateDoc(doc(db, 'timeLogs', timeLogId), {
    logoutTime: Timestamp.now(),
    duration: Math.round(duration * 100) / 100,
  });

  return {
    ...log,
    logoutTime: Timestamp.now(),
    duration: Math.round(duration * 100) / 100,
  };
};

export const getTodaysLog = async (userId: string): Promise<TimeLog | null> => {
  const today = new Date().toISOString().split('T')[0];
  const q = query(
    collection(db, 'timeLogs'),
    where('userId', '==', userId),
    where('date', '==', today)
  );
  const snapshot = await getDocs(q);
  return snapshot.empty ? null : ({ id: snapshot.docs[0].id, ...snapshot.docs[0].data() } as TimeLog);
};

export const getTimeLogs = async (userId: string, limit = 30): Promise<TimeLog[]> => {
  const q = query(
    collection(db, 'timeLogs'),
    where('userId', '==', userId),
    orderBy('date', 'desc')
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.slice(0, limit).map(doc => ({ id: doc.id, ...doc.data() } as TimeLog));
};
