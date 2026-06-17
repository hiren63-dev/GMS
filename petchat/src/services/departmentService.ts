import { db } from './firebase';
import { collection, getDocs, query, where, addDoc, Timestamp } from 'firebase/firestore';

export interface Department {
  id: string;
  name: string;
  description: string;
  head: string;
  color: string;
  icon: string;
}

export const getDepartments = async (): Promise<Department[]> => {
  const snapshot = await getDocs(collection(db, 'departments'));
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Department));
};

export const getDepartmentMembers = async (deptName: string) => {
  const q = query(collection(db, 'employees'), where('department', '==', deptName));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => doc.data());
};

export const createDepartment = async (dept: Omit<Department, 'id'>) => {
  return addDoc(collection(db, 'departments'), dept);
};

const DEFAULT_DEPARTMENTS: Omit<Department, 'id'>[] = [
  { name: 'Tech', description: 'Engineering team', head: '', color: '#FF6B6B', icon: '💻' },
  { name: 'Marketing', description: 'Marketing team', head: '', color: '#4ECDC4', icon: '📢' },
  { name: 'Operations', description: 'Operations team', head: '', color: '#FFE66D', icon: '⚙️' },
  { name: 'Sales', description: 'Sales team', head: '', color: '#95E1D3', icon: '💰' },
  { name: 'CEO', description: 'Executive', head: '', color: '#A8E6CF', icon: '👑' },
  { name: 'CFO', description: 'Finance', head: '', color: '#FFD3B6', icon: '💎' },
  { name: 'CMO', description: 'Chief Marketing', head: '', color: '#FFAAA5', icon: '🎯' },
];

export const initializeDepartments = async () => {
  const existing = await getDepartments();
  if (existing.length === 0) {
    for (const dept of DEFAULT_DEPARTMENTS) {
      await createDepartment(dept);
    }
  }
};
