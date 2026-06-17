# 🚀 SPRINT 1: Foundation & Auth Implementation

**Duration:** Week 1-2  
**Goal:** Set up Firebase schema, expand PetChat with task/time tracking, deploy v2.0  
**Team:** You (1 developer)  

---

## 📋 CHECKLIST

### **Day 1-2: Firebase Setup**

- [ ] **Update Firestore Collections**
  - Create: `departments`
  - Create: `tasks`
  - Create: `timeLogs`
  - Create: `conversations` (renamed from current messages)
  - Create: `resources`
  - Create: `notifications`
  - Add missing fields to `users` (department, role, status, preferences)

- [ ] **Add Firebase Security Rules**
  - Deploy rules from ARCHITECTURE.md
  - Test read/write permissions
  - Verify user isolation

- [ ] **Add Firestore Indexes**
  - tasks: userId + dueDate
  - tasks: status + userId
  - timeLogs: userId + date
  - messages: conversationId + timestamp
  - notifications: userId + read

**Command to add indexes:** Use Firebase Console → Firestore → Indexes tab

---

### **Day 3-5: Expand React App**

#### **1. Update Types** (`src/types/index.ts`)
Add to existing file:
```typescript
// Tasks
export interface Task {
  id: string;
  userId: string;
  title: string;
  description: string;
  dueDate: Timestamp;
  dueTime: string; // HH:mm
  priority: 'urgent' | 'high' | 'medium' | 'low';
  status: 'todo' | 'in_progress' | 'done' | 'blocked';
  parentTaskId?: string;
  subtasks: string[];
  assignedBy: string;
  tags: string[];
  createdAt: Timestamp;
  updatedAt: Timestamp;
  completedAt?: Timestamp;
}

// Time Logs
export interface TimeLog {
  id: string;
  userId: string;
  date: string; // YYYY-MM-DD
  loginTime: Timestamp;
  logoutTime?: Timestamp;
  duration: number; // hours
  breakTime: number; // minutes
  location: 'office' | 'remote';
  notes: string;
}

// Departments
export interface Department {
  id: string;
  name: string;
  description: string;
  head: string; // userId
  color: string;
  icon: string;
}

// Resources
export interface Resource {
  id: string;
  departmentId: string;
  type: 'document' | 'codebase' | 'file' | 'link';
  name: string;
  description: string;
  url: string;
  fileSize: number;
  uploadedBy: string;
  tags: string[];
  accessLevel: 'public' | 'department' | 'restricted';
  sharedWith: string[];
  createdAt: Timestamp;
  lastModified: Timestamp;
}
```

#### **2. Create New Services** 

**`src/services/taskService.ts`**
```typescript
import { db } from './firebase';
import { collection, addDoc, query, where, onSnapshot, updateDoc, doc, getDocs, Timestamp } from 'firebase/firestore';
import { Task } from '../types';

export const createTask = async (task: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>) => {
  return addDoc(collection(db, 'tasks'), {
    ...task,
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  });
};

export const getUserTasks = async (userId: string) => {
  const q = query(collection(db, 'tasks'), where('userId', '==', userId));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Task));
};

export const onUserTasksChange = (userId: string, callback: (tasks: Task[]) => void) => {
  const q = query(collection(db, 'tasks'), where('userId', '==', userId));
  return onSnapshot(q, (snapshot) => {
    const tasks = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Task));
    callback(tasks);
  });
};

export const updateTask = async (taskId: string, data: Partial<Task>) => {
  return updateDoc(doc(db, 'tasks', taskId), {
    ...data,
    updatedAt: Timestamp.now(),
  });
};

export const updateTaskStatus = async (taskId: string, status: Task['status']) => {
  const completedAt = status === 'done' ? Timestamp.now() : null;
  return updateDoc(doc(db, 'tasks', taskId), {
    status,
    completedAt,
    updatedAt: Timestamp.now(),
  });
};
```

