import { useState } from 'react';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Clock } from 'lucide-react';
import { useApp } from '../store/useStore';

export default function ManagerCalendar() {
  const { trainers, ptSessions } = useApp();
  const [currentDate, setCurrentDate] = useState(new Date());

  // Generate 7 days starting from Monday of the current date's week
  const getDaysInWeek = (date: Date) => {
    const start = new Date(date);
    const day = start.getDay();
    const diff = start.getDate() - day + (day === 0 ? -6 : 1); // adjust when day is sunday
    start.setDate(diff);

    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      return d;
    });
  };

  const weekDays = getDaysInWeek(currentDate);
  const timeSlots = ['06:00', '07:00', '08:00', '09:00', '10:00', '17:00', '18:00', '19:00', '20:00'];

  const nextWeek = () => {
    const next = new Date(currentDate);
    next.setDate(currentDate.getDate() + 7);
    setCurrentDate(next);
  };

  const prevWeek = () => {
    const prev = new Date(currentDate);
    prev.setDate(currentDate.getDate() - 7);
    setCurrentDate(prev);
  };

  // Helper to find session based on trainer, date and time
  const getSession = (trainerId: string, dateObj: Date, timeStr: string) => {
    const dateStr = dateObj.toISOString().split('T')[0];
    return ptSessions.find(s => s.trainerId === trainerId && s.date === dateStr && s.time === timeStr);
  };

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div className="page-header">
        <div>
          <h1 className="page-title">Manager Calendar</h1>
          <p className="page-subtitle">Track trainer schedules and upcoming PT sessions</p>
        </div>
        <div className="page-header-actions">
          <div className="card card-sm" style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '8px 16px' }}>
            <button onClick={prevWeek} className="btn-icon text-secondary"><ChevronLeft size={20} /></button>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 700 }}>
              <CalendarIcon size={16} className="text-accent" />
              {weekDays[0].toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} 
              {' - '}
              {weekDays[6].toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
            </div>
            <button onClick={nextWeek} className="btn-icon text-secondary"><ChevronRight size={20} /></button>
          </div>
        </div>
      </div>

      <div className="card card-no-padding overflow-hidden">
        <div style={{ display: 'flex', width: '100%', overflowX: 'auto' }}>
          
          {/* Timeslot Column */}
          <div style={{ width: 80, flexShrink: 0, borderRight: '1px solid var(--border-color)', background: 'var(--bg-elevated)', paddingTop: 50 }}>
            {timeSlots.map(time => (
              <div key={time} style={{ height: 80, padding: 8, fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', textAlign: 'right', borderBottom: '1px solid var(--border-color)' }}>
                {time}
              </div>
            ))}
          </div>

          {/* Trainer Columns */}
          {trainers.slice(0, 4).map(trainer => (
            <div key={trainer.id} style={{ flex: 1, minWidth: 200, borderRight: '1px solid var(--border-color)' }}>
              
              {/* Trainer Header */}
              <div style={{ height: 50, padding: 8, display: 'flex', alignItems: 'center', gap: 8, borderBottom: '1px solid var(--border-color)', background: 'var(--bg-elevated)' }}>
                <img src={trainer.photo} alt={trainer.name} style={{ width: 24, height: 24, borderRadius: '50%' }} />
                <span style={{ fontSize: 13, fontWeight: 700 }}>{trainer.name}</span>
              </div>

              {/* Time slots for trainer */}
              <div style={{ position: 'relative' }}>
                {timeSlots.map(time => {
                  // Find if there's a session for the first visible day just for prototype
                  const sessionDay = weekDays[0]; 
                  const session = getSession(trainer.id, sessionDay, time);

                  return (
                    <div key={time} style={{ height: 80, padding: 4, borderBottom: '1px solid var(--border-color)', position: 'relative' }}>
                      {session && (
                        <div style={{ 
                          position: 'absolute', top: 4, left: 4, right: 4, bottom: 4, 
                          background: session.status === 'Completed' ? 'var(--accent-success)' : session.status === 'Cancelled' ? 'var(--accent-danger)' : 'var(--accent-primary)',
                          opacity: session.status === 'Cancelled' ? 0.3 : 1,
                          borderRadius: 8, padding: '8px 12px', color: 'white', display: 'flex', flexDirection: 'column', gap: 4,
                          boxShadow: 'var(--shadow-md)', cursor: 'pointer', transition: 'var(--transition)'
                        }} className="card-hover">
                          <div style={{ fontSize: 11, fontWeight: 800 }}>{session.memberName}</div>
                          <div style={{ fontSize: 10, display: 'flex', alignItems: 'center', gap: 4 }}><Clock size={10} /> {session.duration}m</div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
