import type { Member, Plan, Payment, AttendanceRecord, Trainer, Lead, Expense, Equipment, BodyMeasurement, Subscription, PTSession, StaffUser, Notification } from '../types';

export const PLANS: Plan[] = [
  { id: 'p1', name: 'Monthly Gym Only', duration: 30, price: 1500, gst: 18, features: ['Gym Access', 'Locker Room'], category: 'Gym', color: '#60a5fa' },
  { id: 'p2', name: 'Annual Full Access', duration: 365, price: 14000, gst: 18, features: ['Unlimited Access', 'Cardio Zone'], category: 'Full Access', color: '#f43f5e', popular: true },
];

export const STAFF_USERS: StaffUser[] = [
  { id: 'u1', name: 'Gym Owner', email: 'owner@gym.com', password: 'demo123', role: 'Owner', phone: '', photo: 'https://ui-avatars.com/api/?name=Owner&background=8b5cf6&color=fff', active: true },
  { id: 'u2', name: 'Gym Manager', email: 'manager@gym.com', password: 'demo123', role: 'Manager', phone: '', photo: 'https://ui-avatars.com/api/?name=Manager&background=ec4899&color=fff', active: true },
  { id: 'u3', name: 'Head Trainer', email: 'trainer@gym.com', password: 'demo123', role: 'Trainer', phone: '', photo: 'https://ui-avatars.com/api/?name=Trainer&background=10b981&color=fff', active: true },
  { id: 'u4', name: 'Front Desk', email: 'frontdesk@gym.com', password: 'demo123', role: 'Receptionist', phone: '', photo: 'https://ui-avatars.com/api/?name=Desk&background=f59e0b&color=fff', active: true },
];

export const TRAINERS: Trainer[] = [
  { id: 't1', name: 'Alex Harrison', phone: '+91 9876543210', email: 'alex@gym.com', specialization: ['Weight Loss', 'Strength'], experience: 5, photo: 'https://images.unsplash.com/photo-1568602471122-7832951cc4c5?q=80&w=200&auto=format&fit=crop', assignedMembers: ['m1', 'm2'], rating: 4.8, schedule: { 'Monday': ['08:00', '10:00'], 'Wednesday': ['14:00', '16:00'] }, salary: 45000, joinDate: '2023-01-15', status: 'Active' },
  { id: 't2', name: 'Sarah Jenkins', phone: '+91 8765432109', email: 'sarah@gym.com', specialization: ['Crossfit', 'HIIT'], experience: 3, photo: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?q=80&w=200&auto=format&fit=crop', assignedMembers: ['m3'], rating: 4.9, schedule: { 'Tuesday': ['09:00', '11:00'], 'Thursday': ['17:00', '19:00'] }, salary: 40000, joinDate: '2023-05-20', status: 'Active' },
];

export const MEMBERS: Member[] = [
  { id: 'm1', name: 'Rahul Kumar', email: 'rahul@example.com', phone: '+91 9999988888', address: '123 Street', area: 'Downtown', gender: 'Male', dob: '1990-05-15', joinDate: '2024-01-01', status: 'Active', planId: 'p2', planName: 'Annual Full Access', expiryDate: '2024-12-31', trainerId: 't1', photo: 'https://i.pravatar.cc/150?u=m1', memberId: 'GMS-1001', daysRemaining: 275 },
  { id: 'm2', name: 'Priya Sharma', email: 'priya@example.com', phone: '+91 8888877777', address: '456 Lane', area: 'Suburbs', gender: 'Female', dob: '1995-08-22', joinDate: '2024-03-01', status: 'Expiring Soon', planId: 'p1', planName: 'Monthly Gym Only', expiryDate: '2024-03-31', trainerId: 't1', photo: 'https://i.pravatar.cc/150?u=m2', memberId: 'GMS-1002', daysRemaining: 3 },
  { id: 'm3', name: 'Amit Patel', email: 'amit@example.com', phone: '+91 7777766666', address: '789 Road', area: 'Westside', gender: 'Male', dob: '1988-11-05', joinDate: '2023-05-01', status: 'Active', planId: 'p2', planName: 'Annual Full Access', expiryDate: '2024-04-30', trainerId: 't2', photo: 'https://i.pravatar.cc/150?u=m3', memberId: 'GMS-1003', daysRemaining: 32 },
];
export const SUBSCRIPTIONS: Subscription[] = [
  { id: 'sub1', memberId: 'm1', memberName: 'Rahul Kumar', planId: 'p2', planName: 'Annual Full Access', startDate: '2024-01-01', endDate: '2024-12-31', status: 'Active', amountPaid: 14000, paymentId: 'pay1', daysRemaining: 275 },
  { id: 'sub2', memberId: 'm2', memberName: 'Priya Sharma', planId: 'p1', planName: 'Monthly Gym Only', startDate: '2024-03-01', endDate: '2024-03-31', status: 'Active', amountPaid: 1500, paymentId: 'pay2', daysRemaining: 3 },
  { id: 'sub3', memberId: 'm3', memberName: 'Amit Patel', planId: 'p2', planName: 'Annual Full Access', startDate: '2023-05-01', endDate: '2024-04-30', status: 'Active', amountPaid: 14000, paymentId: 'pay3', daysRemaining: 32 },
];
export const PAYMENTS: Payment[] = [];
export const ATTENDANCE: AttendanceRecord[] = [];
export const LEADS: Lead[] = [];
export const EXPENSES: Expense[] = [];
export const EQUIPMENT: Equipment[] = [];
export const BODY_MEASUREMENTS: BodyMeasurement[] = [];
export const PT_SESSIONS: PTSession[] = [
  { id: 'pts1', memberId: 'm1', memberName: 'Rahul Kumar', trainerId: 't1', trainerName: 'Alex Harrison', date: '2026-03-31', time: '08:00', duration: 60, exercises: 'Deadlifts, Squats', notes: 'Focus on form during heavy squats', status: 'Scheduled' },
  { id: 'pts2', memberId: 'm3', memberName: 'Amit Patel', trainerId: 't2', trainerName: 'Sarah Jenkins', date: '2026-04-02', time: '17:00', duration: 45, exercises: 'HIIT Circuit', notes: 'High intensity required', status: 'Scheduled' },
];
export const NOTIFICATIONS: Notification[] = [];

export const GYM_SETTINGS = {
  gymName: 'My Gym',
  tagline: 'Transform Your Body',
  address: '123 Gym Street',
  phone: '+91 00000 00000',
  email: 'contact@mygym.com',
  timings: 'Mon-Sat: 6:00 AM - 10:00 PM',
  gstNumber: '',
  gstRate: 18,
  logo: '',
  primaryColor: '#5A32FA',
  theme: 'light' as 'dark' | 'light',
};
