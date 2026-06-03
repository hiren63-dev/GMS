import { useState, useMemo } from 'react';
import { useApp } from '../store/useStore';
import { formatCurrency, formatDate, exportToCSV } from '../utils/helpers';
import { Plus, Download } from 'lucide-react';
import Modal from '../components/ui/Modal';
import type { Expense } from '../types';
import { generateId } from '../utils/helpers';

const CATS: Expense['category'][] = ['Rent', 'Electricity', 'Salary', 'Equipment', 'Maintenance', 'Marketing', 'Supplements', 'Other'];

export default function Expenses() {
  const { expenses, addExpense, addToast } = useApp();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ category: 'Rent', description: '', amount: '', date: '', paidTo: '', paymentMode: 'UPI' });
  const [timeFilter, setTimeFilter] = useState('All');

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
    addExpense({ id: generateId(), ...form, amount: +form.amount, category: form.category as Expense['category'], paymentMode: form.paymentMode as Expense['paymentMode'] });
    addToast('Expense recorded', 'success');
    setOpen(false);
    setForm({ category: 'Rent', description: '', amount: '', date: '', paidTo: '', paymentMode: 'UPI' });
  };

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
          const icons: Record<string, string> = { Rent: '🏢', Electricity: '⚡', Salary: '👤', Equipment: '🔧' };
          return (
            <div key={cat} className="card card-sm">
              <div style={{ fontSize: 22, marginBottom: 8 }}>{icons[cat]}</div>
              <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--accent-danger)' }}>{formatCurrency(amt)}</div>
              <div className="text-muted text-xs mt-1">{cat}</div>
            </div>
          );
        })}
      </div>

      <div className="card card-no-padding">
        <div className="table-container">
          <table className="table">
            <thead><tr><th>Date</th><th>Category</th><th>Description</th><th>Amount</th><th>Paid To</th><th>Mode</th></tr></thead>
            <tbody>
              {filteredExpenses.map(e => (
                <tr key={e.id}>
                  <td style={{ fontSize: 13 }}>{formatDate(e.date)}</td>
                  <td><span className="badge badge-danger">{e.category}</span></td>
                  <td style={{ fontSize: 13 }}>{e.description}</td>
                  <td style={{ fontWeight: 700, color: 'var(--accent-danger)' }}>{formatCurrency(e.amount)}</td>
                  <td style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{e.paidTo}</td>
                  <td><span className="badge badge-purple">{e.paymentMode}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <Modal open={open} onClose={() => setOpen(false)} title="Add Expense"
        footer={<><button className="btn btn-secondary" onClick={() => setOpen(false)}>Cancel</button><button className="btn btn-primary" onClick={handleAdd}>Add</button></>}
      >
        <div className="grid grid-2" style={{ gap: 14 }}>
          <div className="form-group"><label className="form-label">Category</label>
            <select className="select" value={form.category} onChange={e => setForm(p => ({ ...p, category: e.target.value }))}>
              {CATS.map(c => <option key={c}>{c}</option>)}
            </select>
          </div>
          <div className="form-group"><label className="form-label">Date</label>
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
    </div>
  );
}
