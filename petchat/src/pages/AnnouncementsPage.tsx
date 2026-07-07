import { useState, useEffect } from 'react';
import type { Employee, Announcement, AudienceTarget, AnnouncementReply, Integration } from '../types';
import { onAnnouncementsChange, createAnnouncement, updateAnnouncement, deleteAnnouncement, filterAnnouncements, onAnnouncementRepliesChange, addAnnouncementReply, onIntegrationsChange, sendSlackNotification } from '../services/firebase';
import { toast } from '../utils/toast';

interface Props {
  employee: Employee;
  allEmployees: Employee[];
}

interface AnnouncementCardProps {
  a: Announcement;
  canPost: boolean;
  employee: Employee;
  onPin: (a: Announcement) => void;
  onDelete: (id: string) => void;
}

function AnnouncementCard({ a, canPost, employee, onPin, onDelete }: AnnouncementCardProps) {
  const [showReplies, setShowReplies] = useState(false);
  const [replies, setReplies] = useState<AnnouncementReply[]>([]);
  const [replyText, setReplyText] = useState('');
  const [replying, setReplying] = useState(false);

  useEffect(() => {
    if (!showReplies) return;
    return onAnnouncementRepliesChange(a.id, setReplies);
  }, [a.id, showReplies]);

  const handleReply = async () => {
    if (!replyText.trim()) return;
    setReplying(true);
    await addAnnouncementReply({ announcementId: a.id, authorId: employee.id, authorName: employee.name, content: replyText.trim(), createdAt: Date.now() });
    setReplyText(''); setReplying(false);
    toast('Reply posted');
  };

  const expired = a.expiresAt && a.expiresAt < Date.now();
  if (expired) return null;
  return (
    <div className={`card p-5 border-l-4 ${a.pinned ? 'border-l-blue-500' : 'border-l-transparent'} animate-slide-in`}>
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
          <p className="text-sm mt-1 leading-relaxed whitespace-pre-wrap" style={{ color: 'var(--text-muted)' }}>
            {a.body.split(/(https?:\/\/[^\s]+)/g).map((part, i) => 
              /(https?:\/\/[^\s]+)/.test(part) ? 
                <a key={i} href={part} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">{part}</a> 
              : part
            )}
          </p>
          <div className="flex items-center gap-3 mt-3 text-xs" style={{ color: 'var(--text-muted)' }}>
            <span>👤 {a.authorName}</span>
            <span>·</span>
            <span>{new Date(a.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
            {a.expiresAt && (<><span>·</span><span>Expires {new Date(a.expiresAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</span></>)}
          </div>
        </div>
        {canPost && (
          <div className="flex gap-1 flex-shrink-0">
            <button onClick={() => onPin(a)} title={a.pinned ? 'Unpin' : 'Pin'}
              className="text-sm p-1.5 rounded-lg transition hover:bg-gray-100 dark:hover:bg-white/10"
              style={{ color: a.pinned ? 'var(--accent)' : 'var(--text-muted)' }}>📌</button>
            <button onClick={() => onDelete(a.id)}
              className="text-sm p-1.5 rounded-lg transition hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-500"
              style={{ color: 'var(--text-muted)' }}>🗑️</button>
          </div>
        )}
      </div>

      {/* Reply thread */}
      <div className="mt-3 pt-3" style={{ borderTop: '1px solid var(--border)' }}>
        <button onClick={() => setShowReplies(v => !v)} className="text-xs font-medium transition"
          style={{ color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
          onMouseOver={e => (e.currentTarget as HTMLButtonElement).style.color = 'var(--text)'}
          onMouseOut={e => (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-muted)'}
        >
          💬 {showReplies ? 'Hide' : 'Reply'}{replies.length > 0 ? ` · ${replies.length}` : ''}
        </button>
        {showReplies && (
          <div className="mt-3 space-y-2">
            {replies.map(r => (
              <div key={r.id} className="flex gap-2 items-start">
                <div style={{ width: 24, height: 24, borderRadius: '50%', background: 'var(--text)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 700, color: 'var(--surface)', flexShrink: 0 }}>
                  {r.authorName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                </div>
                <div style={{ background: 'var(--surface2)', borderRadius: 8, padding: '6px 10px', flex: 1 }}>
                  <div className="text-xs font-semibold" style={{ color: 'var(--text)' }}>{r.authorName}</div>
                  <div className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{r.content}</div>
                </div>
              </div>
            ))}
            <div className="flex gap-2 mt-2">
              <input value={replyText} onChange={e => setReplyText(e.target.value)}
                placeholder="Write a reply…"
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleReply(); } }}
                style={{ flex: 1, height: 34, padding: '0 10px', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 7, fontSize: 12, fontFamily: 'inherit', color: 'var(--text)', outline: 'none' }}
                onFocus={e => (e.target.style.borderColor = 'var(--accent)')}
                onBlur={e => (e.target.style.borderColor = 'var(--border)')}
              />
              <button onClick={handleReply} disabled={replying || !replyText.trim()}
                style={{ height: 34, padding: '0 14px', background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 7, fontSize: 12, fontWeight: 500, cursor: 'pointer', opacity: replyText.trim() ? 1 : 0.5 }}>
                {replying ? '…' : 'Reply'}
              </button>
            </div>
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
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const canPost = employee.role === 'admin' || employee.role === 'founder' || !!(employee.permissions?.includes('post_announcements'));

  useEffect(() => {
    const u1 = onAnnouncementsChange(setAll);
    const u2 = onIntegrationsChange(setIntegrations);
    return () => { u1(); u2(); };
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
    const slackIntegration = integrations.find(i => i.type === 'slack' && i.webhookUrl);
    if (slackIntegration?.webhookUrl) {
      sendSlackNotification(slackIntegration.webhookUrl, `📢 *${form.title}* — ${form.body} _(posted by ${employee.name})_`);
    }
    setForm({ title: '', body: '', audience: 'all', pinned: false, expiresAt: '' });
    setShowForm(false); setSaving(false);
    toast('Announcement posted! 📢');
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
          <button onClick={() => setShowForm(true)}
            className="px-4 py-2 rounded-xl bg-blue-500 hover:bg-blue-600 text-white text-sm font-medium transition shadow">
            + Post
          </button>
        )}
      </div>

      {/* Create modal */}
      {showForm && canPost && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 300, padding: 20 }}
          onClick={e => { if (e.target === e.currentTarget) setShowForm(false); }}>
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, padding: 28, width: 460, maxHeight: '85vh', overflowY: 'auto', boxShadow: '0 8px 32px rgba(0,0,0,0.12)', animation: 'fadeIn 150ms ease' }}
            className="space-y-4">
            <h3 className="font-semibold" style={{ color: 'var(--text)' }}>New Announcement</h3>
            <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
              placeholder="Title *" autoFocus className="input w-full" />
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
              <button onClick={() => setShowForm(false)}
                className="flex-1 py-2 rounded-lg text-sm font-medium transition"
                style={{ background: 'var(--surface2)', color: 'var(--text-muted)' }}>Cancel</button>
              <button onClick={handleCreate} disabled={saving || !form.title.trim() || !form.body.trim()}
                className="flex-1 py-2 rounded-lg bg-blue-500 hover:bg-blue-600 disabled:opacity-50 text-white text-sm font-medium transition">
                {saving ? 'Posting…' : 'Post Announcement'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Pinned */}
      {pinned.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>📌 Pinned</h3>
          {pinned.map(a => <AnnouncementCard key={a.id} a={a} canPost={canPost} employee={employee} onPin={togglePin} onDelete={handleDelete} />)}
        </div>
      )}

      {/* Normal */}
      <div className="space-y-3">
        {pinned.length > 0 && normal.length > 0 && (
          <h3 className="text-sm font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>Latest</h3>
        )}
        {normal.map(a => <AnnouncementCard key={a.id} a={a} canPost={canPost} employee={employee} onPin={togglePin} onDelete={handleDelete} />)}
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
