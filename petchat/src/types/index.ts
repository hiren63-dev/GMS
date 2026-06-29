// ── Roles & Permissions ────────────────────────────────
export type Role = 'founder' | 'admin' | 'employee';
export type Permission =
  | 'assign_tasks'          // can assign tasks to anyone
  | 'post_announcements'    // can create / pin announcements
  | 'view_all_screentime'   // can view any employee's screentime
  | 'manage_shifts'         // can edit shift schedules
  | 'view_reports';         // can view admin overview & health

export type Department = 'Tech' | 'Marketing' | 'Operations' | 'Sales' | 'CEO' | 'CFO' | 'CMO' | 'Design' | 'Engineering' | 'Other';
export type ActivityStatus = 'active' | 'idle' | 'blocked' | 'offline';
export type Priority = 'urgent' | 'high' | 'medium' | 'low';
export type TaskStatus = 'todo' | 'in_progress' | 'done' | 'blocked';
export type Mood = 'great' | 'good' | 'okay' | 'rough' | 'bad';
export type Recurrence = 'daily' | 'weekly' | 'monthly';

// ── Core Entities ──────────────────────────────────────
export interface Employee {
  id: string;
  name: string;
  email: string;
  department: Department;
  role: Role;
  avatar?: string;
  status?: ActivityStatus;
  shiftStart?: string;   // 'HH:mm'
  shiftEnd?: string;
  lastSeen?: number;
  createdAt?: number;
  password?: string;     // stored plaintext for admin reference (internal tool)
  authUid?: string;      // Firebase Auth UID, if account created via createEmployeeWithAuth
  permissions?: Permission[]; // extra permissions granted by admin to non-admin employees
  // Profile fields
  bio?: string;
  skills?: string[];
  phone?: string;
  birthday?: string;     // 'MM-DD' for annual recurring reminder
  jobTitle?: string;     // display label, e.g. "Senior Engineer"
  managerId?: string;    // org chart parent
}

export interface Message {
  id: string;
  senderId: string;
  senderName: string;
  senderAvatar?: string;
  recipientId?: string;
  groupId?: string;
  participants?: string[];   // [senderId, recipientId] for DM querying
  content: string;
  isGroupChat: boolean;
  timestamp: number;
  read?: boolean;
  attachment?: { name: string; size: string; ext: string; url?: string };
  reactions?: Record<string, string[]>; // emoji → [userId, ...]
  mentions?: string[];                  // employee IDs mentioned with @name
}

export interface Task {
  id: string;
  title: string;
  description?: string;
  assigneeId: string;
  assigneeName: string;
  assignedById?: string;
  priority: Priority;
  status: TaskStatus;
  dueDate?: number;
  dueTime?: string;
  subtasks?: string[];
  completedSubtasks?: string[];
  tags?: string[];
  createdAt?: number;
  completedAt?: number;
  recurrence?: Recurrence;   // auto-recreate on completion
  blockedBy?: string[];      // task IDs this task is blocked by
  commentCount?: number;
  groupId?: string;          // if set, task belongs to a group
}

// ── Groups ────────────────────────────────────────────────────────────────
export interface Group {
  id: string;
  name: string;
  description?: string;
  memberIds: string[];
  createdBy: string;
  createdByName: string;
  createdAt: number;
}

// ── Task Comments ─────────────────────────────────────
export interface TaskComment {
  id: string;
  taskId: string;
  authorId: string;
  authorName: string;
  content: string;
  createdAt: number;
}

// ── Announcement Replies ──────────────────────────────
export interface AnnouncementReply {
  id: string;
  announcementId: string;
  authorId: string;
  authorName: string;
  content: string;
  createdAt: number;
}

// ── 1-on-1 Notes ─────────────────────────────────────
export interface OneOnOneNote {
  id: string;
  managerId: string;
  employeeId: string;
  managerName: string;
  employeeName: string;
  content: string;
  createdAt: number;
  updatedAt?: number;
}

