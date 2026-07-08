// ─────────────────────────────────────────────────────────────────────────────
// Work reminders — the "manager who checks in on your shift" nudges.
//
// Pure logic: given the current employee + their tasks + the time, decide which
// reminder pop-ups are due right now. App.tsx runs this on a timer while the app
// is open and pushes each result through the normal notification system (so they
// also become OS notifications when you're on another tab, and — once Web Push
// is wired — when the app is closed).
//
// Every reminder is de-duped via localStorage so it fires at most once per
// task/day/window, never on a loop.
// ─────────────────────────────────────────────────────────────────────────────
import type { Employee, Task } from '../types';
import type { AppNotif } from './notifications';

type Nudge = Omit<AppNotif, 'id'>;

const HOUR = 3600_000;

function dayKey(d = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
const seen = (k: string) => !!localStorage.getItem(k);
const mark = (k: string) => { try { localStorage.setItem(k, '1'); } catch { /* quota */ } };

/** Today's shift-end as a Date, or null if the employee has no shiftEnd set. */
function shiftEndToday(shiftEnd: string | undefined, now: Date): Date | null {
  if (!shiftEnd) return null;
  const [h, m] = shiftEnd.split(':').map(Number);
  if (Number.isNaN(h)) return null;
  const d = new Date(now);
  d.setHours(h, m || 0, 0, 0);
  return d;
}

export interface ReminderOpts {
  /** Only send the periodic "how's it going" pulse after they've checked in. */
  checkedIn: boolean;
}

/**
 * Returns the reminder notifications that should fire *now*. Called every few
 * minutes; the localStorage guards make repeated calls idempotent.
 */
export function computeReminders(me: Employee, tasks: Task[], opts: ReminderOpts, now = new Date()): Nudge[] {
  const out: Nudge[] = [];
  const hour = now.getHours();
  if (hour < 11) return out;          // outside the working window (11:00 → midnight)

  const today = dayKey(now);
  const open = tasks.filter(t => t.status !== 'done');
  const end = shiftEndToday(me.shiftEnd, now);

  // 1. Deadline approaching — task due within the next 24h (but >2h away, so it
  //    doesn't overlap the "due soon (<=60m)" alert). Once per task per day.
  for (const t of open) {
    if (!t.dueDate) continue;
    const ms = t.dueDate - now.getTime();
    if (ms > 2 * HOUR && ms <= 24 * HOUR) {
      const k = `rem_due24_${t.id}_${today}`;
      if (!seen(k)) {
        mark(k);
        out.push({
          kind: 'task_due', title: 'Deadline coming up', body: `“${t.title}” is due within a day.`,
          actions: [{ label: 'View task', page: 'tasks', primary: true }],
        });
      }
    }
  }

  // 2. Before clock-out — within 30 min of shift end, once per day. Reminds them
  //    to wrap up / update tasks before they leave.
  if (end) {
    const minsToEnd = (end.getTime() - now.getTime()) / 60000;
    if (minsToEnd > 0 && minsToEnd <= 30) {
      const k = `rem_clockout_${today}`;
      if (!seen(k)) {
        mark(k);
        const dueToday = open.filter(t => t.dueDate && dayKey(new Date(t.dueDate)) === today);
        const n = dueToday.length || open.length;
        out.push({
          kind: 'checkin',
          title: 'Wrapping up soon?',
          body: n > 0
            ? `You still have ${n} open task${n > 1 ? 's' : ''}. Update them before you clock out.`
            : 'Update your progress before you clock out for the day.',
          autoCloseMs: null,
          actions: [
            { label: 'Update tasks', page: 'tasks', primary: true },
            { label: 'Check in', page: 'checkin' },
          ],
        });
      }
    }
  }

  // 3. Periodic pulse — every ~2h during the shift, a friendly "how's it going?"
  //    like a manager stopping by. Only after they've checked in; throttled
  //    globally so it never fires more than once per 2h across tabs/sessions.
  if (opts.checkedIn && (!end || now < end)) {
    const lastK = 'rem_pulse_last';
    const last = Number(localStorage.getItem(lastK) || 0);
    if (now.getTime() - last >= 2 * HOUR) {
      try { localStorage.setItem(lastK, String(now.getTime())); } catch { /* quota */ }
      // Skip the first-ever tick (no baseline) so it doesn't fire right at login.
      if (last !== 0) {
        const first = me.name.split(' ')[0];
        out.push({
          kind: 'motivation',
          title: `How's it going, ${first}?`,
          body: 'What are you working on right now? Tap to update your tasks and status.',
          actions: [{ label: 'Update work', page: 'tasks', primary: true }],
        });
      }
    }
  }

  return out;
}
