import { useEffect, useRef } from 'react';
import { useApp } from '../store/useStore';
import { Users, ArrowUpRight, CheckCircle2, DollarSign, ChevronLeft, ChevronRight } from 'lucide-react';

declare global { interface Window { Chart: any; } }

function useChartJS(callback: () => void) {
  useEffect(() => {
    if (window.Chart) { callback(); }
    else {
      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js';
      script.onload = callback;
      document.head.appendChild(script);
    }
  }, []);
}

export default function Dashboard() {
  const { members, attendance } = useApp();
  const revenueChartRef = useRef<HTMLCanvasElement>(null);
  const doughnutChartRef = useRef<HTMLCanvasElement>(null);
  const charts = useRef<any[]>([]);

  const activeMembers = members.filter(m => m.status === 'Active').length;
  const todayAttendance = attendance.filter(a => a.date === new Date().toISOString().split('T')[0]).length;

  useChartJS(() => {
    charts.current.forEach(c => c.destroy());
    charts.current = [];

    // Revenue Line Chart (matching the image's blue gradient fill)
    if (revenueChartRef.current) {
      const ctx = revenueChartRef.current.getContext('2d');
      const gradient = ctx?.createLinearGradient(0, 0, 0, 300);
      gradient?.addColorStop(0, 'rgba(0, 43, 255, 0.4)');
      gradient?.addColorStop(1, 'rgba(0, 43, 255, 0)');

      charts.current.push(new window.Chart(revenueChartRef.current, {
        type: 'line',
        data: {
          labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep'],
          datasets: [{
            data: [20, 35, 25, 45, 30, 75, 50, 60, 45],
            borderColor: '#002BFF',
            backgroundColor: gradient,
            borderWidth: 3,
            fill: true,
            tension: 0.4,
            pointRadius: 0,
            pointHoverRadius: 6
          }],
        },
        options: {
          responsive: true, maintainAspectRatio: false,
          plugins: { legend: { display: false } },
          scales: {
            x: { grid: { display: false }, ticks: { font: { size: 10 }, color: '#a1a1aa' } },
            y: { grid: { borderDash: [5, 5], color: '#27272a' }, min: 0, max: 100, ticks: { color: '#a1a1aa' } }
          }
        }
      }));
    }

    // Top Product Sale (Doughnut Chart)
    if (doughnutChartRef.current) {
      charts.current.push(new window.Chart(doughnutChartRef.current, {
        type: 'doughnut',
        data: {
          labels: ['Vector', 'Template', 'Presentation'],
          datasets: [{
            data: [65, 25, 10],
            backgroundColor: ['#0A84FF', '#27272a', '#3f3f46'],
            borderWidth: 0,
          }],
        },
        options: {
          responsive: true, maintainAspectRatio: false,
          plugins: { legend: { display: false } },
          cutout: '70%',
        }
      }));
    }
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24, paddingBottom: 40 }} className="animate-fade-in">
      

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 24 }}>
        
        {/* Left Column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          {/* STATS ROW */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
            <div className="card card-hover" style={{ padding: 16, display: 'flex', gap: 12, alignItems: 'center' }}>
               <div style={{ width: 40, height: 40, borderRadius: '50%', border: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)' }}>
                 <Users size={20} />
               </div>
               <div>
                  <div style={{ fontSize: 11, color: 'var(--text-secondary)', fontWeight: 600 }}>Active Members</div>
                  <div style={{ fontSize: 18, fontWeight: 800 }}>{activeMembers}</div>
                  <div style={{ fontSize: 10, color: 'var(--accent-success)', display: 'flex', alignItems: 'center', gap: 2 }}><ArrowUpRight size={10} /> 3 this month</div>
               </div>
            </div>
            <div className="card card-hover" style={{ padding: 16, display: 'flex', gap: 12, alignItems: 'center' }}>
               <div style={{ width: 40, height: 40, borderRadius: '50%', border: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)' }}>
                 <CheckCircle2 size={20} />
               </div>
               <div>
                  <div style={{ fontSize: 11, color: 'var(--text-secondary)', fontWeight: 600 }}>Today Check-ins</div>
                  <div style={{ fontSize: 18, fontWeight: 800 }}>{todayAttendance}</div>
                  <div style={{ fontSize: 10, color: 'var(--accent-success)', display: 'flex', alignItems: 'center', gap: 2 }}><ArrowUpRight size={10} /> 5 vs yesterday</div>
               </div>
            </div>
            <div className="card card-hover" style={{ padding: 16, display: 'flex', gap: 12, alignItems: 'center', background: 'var(--accent-primary)', color: '#fff' }}>
               <div style={{ width: 40, height: 40, borderRadius: '50%', border: '1px solid rgba(255,255,255,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                 <DollarSign size={20} />
               </div>
               <div>
                  <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.8)', fontWeight: 600 }}>Earning</div>
                  <div style={{ fontSize: 18, fontWeight: 800 }}>$6,159</div>
                  <div style={{ fontSize: 10, color: '#fff', display: 'flex', alignItems: 'center', gap: 2 }}><ArrowUpRight size={10} /> Since Last Month</div>
               </div>
            </div>
          </div>

          {/* LINE CHART */}
          <div className="card" style={{ flex: 1, minHeight: 250, padding: 24 }}>
             <div style={{ height: '100%' }}>
               <canvas ref={revenueChartRef} />
             </div>
          </div>
        </div>

        {/* Right Column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          {/* Doughnut Chart */}
          <div className="card" style={{ padding: 24 }}>
            <h3 style={{ fontSize: 15, fontWeight: 800, marginBottom: 16 }}>Top Product Sale</h3>
            <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
               <div style={{ position: 'relative', width: 120, height: 120 }}>
                 <canvas ref={doughnutChartRef} />
                 <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', textAlign: 'center' }}>
                   <div style={{ fontSize: 8, color: '#64748b', fontWeight: 700 }}>Total Sale</div>
                   <div style={{ fontSize: 16, fontWeight: 800 }}>95K</div>
                 </div>
               </div>
               <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                 <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 11, fontWeight: 600, color: 'var(--text-primary)' }}>
                   <div style={{ width: 8, height: 8, background: 'var(--accent-primary)' }} /> Active
                 </div>
                 <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 11, fontWeight: 600, color: 'var(--text-primary)' }}>
                   <div style={{ width: 8, height: 8, background: 'var(--bg-elevated)' }} /> Expiring
                 </div>
                 <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)' }}>
                   <div style={{ width: 8, height: 8, background: 'var(--border-color)' }} /> Dropped
                 </div>
               </div>
            </div>
          </div>

          {/* Traffic Source Custom Bars */}
          <div className="card" style={{ padding: 24, flex: 1 }}>
            <h3 style={{ fontSize: 15, fontWeight: 800, marginBottom: 20 }}>Lead Sources</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {[
                { name: 'Instagram', pct: 65, color: '#0A84FF' },
                { name: 'Walk-ins', pct: 25, color: '#27272a' },
                { name: 'Referrals', pct: 10, color: '#3f3f46' }
              ].map(src => (
                <div key={src.name}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, fontWeight: 600, marginBottom: 6, color: 'var(--text-primary)' }}>
                    <span>{src.name}</span>
                    <span>{src.pct}%</span>
                  </div>
                  <div style={{ height: 4, background: 'var(--bg-elevated)', borderRadius: 4, overflow: 'hidden' }}>
                    <div style={{ width: `${src.pct}%`, height: '100%', background: src.color }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Calendar Strip */}
      <div className="card" style={{ padding: '24px 32px' }}>
        <h3 style={{ fontSize: 16, fontWeight: 800, marginBottom: 16 }}>March 2026</h3>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <button style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#64748b' }}><ChevronLeft size={20} /></button>
          
          <div style={{ display: 'flex', gap: 16, flex: 1, justifyContent: 'space-evenly' }}>
            {[
              { day: 'Mon', date: 16, active: false },
              { day: 'Tue', date: 17, active: false },
              { day: 'Wed', date: 18, active: true },
              { day: 'Thu', date: 19, active: false },
              { day: 'Fri', date: 20, active: false },
              { day: 'Sat', date: 21, active: false },
              { day: 'Sun', date: 22, active: false },
            ].map(d => (
              <div key={d.date} className="card-hover" style={{ 
                width: 60, height: 80, borderRadius: 16, 
                background: d.active ? 'var(--accent-primary)' : 'transparent', 
                color: d.active ? '#fff' : 'var(--text-primary)',
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                boxShadow: d.active ? 'var(--shadow-glow)' : 'none',
                cursor: 'pointer', transition: 'all 0.2s'
              }}>
                <div style={{ fontSize: 11, fontWeight: 600, opacity: d.active ? 0.9 : 0.5 }}>{d.day}</div>
                <div style={{ fontSize: 20, fontWeight: 800 }}>{d.date}</div>
              </div>
            ))}
          </div>

          <button style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#64748b' }}><ChevronRight size={20} /></button>
        </div>
      </div>

    </div>
  );
}
