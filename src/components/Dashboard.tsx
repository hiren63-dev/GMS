import { useState, useEffect, useRef } from 'react';
import { Users, TrendingUp, DollarSign, Clock, AlertTriangle } from 'lucide-react';

export default function Dashboard() {
    const [stats, setStats] = useState({
        inside: 0,
        checkins: 0,
        revenue: 0
    });

    const [recentLogs, setRecentLogs] = useState<any[]>([]);
    const [expiringSoon, setExpiringSoon] = useState<any[]>([]);
    const [scannerInput, setScannerInput] = useState('');
    const [scanResult, setScanResult] = useState<{ status: 'idle' | 'success' | 'error', user?: any, message?: string }>({ status: 'idle' });

    const scannerTimeout = useRef<any>(null);

    // Use a global key press listener for the scanner input
    useEffect(() => {
        const handleKeyPress = (e: KeyboardEvent) => {
            // Ignore if typing in an input
            if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName)) return;

            if (e.key === 'Enter') {
                if (scannerInput.trim().length > 0) {
                    handleScan(scannerInput.trim());
                    setScannerInput('');
                }
            } else if (e.key.length === 1) {
                setScannerInput(prev => prev + e.key);
                // Clear input if idle for 200ms (to distinguish from manual typing)
                clearTimeout(scannerTimeout.current);
                scannerTimeout.current = setTimeout(() => setScannerInput(''), 200);
            }
        };

        window.addEventListener('keypress', handleKeyPress);
        return () => window.removeEventListener('keypress', handleKeyPress);
    }, [scannerInput]);

    useEffect(() => {
        fetchDashboardData();
        // In a real app we'd subscribe to Supabase Realtime changes here
    }, []);

    const fetchDashboardData = async () => {
        // Current live stats mocks for visual prototype
        setStats({
            inside: 42,
            checkins: 128,
            revenue: 450
        });

        setRecentLogs([
            { id: '1', name: 'John Doe', time: 'Just now', status: 'Active', photo: 'https://i.pravatar.cc/150?u=1' },
            { id: '2', name: 'Sarah Connor', time: '5m ago', status: 'Active', photo: 'https://i.pravatar.cc/150?u=2' },
            { id: '3', name: 'Mike Ross', time: '12m ago', status: 'Expired', photo: 'https://i.pravatar.cc/150?u=3' },
        ]);

        setExpiringSoon([
            { id: '4', name: 'Rachel Zane', daysLeft: 2 },
            { id: '5', name: 'Harvey Specter', daysLeft: 0 },
        ]);
    };

    const handleScan = async (code: string) => {
        // MOCK: Fast local validation
        if (code === '12345') {
            setScanResult({
                status: 'success',
                user: { name: 'John Doe', plan: 'Monthly Pro' },
                message: 'Checked In Successfully'
            });
            // Beep sound
            setTimeout(() => setScanResult({ status: 'idle' }), 3000);
        } else {
            setScanResult({
                status: 'error',
                message: 'Subscription Expired'
            });
            // Buzzer sound
            setTimeout(() => setScanResult({ status: 'idle' }), 5000);
        }
    };

    return (
        <div style={{ display: 'grid', gridTemplateColumns: '7fr 3fr', gap: '24px', height: '100%' }}>

            {/* Left Column: Live Activity */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                <header className="glass-panel" style={{ padding: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                        <h1 style={{ fontSize: '1.8rem', marginBottom: '4px' }}>Welcome back, Hiren</h1>
                        <p>Here is what's happening today at Pulse Fitness.</p>
                    </div>
                    <div style={{ background: 'rgba(255,255,255,0.05)', padding: '10px 20px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)' }}>
                        <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>{new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
                    </div>
                </header>

                {/* KPIs */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '24px' }}>
                    <div className="glass-panel" style={{ padding: '24px', display: 'flex', alignItems: 'center', gap: '16px' }}>
                        <div style={{ background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.2), rgba(37, 99, 235, 0.2))', padding: '16px', borderRadius: '16px', color: '#3b82f6' }}>
                            <Users size={28} />
                        </div>
                        <div>
                            <p style={{ fontSize: '0.9rem', marginBottom: '4px' }}>Currently Inside</p>
                            <h2 style={{ fontSize: '2rem' }}>{stats.inside}</h2>
                        </div>
                    </div>

                    <div className="glass-panel" style={{ padding: '24px', display: 'flex', alignItems: 'center', gap: '16px' }}>
                        <div style={{ background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.2), rgba(5, 150, 105, 0.2))', padding: '16px', borderRadius: '16px', color: '#10b981' }}>
                            <TrendingUp size={28} />
                        </div>
                        <div>
                            <p style={{ fontSize: '0.9rem', marginBottom: '4px' }}>Check-ins Today</p>
                            <h2 style={{ fontSize: '2rem' }}>{stats.checkins}</h2>
                        </div>
                    </div>

                    <div className="glass-panel" style={{ padding: '24px', display: 'flex', alignItems: 'center', gap: '16px' }}>
                        <div style={{ background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.2), rgba(109, 40, 217, 0.2))', padding: '16px', borderRadius: '16px', color: '#8b5cf6' }}>
                            <DollarSign size={28} />
                        </div>
                        <div>
                            <p style={{ fontSize: '0.9rem', marginBottom: '4px' }}>Today's Revenue</p>
                            <h2 style={{ fontSize: '2rem' }}>${stats.revenue}</h2>
                        </div>
                    </div>
                </div>

                {/* Live Feed */}
                <div className="glass-panel" style={{ flexGrow: 1, padding: '24px', display: 'flex', flexDirection: 'column' }}>
                    <h3 style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Clock size={20} color="var(--accent-primary)" /> Live Check-in Feed
                    </h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', overflowY: 'auto' }}>
                        {recentLogs.map(log => (
                            <div key={log.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', background: 'rgba(0,0,0,0.2)', borderRadius: '12px', border: '1px solid var(--glass-border)' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                                    <img src={log.photo} alt={log.name} style={{ width: '48px', height: '48px', borderRadius: '50%', objectFit: 'cover' }} />
                                    <div>
                                        <h4 style={{ fontSize: '1.1rem', marginBottom: '4px' }}>{log.name}</h4>
                                        <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{log.time}</span>
                                    </div>
                                </div>
                                <div style={{
                                    padding: '6px 12px',
                                    borderRadius: '20px',
                                    fontSize: '0.85rem',
                                    fontWeight: 600,
                                    background: log.status === 'Active' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                                    color: log.status === 'Active' ? 'var(--accent-success)' : 'var(--accent-danger)'
                                }}>
                                    {log.status}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Right Column: Actions */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>

                {/* Scanner Panel */}
                <div className="glass-panel" style={{
                    padding: '24px',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    height: '300px',
                    border: scanResult.status === 'success' ? '2px solid var(--accent-success)' : (scanResult.status === 'error' ? '2px solid var(--accent-danger)' : '1px solid var(--glass-border)'),
                    background: scanResult.status === 'success' ? 'rgba(16, 185, 129, 0.05)' : (scanResult.status === 'error' ? 'rgba(239, 68, 68, 0.05)' : 'var(--glass-bg)'),
                    transition: 'all 0.3s ease'
                }}>
                    {scanResult.status === 'idle' && (
                        <>
                            <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '20px' }}>
                                <div style={{ width: '40px', height: '3px', background: 'var(--accent-primary)', boxShadow: '0 0 10px var(--accent-primary)', animation: 'scan 2s infinite alternate' }}></div>
                            </div>
                            <h2 style={{ fontSize: '1.5rem', marginBottom: '8px' }}>Ready to Scan</h2>
                            <p style={{ textAlign: 'center' }}>Focus is not required. Auto-listening for scanner input.</p>

                            <style dangerouslySetInnerHTML={{
                                __html: `
                @keyframes scan {
                  0% { transform: translateY(-20px); }
                  100% { transform: translateY(20px); }
                }
              `}} />
                        </>
                    )}

                    {scanResult.status === 'success' && (
                        <div style={{ textAlign: 'center' }}>
                            <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: 'var(--accent-success)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px', color: '#fff' }}>
                                <CheckIcon size={40} />
                            </div>
                            <h2 style={{ fontSize: '1.5rem', marginBottom: '8px' }}>{scanResult.user?.name}</h2>
                            <p style={{ color: 'var(--accent-success)', fontWeight: 600 }}>{scanResult.message}</p>
                        </div>
                    )}

                    {scanResult.status === 'error' && (
                        <div style={{ textAlign: 'center' }}>
                            <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: 'var(--accent-danger)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px', color: '#fff' }}>
                                <AlertTriangle size={40} />
                            </div>
                            <h2 style={{ fontSize: '1.5rem', marginBottom: '8px' }}>Access Denied</h2>
                            <p style={{ color: 'var(--accent-danger)', fontWeight: 600 }}>{scanResult.message}</p>
                            <button className="glass-button primary" style={{ margin: '20px auto 0' }}>Renew Now</button>
                        </div>
                    )}
                </div>

                {/* Expiring Soon */}
                <div className="glass-panel" style={{ padding: '24px', flexGrow: 1 }}>
                    <h3 style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <AlertTriangle size={20} color="var(--accent-warning)" /> Expiring Soon
                    </h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        {expiringSoon.map(user => (
                            <div key={user.id} style={{ padding: '16px', background: 'rgba(0,0,0,0.2)', borderRadius: '12px', borderLeft: `4px solid ${user.daysLeft === 0 ? 'var(--accent-danger)' : 'var(--accent-warning)'}` }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                                    <h4 style={{ fontSize: '1rem', fontWeight: 600 }}>{user.name}</h4>
                                    <span style={{ fontSize: '0.8rem', background: 'rgba(255,255,255,0.1)', padding: '4px 8px', borderRadius: '8px' }}>
                                        {user.daysLeft === 0 ? 'Today' : `${user.daysLeft} Days`}
                                    </span>
                                </div>
                                <button className="glass-button" style={{ width: '100%', padding: '8px' }}>
                                    Send WhatsApp Reminder
                                </button>
                            </div>
                        ))}
                    </div>
                </div>

            </div>
        </div >
    );
}

const CheckIcon = ({ size }: { size: number }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="20 6 9 17 4 12"></polyline>
    </svg>
)
