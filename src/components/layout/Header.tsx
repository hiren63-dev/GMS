import { useState, useRef, useEffect } from 'react';
import { Bell, Search, ChevronDown, Check, Menu } from 'lucide-react';
import { useApp } from '../../store/useStore';
import { formatRelativeTime } from '../../utils/helpers';

interface HeaderProps {
  pageName: string;
  onSearch?: (query: string) => void;
}

export default function Header({ pageName, onSearch }: HeaderProps) {
  const { notifications, markNotificationRead, markAllRead, currentUser, toggleSidebar } = useApp();
  const [notifOpen, setNotifOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [searchVal, setSearchVal] = useState('');
  const notifRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);

  const unread = notifications.filter(n => !n.read);


  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) setNotifOpen(false);
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) setProfileOpen(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const notifTypeIcon: Record<string, string> = {
    warning: '⚠️', success: '✅', error: '🔴', info: 'ℹ️',
  };

  return (
    <header className="header-bar">
      {/* Mobile Menu & Page Title */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <button className="btn btn-ghost btn-icon menu-btn-mobile" onClick={toggleSidebar}>
          <Menu size={20} />
        </button>
        <div style={{ fontWeight: 700, fontSize: 18, color: 'var(--text-primary)', whiteSpace: 'nowrap' }}>
          {pageName === 'Dashboard' ? `Hii ${currentUser?.name?.split(' ')[0]} 👋` : pageName}
        </div>
      </div>

      {/* Search */}
      {onSearch && (
        <div className="search-input-wrap" style={{ flex: 1, maxWidth: 360 }}>
          <Search size={15} className="search-icon" />
          <input
            type="text"
            className="input"
            placeholder="Search members, payments..."
            value={searchVal}
            onChange={e => { setSearchVal(e.target.value); onSearch(e.target.value); }}
            style={{ fontSize: 13 }}
          />
        </div>
      )}

      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginLeft: 'auto' }}>


        {/* Notifications */}
        <div className="relative" ref={notifRef}>
          <button
            className="btn btn-ghost btn-icon"
            onClick={() => setNotifOpen(!notifOpen)}
            style={{ position: 'relative' }}
          >
            <Bell size={18} />
            {unread.length > 0 && (
              <span style={{
                position: 'absolute', top: 6, right: 6,
                width: 8, height: 8, borderRadius: '50%',
                background: 'var(--accent-danger)',
                border: '2px solid var(--bg-primary)',
              }} />
            )}
          </button>

          {notifOpen && (
            <div className="dropdown-menu" style={{ width: 340 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', borderBottom: '1px solid var(--glass-border)' }}>
                <span style={{ fontWeight: 700, fontSize: 14 }}>Notifications</span>
                {unread.length > 0 && (
                  <button onClick={markAllRead} style={{ background: 'none', border: 'none', color: 'var(--accent-primary)', cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>
                    Mark all read
                  </button>
                )}
              </div>
              <div style={{ maxHeight: 320, overflowY: 'auto' }}>
                {notifications.slice(0, 6).map(n => (
                  <div
                    key={n.id}
                    className="dropdown-item"
                    onClick={() => markNotificationRead(n.id)}
                    style={{ background: n.read ? 'transparent' : 'var(--bg-active)', gap: 12, alignItems: 'flex-start', padding: '12px 16px' }}
                  >
                    <span style={{ fontSize: 16, flexShrink: 0 }}>{notifTypeIcon[n.type]}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 2 }}>{n.title}</div>
                      <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.4 }}>{n.message}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>{formatRelativeTime(n.timestamp)}</div>
                    </div>
                    {!n.read && (
                      <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--accent-primary)', flexShrink: 0, marginTop: 4 }} />
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Profile */}
        <div className="relative" ref={profileRef}>
          <button
            className="btn btn-ghost"
            onClick={() => setProfileOpen(!profileOpen)}
            style={{ gap: 8, padding: '0 8px' }}
          >
            <div style={{ position: 'relative' }}>
              {currentUser?.photo ? (
                <img
                  src={currentUser.photo}
                  alt={currentUser.name}
                  style={{ width: 30, height: 30, borderRadius: '50%', objectFit: 'cover' }}
                  onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                />
              ) : (
                <div style={{
                  width: 30, height: 30, borderRadius: '50%',
                  background: 'var(--accent-primary)', color: '#fff',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 11, fontWeight: 800,
                }}>
                  {(currentUser?.name || 'U').split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()}
                </div>
              )}
            </div>
            <div style={{ textAlign: 'left', lineHeight: 1.2 }}>
              <div style={{ fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap' }}>{currentUser?.name?.split(' ')[0]}</div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{currentUser?.role}</div>
            </div>
            <ChevronDown size={14} color="var(--text-muted)" />
          </button>


          {profileOpen && (
            <div className="dropdown-menu" style={{ width: 200 }}>
              <div style={{ padding: '12px 14px', borderBottom: '1px solid var(--glass-border)' }}>
                <div style={{ fontWeight: 700, fontSize: 14 }}>{currentUser?.name}</div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{currentUser?.email}</div>
              </div>
              <div className="dropdown-item" style={{ gap: 10 }}>
                <Check size={14} color="var(--accent-success)" />
                Role: {currentUser?.role}
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
