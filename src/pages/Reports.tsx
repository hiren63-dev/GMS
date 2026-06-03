import { useRef, useEffect } from 'react';
import { useApp } from '../store/useStore';
import { formatCurrency, getLastNMonths } from '../utils/helpers';

declare global { interface Window { Chart: any; } }

function useChartJS(callback: () => void, deps: any[] = []) {
  useEffect(() => {
    if (window.Chart) { callback(); }
    else {
      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js';
      script.onload = callback;
      if (!document.querySelector('script[src*="chart.js"]')) document.head.appendChild(script);
    }
  }, deps);
}

export default function Reports() {
  const { members, payments, attendance, leads, expenses } = useApp();
  const revDetailRef = useRef<HTMLCanvasElement>(null);
  const modeRef = useRef<HTMLCanvasElement>(null);
  const planDistRef = useRef<HTMLCanvasElement>(null);
  const expenseCatRef = useRef<HTMLCanvasElement>(null);
  const charts = useRef<any[]>([]);

  const isDark = () => document.documentElement.getAttribute('data-theme') === 'dark';
  const gridColor = () => isDark() ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)';
  const textColor = () => isDark() ? '#94a3b8' : '#64748b';

  const totalRevenue = payments.reduce((s, p) => s + p.totalAmount, 0);
  const totalExpenses = expenses.reduce((s, e) => s + e.amount, 0);
  const netProfit = totalRevenue - totalExpenses;
  const avgRevPerMember = Math.round(totalRevenue / members.length);
  const totalGST = payments.reduce((s, p) => s + p.gst, 0);

  useChartJS(() => {
    charts.current.forEach(c => c.destroy());
    charts.current = [];
    const months = getLastNMonths(6);

    // Revenue by month
    if (revDetailRef.current) {
      const monthlyRev = months.map((_, idx) => {
        const date = new Date(); date.setMonth(date.getMonth() - (5 - idx));
        return payments.filter(p => {
          const d = new Date(p.date);
          return d.getMonth() === date.getMonth() && d.getFullYear() === date.getFullYear();
        }).reduce((s, p) => s + p.totalAmount, 0);
      });
      const monthlyExp = months.map((_, idx) => {
        const date = new Date(); date.setMonth(date.getMonth() - (5 - idx));
        return expenses.filter(e => {
          const d = new Date(e.date);
          return d.getMonth() === date.getMonth() && d.getFullYear() === date.getFullYear();
        }).reduce((s, e) => s + e.amount, 0);
      });
      charts.current.push(new window.Chart(revDetailRef.current, {
        type: 'bar',
        data: {
          labels: months,
          datasets: [
            { label: 'Revenue', data: monthlyRev, backgroundColor: 'rgba(139,92,246,0.7)', borderRadius: 6 },
            { label: 'Expenses', data: monthlyExp, backgroundColor: 'rgba(248,113,113,0.7)', borderRadius: 6 },
          ],
        },
        options: {
          responsive: true, maintainAspectRatio: false,
          plugins: { legend: { labels: { color: textColor() } } },
          scales: {
            x: { grid: { color: gridColor() }, ticks: { color: textColor() } },
            y: { grid: { color: gridColor() }, ticks: { color: textColor(), callback: (v: number) => `₹${(v / 1000).toFixed(0)}k` } },
          },
        },
      }));
    }

    // Payment mode pie
    if (modeRef.current) {
      const modes = ['UPI', 'Cash', 'Card', 'GPay', 'PhonePe'];
      const counts = modes.map(m => payments.filter(p => p.paymentMode === m).length);
      charts.current.push(new window.Chart(modeRef.current, {
        type: 'pie',
        data: {
          labels: modes,
          datasets: [{ data: counts, backgroundColor: ['#8b5cf6', '#f59e0b', '#3b82f6', '#10b981', '#ec4899'], borderWidth: 0 }],
        },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'right', labels: { color: textColor() } } } },
      }));
    }

    // Plan distribution doughnut
    if (planDistRef.current) {
      const planCounts = ['p1', 'p2', 'p3', 'p4', 'p5', 'p6', 'p7'].map(id => members.filter(m => m.planId === id).length);
      const planNames = ['Monthly Only', 'Monthly Full', 'Quarterly Gym', 'Quarterly Full', 'Half-Yearly', 'Annual', 'Student'];
      charts.current.push(new window.Chart(planDistRef.current, {
        type: 'doughnut',
        data: {
          labels: planNames,
          datasets: [{ data: planCounts, backgroundColor: ['#60a5fa', '#8b5cf6', '#34d399', '#f59e0b', '#ec4899', '#f43f5e', '#14b8a6'], borderWidth: 0 }],
        },
        options: { responsive: true, maintainAspectRatio: false, cutout: '60%', plugins: { legend: { position: 'right', labels: { color: textColor() } } } },
      }));
    }

    // Expense category breakdown
    if (expenseCatRef.current) {
      const cats = ['Rent', 'Electricity', 'Salary', 'Equipment', 'Maintenance', 'Marketing', 'Other'];
      const catAmts = cats.map(c => expenses.filter(e => e.category === c).reduce((s, e) => s + e.amount, 0));
      charts.current.push(new window.Chart(expenseCatRef.current, {
        type: 'bar',
        data: {
          labels: cats,
          datasets: [{ label: '₹', data: catAmts, backgroundColor: 'rgba(248,113,113,0.6)', borderRadius: 6 }],
        },
        options: {
          responsive: true, maintainAspectRatio: false,
          indexAxis: 'y',
          plugins: { legend: { display: false } },
          scales: {
            x: { grid: { color: gridColor() }, ticks: { color: textColor(), callback: (v: number) => `₹${(v / 1000).toFixed(0)}k` } },
            y: { grid: { display: false }, ticks: { color: textColor() } },
          },
        },
      }));
    }
  }, []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div className="page-header">
        <div>
          <h1 className="page-title">Reports & Analytics</h1>
          <p className="page-subtitle">Financial and operational insights</p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-4">
        <div className="card card-sm">
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>Total Revenue</div>
          <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--accent-success)' }}>{formatCurrency(totalRevenue)}</div>
        </div>
        <div className="card card-sm">
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>Total Expenses</div>
          <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--accent-danger)' }}>{formatCurrency(totalExpenses)}</div>
        </div>
        <div className="card card-sm">
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>Net Profit</div>
          <div style={{ fontSize: 22, fontWeight: 800, color: netProfit > 0 ? 'var(--accent-success)' : 'var(--accent-danger)' }}>{formatCurrency(netProfit)}</div>
        </div>
        <div className="card card-sm">
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>GST Collected</div>
          <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--accent-warning)' }}>{formatCurrency(totalGST)}</div>
        </div>
      </div>

      {/* Charts row 1 */}
      <div className="grid grid-2">
        <div className="card">
          <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 16 }}>Revenue vs Expenses</h3>
          <div style={{ height: 240 }}><canvas ref={revDetailRef} /></div>
        </div>
        <div className="card">
          <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 16 }}>Payment Mode Breakdown</h3>
          <div style={{ height: 240 }}><canvas ref={modeRef} /></div>
        </div>
      </div>

      {/* Charts row 2 */}
      <div className="grid grid-2">
        <div className="card">
          <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 16 }}>Plan Distribution</h3>
          <div style={{ height: 240 }}><canvas ref={planDistRef} /></div>
        </div>
        <div className="card">
          <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 16 }}>Expense Breakdown</h3>
          <div style={{ height: 240 }}><canvas ref={expenseCatRef} /></div>
        </div>
      </div>

      {/* Membership Analytics */}
      <div className="grid grid-3">
        <div className="card">
          <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 12 }}>Member Status</h3>
          {[['Active', '#4ade80'], ['Expiring Soon', '#fbbf24'], ['Expired', '#f87171'], ['Frozen', '#60a5fa']].map(([s, c]) => {
            const count = members.filter(m => m.status === s).length;
            const pct = Math.round(count / members.length * 100);
            return (
              <div key={s} style={{ marginBottom: 10 }}>
                <div className="flex justify-between mb-1"><span style={{ fontSize: 12 }}>{s}</span><span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{count} ({pct}%)</span></div>
                <div className="progress-bar"><div className="progress-bar-fill" style={{ width: `${pct}%`, background: c }} /></div>
              </div>
            );
          })}
        </div>
        <div className="card">
          <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 12 }}>Key Metrics</h3>
          {[
            ['Total Members', members.length, '👥'],
            ['Avg Rev/Member', formatCurrency(avgRevPerMember), '💰'],
            ['Total Payments', payments.length, '💳'],
            ['Total Attendance', attendance.length, '📅'],
            ['Lead Conversion', `${Math.round(leads.filter(l => l.status === 'Converted').length / leads.length * 100)}%`, '🎯'],
          ].map(([label, value, icon]) => (
            <div key={String(label)} className="flex items-center justify-between" style={{ padding: '8px 0', borderBottom: '1px solid var(--glass-border)' }}>
              <span style={{ fontSize: 13 }}>{icon} {label}</span>
              <span style={{ fontWeight: 700, fontSize: 13 }}>{value}</span>
            </div>
          ))}
        </div>
        <div className="card">
          <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 12 }}>Gender Distribution</h3>
          {['Male', 'Female'].map(g => {
            const count = members.filter(m => m.gender === g).length;
            const pct = Math.round(count / members.length * 100);
            return (
              <div key={g} style={{ marginBottom: 10 }}>
                <div className="flex justify-between mb-1"><span style={{ fontSize: 12 }}>{g}</span><span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{count} ({pct}%)</span></div>
                <div className="progress-bar"><div className="progress-bar-fill" style={{ width: `${pct}%`, background: g === 'Male' ? '#60a5fa' : '#ec4899' }} /></div>
              </div>
            );
          })}
          <div className="divider" />
          <h3 style={{ fontSize: 13, fontWeight: 700, marginTop: 12, marginBottom: 8 }}>Top Areas</h3>
          {['Koramangala', 'Indiranagar', 'HSR Layout', 'BTM Layout'].map(area => {
            const count = members.filter(m => m.area === area).length;
            return (
              <div key={area} className="flex justify-between" style={{ fontSize: 12, padding: '4px 0' }}>
                <span>{area}</span><span style={{ color: 'var(--accent-primary)', fontWeight: 700 }}>{count}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
