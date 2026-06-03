import { useState } from 'react';
import { CheckCircle2, AlertTriangle, Clock, Search } from 'lucide-react';
import { useApp } from '../store/useStore';
import { formatDate } from '../utils/helpers';

export default function Attendance() {
  const { attendance, members, addAttendance, addToast } = useApp();
  const [query, setQuery] = useState('');
  const [manualId, setManualId] = useState('');
  const [scanResult, setScanResult] = useState<{ status: 'idle' | 'success' | 'error'; member?: any }>({ status: 'idle' });
  const today = new Date().toISOString().split('T')[0];

  const todayRecords = attendance.filter(a => a.date === today);
  const recentRecords = attendance.slice(0, 20);



  const handleCheckIn = (code: string) => {
    const member = members.find(m => m.memberId === code || m.phone === code || m.id === code);
    if (member) {
      if (member.status === 'Expired') {
        setScanResult({ status: 'error', member });
        addToast(`${member.name} - Membership expired!`, 'error');
      } else {
        const record = {
          id: `att${Date.now()}`,
          memberId: member.id,
          memberName: member.name,
          memberPhoto: member.photo,
          planName: member.planName,
          type: 'Check-in' as const,
          timestamp: new Date().toISOString(),
          date: today,
          daysRemaining: member.daysRemaining,
          status: 'Active' as const,
        };
        addAttendance(record);
        setScanResult({ status: 'success', member });
        addToast(`${member.name} checked in ✅`, 'success');
      }
    } else {
      setScanResult({ status: 'error' });
      addToast('Member not found', 'error');
    }
    setManualId('');
    setTimeout(() => setScanResult({ status: 'idle' }), 4000);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div className="page-header">
        <div>
          <h1 className="page-title">Attendance</h1>
          <p className="page-subtitle">{todayRecords.length} check-ins today · {attendance.length} total records</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-4">
        <div className="card card-sm"><div style={{ fontSize: 26, fontWeight: 800, color: 'var(--accent-success)' }}>{todayRecords.length}</div><div className="text-secondary text-xs mt-1">Today's Check-ins</div></div>
        <div className="card card-sm"><div style={{ fontSize: 26, fontWeight: 800, color: 'var(--accent-info)' }}>{members.filter(m => m.status === 'Active').length}</div><div className="text-secondary text-xs mt-1">Active Members</div></div>
        <div className="card card-sm"><div style={{ fontSize: 26, fontWeight: 800, color: 'var(--accent-primary)' }}>{Math.round(todayRecords.length / members.filter(m => m.status === 'Active').length * 100)}%</div><div className="text-secondary text-xs mt-1">Attendance Rate</div></div>
        <div className="card card-sm"><div style={{ fontSize: 26, fontWeight: 800, color: 'var(--accent-warning)' }}>{attendance.filter(a => a.status === 'Expired').length}</div><div className="text-secondary text-xs mt-1">Denied (Expired)</div></div>
      </div>

      <div className="grid grid-2">
        {/* Scanner */}
        <div className="card" style={{ border: scanResult.status === 'success' ? '1px solid var(--accent-success)' : scanResult.status === 'error' ? '1px solid var(--accent-danger)' : undefined }}>
          <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 16 }}>
            <Clock size={16} style={{ display: 'inline', marginRight: 8, color: 'var(--accent-primary)' }} />
            Check-in Station
          </h3>
          {scanResult.status === 'idle' && (
            <div className="scanner-ready">
              <div className="scanner-ring"><div className="scanner-beam" /></div>
              <h3>Ready to Scan</h3>
              <p className="text-secondary text-sm text-center">Auto-listening for barcode/QR scanner input</p>
              <div className="flex gap-2 w-full">
                <input
                  className="input"
                  placeholder="Member ID or Phone..."
                  value={manualId}
                  onChange={e => setManualId(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleCheckIn(manualId)}
                  style={{ flex: 1 }}
                />
                <button className="btn btn-primary" onClick={() => handleCheckIn(manualId)}>Check In</button>
              </div>
              <p className="text-muted text-xs">Try: GMS-0001, GMS-0002, etc.</p>
            </div>
          )}
          {scanResult.status === 'success' && (
            <div className="scanner-ready">
              <img src={scanResult.member?.photo} style={{ width: 72, height: 72, borderRadius: '50%', objectFit: 'cover' }} />
              <div style={{ width: 72, height: 72, borderRadius: '50%', background: 'var(--accent-success)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <CheckCircle2 size={40} color="white" />
              </div>
              <h3 style={{ color: 'var(--accent-success)' }}>{scanResult.member?.name}</h3>
              <p>{scanResult.member?.planName}</p>
              <span className="badge badge-success">{scanResult.member?.daysRemaining} days remaining</span>
            </div>
          )}
          {scanResult.status === 'error' && (
            <div className="scanner-ready">
              <div style={{ width: 72, height: 72, borderRadius: '50%', background: 'var(--accent-danger)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <AlertTriangle size={40} color="white" />
              </div>
              <h3 style={{ color: 'var(--accent-danger)' }}>{scanResult.member?.name ?? 'Access Denied'}</h3>
              <p>{scanResult.member ? 'Membership expired!' : 'Member not found in system'}</p>
              {scanResult.member && <button className="btn btn-primary btn-sm">💳 Renew Now</button>}
            </div>
          )}
        </div>

        {/* Today's log */}
        <div className="card card-no-padding">
          <div className="flex items-center justify-between" style={{ padding: '16px 20px', borderBottom: '1px solid var(--glass-border)' }}>
            <h3 style={{ fontSize: 14, fontWeight: 700 }}>Today's Check-ins</h3>
            <span className="badge badge-success">{todayRecords.length}</span>
          </div>
          <div style={{ maxHeight: 380, overflowY: 'auto' }}>
            {todayRecords.length === 0 && <div className="empty-state" style={{ padding: 32 }}>No check-ins yet today</div>}
            {todayRecords.map(r => (
              <div key={r.id} className="flex items-center gap-3" style={{ padding: '10px 16px', borderBottom: '1px solid var(--glass-border)' }}>
                <img src={r.memberPhoto} alt={r.memberName} style={{ width: 34, height: 34, borderRadius: '50%', objectFit: 'cover' }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13.5, fontWeight: 600 }}>{r.memberName}</div>
                  <div className="text-muted text-xs">{r.planName}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 12, color: 'var(--accent-success)' }}>✓ {r.type}</div>
                  <div className="text-muted text-xs">{new Date(r.timestamp).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent Records */}
      <div className="card card-no-padding">
        <div className="flex items-center justify-between" style={{ padding: '16px 20px', borderBottom: '1px solid var(--glass-border)' }}>
          <h3 style={{ fontSize: 14, fontWeight: 700 }}>Attendance History</h3>
          <div className="search-input-wrap" style={{ width: 200 }}>
            <Search size={13} className="search-icon" />
            <input className="input" placeholder="Search..." value={query} onChange={e => setQuery(e.target.value)} style={{ paddingLeft: 32, height: 32, fontSize: 12 }} />
          </div>
        </div>
        <div className="table-container">
          <table className="table">
            <thead><tr><th>Member</th><th>Plan</th><th>Type</th><th>Date</th><th>Time</th><th>Status</th></tr></thead>
            <tbody>
              {recentRecords.slice(0, 15).map(r => (
                <tr key={r.id}>
                  <td>
                    <div className="flex items-center gap-2">
                      <img src={r.memberPhoto} style={{ width: 28, height: 28, borderRadius: '50%' }} />
                      <span style={{ fontWeight: 600, fontSize: 13 }}>{r.memberName}</span>
                    </div>
                  </td>
                  <td style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{r.planName}</td>
                  <td><span className="badge badge-success">{r.type}</span></td>
                  <td style={{ fontSize: 13 }}>{formatDate(r.date)}</td>
                  <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>{new Date(r.timestamp).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</td>
                  <td><span className={`badge ${r.status === 'Active' ? 'badge-success' : 'badge-danger'}`}>{r.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