**`src/services/timeService.ts`**
```typescript
import { db } from './firebase';
import { collection, addDoc, query, where, onSnapshot, getDocs, updateDoc, doc, Timestamp } from 'firebase/firestore';
import { TimeLog } from '../types';

export const logLogin = async (userId: string) => {
  const today = new Date().toISOString().split('T')[0];
  return addDoc(collection(db, 'timeLogs'), {
    userId,
    date: today,
    loginTime: Timestamp.now(),
    duration: 0,
    breakTime: 0,
    location: 'office',
    notes: '',
  });
};

export const logLogout = async (timeLogId: string) => {
  const log = await getDocs(query(collection(db, 'timeLogs'), where('__name__', '==', timeLogId)));
  const loginTime = log.docs[0].data().loginTime.toMillis();
  const logoutTime = Date.now();
  const duration = (logoutTime - loginTime) / (1000 * 60 * 60); // hours
  
  return updateDoc(doc(db, 'timeLogs', timeLogId), {
    logoutTime: Timestamp.now(),
    duration: Math.round(duration * 10) / 10,
  });
};

export const getTodaysLog = async (userId: string) => {
  const today = new Date().toISOString().split('T')[0];
  const q = query(collection(db, 'timeLogs'), where('userId', '==', userId), where('date', '==', today));
  const snapshot = await getDocs(q);
  return snapshot.docs[0]?.data() as TimeLog | undefined;
};

export const onTimeLogs = (userId: string, callback: (logs: TimeLog[]) => void) => {
  const q = query(collection(db, 'timeLogs'), where('userId', '==', userId));
  return onSnapshot(q, (snapshot) => {
    const logs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as TimeLog));
    callback(logs);
  });
};
```

**`src/services/departmentService.ts`**
```typescript
import { db } from './firebase';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { Department } from '../types';

export const getDepartments = async () => {
  const snapshot = await getDocs(collection(db, 'departments'));
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Department));
};

export const getDepartmentMembers = async (deptId: string) => {
  const q = query(collection(db, 'users'), where('department', '==', deptId));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => doc.data());
};
```

#### **3. Create New Components**

**`src/components/TaskBoard.tsx`** (Quick version)
```typescript
import { useState, useEffect } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { createTask, onUserTasksChange, updateTaskStatus } from '../services/taskService';
import { Task } from '../types';

export default function TaskBoard({ userId }: { userId: string }) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [newTask, setNewTask] = useState('');

  useEffect(() => {
    const unsub = onUserTasksChange(userId, setTasks);
    return unsub;
  }, [userId]);

  const handleAddTask = async () => {
    if (!newTask.trim()) return;
    await createTask({
      userId,
      title: newTask,
      description: '',
      priority: 'medium',
      status: 'todo',
      subtasks: [],
      assignedBy: userId,
      tags: [],
      dueDate: new Date(),
      dueTime: '17:00',
    });
    setNewTask('');
  };

  const handleStatusChange = (taskId: string, status: Task['status']) => {
    updateTaskStatus(taskId, status);
  };

  return (
    <div className="p-6 bg-white rounded-lg">
      <h2 className="text-2xl font-bold mb-4">My Tasks</h2>
      
      <div className="flex gap-2 mb-6">
        <input
          type="text"
          value={newTask}
          onChange={(e) => setNewTask(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && handleAddTask()}
          placeholder="Add new task..."
          className="flex-1 px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
        />
        <button onClick={handleAddTask} className="bg-primary text-white px-4 py-2 rounded-lg hover:bg-opacity-90">
          <Plus size={20} />
        </button>
      </div>

      <div className="grid grid-cols-4 gap-4">
        {['todo', 'in_progress', 'done', 'blocked'].map(status => (
          <div key={status} className="bg-gray-100 p-4 rounded-lg">
            <h3 className="font-semibold mb-3 capitalize">{status.replace('_', ' ')}</h3>
            <div className="space-y-2">
              {tasks.filter(t => t.status === status).map(task => (
                <div key={task.id} className="bg-white p-3 rounded border-l-4 border-primary">
                  <p className="font-medium text-sm">{task.title}</p>
                  <p className="text-xs text-gray-500">{task.dueTime}</p>
                  <div className="flex gap-2 mt-2">
                    <select
                      value={task.status}
                      onChange={(e) => handleStatusChange(task.id, e.target.value as Task['status'])}
                      className="flex-1 text-xs p-1 border rounded"
                    >
                      <option value="todo">To Do</option>
                      <option value="in_progress">In Progress</option>
                      <option value="done">Done</option>
                      <option value="blocked">Blocked</option>
                    </select>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
```

