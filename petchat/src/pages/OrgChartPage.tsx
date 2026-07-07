import { useState, useEffect } from 'react';
import type { Employee, Group } from '../types';
import { onAllGroupsChange } from '../services/firebase';
import { avatarColor, initialsOf } from '../lib/avatar';

// ─────────────────────────────────────────────────────────────────────────
// Org Chart — a mind map, not a manager tree. Leadership (CEO/CMO/CFO
// departments) sits at the top; everyone else is clustered into a circle per
// collaboration Group (real membership data, not invented), so at a glance
// you can see who is actually working together. People in no group land in
// a plain "Working independently" row below the clusters.
// ─────────────────────────────────────────────────────────────────────────

interface Props { employee: Employee; allEmployees: Employee[]; }

function PersonChip({ emp, isCurrentUser, size = 40 }: { emp: Employee; isCurrentUser: boolean; size?: number }) {
  const av = avatarColor(emp.name);
  return (
    <div title={`${emp.name} — ${emp.jobTitle || emp.department}`} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, width: size + 20 }}>
      <div style={{
        width: size, height: size, borderRadius: '50%', background: av.bg, color: av.fg,
        display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700,
        fontSize: size * 0.34, flexShrink: 0,
        border: isCurrentUser ? '2px solid var(--accent)' : '2px solid var(--surface)',
        boxShadow: '0 1px 4px rgba(0,0,0,0.10)',
      }}>
        {initialsOf(emp.name)}
      </div>
      <div style={{ fontSize: 11, fontWeight: 500, color: 'var(--text)', textAlign: 'center', maxWidth: size + 30, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {emp.name.split(' ')[0]}
      </div>
    </div>
  );
}

function LeaderCard({ emp, isCurrentUser }: { emp: Employee; isCurrentUser: boolean }) {
  const av = avatarColor(emp.name);
  return (
    <div style={{
      background: 'var(--surface)', border: isCurrentUser ? '2px solid var(--accent)' : '1px solid var(--border)',
      borderRadius: 12, padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 12,
      minWidth: 200, boxShadow: 'var(--card-shadow-hover)',
    }}>
      <div style={{ width: 40, height: 40, borderRadius: '50%', background: av.bg, color: av.fg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 700, flexShrink: 0 }}>
        {initialsOf(emp.name)}
      </div>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{emp.name}</div>
        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{emp.jobTitle || emp.department}</div>
      </div>
    </div>
  );
}

// A group rendered as a literal circle: members arranged around the rim,
// the group name centered. Diameter grows a little with member count so
// avatars never overlap.
function GroupCircle({ group, members, currentUserId }: { group: Group; members: Employee[]; currentUserId: string }) {
  const n = members.length;
  const diameter = Math.max(160, Math.min(260, 140 + n * 16));
  const radius = diameter / 2 - 26;
  const center = diameter / 2;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
      <div style={{
        position: 'relative', width: diameter, height: diameter, borderRadius: '50%',
        background: 'rgba(0,117,222,0.04)', border: '1.5px dashed rgba(0,117,222,0.35)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--accent)', textAlign: 'center', maxWidth: diameter * 0.5, lineHeight: 1.3 }}>
          {group.name}
        </div>
        {members.map((m, i) => {
          const angle = (2 * Math.PI * i) / Math.max(n, 1) - Math.PI / 2;
          const x = center + radius * Math.cos(angle) - 22;
          const y = center + radius * Math.sin(angle) - 22;
          return (
            <div key={m.id} style={{ position: 'absolute', left: x, top: y }}>
              <PersonChip emp={m} isCurrentUser={m.id === currentUserId} size={40} />
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function OrgChartPage({ employee, allEmployees }: Props) {
  const [search, setSearch] = useState('');
  const [groups, setGroups] = useState<Group[]>([]);

  useEffect(() => onAllGroupsChange(setGroups), []);

  const filtered = search
    ? allEmployees.filter(e =>
        e.name.toLowerCase().includes(search.toLowerCase()) ||
        (e.jobTitle || '').toLowerCase().includes(search.toLowerCase()))
    : null;

  const leadership = allEmployees.filter(e => e.department === 'CEO' || e.department === 'CFO' || e.department === 'CMO');
  const leaderIds = new Set(leadership.map(e => e.id));

  const groupedIds = new Set<string>();
  const groupsWithMembers = groups
    .map(g => ({ group: g, members: allEmployees.filter(e => g.memberIds.includes(e.id) && !leaderIds.has(e.id)) }))
    .filter(g => g.members.length > 0);
  groupsWithMembers.forEach(g => g.members.forEach(m => groupedIds.add(m.id)));

  const independent = allEmployees.filter(e => !leaderIds.has(e.id) && !groupedIds.has(e.id));

  return (
    <div className="p-6" style={{ minHeight: '100%', animation: 'fadeIn 200ms ease' }}>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-bold" style={{ color: 'var(--text)' }}>Org Chart</h2>
          <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
            {allEmployees.length} team member{allEmployees.length !== 1 ? 's' : ''} · {groupsWithMembers.length} active group{groupsWithMembers.length !== 1 ? 's' : ''}
          </p>
        </div>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search name or title…" className="input" style={{ width: 220 }} />
      </div>

      {filtered ? (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
          {filtered.length === 0
            ? <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>No results found.</p>
            : filtered.map(e => <LeaderCard key={e.id} emp={e} isCurrentUser={e.id === employee.id} />)}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0 }}>
          {/* Leadership row */}
          {leadership.length > 0 && (
            <>
              <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', justifyContent: 'center' }}>
                {leadership.map(l => <LeaderCard key={l.id} emp={l} isCurrentUser={l.id === employee.id} />)}
              </div>
              <div style={{ width: 2, height: 28, background: 'var(--border)' }} />
            </>
          )}

          {/* Group clusters */}
          {groupsWithMembers.length > 0 ? (
            <div style={{ display: 'flex', gap: 32, flexWrap: 'wrap', justifyContent: 'center', paddingBottom: 8 }}>
              {groupsWithMembers.map(({ group, members }) => (
                <GroupCircle key={group.id} group={group} members={members} currentUserId={employee.id} />
              ))}
            </div>
          ) : (
            <p style={{ fontSize: 13, color: 'var(--text-faint)', padding: '20px 0' }}>No collaboration groups yet — create one in Groups to see clusters here.</p>
          )}

          {/* Independent contributors */}
          {independent.length > 0 && (
            <div style={{ marginTop: 24, width: '100%', borderTop: '1px solid var(--border)', paddingTop: 20 }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '0.04em', textAlign: 'center', marginBottom: 14 }}>
                Working independently
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 18, justifyContent: 'center' }}>
                {independent.map(e => <PersonChip key={e.id} emp={e} isCurrentUser={e.id === employee.id} />)}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Legend */}
      <div className="flex gap-4 mt-8 flex-wrap" style={{ borderTop: '1px solid var(--border)', paddingTop: 16 }}>
        <span style={{ fontSize: 12, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ display: 'inline-block', width: 14, height: 14, borderRadius: '50%', border: '1.5px dashed rgba(0,117,222,0.35)', background: 'rgba(0,117,222,0.04)' }} />
          Collaboration group
        </span>
        <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Circles are built from real Group membership — add people to a Group to cluster them here.</span>
      </div>
    </div>
  );
}
