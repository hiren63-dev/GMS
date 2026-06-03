// ============================================================
// GYM MANAGEMENT SYSTEM - TYPE DEFINITIONS
// ============================================================

export type MemberStatus = 'Active' | 'Expired' | 'Expiring Soon' | 'Frozen';
export type PaymentMode = 'UPI' | 'Cash' | 'Card' | 'GPay' | 'PhonePe';
export type UserRole = 'Owner' | 'Manager' | 'Trainer' | 'Receptionist';
export type LeadStatus = 'New' | 'Contacted' | 'Follow-up' | 'Trial' | 'Converted' | 'Lost';
export type AttendanceType = 'Check-in' | 'Check-out';

export interface Member {
  id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  area: string;
  gender: 'Male' | 'Female' | 'Other';
  dob: string;
  joinDate: string;
  status: MemberStatus;
  planId: string;
  planName: string;
  expiryDate: string;
  trainerId?: string;
  photo: string;
  bloodGroup?: string;
  emergencyContact?: string;
  healthConditions?: string;
  memberId: string; // GMS-XXXX
  daysRemaining: number;
}

export interface Plan {
  id: string;
  name: string;
  duration: number; // days
  price: number; // base price before GST
  gst: number; // percentage
  features: string[];
  category: 'Gym' | 'Full Access' | 'PT' | 'Special';
  color: string;
  popular?: boolean;
}

export interface Subscription {
  id: string;
  memberId: string;
  memberName: string;
  planId: string;
  planName: string;
  startDate: string;
  endDate: string;
  status: 'Active' | 'Expired' | 'Frozen' | 'Cancelled';
  amountPaid: number;
  paymentId: string;
  daysRemaining: number;
}

export interface Payment {
  id: string;
  receiptNo: string;
  memberId: string;
  memberName: string;
  memberPhone: string;
  planName: string;
  amount: number;
  discount: number;
  gst: number;
  totalAmount: number;
  paymentMode: PaymentMode;
  transactionId?: string;
  date: string;
  time: string;
  category: 'Membership' | 'PT' | 'Supplement' | 'Locker' | 'Other';
  collectedBy: string;
  notes?: string;
}

export interface AttendanceRecord {
  id: string;
  memberId: string;
  memberName: string;
  memberPhoto: string;
  planName: string;
  type: AttendanceType;
  timestamp: string;
  date: string;
  daysRemaining: number;
  status: 'Active' | 'Expired';
}

export interface Trainer {
  id: string;
  name: string;
  phone: string;
  email: string;
  specialization: string[];
  experience: number; // years
  photo: string;
  assignedMembers: string[];
  rating: number;
  schedule: { [key: string]: string[] }; // day: [time slots]
  salary: number;
  joinDate: string;
  status: 'Active' | 'Inactive';
}

export interface PTSession {
  id: string;
  memberId: string;
  memberName: string;
  trainerId: string;
  trainerName: string;
  date: string;
  time: string;
  duration: number; // minutes
  exercises: string;
  notes: string;
  status: 'Scheduled' | 'Completed' | 'Cancelled';
  feedback?: { rating: number; comment: string };
}

export interface Lead {
  id: string;
  name: string;
  phone: string;
  email?: string;
  source: 'Walk-in' | 'Instagram' | 'Google' | 'JustDial' | 'Referral' | 'Other';
  interestedPlan?: string;
  status: LeadStatus;
  assignedTo: string;
  followUpDate: string;
  enquiryDate: string;
  notes: string;
  lostReason?: string;
}

export interface Expense {
  id: string;
  category: 'Rent' | 'Electricity' | 'Salary' | 'Equipment' | 'Maintenance' | 'Marketing' | 'Supplements' | 'Other';
  description: string;
  amount: number;
  date: string;
  paidTo: string;
  paymentMode: PaymentMode;
  receiptNo?: string;
}

export interface Equipment {
  id: string;
  name: string;
  category: string;
  purchaseDate: string;
  lastMaintenance: string;
  nextMaintenance: string;
  status: 'Working' | 'Under Maintenance' | 'Out of Order';
  cost: number;
  vendor: string;
}

export interface BodyMeasurement {
  id: string;
  memberId: string;
  date: string;
  weight: number;
  height: number;
  bmi: number;
  chest: number;
  waist: number;
  hips: number;
  arms: number;
  thighs: number;
  bodyFat?: number;
  notes?: string;
}

export interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'warning' | 'success' | 'error';
  timestamp: string;
  read: boolean;
  actionUrl?: string;
}

export interface StaffUser {
  id: string;
  name: string;
  email: string;
  password: string;
  role: UserRole;
  phone: string;
  photo: string;
  active: boolean;
}

export interface GymSettings {
  gymName: string;
  tagline: string;
  address: string;
  phone: string;
  email: string;
  timings: string;
  gstNumber: string;
  gstRate: number;
  logo: string;
  primaryColor: string;
  theme: 'dark' | 'light';
}
