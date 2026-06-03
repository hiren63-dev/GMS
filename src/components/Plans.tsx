import { CreditCard } from 'lucide-react';

export default function Plans() {
    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', height: '100%' }}>
            <header className="glass-panel" style={{ padding: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                    <h1 style={{ fontSize: '1.8rem', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <CreditCard size={28} color="var(--accent-secondary)" /> Plans & Payments
                    </h1>
                    <p>Configure subscription tiers and review transaction histories.</p>
                </div>
                <button className="glass-button primary">
                    + Create Plan
                </button>
            </header>

            <div className="glass-panel" style={{ flexGrow: 1, padding: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>
                    <CreditCard size={48} style={{ margin: '0 auto 16px', opacity: 0.5 }} />
                    <h3>Plans Management Coming Soon</h3>
                    <p>Manage subscription renewals and direct payments here.</p>
                </div>
            </div>
        </div>
    );
}
