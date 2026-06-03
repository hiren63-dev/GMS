import { useState, useRef } from 'react';
import { Save, Upload } from 'lucide-react';
import { useApp } from '../store/useStore';

export default function Settings() {
  const { settings, updateSettings, addToast, theme, toggleTheme } = useApp();
  const [form, setForm] = useState({
    ...settings,
    receiptFooter: (settings as any).receiptFooter ?? 'Thank you for choosing us! Stay fit, stay healthy.',
    signature: (settings as any).signature ?? '',
    stamp: (settings as any).stamp ?? '',
    receiptHeader: (settings as any).receiptHeader ?? '',
  });
  const [tab, setTab] = useState('gym');
  const sigRef = useRef<HTMLInputElement>(null);
  const stampRef = useRef<HTMLInputElement>(null);

  const handleSave = () => {
    updateSettings(form as any);
    addToast('Settings saved successfully!', 'success');
  };

  const handleFileUpload = (field: 'signature' | 'stamp', file: File | undefined) => {
    if (!file) return;
    if (file.size > 500 * 1024) {
      addToast('File too large (max 500KB)', 'error');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setForm(p => ({ ...p, [field]: reader.result as string }));
      addToast(`${field === 'signature' ? 'Signature' : 'Stamp'} uploaded!`, 'success');
    };
    reader.readAsDataURL(file);
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
        {['gym', 'billing', 'receipt', 'appearance'].map(t => (
          <button key={t} className={`tab-btn ${tab === t ? 'active' : ''}`} onClick={() => setTab(t)}>
            {t === 'gym' ? '🏢 Gym Profile' : t === 'billing' ? '💰 Billing & Tax' : t === 'receipt' ? '🧾 Receipt & Branding' : '🎨 Appearance'}
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
          </div>
        </div>
      )}

      {/* NEW: Receipt & Branding Tab */}
      {tab === 'receipt' && (
        <div className="card">
          <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 20 }}>Receipt Customization</h3>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 20 }}>
            Configure once — all payment and expense receipts will use these settings automatically.
          </p>

          <div className="grid grid-2" style={{ gap: 18 }}>
            {/* Receipt Header */}
            <div className="form-group" style={{ gridColumn: '1/-1' }}>
              <label className="form-label">Receipt Header Text (optional)</label>
              <input
                className="input"
                placeholder="e.g., TAX INVOICE or PAYMENT RECEIPT"
                value={form.receiptHeader ?? ''}
                onChange={e => setForm(p => ({ ...p, receiptHeader: e.target.value }))}
              />
            </div>

            {/* Receipt Footer */}
            <div className="form-group" style={{ gridColumn: '1/-1' }}>
              <label className="form-label">Receipt Footer Note</label>
              <input
                className="input"
                placeholder="Thank you for choosing us!"
                value={form.receiptFooter ?? ''}
                onChange={e => setForm(p => ({ ...p, receiptFooter: e.target.value }))}
              />
            </div>

            {/* Owner Signature Upload */}
            <div className="form-group">
              <label className="form-label">Owner Signature</label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {form.signature ? (
                  <div style={{ position: 'relative', padding: 12, background: 'var(--bg-elevated)', borderRadius: 10, border: '1px dashed var(--border-color)', textAlign: 'center' }}>
                    <img src={form.signature} alt="Signature" style={{ maxHeight: 60, maxWidth: '100%', objectFit: 'contain' }} />
                    <button
                      className="btn btn-danger btn-sm"
                      style={{ position: 'absolute', top: 4, right: 4, height: 24, width: 24, padding: 0 }}
                      onClick={() => setForm(p => ({ ...p, signature: '' }))}
                    >✕</button>
                  </div>
                ) : (
                  <div
                    onClick={() => sigRef.current?.click()}
                    style={{
                      padding: '20px 12px', background: 'var(--bg-elevated)', borderRadius: 10,
                      border: '2px dashed var(--border-color)', textAlign: 'center',
                      cursor: 'pointer', transition: 'all 0.2s',
                    }}
                  >
                    <Upload size={20} style={{ color: 'var(--text-muted)', marginBottom: 6 }} />
                    <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Click to upload signature</div>
                    <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>PNG or JPG, max 500KB</div>
                  </div>
                )}
                <input
                  ref={sigRef}
                  type="file"
                  accept="image/png,image/jpeg"
                  style={{ display: 'none' }}
                  onChange={e => handleFileUpload('signature', e.target.files?.[0])}
                />
              </div>
            </div>

            {/* Gym Stamp Upload */}
            <div className="form-group">
              <label className="form-label">Gym Stamp</label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {form.stamp ? (
                  <div style={{ position: 'relative', padding: 12, background: 'var(--bg-elevated)', borderRadius: 10, border: '1px dashed var(--border-color)', textAlign: 'center' }}>
                    <img src={form.stamp} alt="Stamp" style={{ maxHeight: 60, maxWidth: '100%', objectFit: 'contain' }} />
                    <button
                      className="btn btn-danger btn-sm"
                      style={{ position: 'absolute', top: 4, right: 4, height: 24, width: 24, padding: 0 }}
                      onClick={() => setForm(p => ({ ...p, stamp: '' }))}
                    >✕</button>
                  </div>
                ) : (
                  <div
                    onClick={() => stampRef.current?.click()}
                    style={{
                      padding: '20px 12px', background: 'var(--bg-elevated)', borderRadius: 10,
                      border: '2px dashed var(--border-color)', textAlign: 'center',
                      cursor: 'pointer', transition: 'all 0.2s',
                    }}
                  >
                    <Upload size={20} style={{ color: 'var(--text-muted)', marginBottom: 6 }} />
                    <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Click to upload gym stamp</div>
                    <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>PNG or JPG, max 500KB</div>
                  </div>
                )}
                <input
                  ref={stampRef}
                  type="file"
                  accept="image/png,image/jpeg"
                  style={{ display: 'none' }}
                  onChange={e => handleFileUpload('stamp', e.target.files?.[0])}
                />
              </div>
            </div>
          </div>

          {/* Live Preview */}
          <div style={{ marginTop: 24 }}>
            <h4 style={{ fontSize: 14, fontWeight: 700, marginBottom: 12 }}>📄 Receipt Preview</h4>
            <div style={{ maxWidth: 340, margin: '0 auto', padding: 20, background: '#fff', color: '#111', borderRadius: 10, fontFamily: 'monospace', fontSize: 12, lineHeight: 1.8, border: '1px solid #ddd' }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontFamily: 'Inter, sans-serif', fontWeight: 800, fontSize: 16 }}>{form.gymName || 'My Gym'}</div>
                <div style={{ fontSize: 10, color: '#888' }}>{form.address} · {form.phone}</div>
                {form.receiptHeader && <div style={{ fontSize: 11, fontWeight: 700, color: '#c00', marginTop: 6, letterSpacing: '0.08em' }}>{form.receiptHeader}</div>}
              </div>
              <div style={{ borderTop: '1px dashed #ccc', margin: '8px 0' }} />
              <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: '#888' }}>Receipt No:</span><span style={{ color: '#0A84FF', fontWeight: 700 }}>RCP-XXXXX</span></div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: '#888' }}>Date:</span><span>XX/XX/XXXX</span></div>
              <div style={{ borderTop: '1px dashed #ccc', margin: '8px 0' }} />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700 }}><span>Total:</span><span>₹X,XXX</span></div>
              <div style={{ borderTop: '1px dashed #ccc', margin: '8px 0' }} />
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', minHeight: 50 }}>
                <div style={{ textAlign: 'center' }}>
                  {form.signature ? <img src={form.signature} style={{ maxHeight: 30, objectFit: 'contain' }} /> : <div style={{ height: 20 }} />}
                  <div style={{ fontSize: 9, color: '#aaa', borderTop: '1px solid #ccc', paddingTop: 2, marginTop: 2 }}>Signature</div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  {form.stamp ? <img src={form.stamp} style={{ maxHeight: 36, objectFit: 'contain' }} /> : <div style={{ height: 20 }} />}
                  <div style={{ fontSize: 9, color: '#aaa', borderTop: '1px solid #ccc', paddingTop: 2, marginTop: 2 }}>Stamp</div>
                </div>
              </div>
              {form.receiptFooter && <div style={{ textAlign: 'center', fontSize: 9, color: '#aaa', fontStyle: 'italic', marginTop: 8 }}>{form.receiptFooter}</div>}
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