// ── Audit Log ─────────────────────────────────────────
export interface AuditEntry {
  id: string;
  actorId: string;
  actorName: string;
  action: string;
  target: string;
  details?: string;
  timestamp: number;
}

export interface LoginLog {
  id: string;
  employeeId: string;
  employeeName: string;
  loginTime: number;
  logoutTime?: number;
  duration?: number;    // hours
  date: string;         // YYYY-MM-DD
}

export interface CheckInResponse {
  id: string;
  employeeId: string;
  employeeName: string;
  date: number;
  dateKey?: string;     // 'YYYY-MM-DD' local — dedupes one check-in per day
  mood: Mood;
  isFeelingGood: boolean;
  workDone: string;
  hasProblems: boolean;
  problemDetails?: string;
  suggestions?: string;
  status: 'pending' | 'completed';
}

// ── Announcements ──────────────────────────────────────
export type AudienceTarget = 'all' | Department | string; // string = specific employeeId

export interface Announcement {
  id: string;
  title: string;
  body: string;
  authorId: string;
  authorName: string;
  audience: AudienceTarget[];   // ['all'] or ['Tech','Marketing'] or employee IDs
  pinned: boolean;
  createdAt: number;
  expiresAt?: number;
}

// ── OKRs (Founder only) ───────────────────────────────
export interface KeyResult {
  id: string;
  title: string;
  current: number;
  target: number;
  unit: string;       // '%', 'users', '$', etc.
}

export interface Objective {
  id: string;
  title: string;
  quarter: string;    // 'Q3 2025'
  ownerId: string;
  ownerName: string;
  keyResults: KeyResult[];
  status: 'on_track' | 'at_risk' | 'off_track' | 'achieved';
  createdAt: number;
}

// ── Activity / Timeline ───────────────────────────────
export interface ActivityEntry {
  id: string;
  employeeId: string;
  employeeName: string;
  type: 'login' | 'logout' | 'task_done' | 'check_in' | 'message' | 'task_created';
  detail: string;
  timestamp: number;
}

// ── Shift ─────────────────────────────────────────────
export interface Shift {
  employeeId: string;
  employeeName: string;
  department: Department;
  shiftStart: string;   // 'HH:mm'
  shiftEnd: string;
  allowedLoginBuffer: number;  // minutes
}

// ── Workload ──────────────────────────────────────────
export interface WorkloadEntry {
  employee: Employee;
  taskCount: number;
  urgentCount: number;
  capacity: number;          // 0–100%
  status: 'overloaded' | 'balanced' | 'available';
}

// ── Weekly Summary ────────────────────────────────────
export interface WeeklySummary {
  weekOf: string;             // 'YYYY-Www'
  completedTasks: number;
  openTasks: number;
  avgMood: number;            // 1–5
  topBlockers: string[];
  highlights: string[];
  generatedAt: number;
}

// ── Admin Settings ────────────────────────────────────
export interface AdminSettings {
  checkInTime: string;         // 'HH:mm'
  timezone: string;
  allowSelfClockIn: boolean;
  announcements?: Announcement[];
}

// ── Resource Files ────────────────────────────────────
export interface ResourceFile { groupId?: string;
  id: string;
  name: string;
  url: string;
  size: string;
  ext: string;
  mimeType: string;
  uploadedBy: string;
  uploadedByName: string;
  uploadedAt: number;
  category?: string;
}

// ── Integration ───────────────────────────────────────
export interface Integration {
  id: string;
  name: string;
  type: 'openrouter' | 'slack' | 'github' | 'google' | 'custom';
  apiKey?: string;
  webhookUrl?: string;
  enabled: boolean;
  connectedAt?: number;
}

export interface PendingAccount {
  id: string;
  name: string;
  email: string;
  department: Department;
  role: Role;
  password: string;
  requestedAt: number;
  note?: string;
}


