// Stub pages for remaining modules

// Body Tracking
export function BodyTracking() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div className="page-header"><h1 className="page-title">Body Tracking</h1></div>
      <div className="card">
        <div className="empty-state">
          <div className="empty-state-icon" style={{ fontSize: 48 }}>📏</div>
          <h3>Body Measurements</h3>
          <p>Track weight, BMI, body measurements, and progress photos for members.</p>
          <button className="btn btn-primary" style={{ marginTop: 16 }}>+ Add Measurement</button>
        </div>
      </div>
    </div>
  );
}

// Diet & Workout
export function DietWorkout() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div className="page-header"><h1 className="page-title">Diet & Workout Plans</h1></div>
      <div className="card">
        <div className="empty-state">
          <div className="empty-state-icon" style={{ fontSize: 48 }}>🍎</div>
          <h3>Diet & Workout Plans</h3>
          <p>Create and assign customized diet and workout plans to members.</p>
          <button className="btn btn-primary" style={{ marginTop: 16 }}>+ Create Plan</button>
        </div>
      </div>
    </div>
  );
}

// PT Sessions
export function PTSessions() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div className="page-header"><h1 className="page-title">PT Sessions</h1></div>
      <div className="card">
        <div className="empty-state">
          <div className="empty-state-icon" style={{ fontSize: 48 }}>🎯</div>
          <h3>PT Session Calendar</h3>
          <p>Schedule and log personal training sessions. View weekly calendar and session history.</p>
          <button className="btn btn-primary" style={{ marginTop: 16 }}>+ Schedule Session</button>
        </div>
      </div>
    </div>
  );
}

// Communications
export function Communications() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div className="page-header"><h1 className="page-title">Communications</h1></div>
      <div className="grid grid-3">
        {[
          { icon: '💬', title: 'WhatsApp Templates', desc: 'Create reusable message templates for renewals, birthdays, and offers', action: 'Manage Templates' },
          { icon: '📢', title: 'Send Messages', desc: 'Send bulk messages to groups of members filtered by plan or status', action: 'Send Now' },
          { icon: '🤖', title: 'Automation Rules', desc: 'Configure automatic reminders for expiry, birthdays, and inactive members', action: 'Configure' },
        ].map(c => (
          <div key={c.title} className="card card-hover text-center">
            <div style={{ fontSize: 40, marginBottom: 12 }}>{c.icon}</div>
            <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 8 }}>{c.title}</h3>
            <p className="text-secondary text-sm" style={{ marginBottom: 16 }}>{c.desc}</p>
            <button className="btn btn-primary btn-sm btn-full">{c.action}</button>
          </div>
        ))}
      </div>
    </div>
  );
}
