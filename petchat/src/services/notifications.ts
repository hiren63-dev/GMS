// ─────────────────────────────────────────────────────────────────────────────
// Notification engine — WhatsApp-style bottom-right pop-ups + OS notifications.
//
// Two layers:
//  1. In-app cards  → always shown (dispatched as an 'app-notification' event that
//     <NotificationCenter/> renders bottom-right). Auto-dismiss after 4s by default.
//  2. OS notification → fired ONLY when the CRM tab is hidden (user is on another
//     tab / minimised / another app), so you still get alerted like WhatsApp Desktop.
//     Requires the user to have granted the browser notification permission.
// ─────────────────────────────────────────────────────────────────────────────

export type AppNotifKind =
  | 'task'          // new task assigned
  | 'task_due'      // task due soon / overdue
  | 'message'       // new 1:1 message
  | 'announcement'  // company announcement
  | 'checkin'       // daily first-open prompt
  | 'motivation'    // motivational nudge
  | 'info';         // generic

export interface NotifAction {
  label: string;
  page?: string;      // navigate() target, e.g. 'tasks' | 'messages' | 'checkin'
  targetId?: string;  // optional id passed to navigate (e.g. sender id for messages)
  primary?: boolean;  // render as the accent button
}

export interface AppNotif {
  id: string;
  kind: AppNotifKind;
  title: string;
  body?: string;
  /** ms before auto-dismiss. Default 4000 (Wispr Flow style). `null` = sticky until acted on / closed. */
  autoCloseMs?: number | null;
  actions?: NotifAction[];
}

const ICONS: Record<AppNotifKind, string> = {
  task:         '📋',
  task_due:     '⏰',
  message:      '💬',
  announcement: '📢',
  checkin:      '☀️',
  motivation:   '✨',
  info:         '🔔',
};
export const notifIcon = (k: AppNotifKind): string => ICONS[k] ?? '🔔';

// Motivational one-liners used in the daily prompt and occasional nudges.
export const MOTIVATION: string[] = [
  'Small steps every day add up to big results. 🚀',
  "Today's effort is tomorrow's win. 💪",
  'Focus on progress, not perfection. ✨',
  'One task at a time — you’ve got this. 🙌',
  'Great teams are built one honest check-in at a time. 🤝',
  'Momentum beats motivation. Start now. ⚡',
  'Done is better than perfect. Ship it. 📦',
  'Your future self will thank you for starting today. 🌱',
];
export const randomMotivation = (): string =>
  MOTIVATION[Math.floor(Math.random() * MOTIVATION.length)];

/** Ask the browser for OS-notification permission. Safe to call repeatedly. */
export async function ensureNotifyPermission(): Promise<boolean> {
  if (typeof Notification === 'undefined') return false;      // unsupported browser
  if (Notification.permission === 'granted') return true;
  if (Notification.permission === 'denied') return false;     // user blocked — don't nag
  try {
    return (await Notification.requestPermission()) === 'granted';
  } catch {
    return false;
  }
}

let seq = 0;

/**
 * Raise a notification. Always shows the in-app card; additionally fires a native
 * OS notification when the tab isn't the one you're looking at.
 * Returns the notification id.
 */
export function pushNotification(n: Omit<AppNotif, 'id'> & { id?: string }): string {
  const id = n.id ?? `n${Date.now()}_${seq++}`;
  const detail: AppNotif = { autoCloseMs: 4000, ...n, id };

  if (typeof window === 'undefined') return id;

  // 1. In-app card
  window.dispatchEvent(new CustomEvent('app-notification', { detail }));

  // 2. OS notification — only when the CRM isn't the visible tab
  const hidden = typeof document !== 'undefined' && document.visibilityState === 'hidden';
  if (hidden && typeof Notification !== 'undefined' && Notification.permission === 'granted') {
    try {
      const osn = new Notification(detail.title, {
        body: detail.body,
        icon: '/icon-192.png',
        badge: '/icon-192.png',
        tag: id,           // replaces a same-id notification instead of stacking dupes
      });
      osn.onclick = () => { try { window.focus(); } catch {} osn.close(); };
      const ms = detail.autoCloseMs;
      if (ms && ms > 0) setTimeout(() => osn.close(), ms);
    } catch { /* OS notification is best-effort */ }
  }

  return id;
}
