import { useState, useMemo } from 'react';
import { Plus, Download, Search } from 'lucide-react';
import { useApp } from '../store/useStore';
import type { Payment } from '../types';
import {
  formatCurrency, formatDate, paginate,
  exportToCSV, generateId, generateReceiptNo, calculateGST, searchFilter
} from '../utils/helpers';
import Modal from '../components/ui/Modal';

const PAYMENT_MODES = ['UPI', 'Cash', 'Card', 'GPay', 'PhonePe'];
const CATEGORIES = ['Membership', 'PT', 'Supplement', 'Locker', 'Other'];
const DISCOUNTS = [
  { label: 'No Discount', value: 0 },
  { label: 'Festival (₹200)', value: 200 },
  { label: 'Referral (₹100)', value: 100 },
  { label: 'Loyalty (₹150)', value: 150 },
];

export default function Payments() {
  const { payments, members, addPayment, currentUser, addToast, settings } = useApp();
  const [query, setQuery] = useState('');
  const [modeFilter, setModeFilter] = useState('All');
  const [page, setPage] = useState(1);
  const [collectOpen, setCollectOpen] = useState(false);
  const [receipt, setReceipt] = useState<Payment | null>(null);
  const [form, setForm] = useState({
    memberSearch: '', memberId: '', planName: '', baseAmount: 0,
    discount: 0, mode: 'UPI', transactionId: '', category: 'Membership',
  });

  const PER_PAGE = 15;

  const filtered = useMemo(() => {
    let result = searchFilter(payments, query, ['memberName', 'receiptNo', 'paymentMode']);
    if (modeFilter !== 'All') result = result.filter(p => p.paymentMode === modeFilter);
    return [...result].sort((a, b) => b.date.localeCompare(a.date));
  }, [payments, query, modeFilter]);

  const { items, totalPages, total } = paginate(filtered, page, PER_PAGE);

  const totalRevenue = payments.reduce((s, p) => s + p.totalAmount, 0);
  const monthStart = new Date(); monthStart.setDate(1);
  const monthRevenue = payments.filter(p => new Date(p.date) >= monthStart).reduce((s, p) => s + p.totalAmount, 0);
  const upiCount = payments.filter(p => p.paymentMode === 'UPI' || p.paymentMode === 'GPay' || p.paymentMode === 'PhonePe').length;
  const cashCount = payments.filter(p => p.paymentMode === 'Cash').length;

  const selectedMember = members.find(m => m.id === form.memberId);
  const { base, gst, total: totalAmt } = calculateGST(Math.max(0, form.baseAmount - form.discount));

  const memberOptions = members.filter(m =>
    form.memberSearch && m.name.toLowerCase().includes(form.memberSearch.toLowerCase())
  ).slice(0, 5);

  // Close member dropdown when clicking outside
  const memberSearchRef = useState<HTMLDivElement | null>(null);
  void memberSearchRef;

  const handleCollect = () => {
    if (!form.memberId) { addToast('Please select a member', 'error'); return; }
    if (!form.baseAmount) { addToast('Please enter amount', 'error'); return; }
    const payment: Payment = {
      id: generateId(),
      receiptNo: generateReceiptNo(),
      memberId: form.memberId,
      memberName: selectedMember?.name ?? '',
      memberPhone: selectedMember?.phone ?? '',
      planName: form.planName || selectedMember?.planName || '',
      amount: base,
      discount: form.discount,
      gst,
      totalAmount: totalAmt,
      paymentMode: form.mode as Payment['paymentMode'],
      transactionId: form.transactionId || undefined,
      date: new Date().toISOString().split('T')[0],
      time: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
      category: form.category as Payment['category'],
      collectedBy: currentUser?.name ?? 'Staff',
    };
    addPayment(payment);
    setReceipt(payment);
    setCollectOpen(false);
    addToast(`Payment of ${formatCurrency(totalAmt)} collected!`, 'success');
    setForm({ memberSearch: '', memberId: '', planName: '', baseAmount: 0, discount: 0, mode: 'UPI', transactionId: '', category: 'Membership' });
  };

  const handleExport = () => {
    exportToCSV(payments.map(p => ({
      Receipt: p.receiptNo, Date: p.date, Member: p.memberName, Phone: p.memberPhone,
      Plan: p.planName, Amount: p.totalAmount, Mode: p.paymentMode, Category: p.category,
    })), 'payments');
    addToast('Payments exported to CSV', 'success');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div className="page-header">
        <div>
          <h1 className="page-title">Payments & Billing</h1>
          <p className="page-subtitle">{payments.length} transactions · {formatCurrency(totalRevenue)} total</p>
        </div>
        <div className="page-header-actions">
          <button className="btn btn-secondary" onClick={handleExport}><Download size={15} /> Export</button>
          <button className="btn btn-primary" onClick={() => setCollectOpen(true)}><Plus size={16} /> Collect Payment</button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-4">
        <StatCard label="Total Revenue" value={formatCurrency(totalRevenue)} color="#8b5cf6" icon="💰" />
        <StatCard label="This Month" value={formatCurrency(monthRevenue)} color="#10b981" icon="📅" />
        <StatCard label="Digital Payments" value={`${upiCount} txns`} color="#60a5fa" icon="📱" />
        <StatCard label="Cash Payments" value={`${cashCount} txns`} color="#f59e0b" icon="💵" />
      </div>

      {/* Filters */}
      <div className="card card-sm">
        <div className="flex items-center gap-3" style={{ flexWrap: 'wrap' }}>
          <div className="search-input-wrap" style={{ flex: 1, minWidth: 200 }}>
            <Search size={15} className="search-icon" />
            <input className="input" placeholder="Search by member, receipt..." value={query} onChange={e => { setQuery(e.target.value); setPage(1); }} style={{ paddingLeft: 36 }} />
          </div>
          <select className="select" style={{ width: 160 }} value={modeFilter} onChange={e => { setModeFilter(e.target.value); setPage(1); }}>
            <option value="All">All Modes</option>
            {PAYMENT_MODES.map(m => <option key={m}>{m}</option>)}
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="card card-no-padding">
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>Receipt No</th>
                <th>Member</th>
                <th>Category</th>
                <th>Amount</th>
                <th>Mode</th>
                <th>Date</th>
                <th>Collected By</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.map(p => (
                <tr key={p.id}>
                  <td><span style={{ fontFamily: 'monospace', fontSize: 12, color: 'var(--accent-primary)' }}>{p.receiptNo}</span></td>
                  <td>
                    <div style={{ fontWeight: 600, fontSize: 13 }}>{p.memberName}</div>
                    <div className="text-muted text-xs">{p.memberPhone}</div>
                  </td>
                  <td><span className="badge badge-info">{p.category}</span></td>
                  <td>
                    <div style={{ fontWeight: 700, color: 'var(--accent-success)' }}>{formatCurrency(p.totalAmount)}</div>
                    {p.discount > 0 && <div className="text-xs" style={{ color: 'var(--accent-warning)' }}>-{formatCurrency(p.discount)} disc.</div>}
                  </td>
                  <td><span className="badge badge-purple">{p.paymentMode}</span></td>
                  <td>
                    <div style={{ fontSize: 13 }}>{formatDate(p.date)}</div>
                    <div className="text-muted text-xs">{p.time}</div>
                  </td>
                  <td style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{p.collectedBy}</td>
                  <td>
                    <button className="btn btn-ghost btn-xs text-primary" onClick={() => setReceipt(p)}>
                      Print
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="pagination">
          <span>
            {total === 0
              ? 'No results'
              : `Showing ${Math.min((page - 1) * PER_PAGE + 1, total)}–${Math.min(page * PER_PAGE, total)} of ${total}`}
          </span>
          <div className="pagination-controls">
            <button className="page-btn" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>‹</button>
            {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => (
              <button key={i + 1} className={`page-btn ${page === i + 1 ? 'active' : ''}`} onClick={() => setPage(i + 1)}>{i + 1}</button>
            ))}
            <button className="page-btn" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages || totalPages === 0}>›</button>
          </div>
        </div>
      </div>

      {/* Collect Payment Modal */}
      <Modal open={collectOpen} onClose={() => setCollectOpen(false)} title="Collect Payment"
        footer={<>
          <button className="btn btn-secondary" onClick={() => setCollectOpen(false)}>Cancel</button>
          <button className="btn btn-primary" onClick={handleCollect}>Collect {formatCurrency(totalAmt)}</button>
        </>}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Member Search */}
          <div className="form-group">
            <label className="form-label required">Member</label>
            <div className="relative">
              <input
                className="input"
                placeholder="Type member name..."
                value={form.memberSearch}
                onChange={e => setForm(p => ({ ...p, memberSearch: e.target.value, memberId: '' }))}
                onBlur={() => setTimeout(() => setForm(p => ({ ...p, memberSearch: p.memberId ? p.memberSearch : p.memberSearch })), 200)}
              />
              {memberOptions.length > 0 && !form.memberId && (
                <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 100, background: 'var(--bg-surface)', border: '1px solid var(--glass-border)', borderRadius: 'var(--radius-md)', boxShadow: 'var(--shadow-md)', overflow: 'hidden' }}>
                  {memberOptions.map(m => (
                    <div key={m.id} className="dropdown-item" onMouseDown={e => e.preventDefault()} onClick={() => setForm(p => ({ ...p, memberSearch: m.name, memberId: m.id, planName: m.planName, baseAmount: 0 }))}>
                      <img src={m.photo} style={{ width: 28, height: 28, borderRadius: '50%' }} />
                      <div>
                        <div style={{ fontWeight: 600, fontSize: 13 }}>{m.name}</div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{m.memberId} · {m.planName}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            {selectedMember && (
              <div style={{ marginTop: 8, padding: '10px 14px', background: 'var(--bg-active)', borderRadius: 'var(--radius-md)', fontSize: 13 }}>
                ✅ {selectedMember.name} · {selectedMember.memberId} · <span style={{ color: selectedMember.status === 'Expired' ? 'var(--accent-danger)' : 'var(--accent-success)' }}>{selectedMember.status}</span>
              </div>
            )}
          </div>

          <div className="grid grid-2" style={{ gap: 14 }}>
            <div className="form-group">
              <label className="form-label required">Category</label>
              <select className="select" value={form.category} onChange={e => setForm(p => ({ ...p, category: e.target.value }))}>
                {CATEGORIES.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label required">Amount</label>
              <input className="input" type="number" value={form.baseAmount || ''} onChange={e => setForm(p => ({ ...p, baseAmount: +e.target.value }))} placeholder="0" />
            </div>
            <div className="form-group">
              <label className="form-label">Discount</label>
              <select className="select" value={form.discount} onChange={e => setForm(p => ({ ...p, discount: +e.target.value }))}>
                {DISCOUNTS.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label required">Payment Mode</label>
              <select className="select" value={form.mode} onChange={e => setForm(p => ({ ...p, mode: e.target.value }))}>
                {PAYMENT_MODES.map(m => <option key={m}>{m}</option>)}
              </select>
            </div>
          </div>

          {(form.mode === 'UPI' || form.mode === 'GPay' || form.mode === 'PhonePe') && (
            <div className="form-group">
              <label className="form-label">UPI Transaction ID</label>
              <input className="input" value={form.transactionId} onChange={e => setForm(p => ({ ...p, transactionId: e.target.value }))} placeholder="TXN123456789" />
            </div>
          )}

          {/* Breakdown */}
          {form.baseAmount > 0 && (
            <div style={{ padding: 16, background: 'var(--bg-hover)', borderRadius: 'var(--radius-md)', fontSize: 13 }}>
              <div className="flex justify-between mb-1 text-secondary"><span>Base Amount</span><span>{formatCurrency(form.baseAmount)}</span></div>
              {form.discount > 0 && <div className="flex justify-between mb-1" style={{ color: 'var(--accent-warning)' }}><span>Discount</span><span>-{formatCurrency(form.discount)}</span></div>}
              <div className="flex justify-between mb-1 text-secondary"><span>GST (18%)</span><span>{formatCurrency(gst)}</span></div>
              <div className="divider" />
              <div className="flex justify-between font-bold"><span>Total Amount</span><span style={{ color: 'var(--accent-success)', fontSize: 16 }}>{formatCurrency(totalAmt)}</span></div>
            </div>
          )}
        </div>
      </Modal>

      {/* Receipt Modal */}
      {receipt && (
        <Modal open={!!receipt} onClose={() => setReceipt(null)} title="Payment Receipt" size="sm"
          footer={<button className="btn btn-primary" onClick={() => { window.print(); }}>🖨️ Print Receipt</button>}
        >
          <div style={{ fontFamily: 'monospace', fontSize: 13, lineHeight: 2 }}>
            <div style={{ textAlign: 'center', marginBottom: 16 }}>
              <h3 style={{ fontFamily: 'Inter', fontSize: 18, background: 'linear-gradient(135deg, #8b5cf6, #ec4899)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>{settings.gymName || 'GYM'}</h3>
              <div className="text-secondary text-xs">{settings.address} · {settings.phone}</div>
            </div>
            <div className="divider" />
            <div className="flex justify-between"><span className="text-muted">Receipt No:</span><span style={{ color: 'var(--accent-primary)' }}>{receipt.receiptNo}</span></div>
            <div className="flex justify-between"><span className="text-muted">Date:</span><span>{formatDate(receipt.date)} {receipt.time}</span></div>
            <div className="flex justify-between"><span className="text-muted">Member:</span><span>{receipt.memberName}</span></div>
            <div className="flex justify-between"><span className="text-muted">Plan:</span><span>{receipt.planName}</span></div>
            <div className="divider" />
            <div className="flex justify-between"><span className="text-muted">Amount:</span><span>{formatCurrency(receipt.amount)}</span></div>
            {receipt.discount > 0 && <div className="flex justify-between"><span className="text-muted">Discount:</span><span style={{ color: 'var(--accent-warning)' }}>-{formatCurrency(receipt.discount)}</span></div>}
            <div className="flex justify-between"><span className="text-muted">GST (18%):</span><span>{formatCurrency(receipt.gst)}</span></div>
            <div className="divider" />
            <div className="flex justify-between font-bold" style={{ fontSize: 16 }}><span>TOTAL:</span><span style={{ color: 'var(--accent-success)' }}>{formatCurrency(receipt.totalAmount)}</span></div>
            <div className="flex justify-between text-muted text-xs mt-2"><span>Payment Mode:</span><span>{receipt.paymentMode}</span></div>
            {receipt.transactionId && <div className="flex justify-between text-muted text-xs"><span>Txn ID:</span><span>{receipt.transactionId}</span></div>}

            {/* Signature & Stamp from settings */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: 16, minHeight: 50 }}>
              <div style={{ textAlign: 'center' }}>
                {(settings as any).signature && <img src={(settings as any).signature} alt="Signature" style={{ maxHeight: 36, maxWidth: 80, objectFit: 'contain' }} />}
                <div style={{ fontSize: 9, color: 'var(--text-muted)', borderTop: '1px solid var(--border-color)', paddingTop: 3, marginTop: 3 }}>Auth. Signature</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                {(settings as any).stamp && <img src={(settings as any).stamp} alt="Stamp" style={{ maxHeight: 44, maxWidth: 60, objectFit: 'contain' }} />}
                <div style={{ fontSize: 9, color: 'var(--text-muted)', borderTop: '1px solid var(--border-color)', paddingTop: 3, marginTop: 3 }}>Gym Stamp</div>
              </div>
            </div>

            {/* Footer */}
            {(settings as any).receiptFooter && (
              <div style={{ textAlign: 'center', marginTop: 12, fontSize: 10, color: 'var(--text-muted)', fontStyle: 'italic' }}>
                {(settings as any).receiptFooter}
              </div>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
}

function StatCard({ label, value, color, icon }: any) {
  return (
    <div className="card card-sm">
      <div style={{ fontSize: 24, marginBottom: 8 }}>{icon}</div>
      <div style={{ fontSize: 20, fontWeight: 800, color }}>{value}</div>
      <div className="text-secondary text-xs mt-1">{label}</div>
    </div>
  );
}
