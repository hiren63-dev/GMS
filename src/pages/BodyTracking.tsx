import { useState } from 'react';
import { useApp } from '../store/useStore';
import { formatDate } from '../utils/helpers';
import { Scale, Activity, TrendingUp, Plus, History, Ruler } from 'lucide-react';
import Modal from '../components/ui/Modal';

export default function BodyTracking() {
  const { bodyMeasurements, members, addToast } = useApp();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedMemberId, setSelectedMemberId] = useState(members[0]?.id || '');

  // Filter measurements for the selected member (sorted by date)
  const memberMeasurements = bodyMeasurements
    .filter(m => m.memberId === selectedMemberId)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  const latest = memberMeasurements[memberMeasurements.length - 1];
  const previous = memberMeasurements[memberMeasurements.length - 2];

  const getTrend = (current: number, prev: number | undefined) => {
    if (!prev) return null;
    const diff = current - prev;
    const percent = (diff / prev) * 100;
    return {
      value: Math.abs(diff).toFixed(1),
      percent: Math.abs(percent).toFixed(1),
      isUp: diff > 0,
    };
  };

  // Simple SVG Sparkline
  const Sparkline = ({ data, color }: { data: number[], color: string }) => {
    if (data.length < 2) return <div className="text-xs text-muted">Awaiting more data...</div>;
    const min = Math.min(...data);
    const max = Math.max(...data);
    const range = max - min || 1;
    const width = 100;
    const height = 30;
    const points = data.map((d, i) => {
      const x = (i / (data.length - 1)) * width;
      const y = height - ((d - min) / range) * height;
      return `${x},${y}`;
    }).join(' ');

    return (
      <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} style={{ overflow: 'visible' }}>
        <polyline
          fill="none"
          stroke={color}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          points={points}
          style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.2))' }}
        />
      </svg>
    );
  };

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div className="page-header">
        <div>
          <h1 className="page-title">Body Tracking</h1>
          <p className="page-subtitle">Monitor member progress and transformation results</p>
        </div>
        <div className="page-header-actions">
          <select 
            className="select" 
            style={{ minWidth: 200 }}
            value={selectedMemberId}
            onChange={(e) => setSelectedMemberId(e.target.value)}
          >
            {members.map(m => (
              <option key={m.id} value={m.id}>{m.name} ({m.memberId})</option>
            ))}
          </select>
          <button className="btn btn-primary" onClick={() => setIsModalOpen(true)}>
            <Plus size={18} /> Add Entry
          </button>
        </div>
      </div>

      {latest ? (
        <>
          {/* Progress Overview */}
          <div className="grid grid-4">
            <div className="card card-hover">
              <div className="flex justify-between items-start mb-3">
                <div className="p-2 rounded-lg" style={{ background: 'rgba(96, 165, 250, 0.1)', color: '#60a5fa' }}>
                  <Scale size={20} />
                </div>
                {getTrend(latest.weight, previous?.weight) && (
                  <div className={`text-xs font-bold ${getTrend(latest.weight, previous?.weight)?.isUp ? 'text-danger' : 'text-success'}`}>
                    {getTrend(latest.weight, previous?.weight)?.isUp ? '▲' : '▼'} {getTrend(latest.weight, previous?.weight)?.percent}%
                  </div>
                )}
              </div>
              <div className="text-2xl font-bold">{latest.weight} <span className="text-sm font-normal text-muted">kg</span></div>
              <div className="text-xs text-muted mt-1">Current Weight</div>
              <div className="mt-4">
                <Sparkline data={memberMeasurements.map(m => m.weight)} color="#60a5fa" />
              </div>
            </div>

            <div className="card card-hover">
              <div className="flex justify-between items-start mb-3">
                <div className="p-2 rounded-lg" style={{ background: 'rgba(139, 92, 246, 0.1)', color: '#8b5cf6' }}>
                  <Activity size={20} />
                </div>
                {getTrend(latest.bmi, previous?.bmi) && (
                  <div className={`text-xs font-bold ${getTrend(latest.bmi, previous?.bmi)?.isUp ? 'text-danger' : 'text-success'}`}>
                    {getTrend(latest.bmi, previous?.bmi)?.isUp ? '▲' : '▼'} {getTrend(latest.bmi, previous?.bmi)?.percent}%
                  </div>
                )}
              </div>
              <div className="text-2xl font-bold">{latest.bmi}</div>
              <div className="text-xs text-muted mt-1">Body Mass Index (BMI)</div>
              <div className="mt-4">
                <Sparkline data={memberMeasurements.map(m => m.bmi)} color="#8b5cf6" />
              </div>
            </div>

            <div className="card card-hover">
              <div className="flex justify-between items-start mb-3">
                <div className="p-2 rounded-lg" style={{ background: 'rgba(236, 72, 153, 0.1)', color: '#ec4899' }}>
                  <TrendingUp size={20} />
                </div>
                {latest.bodyFat && previous?.bodyFat && getTrend(latest.bodyFat, previous.bodyFat) && (
                  <div className={`text-xs font-bold ${getTrend(latest.bodyFat, previous.bodyFat)?.isUp ? 'text-danger' : 'text-success'}`}>
                    {getTrend(latest.bodyFat, previous.bodyFat)?.isUp ? '▲' : '▼'} {getTrend(latest.bodyFat, previous.bodyFat)?.percent}%
                  </div>
                )}
              </div>
              <div className="text-2xl font-bold">{latest.bodyFat || '--'} <span className="text-sm font-normal text-muted">%</span></div>
              <div className="text-xs text-muted mt-1">Body Fat Percentage</div>
              <div className="mt-4">
                <Sparkline data={memberMeasurements.filter(m => m.bodyFat).map(m => m.bodyFat!) } color="#ec4899" />
              </div>
            </div>

            <div className="card card-hover">
              <div className="flex justify-between items-start mb-3">
                <div className="p-2 rounded-lg" style={{ background: 'rgba(16, 185, 129, 0.1)', color: '#10b981' }}>
                  <Ruler size={20} />
                </div>
              </div>
              <div className="text-2xl font-bold">{latest.waist} <span className="text-sm font-normal text-muted">cm</span></div>
              <div className="text-xs text-muted mt-1">Waist Measurement</div>
              <div className="mt-4">
                <Sparkline data={memberMeasurements.map(m => m.waist)} color="#10b981" />
              </div>
            </div>
          </div>

          {/* Detailed Measurements Table */}
          <div className="card card-no-padding">
            <div className="card-header" style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', gap: 10 }}>
              <History size={18} className="text-accent" />
              <h2 style={{ fontSize: 16, fontWeight: 700 }}>Measurement History</h2>
            </div>
            <div className="table-container">
              <table className="table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Weight (kg)</th>
                    <th>BMI</th>
                    <th>Fat %</th>
                    <th>Chest (cm)</th>
                    <th>Waist (cm)</th>
                    <th>Arms (cm)</th>
                    <th>Thighs (cm)</th>
                    <th>Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {[...memberMeasurements].reverse().map(m => (
                    <tr key={m.id}>
                      <td style={{ fontWeight: 600 }}>{formatDate(m.date)}</td>
                      <td>{m.weight}</td>
                      <td><span className="badge badge-info">{m.bmi}</span></td>
                      <td>{m.bodyFat || '--'}%</td>
                      <td>{m.chest}</td>
                      <td>{m.waist}</td>
                      <td>{m.arms}</td>
                      <td>{m.thighs}</td>
                      <td className="text-secondary text-sm">{m.notes || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : (
        <div className="card py-12 text-center">
          <div className="empty-state">
            <div className="empty-state-icon" style={{ fontSize: 48 }}>📏</div>
            <h3>No Measurements Yet</h3>
            <p>Start tracking this member's transformation by adding their first measurement.</p>
            <button className="btn btn-primary mt-4" onClick={() => setIsModalOpen(true)}>
              + Add First Entry
            </button>
          </div>
        </div>
      )}

      {/* Add Measurement Modal */}
      <Modal 
        open={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        title="Record Body Measurements"
        footer={
          <>
            <button className="btn btn-secondary" onClick={() => setIsModalOpen(false)}>Cancel</button>
            <button className="btn btn-primary" onClick={() => { addToast('Measurement recorded!', 'success'); setIsModalOpen(false); }}>Save Measurement</button>
          </>
        }
      >
        <div className="grid grid-2" style={{ gap: 16 }}>
          <div className="form-group" style={{ gridColumn: '1 / -1' }}>
            <label className="form-label">Member</label>
            <input className="input" value={members.find(m => m.id === selectedMemberId)?.name || ''} disabled />
          </div>
          <div className="form-group">
            <label className="form-label">Date</label>
            <input className="input" type="date" defaultValue={new Date().toISOString().split('T')[0]} />
          </div>
          <div className="form-group">
            <label className="form-label">Weight (kg)</label>
            <input className="input" type="number" step="0.1" placeholder="75.0" />
          </div>
          <div className="form-group">
            <label className="form-label">Height (cm)</label>
            <input className="input" type="number" placeholder="175" />
          </div>
          <div className="form-group">
            <label className="form-label">Body Fat %</label>
            <input className="input" type="number" step="0.1" placeholder="15.5" />
          </div>
          <div className="form-group">
            <label className="form-label">Chest (cm)</label>
            <input className="input" type="number" />
          </div>
          <div className="form-group">
            <label className="form-label">Waist (cm)</label>
            <input className="input" type="number" />
          </div>
          <div className="form-group" style={{ gridColumn: '1 / -1' }}>
            <label className="form-label">Notes</label>
            <textarea className="input" rows={3} placeholder="Any specific observations?"></textarea>
          </div>
        </div>
      </Modal>
    </div>
  );
}
