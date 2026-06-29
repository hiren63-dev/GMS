import { useState } from 'react';
import type { Employee, Mood } from '../types';
import { submitCheckIn, logActivity } from '../services/firebase';
import { toast } from '../utils/toast';

interface Props {
  employee: Employee;
  onDone: () => void;
}

type Step = 0 | 1 | 2 | 3 | 4 | 5;

const MOODS: { value: Mood; emoji: string; label: string }[] = [
  { value: 'great', emoji: '😄', label: 'Great' },
  { value: 'good',  emoji: '🙂', label: 'Good' },
  { value: 'okay',  emoji: '😐', label: 'Okay' },
  { value: 'rough', emoji: '😟', label: 'Rough' },
  { value: 'bad',   emoji: '😢', label: 'Bad' },
];

export default function CheckInForm({ employee, onDone }: Props) {
  const [step, setStep] = useState<Step>(0);
  const [mood, setMood] = useState<Mood | null>(null);
  const [isFeelingGood, setIsFeelingGood] = useState<boolean | null>(null);
  const [workDone, setWorkDone] = useState('');
  const [hasProblems, setHasProblems] = useState<boolean | null>(null);
  const [problemDetails, setProblemDetails] = useState('');
  const [suggestions, setSuggestions] = useState('');
  const [saving, setSaving] = useState(false);

  const progress = (step / 5) * 100;

  const handleSubmit = async () => {
    if (!mood) return;
    setSaving(true);
    await submitCheckIn({
      employeeId: employee.id, employeeName: employee.name,
      date: Date.now(),
      mood,
      isFeelingGood: isFeelingGood ?? true,
      workDone,
      hasProblems: hasProblems ?? false,
      problemDetails: hasProblems ? problemDetails : undefined,
      suggestions: suggestions || undefined,
      status: 'completed',
    });
    await logActivity({
      employeeId: employee.id, employeeName: employee.name,
      type: 'check_in', detail: `Checked in — mood: ${mood}`, timestamp: Date.now(),
    });
    setSaving(false);
    toast('Check-in submitted! 📋');
    onDone();
  };

  const steps = [
    // Step 0: Mood
    <div key={0} className="text-center space-y-6">
      <div>
        <h3 className="text-xl font-bold mb-1" style={{ color: 'var(--text)' }}>How's your day going?</h3>
        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Pick the emoji that matches your mood</p>
      </div>
      <div className="flex justify-center gap-3 flex-wrap">
        {MOODS.map(m => (
          <button key={m.value}
            onClick={() => { setMood(m.value); setStep(1); }}
            className={`flex flex-col items-center gap-2 p-4 rounded-2xl border-2 transition hover:scale-110 ${
              mood === m.value ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' : 'border-transparent'
            }`}
            style={{ background: mood === m.value ? undefined : 'var(--surface2)' }}>
            <span className="text-4xl">{m.emoji}</span>
            <span className="text-xs font-medium" style={{ color: 'var(--text)' }}>{m.label}</span>
          </button>
        ))}
      </div>
    </div>,

    // Step 1: Feeling good?
    <div key={1} className="text-center space-y-6">
      <div>
        <h3 className="text-xl font-bold mb-1" style={{ color: 'var(--text)' }}>Are you feeling good today?</h3>
        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Physically and mentally?</p>
      </div>
      <div className="flex justify-center gap-4">
        {([true, false] as boolean[]).map(val => (
          <button key={String(val)}
            onClick={() => { setIsFeelingGood(val); setStep(2); }}
            className={`w-32 py-4 rounded-2xl border-2 font-semibold text-lg transition hover:scale-105 ${
              isFeelingGood === val ? 'border-blue-500' : 'border-transparent'
            }`}
            style={{ background: 'var(--surface2)', color: 'var(--text)' }}>
            {val ? '👍 Yes' : '👎 No'}
          </button>
        ))}
      </div>
    </div>,

    // Step 2: Work done
    <div key={2} className="space-y-4">
      <div>
        <h3 className="text-xl font-bold mb-1" style={{ color: 'var(--text)' }}>What work did you do today?</h3>
        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>A brief summary of your tasks</p>
      </div>
      <textarea value={workDone} onChange={e => setWorkDone(e.target.value)}
        placeholder="e.g. Completed login page design, reviewed 3 PRs…"
        rows={4} className="input w-full resize-none" />
      <button onClick={() => setStep(3)} disabled={!workDone.trim()}
        className="w-full py-3 rounded-xl bg-blue-500 hover:bg-blue-600 disabled:opacity-50 text-white font-semibold transition">
        Continue →
      </button>
    </div>,

    // Step 3: Problems
    <div key={3} className="text-center space-y-6">
      <div>
        <h3 className="text-xl font-bold mb-1" style={{ color: 'var(--text)' }}>Any blockers or problems?</h3>
        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Issues slowing you down?</p>
      </div>
      <div className="flex justify-center gap-4">
        {([false, true] as boolean[]).map(val => (
          <button key={String(val)}
            onClick={() => { setHasProblems(val); setStep(val ? 4 : 5); }}
            className={`w-32 py-4 rounded-2xl border-2 font-semibold text-lg transition hover:scale-105 ${
              hasProblems === val ? 'border-blue-500' : 'border-transparent'
            }`}
            style={{ background: 'var(--surface2)', color: 'var(--text)' }}>
            {val ? '⚠️ Yes' : '✅ No'}
          </button>
        ))}
      </div>
    </div>,

    // Step 4: Problem details
    <div key={4} className="space-y-4">
      <div>
        <h3 className="text-xl font-bold mb-1" style={{ color: 'var(--text)' }}>Tell us what's blocking you</h3>
        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>This will be flagged for your manager</p>
      </div>
      <textarea value={problemDetails} onChange={e => setProblemDetails(e.target.value)}
        placeholder="Describe the blocker…" rows={4} className="input w-full resize-none" />
      <button onClick={() => setStep(5)} disabled={!problemDetails.trim()}
        className="w-full py-3 rounded-xl bg-blue-500 hover:bg-blue-600 disabled:opacity-50 text-white font-semibold transition">
        Continue →
      </button>
    </div>,

    // Step 5: Suggestions
    <div key={5} className="space-y-4">
      <div>
        <h3 className="text-xl font-bold mb-1" style={{ color: 'var(--text)' }}>Any suggestions?</h3>
        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Optional — share feedback or ideas</p>
      </div>
      <textarea value={suggestions} onChange={e => setSuggestions(e.target.value)}
        placeholder="Ideas for improving processes, tools, or team culture…"
        rows={3} className="input w-full resize-none" />
      <button onClick={handleSubmit} disabled={saving}
        className="w-full py-3 rounded-xl font-semibold text-white transition"
        style={{ background: 'linear-gradient(135deg,#6366F1,#8B5CF6)' }}>
        {saving ? 'Submitting…' : '✅ Submit Check-In'}
      </button>
    </div>,
  ];

  return (
    <div className="p-6 max-w-xl mx-auto animate-slide-in">
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-lg font-bold" style={{ color: 'var(--text)' }}>✅ Daily Check-In</h2>
          <span className="text-sm" style={{ color: 'var(--text-muted)' }}>Step {step + 1} of 6</span>
        </div>
        <div className="h-2 rounded-full overflow-hidden" style={{ background: 'var(--surface2)' }}>
          <div className="h-full rounded-full transition-all duration-500"
            style={{ width: `${progress}%`, background: 'linear-gradient(90deg,#6366F1,#8B5CF6)' }} />
        </div>
      </div>
      <div className="card p-6">{steps[step]}</div>
      {step > 0 && step < 5 && (
        <button onClick={() => setStep(prev => (prev - 1) as Step)}
          className="mt-4 text-sm" style={{ color: 'var(--text-muted)' }}>← Back</button>
      )}
    </div>
  );
}
