import { useState } from 'react';
import { Eye, EyeOff, Zap, Lock, Mail } from 'lucide-react';
import { useApp } from '../store/useStore';

const DEMO_USERS = [
  { role: 'Owner', email: 'owner@gym.com', color: '#8b5cf6', icon: '👑' },
  { role: 'Manager', email: 'manager@gym.com', color: '#ec4899', icon: '📊' },
  { role: 'Trainer', email: 'trainer@gym.com', color: '#10b981', icon: '🏋️' },
  { role: 'Receptionist', email: 'frontdesk@gym.com', color: '#f59e0b', icon: '🖥️' },
];

export default function Login() {
  const { login, addToast } = useApp();
  const [email, setEmail] = useState('owner@gym.com');
  const [password, setPassword] = useState('demo123');
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    await new Promise(r => setTimeout(r, 600)); // simulate auth
    const ok = login(email, password);
    if (!ok) {
      setError('Invalid email or password');
      addToast('Invalid credentials', 'error');
    } else {
      addToast('Welcome back!', 'success');
    }
    setLoading(false);
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div className="bg-blobs">
        <div className="blob blob-1" />
        <div className="blob blob-2" />
        <div className="blob blob-3" />
      </div>

      <div className="card animate-slide-up" style={{ width: '100%', maxWidth: 440 }}>
        {/* Logo */}
        <div className="text-center mb-6">
          <div style={{ width: 64, height: 64, borderRadius: 20, background: 'linear-gradient(135deg, #8b5cf6, #ec4899)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
            <Zap size={32} color="white" />
          </div>
          <h1 style={{ fontSize: 26, fontWeight: 800, background: 'linear-gradient(135deg, #8b5cf6, #ec4899)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            Pulse Fitness
          </h1>
          <p className="text-secondary" style={{ fontSize: 13, marginTop: 4 }}>Gym Management System</p>
        </div>

        {/* Demo Quick-Login */}
        <div style={{ marginBottom: 20 }}>
          <p style={{ fontSize: 11.5, color: 'var(--text-muted)', textAlign: 'center', marginBottom: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Quick Demo Login</p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            {DEMO_USERS.map(u => (
              <button
                key={u.role}
                type="button"
                className="btn btn-secondary"
                style={{ fontSize: 12, height: 36, gap: 6, justifyContent: 'flex-start', borderColor: email === u.email ? u.color : undefined }}
                onClick={() => { setEmail(u.email); setPassword('demo123'); }}
              >
                <span>{u.icon}</span>
                {u.role}
              </button>
            ))}
          </div>
        </div>

        <div className="divider" style={{ position: 'relative' }}>
          <span style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', background: 'var(--bg-secondary)', padding: '0 12px', color: 'var(--text-muted)', fontSize: 11 }}>OR</span>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16, marginTop: 16 }}>
          <div className="form-group">
            <label className="form-label">Email</label>
            <div className="relative">
              <Mail size={15} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input
                type="email"
                className="input"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="your@email.com"
                style={{ paddingLeft: 36 }}
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Password</label>
            <div className="relative">
              <Lock size={15} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input
                type={showPw ? 'text' : 'password'}
                className="input"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Enter password"
                style={{ paddingLeft: 36, paddingRight: 44 }}
                required
              />
              <button
                type="button"
                onClick={() => setShowPw(!showPw)}
                style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
              >
                {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {error && (
            <div style={{ background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.3)', borderRadius: 'var(--radius-md)', padding: '10px 14px', fontSize: 13, color: 'var(--accent-danger)' }}>
              {error}
            </div>
          )}

          <button type="submit" className="btn btn-primary btn-full btn-lg" disabled={loading}>
            {loading ? (
              <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ width: 16, height: 16, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: 'white', borderRadius: '50%', animation: 'spin 0.8s linear infinite', display: 'inline-block' }} />
                Signing in...
              </span>
            ) : 'Sign In'}
          </button>
        </form>

        <p style={{ textAlign: 'center', fontSize: 11, color: 'var(--text-muted)', marginTop: 20 }}>
          Demo password for all accounts: <strong style={{ color: 'var(--text-secondary)' }}>demo123</strong>
        </p>
      </div>
    </div>
  );
}
