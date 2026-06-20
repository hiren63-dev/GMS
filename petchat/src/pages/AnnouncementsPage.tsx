import { useState, useEffect } from 'react';
import type { Employee, Announcement, AudienceTarget } from '../types';
import { onAnnouncementsChange, createAnnouncement, updateAnnouncement, deleteAnnouncement, filterAnnouncements } from '../services/firebase';

interface Props {
  employee: Employee;
  allEmployees: Employee[];
}

interface AnnouncementCardProps {
  a: Announcement;
  canPost: boolean;
  onPin: (a: Announcement) => void;
  onDelete: (id: string) => void;
}

function AnnouncementCard({ a, canPost, onPin, onDelete }: AnnouncementCardProps) {
  const expired = a.expiresAt && a.expiresAt < Date.now();
  if (expired) return null;
  return (
    <div className={`card p-5 border-l-4 ${a.pinned ? 'border-l-blue-500' : 'border-l-transparent'} animate-slide-in`}
      style={{ opacity: expired ? 0.5 : 1 }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            {a.pinned && <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 font-medium">📌 Pinned</span>}
            <span className="text-xs px-2 py-0.5 rounded-full font-medium"
              style={{ background: 'var(--surface2)', color: 'var(--text-muted)' }}>
              {a.audience.join(', ')}
            </span>
          </div>
          <h4 className="font-semibold" style={{ color: 'var(--text)' }}>{a.title}</h4>
          <p className="text-sm mt-1 leading-relaxed" style={{ color: 'var(--text-muted)' }}>{a.body}</p>
          <div className="flex items-center gap-3 mt-3 text-xs" style={{ color: 'var(--text-muted)' }}>
            <span>👤 {a.authorName}</span>
            <span>·</span>
            <span>{new Date(a.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
            {a.expiresAt && (
              <>
                <span>·</span>
                <span>Expires {new Date(a.expiresAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</span>
              </>
            )}
          </div>
        </div>
        {canPost && (
          <div className="flex gap-1 flex-shrink-0">
            <button onClick={() => onPin(a)} title={a.pinned ? 'Unpin' : 'Pin'}
              className="text-sm p-1.5 rounded-lg transition hover:bg-gray-100 dark:hover:bg-white/10"
              style={{ color: a.pinned ? '#3B82F6' : 'var(--text-muted)' }}>📌</button>
            <button onClick={() => onDelete(a.id)}
              className="text-sm p-1.5 rounded-lg transition hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-500"
              style={{ color: 'var(--text-muted)' }}>🗑️</button>
          </div>
        )}
      </div>
    </div>
  );
}

export default function AnnouncementsPage({ employee, allEmployees }: Props) {
  const [all, setAll]       = useState<Announcement[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm]     = useState({ title: '', body: '', audience: 'all' as AudienceTarget, pinned: false, expiresAt: '' });
  const [saving, setSaving] = useState(false);
  const canPost = employee.role === 'admin' || employee.role === 'founder';

  useEffect(() => {
    return onAnnouncementsChange(setAll);
  }, []);

  const visible = filterAnnouncements(all, employee).filter(a => !a.expiresAt || a.expiresAt >= Date.now());
  const pinned  = visible.filter(a => a.pinned);
  const normal  = visible.filter(a => !a.pinned);

  const handleCreate = async () => {
    if (!form.title.trim() || !form.body.trim()) return;
    setSaving(true);
    await createAnnouncement({
      title: form.title, body: form.body,
      authorId: employee.id, authorName: employee.name,
      audience: [form.audience],
      pinned: form.pinned,
      expiresAt: form.expiresAt ? new Date(form.expiresAt).getTime() : undefined,
      createdAt: Date.now(),
    });
    setForm({ title: '', body: '', audience: 'all', pinned: false, expiresAt: '' });
    setShowForm(false); setSaving(false);
  };

  const togglePin = (a: Announcement) => updateAnnouncement(a.id, { pinned: !a.pinned });
  const handleDelete = (id: string) => { if (confirm('Delete this announcement?')) deleteAnnouncement(id); };

  const departments = Array.from(new Set(allEmployees.map(e => e.department)));

  return (
    <div className="p-6 space-y-5 animate-slide-in">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold" style={{ color: 'var(--text)' }}>📢 Announcements</h2>
          <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>{visible.length} announcement{visible.length !== 1 ? 's' : ''} for you</p>
        </div>
        {canPost && (
          <button onClick={() => setShowForm(v => !v)}
            className="px-4 py-2 rounded-xl bg-blue-500 hover:bg-blue-600 text-white text-sm font-medium transition shadow">
            + Post
          </button>
        )}
      </div>

      {/* Create form */}
      {showForm && canPost && (
        <div className="card p-5 border-2 border-blue-300 dark:border-blue-700 space-y-4">
          <h3 className="font-semibold" style={{ color: 'var(--text)' }}>New Announcement</h3>
          <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
            placeholder="Title *" className="input w-full" />
          <textarea value={form.body} onChange={e => setForm(f => ({ ...f, body: e.target.value }))}
            placeholder="Message body *" rows={4}
            className="input w-full resize-none" />
          <div className="flex flex-wrap gap-3">
            <div className="flex-1 min-w-40">
              <label className="text-xs font-medium block mb-1" style={{ color: 'var(--text-muted)' }}>Audience</label>
              <select value={form.audience} onChange={e => setForm(f => ({ ...f, audience: e.target.value as AudienceTarget }))}
                className="input w-full">
                <option value="all">Everyone</option>
                {departments.map(d => <option key={d} value={d}>{d}</option>)}
                {allEmployees.map(e => <option key={e.id} value={e.id}>{e.name} (only)</option>)}
              </select>
            </div>
            <div className="flex-1 min-w-40">
              <label className="text-xs font-medium block mb-1" style={{ color: 'var(--text-muted)' }}>Expires (optional)</label>
              <input type="date" value={form.expiresAt} onChange={e => setForm(f => ({ ...f, expiresAt: e.target.value }))}
                className="input w-full" />
            </div>
            <div className="flex items-center gap-2 pt-4">
              <input type="checkbox" id="pin" checked={form.pinned} onChange={e => setForm(f => ({ ...f, pinned: e.target.checked }))}
                className="w-4 h-4 rounded" />
              <label htmlFor="pin" className="text-sm" style={{ color: 'var(--text)' }}>📌 Pin to top</label>
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={handleCreate} disabled={saving || !form.title.trim() || !form.body.trim()}
              className="flex-1 py-2 rounded-lg bg-blue-500 hover:bg-blue-600 disabled:opacity-50 text-white text-sm font-medium transition">
              {saving ? 'Posting…' : 'Post Announcement'}
            </button>
            <button onClick={() => setShowForm(false)}
              className="flex-1 py-2 rounded-lg text-sm font-medium transition"
              style={{ background: 'var(--surface2)', color: 'var(--text-muted)' }}>Cancel</button>
          </div>
        </div>
      )}

      {/* Pinned */}
      {pinned.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>📌 Pinned</h3>
          {pinned.map(a => <AnnouncementCard key={a.id} a={a} canPost={canPost} onPin={togglePin} onDelete={handleDelete} />)}
        </div>
      )}

      {/* Normal */}
      <div className="space-y-3">
        {pinned.length > 0 && normal.length > 0 && (
          <h3 className="text-sm font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>Latest</h3>
        )}
        {normal.map(a => <AnnouncementCard key={a.id} a={a} canPost={canPost} onPin={togglePin} onDelete={handleDelete} />)}
      </div>

      {visible.length === 0 && (
        <div className="text-center py-16">
          <p className="text-5xl mb-4">📭</p>
          <p className="font-semibold text-lg" style={{ color: 'var(--text)' }}>No announcements</p>
          <p className="text-sm mt-2" style={{ color: 'var(--text-muted)' }}>
            {canPost ? 'Post the first announcement!' : 'Check back later.'}
          </p>
        </div>
      )}
    </div>
  );
}
