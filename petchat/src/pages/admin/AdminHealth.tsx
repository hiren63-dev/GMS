import { useState, useEffect, useRef } from 'react';
import { getDocs, collection, query, limit, onSnapshot } from 'firebase/firestore';
import { db, auth } from '../../services/firebase';
import type { Employee } from '../../types';

interface Props {
  employee: Employee;
  allEmployees: Employee[];
}

type Status = 'checking' | 'ok' | 'warn' | 'error';

interface Check {
  label: string;
  detail: string;
  status: Status;
  count?: number;
  note?: string;
}

const DOT: Record<Status, { bg: string; label: string }> = {
  checking: { bg: '#D1D5DB', label: 'Checking…' },
  ok:       { bg: '#22C55E', label: 'OK' },
  warn:     { bg: '#F59E0B', label: 'Warning' },
  error:    { bg: '#EF4444', label: 'Error' },
};

export default function AdminHealth({ employee, allEmployees }: Props) {
  const [checks, setChecks] = useState<Check[]>([]);
  const [running, setRunning] = useState(false);
  const [lastRun, setLastRun] = useState<Date | null>(null);
  const ranWithEmployees = useRef(false);

  const runChecks = async () => {
    setRunning(true);
    const results: Check[] = [];

    // 1 — Firebase Auth
    try {
      const user = auth.currentUser;
      results.push({
        label: 'Firebase Auth',
        detail: 'Authentication service',
        status: 'ok',
        note: user ? `Signed in as ${user.email}` : 'No session (using demo login)',
      });
    } catch (e: any) {
      results.push({ label: 'Firebase Auth', detail: 'Authentication service', status: 'error', note: e.message });
    }

    // 2 — Firestore connection
    try {
      await getDocs(query(collection(db, 'employees'), limit(1)));
      results.push({ label: 'Firestore DB', detail: 'Database connection', status: 'ok', note: 'Read successful' });
    } catch (e: any) {
      results.push({ label: 'Firestore DB', detail: 'Database connection', status: 'error', note: e.message });
    }

    // Collection checks
    const cols: { key: string; label: string; feature: string; warnIfZero?: boolean }[] = [
      { key: 'employees',     label: 'Employees',     feature: 'Login & team directory', warnIfZero: true },
      { key: 'tasks',         label: 'Tasks',         feature: 'Task board & kanban' },
      { key: 'messages',      label: 'Messages',      feature: 'Chat & direct messages' },
      { key: 'checkIns',      label: 'Check-Ins',     feature: 'Daily check-in form' },
      { key: 'announcements', label: 'Announcements', feature: 'Announcements board' },
      { key: 'loginLogs',     label: 'Login Logs',    feature: 'Time tracker & clock-in' },
      { key: 'objectives',    label: 'Objectives',    feature: 'Founder OKR dashboard' },
      { key: 'shifts',        label: 'Shifts',        feature: 'Shift control (admin)' },
      { key: 'activity',      label: 'Activity',      feature: 'Activity feed' },
      { key: 'integrations',  label: 'Integrations',  feature: 'Integration hub' },
    ];

    for (const col of cols) {
      try {
        const snap = await getDocs(collection(db, col.key));
        const count = snap.size;
        const status: Status = col.warnIfZero && count === 0 ? 'warn' : 'ok';
        results.push({
          label: col.label,
          detail: col.feature,
          status,
          count,
          note: count === 0 ? 'No records yet' : `${count} record${count !== 1 ? 's' : ''}`,
        });
      } catch (e: any) {
        results.push({ label: col.label, detail: col.feature, status: 'error', note: e.message });
      }
    }

    // Feature smoke-tests
    const featureTests: { label: string; detail: string; test: () => Promise<{ ok: boolean; note: string }> }[] = [
      {
        label: 'Login (email lookup)',
        detail: 'Can find employees by email',
        test: async () => {
          if (allEmployees.length === 0) return { ok: false, note: 'No employees to test with' };
          const email = allEmployees[0].email;
          const snap = await getDocs(query(collection(db, 'employees')));
          const found = snap.docs.some(d => (d.data() as any).email === email);
          return { ok: found, note: found ? `Found ${email}` : `Could not find ${email}` };
        },
      },
      {
        label: 'Real-time listeners',
        detail: 'onSnapshot works (Firestore rules)',
        test: async () => {
          return new Promise(resolve => {
            let done = false;
            const unsub = onSnapshot(
              collection(db, 'employees'),
              () => { if (!done) { done = true; unsub(); resolve({ ok: true, note: 'Snapshot received' }); } },
              (err: any) => { if (!done) { done = true; resolve({ ok: false, note: err.message }); } }
            );
            setTimeout(() => { if (!done) { done = true; resolve({ ok: false, note: 'Timeout — check Firestore rules' }); } }, 4000);
          });
        },
      },
      {
        label: 'Password storage',
        detail: 'Employee passwords stored in Firestore',
        test: async () => {
          const snap = await getDocs(collection(db, 'employees'));
          const withPw = snap.docs.filter(d => !!(d.data() as any).password).length;
          const total  = snap.size;
          if (total === 0) return { ok: false, note: 'No employees yet' };
          return {
            ok: withPw > 0,
            note: `${withPw}/${total} employees have stored passwords`,
          };
        },
      },
    ];

    for (const ft of featureTests) {
      try {
        const { ok, note } = await ft.test();
        results.push({ label: ft.label, detail: ft.detail, status: ok ? 'ok' : 'warn', note });
      } catch (e: any) {
        results.push({ label: ft.label, detail: ft.detail, status: 'error', note: e.message });
      }
    }

    setChecks(results);
    setLastRun(new Date());
    setRunning(false);
  };

  useEffect(() => { runChecks(); }, []);

  // Re-run once employees arrive if the initial run had no employees to test with
  useEffect(() => {
    if (allEmployees.length > 0 && !ranWithEmployees.current) {
      ranWithEmployees.current = true;
      runChecks();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allEmployees.length]);

  const okCount    = checks.filter(c => c.status === 'ok').length;
  const warnCount  = checks.filter(c => c.status === 'warn').length;
  const errorCount = checks.filter(c => c.status === 'error').length;
  const overall: Status = errorCount > 0 ? 'error' : warnCount > 0 ? 'warn' : checks.length > 0 ? 'ok' : 'checking';

  return (
    <div style={{ padding: 24, maxWidth: 900, animation: 'fadeIn 200ms ease' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <div style={{ fontSize: 20, fontWeight: 600, color: 'var(--text)', letterSpacing: '-0.01em', marginBottom: 4 }}>System Health</div>
          <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>
            {lastRun ? `Last checked ${lastRun.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}` : 'Running checks…'}
          </div>
        </div>
        <button onClick={runChecks} disabled={running}
          style={{ height: 36, padding: '0 18px', background: '#111', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 500, cursor: running ? 'not-allowed' : 'pointer', opacity: running ? 0.6 : 1, display: 'flex', alignItems: 'center', gap: 7 }}
          onMouseOver={e => { if (!running) (e.currentTarget as HTMLButtonElement).style.background = '#333'; }}
          onMouseOut={e => { if (!running) (e.currentTarget as HTMLButtonElement).style.background = '#111'; }}
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" style={{ animation: running ? 'spin 1s linear infinite' : 'none' }}><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>
          {running ? 'Running…' : 'Re-run checks'}
        </button>
      </div>

      {/* Overall status banner */}
      <div style={{ background: overall === 'ok' ? '#F0FDF4' : overall === 'warn' ? '#FFFBEB' : overall === 'error' ? '#FEF2F2' : 'var(--bg)', border: `1px solid ${overall === 'ok' ? '#BBF7D0' : overall === 'warn' ? '#FDE68A' : overall === 'error' ? '#FECACA' : 'var(--border)'}`, borderRadius: 10, padding: '16px 20px', marginBottom: 24, display: 'flex', alignItems: 'center', gap: 14 }}>
        <div style={{ width: 12, height: 12, borderRadius: '50%', background: DOT[overall].bg, flexShrink: 0 }} />
        <div>
          <div style={{ fontSize: 14, fontWeight: 600, color: overall === 'ok' ? '#15803D' : overall === 'warn' ? '#92400E' : overall === 'error' ? '#DC2626' : 'var(--text)' }}>
            {overall === 'ok' ? 'All systems operational' : overall === 'warn' ? 'Some features need attention' : overall === 'error' ? 'Issues detected' : 'Checking…'}
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
            {okCount} OK · {warnCount} warnings · {errorCount} errors
          </div>
        </div>
      </div>

      {/* Checks grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 10 }}>
        {(running && checks.length === 0 ? Array(8).fill(null) : checks).map((check, i) => {
          if (!check) {
            return (
              <div key={i} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, padding: '14px 16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#D1D5DB', flexShrink: 0 }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ height: 12, background: 'var(--bg)', borderRadius: 4, marginBottom: 6 }} />
                    <div style={{ height: 10, background: 'var(--bg)', borderRadius: 4, width: '60%' }} />
                  </div>
                </div>
              </div>
            );
          }
          const c = check as Check;
          const d = DOT[c.status];
          return (
            <div key={i} style={{ background: 'var(--surface)', border: `1px solid ${c.status === 'error' ? '#FECACA' : c.status === 'warn' ? '#FDE68A' : 'var(--border)'}`, borderRadius: 10, padding: '14px 16px', transition: 'border-color 150ms' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: d.bg, flexShrink: 0, marginTop: 4 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                    <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)' }}>{c.label}</span>
                    {c.count !== undefined && (
                      <span style={{ fontSize: 11, color: 'var(--text-faint)', background: 'var(--bg)', padding: '1px 7px', borderRadius: 99, border: '1px solid var(--border)', flexShrink: 0 }}>{c.count}</span>
                    )}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{c.detail}</div>
                  {c.note && (
                    <div style={{ fontSize: 11, color: c.status === 'error' ? '#DC2626' : c.status === 'warn' ? '#CA8A04' : 'var(--text-muted)', marginTop: 4, fontFamily: c.status === 'ok' ? 'inherit' : 'inherit' }}>{c.note}</div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Quick stats */}
      {!running && checks.length > 0 && (
        <div style={{ marginTop: 24 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', marginBottom: 12 }}>Team snapshot</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 10 }}>
            {[
              { label: 'Total employees', value: allEmployees.length },
              { label: 'Active now',      value: allEmployees.filter(e => e.status === 'active').length },
              { label: 'Idle',            value: allEmployees.filter(e => e.status === 'idle').length },
              { label: 'Blocked',         value: allEmployees.filter(e => e.status === 'blocked').length, warn: true },
              { label: 'Offline',         value: allEmployees.filter(e => !e.status || e.status === 'offline').length },
              { label: 'With passwords',  value: (allEmployees as any[]).filter(e => e.password).length },
            ].map(stat => (
              <div key={stat.label} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, padding: '14px 16px' }}>
                <div style={{ fontSize: 11, fontWeight: 500, color: 'var(--text-muted)', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: 6 }}>{stat.label}</div>
                <div style={{ fontSize: 22, fontWeight: 600, color: stat.warn && (stat.value as number) > 0 ? '#DC2626' : 'var(--text)', letterSpacing: '-0.02em' }}>{stat.value}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Known limitations */}
      <div style={{ marginTop: 24, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, padding: '16px 20px' }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', marginBottom: 10 }}>Known limitations</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {[
            { icon: '⚠', text: 'Removing an employee from BuddyDesk does not delete their Firebase Auth account — they lose access to data but the Auth record remains. Delete via Firebase Console → Authentication to fully revoke.' },
            { icon: 'ℹ', text: 'File attachments in chat are stored as metadata only (filename, size) — actual file upload requires Firebase Storage setup.' },
            { icon: 'ℹ', text: 'The AI command bar sends text to a local handler — connect OpenRouter or Gemini in Integration Hub for real AI responses.' },
            { icon: 'ℹ', text: 'Daily check-in is manual — no scheduled push notification unless a Cloud Function + Firebase Cloud Messaging is configured.' },
          ].map((item, i) => (
            <div key={i} style={{ display: 'flex', gap: 10, fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.5 }}>
              <span style={{ flexShrink: 0 }}>{item.icon}</span>
              <span>{item.text}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
