import { useEffect, useRef, useState, useMemo } from 'react';
import { useApp } from '../store/useStore';
import { Users, CheckCircle2, DollarSign, ChevronLeft, ChevronRight, TrendingUp } from 'lucide-react';
import { formatCurrency } from '../utils/helpers';

declare global { interface Window { Chart: any; } }

function useChartJS(callback: () => void, deps: any[]) {
  useEffect(() => {
    if (window.Chart) { callback(); }
    else {
      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js';
      script.onload = callback;
      document.head.appendChild(script);
    }
  }, deps);
}

// Get start of week (Monday) for a given date
function getWeekStart(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function getDaysInWeek(weekStart: Date): Date[] {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(weekStart.getDate() + i);
    return d;
  });
}

const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'];

export default function Dashboard() {
  const { members, attendance, payments } = useApp();

  // Calendar state — fully interactive
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const [selectedDate, setSelectedDate] = useState<Date>(today);
  const [weekStart, setWeekStart] = useState<Date>(getWeekStart(today));
  const weekDays = useMemo(() => getDaysInWeek(weekStart), [weekStart]);

  const revenueChartRef = useRef<HTMLCanvasElement>(null);
  const doughnutChartRef = useRef<HTMLCanvasElement>(null);
  const charts = useRef<any[]>([]);

  // Real computed stats
  const activeMembers = members.filter(m => m.status === 'Active').length;
  const expiringMembers = members.filter(m => m.status === 'Expiring Soon').length;
  const expiredMembers = members.filter(m => m.status === 'Expired').length;

  const todayStr = today.toISOString().split('T')[0];
  const todayAttendance = attendance.filter(a => a.date === todayStr).length;

  // Selected date attendance
  const selectedDateStr = selectedDate.toISOString().split('T')[0];
  const selectedAttendance = attendance.filter(a => a.date === selectedDateStr);

  // Real month revenue from payments (current month only)
  const monthRevenue = useMemo(() => {
    const now = new Date();
    return payments
      .filter(p => {
        const d = new Date(p.date);
        return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
      })
      .reduce((sum, p) => sum + (p.totalAmount || 0), 0);
  }, [payments]);

  // Revenue by last 6 months for chart
  const revenueByMonth = useMemo(() => {
    const months: number[] = [];
    const labels: string[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      labels.push(MONTH_NAMES[d.getMonth()].slice(0, 3));
      const total = payments
        .filter(p => {
          const pd = new Date(p.date);
          return pd.getMonth() === d.getMonth() && pd.getFullYear() === d.getFullYear();
        })
        .reduce((sum, p) => sum + (p.totalAmount || 0), 0);
      months.push(total);
    }
    return { labels, data: months };
  }, [payments]);

  useChartJS(() => {
    charts.current.forEach(c => { try { c.destroy(); } catch(_) {} });
    charts.current = [];

    // Revenue Line Chart — real data
    if (revenueChartRef.current) {
      const ctx = revenueChartRef.current.getContext('2d');
      const gradient = ctx?.createLinearGradient(0, 0, 0, 300);
      gradient?.addColorStop(0, 'rgba(10, 132, 255, 0.35)');
      gradient?.addColorStop(1, 'rgba(10, 132, 255, 0)');

      charts.current.push(new window.Chart(revenueChartRef.current, {
        type: 'line',
        data: {
          labels: revenueByMonth.labels,
          datasets: [{
            label: 'Revenue (₹)',
            data: revenueByMonth.data,
            borderColor: '#0A84FF',
            backgroundColor: gradient,
            borderWidth: 2.5,
            fill: true,
            tension: 0.4,
            pointRadius: 4,
            pointBackgroundColor: '#0A84FF',
            pointHoverRadius: 7,
          }],
        },
        options: {
          responsive: true, maintainAspectRatio: false,
          plugins: {
            legend: { display: false },
            tooltip: {
              callbacks: {
                label: (ctx: any) => `₹${ctx.raw.toLocaleString('en-IN')}`,
              }
            }
          },
          scales: {
            x: { grid: { display: false }, ticks: { font: { size: 11 }, color: '#a1a1aa' } },
            y: {
              grid: { color: '#27272a' },
              ticks: {
                color: '#a1a1aa',
                callback: (v: number) => v === 0 ? '0' : `₹${(v / 1000).toFixed(0)}K`,
              }
            }
          }
        }
      }));
    }

    // Doughnut Chart — real member status breakdown (NOT "Template")
    if (doughnutChartRef.current) {
      charts.current.push(new window.Chart(doughnutChartRef.current, {
        type: 'doughnut',
        data: {
          labels: ['Active', 'Expiring', 'Expired'],
          datasets: [{
            data: [activeMembers, expiringMembers, expiredMembers],
            backgroundColor: ['#0A84FF', '#ffd60a', '#ff453a'],
            borderWidth: 0,
            borderRadius: 4,
          }],
        },
        options: {
          responsive: true, maintainAspectRatio: false,
          plugins: { legend: { display: false } },
          cutout: '72%',
        }
      }));
    }
  }, [revenueByMonth, activeMembers, expiringMembers, expiredMembers]);

  // Calendar navigation
  const prevWeek = () => {
    const prev = new Date(weekStart);
    prev.setDate(weekStart.getDate() - 7);
    setWeekStart(prev);
  };
  const nextWeek = () => {
    const next = new Date(weekStart);
    next.setDate(weekStart.getDate() + 7);
    setWeekStart(next);
  };

  const monthLabel = MONTH_NAMES[weekDays[0].getMonth()] + ' ' + weekDays[0].getFullYear();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24, paddingBottom: 40 }}>
      {/* STATS ROW — 3 cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
        {/* Active Members */}
        <div className="card card-hover" style={{ padding: 20, display: 'flex', gap: 14, alignItems: 'center' }}>
          <div style={{ width: 48, height: 48, borderRadius: 14, background: 'rgba(10,132,255,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent-primary)', flexShrink: 0 }}>
            <Users size={22} />
          </div>
          <div>
            <div style={{ fontSize: 12, color: 'var(--text-secondary)', fontWeight: 600, marginBottom: 2 }}>Active Members</div>
            <div style={{ fontSize: 26, fontWeight: 800, lineHeight: 1 }}>{activeMembers}</div>
            <div style={{ fontSize: 11, color: 'var(--accent-warning)', marginTop: 4 }}>{expiringMembers} expiring soon</div>
          </div>
        </div>

        {/* Today's Check-ins */}
        <div className="card card-hover" style={{ padding: 20, display: 'flex', gap: 14, alignItems: 'center' }}>
          <div style={{ width: 48, height: 48, borderRadius: 14, background: 'rgba(50,215,75,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent-success)', flexShrink: 0 }}>
            <CheckCircle2 size={22} />
          </div>
          <div>
            <div style={{ fontSize: 12, color: 'var(--text-secondary)', fontWeight: 600, marginBottom: 2 }}>Today's Check-ins</div>
            <div style={{ fontSize: 26, fontWeight: 800, lineHeight: 1 }}>{todayAttendance}</div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>Live attendance count</div>
          </div>
        </div>

        {/* This Month's Revenue — REAL DATA */}
        <div className="card card-hover" style={{ padding: 20, display: 'flex', gap: 14, alignItems: 'center', background: 'var(--accent-primary)' }}>
          <div style={{ width: 48, height: 48, borderRadius: 14, background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', flexShrink: 0 }}>
            <DollarSign size={22} />
          </div>
          <div>
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.8)', fontWeight: 600, marginBottom: 2 }}>This Month Revenue</div>
            <div style={{ fontSize: 24, fontWeight: 800, lineHeight: 1, color: '#fff' }}>
              {monthRevenue === 0 ? '₹0' : formatCurrency(monthRevenue)}
            </div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.7)', marginTop: 4, display: 'flex', alignItems: 'center', gap: 3 }}>
              <TrendingUp size={10} /> From {payments.filter(p => { const d = new Date(p.date); const n = new Date(); return d.getMonth() === n.getMonth(); }).length} transactions
            </div>
          </div>
        </div>
      </div>

      {/* Charts Row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 24 }}>
        {/* Revenue Chart */}
        <div className="card" style={{ minHeight: 260, padding: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h3 style={{ fontSize: 15, fontWeight: 700 }}>Revenue Overview</h3>
            <span className="badge badge-info" style={{ fontSize: 11 }}>Last 6 months</span>
          </div>
          <div style={{ height: 200 }}>
            <canvas ref={revenueChartRef} />
          </div>
        </div>

        {/* Right Column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Membership Status Doughnut — real data, NOT "Template" */}
          <div className="card" style={{ padding: 20 }}>
            <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 16 }}>Membership Status</h3>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <div style={{ position: 'relative', width: 110, height: 110, flexShrink: 0 }}>
                <canvas ref={doughnutChartRef} />
                <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', textAlign: 'center', pointerEvents: 'none' }}>
                  <div style={{ fontSize: 20, fontWeight: 800, lineHeight: 1 }}>{members.length}</div>
                  <div style={{ fontSize: 9, color: 'var(--text-muted)', fontWeight: 600 }}>TOTAL</div>
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {[
                  { label: 'Active', count: activeMembers, color: '#0A84FF' },
                  { label: 'Expiring', count: expiringMembers, color: '#ffd60a' },
                  { label: 'Expired', count: expiredMembers, color: '#ff453a' },
                ].map(item => (
                  <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ width: 10, height: 10, borderRadius: 3, background: item.color, flexShrink: 0 }} />
                    <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)' }}>{item.label}</span>
                    <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-primary)', marginLeft: 'auto' }}>{item.count}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Lead Sources */}
          <div className="card" style={{ padding: 20, flex: 1 }}>
            <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 16 }}>Lead Sources</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {[
                { name: 'Instagram', pct: 65, color: '#0A84FF' },
                { name: 'Walk-ins', pct: 25, color: '#5E5CE6' },
                { name: 'Referrals', pct: 10, color: '#32d74b' },
              ].map(src => (
                <div key={src.name}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, fontWeight: 600, marginBottom: 5, color: 'var(--text-primary)' }}>
                    <span>{src.name}</span>
                    <span style={{ color: 'var(--text-muted)' }}>{src.pct}%</span>
                  </div>
                  <div style={{ height: 4, background: 'var(--bg-elevated)', borderRadius: 4, overflow: 'hidden' }}>
                    <div style={{ width: `${src.pct}%`, height: '100%', background: src.color, borderRadius: 4 }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Interactive Calendar Strip */}
      <div className="card" style={{ padding: '20px 24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <h3 style={{ fontSize: 15, fontWeight: 700 }}>{monthLabel}</h3>
          {selectedDate && (
            <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
              {selectedDateStr === todayStr ? "Today's" : formatDate(selectedDate)} attendance:&nbsp;
              <strong style={{ color: 'var(--accent-primary)' }}>{selectedAttendance.length} check-ins</strong>
            </div>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
          <button
            onClick={prevWeek}
            style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-color)', borderRadius: '50%', width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0, color: 'var(--text-primary)' }}
          >
            <ChevronLeft size={18} />
          </button>

          <div style={{ display: 'flex', gap: 8, flex: 1, justifyContent: 'space-evenly', flexWrap: 'nowrap' }}>
            {weekDays.map((d, i) => {
              const dStr = d.toISOString().split('T')[0];
              const isToday = dStr === todayStr;
              const isSelected = dStr === selectedDateStr;
              const dayAttCount = attendance.filter(a => a.date === dStr).length;

              return (
                <div
                  key={dStr}
                  onClick={() => setSelectedDate(new Date(d))}
                  style={{
                    minWidth: 56, height: 76, borderRadius: 14,
                    background: isSelected ? 'var(--accent-primary)' : isToday ? 'rgba(10,132,255,0.12)' : 'var(--bg-elevated)',
                    color: isSelected ? '#fff' : isToday ? 'var(--accent-primary)' : 'var(--text-primary)',
                    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                    cursor: 'pointer', transition: 'all 0.2s',
                    border: isToday && !isSelected ? '1px solid var(--accent-primary)' : '1px solid transparent',
                    position: 'relative',
                  }}
                >
                  <div style={{ fontSize: 10, fontWeight: 700, opacity: 0.7, marginBottom: 2 }}>{DAY_LABELS[i]}</div>
                  <div style={{ fontSize: 20, fontWeight: 800, lineHeight: 1 }}>{d.getDate()}</div>
                  {dayAttCount > 0 && (
                    <div style={{
                      position: 'absolute', bottom: 6,
                      width: 18, height: 18, borderRadius: '50%',
                      background: isSelected ? 'rgba(255,255,255,0.3)' : 'var(--accent-primary)',
                      color: '#fff', fontSize: 9, fontWeight: 800,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      {dayAttCount}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <button
            onClick={nextWeek}
            style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-color)', borderRadius: '50%', width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0, color: 'var(--text-primary)' }}
          >
            <ChevronRight size={18} />
          </button>
        </div>

        {/* Selected date attendance details */}
        {selectedAttendance.length > 0 && (
          <div style={{ marginTop: 16, padding: '12px 16px', background: 'var(--bg-elevated)', borderRadius: 12 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Checked in on {selectedDateStr === todayStr ? 'Today' : selectedDate.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {selectedAttendance.slice(0, 8).map(a => (
                <div key={a.id} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 10px', background: 'var(--bg-surface)', borderRadius: 20, border: '1px solid var(--border-color)' }}>
                  <img src={a.memberPhoto} style={{ width: 20, height: 20, borderRadius: '50%', objectFit: 'cover' }} alt={a.memberName} />
                  <span style={{ fontSize: 12, fontWeight: 600 }}>{a.memberName}</span>
                </div>
              ))}
              {selectedAttendance.length > 8 && (
                <div style={{ padding: '4px 10px', fontSize: 12, color: 'var(--text-muted)' }}>+{selectedAttendance.length - 8} more</div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function formatDate(d: Date): string {
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}
