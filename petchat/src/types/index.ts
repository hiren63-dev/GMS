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
export interface ResourceFile {
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
