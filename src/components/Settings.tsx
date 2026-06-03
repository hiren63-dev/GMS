import { Settings as SettingsIcon } from 'lucide-react';

export default function Settings() {
    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', height: '100%' }}>
            <header className="glass-panel" style={{ padding: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                    <h1 style={{ fontSize: '1.8rem', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <SettingsIcon size={28} color="var(--text-secondary)" /> System Settings
                    </h1>
                    <p>Configure gym details, staff access, and hardware integrations.</p>
                </div>
                <button className="glass-button primary" style={{ background: 'var(--glass-bg)', borderColor: 'var(--glass-border)' }}>
                    Save Changes
                </button>
            </header>

            <div className="glass-panel" style={{ flexGrow: 1, padding: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>
                    <SettingsIcon size={48} style={{ margin: '0 auto 16px', opacity: 0.5 }} />
                    <h3>Settings Coming Soon</h3>
                    <p>Global app configuration goes here.</p>
                </div>
            </div>
        </div>
    );
}
