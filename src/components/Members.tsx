import { Users } from 'lucide-react';

export default function Members() {
    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', height: '100%' }}>
            <header className="glass-panel" style={{ padding: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                    <h1 style={{ fontSize: '1.8rem', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <Users size={28} color="var(--accent-primary)" /> Members Directory
                    </h1>
                    <p>Manage all registered gym members, view their status, and add new ones.</p>
                </div>
                <button className="glass-button primary">
                    + Add New Member
                </button>
            </header>

            <div className="glass-panel" style={{ flexGrow: 1, padding: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>
                    <Users size={48} style={{ margin: '0 auto 16px', opacity: 0.5 }} />
                    <h3>Member List Coming Soon</h3>
                    <p>This module will connect to the Supabase Members table.</p>
                </div>
            </div>
        </div>
    );
}
