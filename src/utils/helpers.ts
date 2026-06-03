// ============================================================
// GYM MANAGEMENT SYSTEM - UTILITY HELPERS
// ============================================================

/** Format currency in Indian Rupees */
export const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount);
};

/** Format date as DD/MM/YYYY */
export const formatDate = (dateStr: string): string => {
  if (!dateStr) return '-';
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
};

/** Format datetime */
export const formatDateTime = (dateStr: string): string => {
  if (!dateStr) return '-';
  const date = new Date(dateStr);
  return date.toLocaleString('en-IN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

/** Format relative time (e.g. "2 hours ago") */
export const formatRelativeTime = (dateStr: string): string => {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHrs = Math.floor(diffMins / 60);
  if (diffHrs < 24) return `${diffHrs}h ago`;
  const diffDays = Math.floor(diffHrs / 24);
  return `${diffDays}d ago`;
};

/** Calculate days remaining until a date */
export const daysUntil = (dateStr: string): number => {
  const targetDate = new Date(dateStr);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  targetDate.setHours(0, 0, 0, 0);
  const diffMs = targetDate.getTime() - today.getTime();
  return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
};

/** Calculate age from dob */
export const calculateAge = (dob: string): number => {
  const birthDate = new Date(dob);
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age;
};

/** Calculate BMI */
export const calculateBMI = (weight: number, heightCm: number): number => {
  const heightM = heightCm / 100;
  return parseFloat((weight / (heightM * heightM)).toFixed(1));
};

/** Get BMI category */
export const getBMICategory = (bmi: number): { label: string; color: string } => {
  if (bmi < 18.5) return { label: 'Underweight', color: '#60a5fa' };
  if (bmi < 25) return { label: 'Normal', color: '#4ade80' };
  if (bmi < 30) return { label: 'Overweight', color: '#fbbf24' };
  return { label: 'Obese', color: '#f87171' };
};

/** Generate unique ID */
export const generateId = (): string => {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
};

/** Generate member ID (GMS-XXXX) */
export const generateMemberId = (index: number): string => {
  return `GMS-${String(index).padStart(4, '0')}`;
};

/** Generate receipt number */
export const generateReceiptNo = (): string => {
  const now = new Date();
  const year = now.getFullYear().toString().slice(-2);
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const rand = Math.floor(Math.random() * 9000 + 1000);
  return `RCP-${year}${month}-${rand}`;
};

/** Add days to a date */
export const addDays = (dateStr: string, days: number): string => {
  const date = new Date(dateStr);
  date.setDate(date.getDate() + days);
  return date.toISOString().split('T')[0];
};

/** Subtract months from today */
export const subtractMonths = (months: number): string => {
  const date = new Date();
  date.setMonth(date.getMonth() - months);
  return date.toISOString().split('T')[0];
};

/** Random date within last N months */
export const randomDateInLastMonths = (months: number): string => {
  const now = new Date();
  const past = new Date();
  past.setMonth(past.getMonth() - months);
  const diff = now.getTime() - past.getTime();
  const randomTime = past.getTime() + Math.random() * diff;
  return new Date(randomTime).toISOString().split('T')[0];
};

/** Get status color */
export const getStatusColor = (status: string): string => {
  switch (status) {
    case 'Active': return '#4ade80';
    case 'Expiring Soon': return '#fbbf24';
    case 'Expired': return '#f87171';
    case 'Frozen': return '#60a5fa';
    default: return '#94a3b8';
  }
};

/** Get status background color */
export const getStatusBg = (status: string): string => {
  switch (status) {
    case 'Active': return 'rgba(74, 222, 128, 0.15)';
    case 'Expiring Soon': return 'rgba(251, 191, 36, 0.15)';
    case 'Expired': return 'rgba(248, 113, 113, 0.15)';
    case 'Frozen': return 'rgba(96, 165, 250, 0.15)';
    default: return 'rgba(148, 163, 184, 0.15)';
  }
};

/** Truncate text */
export const truncate = (str: string, maxLength: number): string => {
  if (str.length <= maxLength) return str;
  return str.slice(0, maxLength) + '...';
};

/** Get initials from name */
export const getInitials = (name: string): string => {
  return name
    .split(' ')
    .map(n => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
};

/** Calculate GST */
export const calculateGST = (amount: number, gstRate: number = 18): { base: number; gst: number; total: number } => {
  const gst = Math.round(amount * (gstRate / 100));
  return { base: amount, gst, total: amount + gst };
};

/** Generate avatar URL */
export const avatarUrl = (name: string): string => {
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=8b5cf6&color=fff&size=128&bold=true`;
};

/** Filter members by search query */
export const searchFilter = <T extends Record<string, any>>(
  items: T[],
  query: string,
  fields: (keyof T)[]
): T[] => {
  if (!query.trim()) return items;
  const q = query.toLowerCase();
  return items.filter(item =>
    fields.some(field => {
      const val = item[field];
      return val && String(val).toLowerCase().includes(q);
    })
  );
};

/** Paginate array */
export const paginate = <T>(items: T[], page: number, perPage: number): { items: T[]; totalPages: number; total: number } => {
  const total = items.length;
  const totalPages = Math.ceil(total / perPage);
  const startIndex = (page - 1) * perPage;
  return {
    items: items.slice(startIndex, startIndex + perPage),
    totalPages,
    total,
  };
};

/** Export to CSV */
export const exportToCSV = (data: Record<string, any>[], filename: string): void => {
  if (data.length === 0) return;
  const headers = Object.keys(data[0]);
  const csvContent = [
    headers.join(','),
    ...data.map(row =>
      headers.map(h => {
        const val = row[h];
        return typeof val === 'string' && val.includes(',') ? `"${val}"` : val;
      }).join(',')
    ),
  ].join('\n');
  
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${filename}_${new Date().toISOString().split('T')[0]}.csv`;
  link.click();
  URL.revokeObjectURL(url);
};

/** Get months array for last N months */
export const getLastNMonths = (n: number): string[] => {
  const months = [];
  for (let i = n - 1; i >= 0; i--) {
    const date = new Date();
    date.setMonth(date.getMonth() - i);
    months.push(date.toLocaleString('en-IN', { month: 'short', year: '2-digit' }));
  }
  return months;
};

/** Random between min and max */
export const randInt = (min: number, max: number): number => {
  return Math.floor(Math.random() * (max - min + 1)) + min;
};

/** Pick random element from array */
export const randomPick = <T>(arr: T[]): T => {
  return arr[Math.floor(Math.random() * arr.length)];
};
