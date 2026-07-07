import { useState, useEffect } from 'react';
import type { Employee, Task, Priority } from '../types';
import { onAllTasksChange } from '../services/firebase';

// ─────────────────────────────────────────────────────────────────────────
// Team Board — the shared "who is doing what" whiteboard.
// One column per person, their open tasks under them with deadlines, a
// workload signal (Free / Balanced / Overloaded), and an OVERLAP flag when
// two people hold a task with the same title — so work doesn't get done twice.
// Read-only and visible to everyone; assigning still happens in Assign Tasks.
// ─────────────────────────────────────────────────────────────────────────

interface Props { employee: Employee; allEmployees: Employee[]; }

const PRIO_RANK: Record<Priority, number> = { urgent: 0, high: 1, medium: 2, low: 3 };
// Sticker-palette status dots (decoration carries status, never structure)
const PRIO_DOT: Record<Priority, string> = { urgent: '#dd5b00', high: '#ff64c8', medium: '#a39e98', low: '#62aef0' };

const normTitle = (t: string) => t.trim().toLowerCase().replace(/\s+/g, ' ');
const initialsOf = (name: string) => name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
const fmtDue = (ts?: number) => ts ? new Date(ts).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : '';

function loadOf(count: number, urgent: number): { label: string; bg: string; fg: string } {
  if (count === 0) return { label: 'Free', bg: 'rgba(26,174,57,0.10)', fg: '#1aae39' };
  if (count >= 6 || urgent >= 2) return { label: 'Overloaded', bg: 'rgba(221,91,0,0.10)', fg: '#dd5b00' };
  return { label: 'Balanced', bg: 'rgba(0,117,222,0.08)', fg: 'var(--accent)' };
}

