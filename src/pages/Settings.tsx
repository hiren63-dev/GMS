import { useState } from 'react';
import { Save } from 'lucide-react';
import { useApp } from '../store/useStore';

export default function Settings() {
  const { settings, updateSettings, addToast, theme, toggleTheme } = useApp();
  // Include receiptFooter in form state (may not be in old settings, so default to '')
  const [form, setForm] = useState({ ...settings, receiptFooter: (settings as any).receiptFooter ?? '' });
  const [tab, setTab] = useState('gym');

  const handleSave = () => {
    updateSettings(form);
    addToast('Settings saved successfully!', 'success');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div className="page-header">
        <div>
          <h1 className="page-title">Settings</h1>
          <p className="page-subtitle">Configure your gym management system</p>
        </div>
        <button className="btn btn-primary" onClick={handleSave}><Save size={15} /> Save Changes</button>
      </div>

      <div className="tabs">
        {['gym', 'billing', 'appearance'].map(t => (
          <button key={t} className={`tab-btn ${tab === t ? 'active' : ''}`} onClick={() => setTab(t)}>
            {t === 'gym' ? '🏢 Gym Profile' : t === 'billing' ? '💰 Billing & Tax' : '🎨 Appearance'}
          </button>
        ))}
      </div>

      {tab === 'gym' && (
        <div className="card">
          <div className="grid grid-2" style={{ gap: 18 }}>
            <div className="form-group" style={{ gridColumn: '1/-1' }}>
              <label className="form-label required">Gym Name</label>
              <input className="input" value={form.gymName} onChange={e => setForm(p => ({ ...p, gymName: e.target.value }))} />
            </div>
            <div className="form-group" style={{ gridColumn: '1/-1' }}>
              <label className="form-label">Tagline</label>
              <input className="input" value={form.tagline} onChange={e => setForm(p => ({ ...p, tagline: e.target.value }))} />
            </div>
            <div className="form-group" style={{ gridColumn: '1/-1' }}>
              <label className="form-label">Address</label>
              <textarea className="textarea" style={{ minHeight: 70 }} value={form.address} onChange={e => setForm(p => ({ ...p, address: e.target.value }))} />
            </div>
            <div className="form-group">
              <label className="form-label">Phone</label>
              <input className="input" value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))} />
            </div>
            <div className="form-group">
              <label className="form-label">Email</label>
              <input className="input" type="email" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} />
            </div>
            <div className="form-group" style={{ gridColumn: '1/-1' }}>
              <label className="form-label">Timings</label>
              <input className="input" value={form.timings} onChange={e => setForm(p => ({ ...p, timings: e.target.value }))} placeholder="Mon-Sat: 5:30 AM - 10 PM" />
            </div>
          </div>
        </div>
      )}

      {tab === 'billing' && (
        <div className="card">
          <div className="grid grid-2" style={{ gap: 18 }}>
            <div className="form-group">
              <label className="form-label">GST Number</label>
              <input className="input" value={form.gstNumber} onChange={e => setForm(p => ({ ...p, gstNumber: e.target.value }))} placeholder="29AABCP1234A1Z5" />
            </div>
            <div className="form-group">
              <label className="form-label">GST Rate (%)</label>
              <input className="input" type="number" value={form.gstRate || ''} onChange={e => setForm(p => ({ ...p, gstRate: +e.target.value }))} />
            </div>
            <div className="form-group" style={{ gridColumn: '1/-1' }}>
              <label className="form-label">Receipt Footer Note</label>
              <input
                className="input"
                placeholder="Thank you for choosing us!"
                value={form.receiptFooter ?? ''}
                onChange={e => setForm(p => ({ ...p, receiptFooter: e.target.value }))}
              />
            </div>
          </div>
        </div>
      )}

      {tab === 'appearance' && (
        <div className="card">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div className="form-group">
              <label className="form-label">Theme</label>
              <div className="flex gap-3">
                <button
                  className={`btn ${theme === 'dark' ? 'btn-primary' : 'btn-secondary'}`}
                  onClick={() => { if (theme !== 'dark') toggleTheme(); }}
                >
                  🌙 Dark Mode
                </button>
                <button
                  className={`btn ${theme === 'light' ? 'btn-primary' : 'btn-secondary'}`}
                  onClick={() => { if (theme !== 'light') toggleTheme(); }}
                >
                  ☀️ Light Mode
                </button>
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Primary Color</label>
              <div className="flex items-center gap-3">
                <input type="color" value={form.primaryColor} onChange={e => setForm(p => ({ ...p, primaryColor: e.target.value }))} style={{ width: 48, height: 38, borderRadius: 8, border: 'none', cursor: 'pointer', background: 'none' }} />
                <input className="input" value={form.primaryColor} onChange={e => setForm(p => ({ ...p, primaryColor: e.target.value }))} style={{ flex: 1 }} />
              </div>
              <div className="flex gap-2" style={{ marginTop: 8 }}>
                {['#8b5cf6', '#3b82f6', '#10b981', '#f59e0b', '#ec4899', '#f43f5e'].map(c => (
                  <div
                    key={c}
                    onClick={() => setForm(p => ({ ...p, primaryColor: c }))}
                    style={{ width: 28, height: 28, borderRadius: '50%', background: c, cursor: 'pointer', border: form.primaryColor === c ? '3px solid white' : '2px solid transparent', transition: 'all 0.2s' }}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
