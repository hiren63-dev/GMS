import { useState, useMemo } from 'react';
import { useApp } from '../store/useStore';
import { formatCurrency, formatDate, exportToCSV } from '../utils/helpers';
import { Plus, Download, Printer, X } from 'lucide-react';
import Modal from '../components/ui/Modal';
import type { Expense } from '../types';
import { generateId } from '../utils/helpers';

const CATS: Expense['category'][] = ['Rent', 'Electricity', 'Salary', 'Equipment', 'Maintenance', 'Marketing', 'Supplements', 'Other'];
const CAT_ICONS: Record<string, string> = { Rent: '🏢', Electricity: '⚡', Salary: '👤', Equipment: '🔧', Maintenance: '🛠️', Marketing: '📢', Supplements: '💊', Other: '📋' };

export default function Expenses() {
  const { expenses, addExpense, addToast, settings } = useApp();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ category: 'Rent', description: '', amount: '', date: new Date().toISOString().split('T')[0], paidTo: '', paymentMode: 'UPI' });
  const [timeFilter, setTimeFilter] = useState('All');
  const [receipt, setReceipt] = useState<Expense | null>(null);

  const filteredExpenses = useMemo(() => {
    if (timeFilter === 'All') return expenses;
    const now = new Date();
    return expenses.filter(e => {
      const d = new Date(e.date);
      if (timeFilter === 'Monthly') {
        return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
      }
      if (timeFilter === 'Weekly') {
        const diffTime = now.getTime() - d.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return diffDays >= 0 && diffDays <= 7;
      }
      return true;
    });
  }, [expenses, timeFilter]);

  const total = filteredExpenses.reduce((s, e) => s + e.amount, 0);

  const handleAdd = () => {
    if (!form.amount || +form.amount <= 0) { addToast('Enter a valid amount', 'error'); return; }
    if (!form.date) { addToast('Select a date', 'error'); return; }
    const expense: Expense = {
      id: generateId(),
      category: form.category as Expense['category'],
      description: form.description,
      amount: +form.amount,
      date: form.date,
      paidTo: form.paidTo,
      paymentMode: form.paymentMode as Expense['paymentMode'],
      receiptNo: `EXP-${Date.now().toString(36).toUpperCase()}`,
    };
    addExpense(expense);
    addToast('Expense recorded', 'success');
    setOpen(false);
    setForm({ category: 'Rent', description: '', amount: '', date: new Date().toISOString().split('T')[0], paidTo: '', paymentMode: 'UPI' });
  };

  const handlePrintReceipt = () => {
    window.print();
  };

  // Settings-based branding
  const gymName = settings.gymName || 'My Gym';
  const gymAddress = (settings as any).address || '';
  const gymPhone = (settings as any).phone || '';
  const receiptFooter = (settings as any).receiptFooter || 'Thank you!';
  const signature = (settings as any).signature || '';
  const stamp = (settings as any).stamp || '';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div className="page-header">
        <div>
          <h1 className="page-title">Expenses</h1>
          <p className="page-subtitle">{filteredExpenses.length} records · {formatCurrency(total)} total</p>
        </div>
        <div className="page-header-actions">
          <select className="select" style={{ width: 140 }} value={timeFilter} onChange={e => setTimeFilter(e.target.value)}>
            <option value="All">All Time</option>
            <option value="Monthly">This Month</option>
            <option value="Weekly">Last 7 Days</option>
          </select>
          <button className="btn btn-secondary" onClick={() => { exportToCSV(filteredExpenses, 'expenses'); addToast('Exported!', 'success'); }}><Download size={15} />Export</button>
          <button className="btn btn-primary" onClick={() => setOpen(true)}><Plus size={16} />Add Expense</button>
        </div>
      </div>

      {/* Category breakdown */}
      <div className="grid grid-4">
        {CATS.slice(0, 4).map(cat => {
          const amt = filteredExpenses.filter(e => e.category === cat).reduce((s, e) => s + e.amount, 0);
          return (
            <div key={cat} className="card card-sm">
              <div style={{ fontSize: 22, marginBottom: 8 }}>{CAT_ICONS[cat]}</div>
              <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--accent-danger)' }}>{formatCurrency(amt)}</div>
              <div className="text-muted text-xs mt-1">{cat}</div>
            </div>
          );
        })}
      </div>

      <div className="card card-no-padding">
        <div className="table-container">
          <table className="table">
            <thead>
              <tr><th>Date</th><th>Category</th><th>Description</th><th>Amount</th><th>Paid To</th><th>Mode</th><th>Actions</th></tr>
            </thead>
            <tbody>
              {filteredExpenses.length === 0 && (
                <tr><td colSpan={7}><div className="empty-state"><div style={{ fontSize: 32 }}>📋</div><h3>No expenses</h3><p>Add an expense to get started.</p></div></td></tr>
              )}
              {filteredExpenses.map(e => (
                <tr key={e.id}>
                  <td style={{ fontSize: 13 }}>{formatDate(e.date)}</td>
                  <td><span className="badge badge-danger">{e.category}</span></td>
                  <td style={{ fontSize: 13 }}>{e.description || '-'}</td>
                  <td style={{ fontWeight: 700, color: 'var(--accent-danger)' }}>{formatCurrency(e.amount)}</td>
                  <td style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{e.paidTo || '-'}</td>
                  <td><span className="badge badge-purple">{e.paymentMode}</span></td>
                  <td>
                    <button className="btn btn-ghost btn-sm" onClick={() => setReceipt(e)} title="Print Receipt">
                      <Printer size={14} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Expense Modal */}
      <Modal open={open} onClose={() => setOpen(false)} title="Add Expense"
        footer={<><button className="btn btn-secondary" onClick={() => setOpen(false)}>Cancel</button><button className="btn btn-primary" onClick={handleAdd}>Add</button></>}
      >
        <div className="grid grid-2" style={{ gap: 14 }}>
          <div className="form-group"><label className="form-label">Category</label>
            <select className="select" value={form.category} onChange={e => setForm(p => ({ ...p, category: e.target.value }))}>
              {CATS.map(c => <option key={c}>{c}</option>)}
            </select>
          </div>
          <div className="form-group"><label className="form-label required">Date</label>
            <input className="input" type="date" value={form.date} onChange={e => setForm(p => ({ ...p, date: e.target.value }))} />
          </div>
          <div className="form-group" style={{ gridColumn: '1/-1' }}><label className="form-label">Description</label>
            <input className="input" value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} placeholder="Expense description" />
          </div>
          <div className="form-group"><label className="form-label required">Amount (₹)</label>
            <input className="input" type="number" value={form.amount || ''} onChange={e => setForm(p => ({ ...p, amount: e.target.value }))} />
          </div>
          <div className="form-group"><label className="form-label">Paid To</label>
            <input className="input" value={form.paidTo} onChange={e => setForm(p => ({ ...p, paidTo: e.target.value }))} />
          </div>
          <div className="form-group"><label className="form-label">Payment Mode</label>
            <select className="select" value={form.paymentMode} onChange={e => setForm(p => ({ ...p, paymentMode: e.target.value }))}>
              {['UPI', 'Cash', 'Card'].map(m => <option key={m}>{m}</option>)}
            </select>
          </div>
        </div>
      </Modal>

      {/* Expense Receipt Modal — Printable */}
      {receipt && (
        <div
          className="modal-overlay"
          onClick={e => { if (e.target === e.currentTarget) setReceipt(null); }}
          style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        >
          <div
            className="modal"
            style={{ background: '#fff', borderRadius: 16, width: 380, maxHeight: '90vh', overflow: 'auto', color: '#111', padding: 0 }}
          >
            {/* Receipt Content */}
            <div style={{ padding: 28, fontFamily: 'monospace', fontSize: 13, lineHeight: 2, color: '#111' }}>
              {/* Header */}
              <div style={{ textAlign: 'center', marginBottom: 16 }}>
                <h3 style={{ fontFamily: 'Inter, sans-serif', fontSize: 18, fontWeight: 800, color: '#111' }}>{gymName}</h3>
                <div style={{ fontSize: 11, color: '#666' }}>{gymAddress} · {gymPhone}</div>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#c00', marginTop: 8, letterSpacing: '0.08em' }}>EXPENSE VOUCHER</div>
              </div>

              <div style={{ borderTop: '1px dashed #aaa', margin: '8px 0' }} />

              <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: '#666' }}>Voucher No:</span><span style={{ fontWeight: 700, color: '#0A84FF' }}>{receipt.receiptNo || 'N/A'}</span></div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: '#666' }}>Date:</span><span>{formatDate(receipt.date)}</span></div>

              <div style={{ borderTop: '1px dashed #aaa', margin: '8px 0' }} />

              <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: '#666' }}>Category:</span><span style={{ fontWeight: 600 }}>{receipt.category}</span></div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: '#666' }}>Description:</span><span>{receipt.description || '-'}</span></div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: '#666' }}>Paid To:</span><span>{receipt.paidTo || '-'}</span></div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: '#666' }}>Payment Mode:</span><span>{receipt.paymentMode}</span></div>

              <div style={{ borderTop: '2px solid #111', margin: '12px 0' }} />

              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 16, fontWeight: 800 }}>
                <span>Total Amount:</span>
                <span style={{ color: '#c00' }}>{formatCurrency(receipt.amount)}</span>
              </div>

              <div style={{ borderTop: '1px dashed #aaa', margin: '12px 0' }} />

              {/* Signature & Stamp */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: 16, minHeight: 60 }}>
                <div style={{ textAlign: 'center' }}>
                  {signature && <img src={signature} alt="Signature" style={{ maxHeight: 40, maxWidth: 100, objectFit: 'contain' }} />}
                  <div style={{ fontSize: 10, color: '#666', borderTop: '1px solid #aaa', paddingTop: 4, marginTop: 4 }}>Authorized Signature</div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  {stamp && <img src={stamp} alt="Stamp" style={{ maxHeight: 50, maxWidth: 70, objectFit: 'contain' }} />}
                  <div style={{ fontSize: 10, color: '#666', borderTop: '1px solid #aaa', paddingTop: 4, marginTop: 4 }}>Gym Stamp</div>
                </div>
              </div>

              {/* Footer */}
              <div style={{ textAlign: 'center', marginTop: 16, fontSize: 10, color: '#888', fontStyle: 'italic' }}>
                {receiptFooter}
              </div>
            </div>

            {/* Actions — hidden in print */}
            <div className="modal-footer" style={{ display: 'flex', gap: 8, padding: '12px 20px', borderTop: '1px solid #eee', justifyContent: 'flex-end' }}>
              <button className="btn btn-secondary" onClick={() => setReceipt(null)} style={{ color: '#333', borderColor: '#ddd' }}><X size={14} /> Close</button>
              <button className="btn btn-primary" onClick={handlePrintReceipt}><Printer size={14} /> Print</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
