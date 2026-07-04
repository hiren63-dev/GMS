import { useState } from 'react';
import type { Employee, Mood } from '../types';
import { submitCheckIn, logActivity } from '../services/firebase';

interface Props {
  employee: Employee;
  onDone: () => void;
}

const MOODS: { value: Mood; emoji: string; label: string }[] = [
  { value: 'great', emoji: '😄', label: 'Great' },
  { value: 'good',  emoji: '🙂', label: 'Good' },
  { value: 'okay',  emoji: '😐', label: 'Okay' },
  { value: 'rough', emoji: '😟', label: 'Rough' },
  { value: 'bad',   emoji: '😢', label: 'Bad' },
];

function todayKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function checkinDoneToday(employeeId: string): boolean {
  return !!localStorage.getItem(`checkin_${employeeId}_${todayKey()}`);
}

export default function DailyCheckInModal({ employee, onDone }: Props) {
  const [mood, setMood]               = useState<Mood | null>(null);
  const [feelingGood, setFeelingGood] = useState<boolean | null>(null);
  const [feelingOkay, setFeelingOkay] = useState<boolean | null>(null);
  const [canWork, setCanWork]         = useState<boolean | null>(null);

  const allAnswered = mood !== null && feelingGood !== null && feelingOkay !== null && canWork !== null;

  const handleSubmit = () => {
    if (!mood) return;

    // Mark done and dismiss immediately — no waiting on network
    localStorage.setItem(`checkin_${employee.id}_${todayKey()}`, '1');
    onDone();

    // Fire Firestore writes in the background; SDK queues them if offline
    submitCheckIn({
      employeeId: employee.id,
      employeeName: employee.name,
      date: Date.now(),
      dateKey: todayKey(),
      mood,
      isFeelingGood: feelingGood ?? true,
      workDone: canWork ? 'yes' : 'no',
      hasProblems: !feelingOkay,
      status: 'completed',
    }).catch(() => {});
    logActivity({
      employeeId: employee.id,
      employeeName: employee.name,
      type: 'check_in',
      detail: `Daily check-in — mood: ${mood}, can work: ${canWork ? 'yes' : 'no'}`,
      timestamp: Date.now(),
    }).catch(() => {});
  };

  const hour = new Date().getHours();
  const firstName = employee.name.split(' ')[0];
  const greeting = hour < 12 ? `Good morning, ${firstName}!` : hour < 17 ? `Good afternoon, ${firstName}!` : `Good evening, ${firstName}!`;

  const YesNo = ({ value, onChange }: { value: boolean | null; onChange: (v: boolean) => void }) => (
    <div style={{ display: 'flex', gap: 8 }}>
      {([true, false] as boolean[]).map(v => (
        <button key={String(v)} type="button" onClick={() => onChange(v)}
          style={{
            flex: 1, height: 40, borderRadius: 8,
            border: `1.5px solid ${value === v ? '#2563EB' : '#E9E9E7'}`,
            background: value === v ? '#EFF6FF' : '#F7F7F6',
            color: value === v ? '#2563EB' : '#555',
            fontSize: 13, fontWeight: 500, cursor: 'pointer', transition: 'all 120ms',
          }}>
          {v ? '👍 Yes' : '👎 No'}
        </button>
      ))}
    </div>
  );

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(3px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <div style={{
        background: '#fff', borderRadius: 18, padding: '32px 36px',
        width: 460, maxWidth: 'calc(100vw - 32px)',
        boxShadow: '0 24px 64px rgba(0,0,0,0.20)',
        animation: 'fadeIn 200ms ease both',
      }}>
        <div style={{ marginBottom: 26 }}>
          <div style={{ fontSize: 22, fontWeight: 600, color: '#111', letterSpacing: '-0.02em', marginBottom: 4 }}>{greeting}</div>
          <div style={{ fontSize: 13, color: '#888' }}>Quick check-in before you dive in — takes 10 seconds.</div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Q1: How was your day */}
          <div>
            <div style={{ fontSize: 13, fontWeight: 500, color: '#333', marginBottom: 10 }}>How was your day?</div>
            <div style={{ display: 'flex', gap: 6 }}>
              {MOODS.map(m => (
                <button key={m.value} type="button" onClick={() => setMood(m.value)}
                  style={{
                    flex: 1, padding: '10px 2px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
                    border: `1.5px solid ${mood === m.value ? '#2563EB' : '#E9E9E7'}`,
                    borderRadius: 10,
                    background: mood === m.value ? '#EFF6FF' : '#F7F7F6',
                    cursor: 'pointer', transition: 'all 120ms',
                  }}>
                  <span style={{ fontSize: 22 }}>{m.emoji}</span>
                  <span style={{ fontSize: 10, color: mood === m.value ? '#2563EB' : '#888', fontWeight: 500 }}>{m.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Q2: Feeling good */}
          <div>
            <div style={{ fontSize: 13, fontWeight: 500, color: '#333', marginBottom: 8 }}>Are you feeling good?</div>
            <YesNo value={feelingGood} onChange={setFeelingGood} />
          </div>

          {/* Q3: Feeling okay */}
          <div>
            <div style={{ fontSize: 13, fontWeight: 500, color: '#333', marginBottom: 8 }}>Are you feeling okay?</div>
            <YesNo value={feelingOkay} onChange={setFeelingOkay} />
          </div>

          {/* Q4: Able to work */}
          <div>
            <div style={{ fontSize: 13, fontWeight: 500, color: '#333', marginBottom: 8 }}>Are you able to work?</div>
            <YesNo value={canWork} onChange={setCanWork} />
          </div>

          <button
            onClick={handleSubmit}
            disabled={!allAnswered}
            style={{
              width: '100%', height: 46, marginTop: 4, border: 'none', borderRadius: 10,
              background: allAnswered ? '#2563EB' : '#E9E9E7',
              color: allAnswered ? '#fff' : '#AAA',
              fontSize: 14, fontWeight: 600,
              cursor: allAnswered ? 'pointer' : 'not-allowed',
              transition: 'all 150ms',
            }}>
            {"✅ Let's go!"}
          </button>
          <button
            onClick={() => {
              localStorage.setItem(`checkin_${employee.id}_${todayKey()}`, 'skipped');
              onDone();
            }}
            style={{ width: '100%', marginTop: 8, background: 'none', border: 'none', fontSize: 12, color: '#BBB', cursor: 'pointer' }}>
            Skip for today
          </button>
        </div>
      </div>
    </div>
  );
}
