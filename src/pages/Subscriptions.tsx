import { useApp } from '../store/useStore';
import { formatDate, formatCurrency } from '../utils/helpers';
import { CreditCard, Calendar, AlertCircle, RefreshCw, Zap } from 'lucide-react';

export default function Subscriptions() {
  const { subscriptions, addToast } = useApp();

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Active': return 'var(--accent-success)';
      case 'Expired': return 'var(--accent-danger)';
      case 'Frozen': return 'var(--accent-info)';
      default: return 'var(--text-secondary)';
    }
  };

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div className="page-header">
        <div>
          <h1 className="page-title">Subscriptions</h1>
          <p className="page-subtitle">Manage memberships, renewals, and billing cycles</p>
        </div>
        <div className="page-header-actions">
           <button className="btn btn-secondary gap-2"><CreditCard size={16} /> Billing History</button>
           <button className="btn btn-primary gap-2"><Zap size={16} /> Bulk Renew</button>
        </div>
      </div>

      <div className="grid grid-4">
        {['Active', 'Expired', 'Frozen', 'Cancelled'].map(s => {
          const count = subscriptions.filter(sub => sub.status === s).length;
          const color = getStatusColor(s);
          return (
            <div key={s} className="card card-sm">
              <div style={{ fontSize: 28, fontWeight: 800, color: color }}>{count}</div>
              <div className="text-muted text-xs mt-1 uppercase tracking-wider font-bold">{s}</div>
            </div>
          );
        })}
      </div>

      <div className="card card-no-padding">
        <div className="card-header border-bottom flex items-center gap-2" style={{ padding: '16px 20px' }}>
          <Calendar size={18} className="text-accent" />
          <h2 style={{ fontSize: 16, fontWeight: 700 }}>Recent Subscriptions</h2>
        </div>
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>Member</th>
                <th>M.ID</th>
                <th>Plan Detail</th>
                <th>Period</th>
                <th>Status</th>
                <th>Longevity</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {subscriptions.slice(0, 15).map(s => {
                const totalDays = 30; // Defaulting to 30 for visualization
                const progress = Math.min(100, Math.max(0, (s.daysRemaining / totalDays) * 100));
                
                return (
                  <tr key={s.id}>
                    <td>
                      <span style={{ fontWeight: 600, fontSize: 13 }}>{s.memberName}</span>
                    </td>
                    <td>
                      <span className="text-xs text-muted" style={{ fontWeight: 600 }}>{s.memberId.slice(0, 8)}</span>
                    </td>
                    <td>
                      <div className="flex flex-column">
                        <span style={{ fontSize: 13 }}>{s.planName}</span>
                        <span className="text-[10px] text-accent font-bold uppercase">{formatCurrency(s.amountPaid)}</span>
                      </div>
                    </td>
                    <td>
                      <div className="text-xs">
                        <div>{formatDate(s.startDate)}</div>
                        <div className="text-muted">to {formatDate(s.endDate)}</div>
                      </div>
                    </td>
                    <td>
                      <span className={`badge ${
                        s.status === 'Active' ? 'badge-success' : 
                        s.status === 'Expired' ? 'badge-danger' : 
                        'badge-info'
                      }`}>
                        {s.status}
                      </span>
                    </td>
                    <td style={{ minWidth: 120 }}>
                      <div className="flex flex-column gap-1">
                        <div className="flex justify-between items-center text-[10px] font-bold">
                          <span style={{ color: s.daysRemaining <= 0 ? 'var(--accent-danger)' : s.daysRemaining < 15 ? 'var(--accent-warning)' : 'var(--accent-success)' }}>
                             {s.daysRemaining > 0 ? `${s.daysRemaining} days left` : 'Expired'}
                          </span>
                        </div>
                        <div className="w-full h-1.5 rounded-full bg-background-alt overflow-hidden">
                           <div 
                              className="h-full transition-all" 
                              style={{ 
                                width: `${Math.max(2, progress)}%`, 
                                background: s.daysRemaining <= 0 ? 'var(--accent-danger)' : s.daysRemaining < 15 ? 'var(--accent-warning)' : 'var(--accent-success)' 
                              }} 
                           />
                        </div>
                      </div>
                    </td>
                    <td>
                      <div className="flex gap-2">
                         <button className="btn btn-ghost btn-xs" onClick={() => addToast('Processing renewal...', 'info')}><RefreshCw size={12} /></button>
                         <button className="btn btn-ghost btn-xs text-danger"><AlertCircle size={12} /></button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
