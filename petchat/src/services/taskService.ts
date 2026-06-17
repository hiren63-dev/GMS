import { db } from './firebase';
import {
  collection,
  addDoc,
  query,
  where,
  onSnapshot,
  updateDoc,
  doc,
  getDocs,
  deleteDoc,
  Timestamp,
  orderBy,
} from 'firebase/firestore';

export interface Task {
  id: string;
  userId: string;
  title: string;
  description: string;
  dueDate: Date | Timestamp;
  dueTime: string;
  priority: 'urgent' | 'high' | 'medium' | 'low';
  status: 'todo' | 'in_progress' | 'done' | 'blocked';
  parentTaskId?: string;
  subtasks: string[];
  assignedBy: string;
  tags: string[];
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
  completedAt?: Timestamp;
}

export const createTask = async (task: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>) => {
  return addDoc(collection(db, 'tasks'), {
    ...task,
    dueDate: task.dueDate instanceof Date ? Timestamp.fromDate(task.dueDate) : task.dueDate,
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  });
};

export const getUserTasks = async (userId: string): Promise<Task[]> => {
  const q = query(
    collection(db, 'tasks'),
    where('userId', '==', userId),
    orderBy('dueDate', 'asc')
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
  } as Task));
};

export const onUserTasksChange = (userId: string, callback: (tasks: Task[]) => void) => {
  const q = query(
    collection(db, 'tasks'),
    where('userId', '==', userId),
    orderBy('dueDate', 'asc')
  );
  return onSnapshot(q, (snapshot) => {
    const tasks = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    } as Task));
    callback(tasks);
  });
};

export const updateTask = async (taskId: string, data: Partial<Task>) => {
  return updateDoc(doc(db, 'tasks', taskId), {
    ...data,
    dueDate: data.dueDate instanceof Date ? Timestamp.fromDate(data.dueDate) : data.dueDate,
    updatedAt: Timestamp.now(),
  });
};

export const updateTaskStatus = async (taskId: string, status: Task['status']) => {
  const completedAt = status === 'done' ? Timestamp.now() : null;
  return updateDoc(doc(db, 'tasks', taskId), {
    status,
    ...(completedAt && { completedAt }),
    updatedAt: Timestamp.now(),
  });
};

export const deleteTask = async (taskId: string) => {
  return deleteDoc(doc(db, 'tasks', taskId));
};

export const getTasksByStatus = async (userId: string, status: Task['status']): Promise<Task[]> => {
  const q = query(
    collection(db, 'tasks'),
    where('userId', '==', userId),
    where('status', '==', status)
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Task));
};