export default function TeamBoard({ employee, allEmployees }: Props) {
  const [tasks, setTasks]         = useState<Task[]>([]);
  const [deptFilter, setDeptFilter] = useState<string>('all');

  useEffect(() => onAllTasksChange(setTasks), []);

  const open = tasks.filter(t => t.status !== 'done');

  // Overlap detection: a normalized title held by >1 distinct assignee.
  const owners = new Map<string, Set<string>>();
  open.forEach(t => {
    const k = normTitle(t.title);
    if (!owners.has(k)) owners.set(k, new Set());
    owners.get(k)!.add(t.assigneeId);
  });
  const overlapTitles = new Set([...owners].filter(([, s]) => s.size > 1).map(([k]) => k));
  const isOverlap = (t: Task) => overlapTitles.has(normTitle(t.title));

  const departments = [...new Set(allEmployees.map(e => e.department))].sort();

  const columns = allEmployees
    .filter(e => deptFilter === 'all' || e.department === deptFilter)
    .map(e => {
      const mine = open
        .filter(t => t.assigneeId === e.id)
        .sort((a, b) => (PRIO_RANK[a.priority] - PRIO_RANK[b.priority]) || ((a.dueDate ?? Infinity) - (b.dueDate ?? Infinity)));
      const urgent  = mine.filter(t => t.priority === 'urgent').length;
      const overdue = mine.filter(t => t.dueDate && t.dueDate < Date.now()).length;
      return { e, mine, urgent, overdue };
    })
    .sort((a, b) => b.mine.length - a.mine.length || a.e.name.localeCompare(b.e.name));

  const totalOpen = open.length;
  const freeHands = columns.filter(c => c.mine.length === 0).length;
  const overloaded = columns.filter(c => loadOf(c.mine.length, c.urgent).label === 'Overloaded').length;

  const Stat = ({ n, label, tone }: { n: number; label: string; tone?: string }) => (
    <div className="card" style={{ padding: '12px 16px', minWidth: 120 }}>
      <div style={{ fontSize: 22, fontWeight: 700, color: tone ?? 'var(--text)', letterSpacing: '-0.02em' }}>{n}</div>
      <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{label}</div>
    </div>
  );

  return (
    <div style={{ padding: 24, animation: 'fadeIn 200ms ease' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, marginBottom: 20, flexWrap: 'wrap' }}>
        <div>
          <h2 style={{ fontSize: 20, fontWeight: 600, color: 'var(--text)', letterSpacing: '-0.01em' }}>Team Board</h2>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 3 }}>
            Who's doing what, live. Spot overlaps and free hands before handing out new work.
          </p>
        </div>
        <select value={deptFilter} onChange={e => setDeptFilter(e.target.value)}
          style={{ height: 36, padding: '0 12px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 13, color: 'var(--text)', cursor: 'pointer', fontFamily: 'inherit' }}>
          <option value="all">All departments</option>
          {departments.map(d => <option key={d} value={d}>{d}</option>)}
        </select>
      </div>

      {/* Summary */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
        <Stat n={totalOpen} label="Open tasks" />
        <Stat n={freeHands} label="Free hands" tone={freeHands ? '#1aae39' : undefined} />
        <Stat n={overloaded} label="Overloaded" tone={overloaded ? '#dd5b00' : undefined} />
        <Stat n={overlapTitles.size} label="Possible overlaps" tone={overlapTitles.size ? '#dd5b00' : undefined} />
      </div>

      {/* Person columns */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16, alignItems: 'start' }}>
        {columns.map(({ e, mine, urgent, overdue }) => {
          const load = loadOf(mine.length, urgent);
          return (
            <div key={e.id} className="card" style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
              {/* Person header */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--text)', color: 'var(--surface)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 600, flexShrink: 0 }}>
                  {initialsOf(e.name)}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {e.name}{e.id === employee.id && <span style={{ color: 'var(--text-faint)', fontWeight: 400 }}> · you</span>}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{e.jobTitle || e.department}</div>
                </div>
                <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 99, background: load.bg, color: load.fg, flexShrink: 0 }}>
                  {mine.length === 0 ? 'Free' : `${mine.length} · ${load.label}`}
                </span>
              </div>

              {overdue > 0 && (
                <div style={{ fontSize: 11, color: '#DC2626', fontWeight: 500 }}>⚠ {overdue} overdue</div>
              )}

              {/* Tasks */}
              {mine.length === 0 ? (
                <div style={{ fontSize: 12.5, color: 'var(--text-muted)', padding: '8px 0' }}>🟢 Available — no active tasks.</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {mine.map(t => {
                    const late = t.dueDate && t.dueDate < Date.now();
                    return (
                      <div key={t.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, padding: '8px 10px', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 8 }}>
                        <span title={t.priority} style={{ width: 7, height: 7, borderRadius: '50%', background: PRIO_DOT[t.priority], marginTop: 5, flexShrink: 0 }} />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 13, color: 'var(--text)', lineHeight: 1.35 }}>
                            {t.title}
                            {isOverlap(t) && (
                              <span title="Another teammate has a task with the same title" style={{ marginLeft: 6, fontSize: 10, fontWeight: 600, color: '#dd5b00', background: 'rgba(221,91,0,0.08)', border: '1px solid rgba(221,91,0,0.25)', borderRadius: 4, padding: '1px 5px', whiteSpace: 'nowrap' }}>⚠ overlap</span>
                            )}
                          </div>
                          {t.description && (
                            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.description}</div>
                          )}
                        </div>
                        {t.dueDate && (
                          <span style={{ fontSize: 11, color: late ? '#DC2626' : 'var(--text-faint)', fontWeight: late ? 600 : 400, flexShrink: 0, marginTop: 1 }}>
                            {late ? '⚠ ' : ''}{fmtDue(t.dueDate)}
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {columns.length === 0 && (
        <div style={{ padding: '48px 0', textAlign: 'center', fontSize: 13, color: 'var(--text-muted)' }}>No teammates in this department.</div>
      )}
    </div>
  );
}