**`src/components/TimeTracker.tsx`**
```typescript
import { useState, useEffect } from 'react';
import { Clock } from 'lucide-react';
import { logLogin, logLogout, getTodaysLog } from '../services/timeService';
import { TimeLog } from '../types';

export default function TimeTracker({ userId }: { userId: string }) {
  const [timeLog, setTimeLog] = useState<TimeLog | null>(null);
  const [workHours, setWorkHours] = useState('0h 0m');

  useEffect(() => {
    getTodaysLog(userId).then(setTimeLog);
  }, [userId]);

  useEffect(() => {
    if (!timeLog?.loginTime) return;

    const interval = setInterval(() => {
      const loginTime = timeLog.loginTime.toMillis();
      const logoutTime = timeLog.logoutTime?.toMillis() || Date.now();
      const diff = logoutTime - loginTime;
      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      setWorkHours(`${hours}h ${minutes}m`);
    }, 60000);

    return () => clearInterval(interval);
  }, [timeLog]);

  const handleClockIn = async () => {
    const log = await logLogin(userId);
    const newLog: TimeLog = {
      id: log.id,
      userId,
      date: new Date().toISOString().split('T')[0],
      loginTime: new Date() as any,
      duration: 0,
      breakTime: 0,
      location: 'office',
      notes: '',
    };
    setTimeLog(newLog);
  };

  const handleClockOut = async () => {
    if (timeLog) {
      await logLogout(timeLog.id);
      setTimeLog(null);
    }
  };

  return (
    <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Clock className="text-blue-600" />
          <div>
            <p className="font-semibold">{workHours}</p>
            <p className="text-sm text-gray-600">{timeLog ? 'Logged in' : 'Logged out'}</p>
          </div>
        </div>
        <button
          onClick={timeLog ? handleClockOut : handleClockIn}
          className={`px-4 py-2 rounded-lg font-semibold text-white transition ${
            timeLog ? 'bg-red-500 hover:bg-red-600' : 'bg-green-500 hover:bg-green-600'
          }`}
        >
          {timeLog ? 'Clock Out' : 'Clock In'}
        </button>
      </div>
    </div>
  );
}
```

#### **4. Update Main App.tsx**
Add new pages to existing App:
```typescript
import TaskBoard from './components/TaskBoard';
import TimeTracker from './components/TimeTracker';

// In your main content area, add tabs:
<div className="flex gap-4 mb-4">
  <button onClick={() => setActivePage('chat')} className="px-4 py-2 rounded">Chat</button>
  <button onClick={() => setActivePage('tasks')} className="px-4 py-2 rounded">Tasks</button>
  <button onClick={() => setActivePage('time')} className="px-4 py-2 rounded">Time Tracking</button>
</div>

{activePage === 'tasks' && <TaskBoard userId={currentEmployee.id} />}
{activePage === 'time' && <TimeTracker userId={currentEmployee.id} />}
```

---

### **Day 6-7: Testing & Deployment**

- [ ] **Local Testing**
  - Test task creation
  - Test clock in/out
  - Check Firestore writes
  - Verify real-time updates
  - Test with 2-3 users

- [ ] **Firebase Deployment**
  - Deploy Firestore collections (via console)
  - Deploy security rules
  - Add test data

- [ ] **Deploy to Vercel**
  ```bash
  git add .
  git commit -m "Sprint 1: Tasks, Time Tracking, Departments"
  git push
  # Vercel auto-deploys
  ```

---

## 🔄 REAL-TIME SYNC TEST

**Test with 2 users:**
1. User A creates task
2. Check User B's app — should see task appear instantly
3. User A updates task status
4. Check User B's app — should update instantly

**If not syncing:**
- Check Firestore rules allow read/write
- Check `onUserTasksChange` listener is active
- Check browser console for errors

---

## 📊 FIREBASE COLLECTIONS TO CREATE

Create these in Firebase Console → Firestore:

```javascript
// departments
{
  name: "Tech",
  description: "Engineering team",
  head: "user_id",
  color: "#FF6B6B",
  icon: "💻"
}

// tasks
{
  userId: "user_id",
  title: "Fix login bug",
  description: "Users can't login on mobile",
  dueDate: timestamp,
  dueTime: "17:00",
  priority: "high",
  status: "in_progress",
  parentTaskId: null,
  subtasks: [],
  assignedBy: "user_id",
  tags: ["bug", "urgent"],
  createdAt: timestamp,
  updatedAt: timestamp
}

// timeLogs
{
  userId: "user_id",
  date: "2026-06-13",
  loginTime: timestamp,
  logoutTime: null,
  duration: 0,
  breakTime: 0,
  location: "office",
  notes: ""
}
```

---

## 🚨 CRITICAL CHECKS

Before moving to Sprint 2:
- ✅ Can create tasks
- ✅ Can clock in/out
- ✅ Real-time sync works
- ✅ No Firebase errors in console
- ✅ All users see same data
- ✅ Timestamps correct

---

## 📝 GIT COMMITS

```bash
# Day 2
git commit -m "feat: Add Firestore schema for tasks, timeLogs, departments"

# Day 5
git commit -m "feat: Add task management and time tracking components"
git commit -m "feat: Add task and time services for Firebase integration"

# Day 7
git commit -m "feat: Deploy v2.0 with tasks and time tracking"
```

---

**Next:** Sprint 2 — Chat System & Real-Time Features

Ready to start? Begin with updating Firestore! 🚀
