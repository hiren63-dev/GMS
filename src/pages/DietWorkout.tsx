import { useState } from 'react';
import { Apple, Dumbbell, Zap, Target, Clock, ChevronRight, Star, Plus, Activity } from 'lucide-react';

const DIET_PLANS = [
  { id: 'd1', name: 'Lean Muscle Gain', goal: 'Bulking', calories: '2,800', difficulty: 'Intermediate', duration: '12 Weeks', tags: ['High Protein', 'Moderate Carbs'], color: '#8b5cf6' },
  { id: 'd2', name: 'Keto Weight Loss', goal: 'Fat Loss', calories: '1,800', difficulty: 'Advanced', duration: '8 Weeks', tags: ['High Fat', 'Zero Carbs'], color: '#ec4899' },
  { id: 'd3', name: 'Vegetarian Athlete', goal: 'Maintenance', calories: '2,400', difficulty: 'Beginner', duration: 'Ongoing', tags: ['Plant Based', 'Balanced'], color: '#10b981' },
];

const WORKOUT_PLANS = [
  { id: 'w1', name: 'PPL (Push Pull Legs)', type: 'Hypertrophy', level: 'Advanced', days: '6 Days/Week', focus: 'Muscle Growth', color: '#f59e0b' },
  { id: 'w2', name: 'Full Body HIIT', type: 'Conditioning', level: 'Beginner', days: '3 Days/Week', focus: 'Fat Loss', color: '#3b82f6' },
  { id: 'w3', name: 'Strength 5x5', type: 'Strength', level: 'Intermediate', days: '3 Days/Week', focus: 'Raw Power', color: '#f43f5e' },
];

export default function DietWorkout() {
  const [activeTab, setActiveTab] = useState<'diet' | 'workout'>('diet');

  const PlanCard = ({ plan, icon: Icon }: { plan: any, icon: any }) => (
    <div className="card card-hover" style={{ display: 'flex', flexDirection: 'column', borderLeft: `4px solid ${plan.color}`, height: '100%' }}>
      <div className="flex justify-between items-start mb-4">
        <div className="p-3 rounded-full" style={{ background: `rgba(${parseInt(plan.color.slice(1,3),16)}, ${parseInt(plan.color.slice(3,5),16)}, ${parseInt(plan.color.slice(5,7),16)}, 0.1)`, color: plan.color }}>
          <Icon size={24} />
        </div>
        <div className="flex gap-2">
           <span className="badge" style={{ background: 'rgba(255,255,255,0.05)', color: 'var(--text-secondary)' }}>
             {plan.difficulty || plan.level}
           </span>
        </div>
      </div>
      
      <h3 className="text-lg font-bold mb-1">{plan.name}</h3>
      <p className="text-secondary text-sm mb-4">Goal: <span className="text-primary font-medium">{plan.goal || plan.type}</span></p>

      <div className="grid grid-2 gap-3 mb-6">
        <div className="flex items-center gap-2 text-xs text-secondary">
          <Clock size={14} className="text-accent" />
          {plan.duration || plan.days}
        </div>
        <div className="flex items-center gap-2 text-xs text-secondary">
          <Target size={14} className="text-accent" />
          {plan.calories ? `${plan.calories} kcal` : plan.focus}
        </div>
      </div>

      <div className="flex flex-wrap gap-2 mt-auto">
        {(plan.tags || ['Customized', 'Expert Approved']).map((tag: string) => (
          <span key={tag} className="text-[10px] px-2 py-1 rounded bg-background-alt border border-border text-muted uppercase tracking-wider font-bold">
            {tag}
          </span>
        ))}
      </div>

      <button className="btn btn-secondary btn-sm mt-6 flex items-center justify-center gap-2 w-full">
        View Details <ChevronRight size={14} />
      </button>
    </div>
  );

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div className="page-header">
        <div>
          <h1 className="page-title">Diet & Workout Plans</h1>
          <p className="page-subtitle">Expert-curated transformation guides for your members</p>
        </div>
        <div className="tabs-container" style={{ background: 'rgba(255,255,255,0.05)', padding: 4, borderRadius: 12 }}>
          <button 
            className={`btn btn-sm ${activeTab === 'diet' ? 'btn-primary' : ''}`} 
            onClick={() => setActiveTab('diet')}
            style={{ borderRadius: 8 }}
          >
            <Apple size={14} className="mr-2" /> Diet Plans
          </button>
          <button 
            className={`btn btn-sm ${activeTab === 'workout' ? 'btn-primary' : ''}`} 
            onClick={() => setActiveTab('workout')}
            style={{ borderRadius: 8 }}
          >
            <Dumbbell size={14} className="mr-2" /> Workout Plans
          </button>
        </div>
      </div>

      {activeTab === 'diet' ? (
        <div className="grid grid-3 gap-6">
          {DIET_PLANS.map(plan => <PlanCard key={plan.id} plan={plan} icon={Apple} />)}
          <div className="card border-dashed p-8 text-center" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'transparent', minHeight: 300 }}>
            <div className="p-4 rounded-full bg-background-alt border border-border mb-4">
              <Plus size={32} className="text-muted" />
            </div>
            <h3 className="font-bold">Create Custom Diet</h3>
            <p className="text-secondary text-sm mt-2">Design a specialized nutrition plan for a member's unique needs</p>
            <button className="btn btn-secondary btn-sm mt-6">Start Building</button>
          </div>
        </div>
      ) : (
        <div className="grid grid-3 gap-6">
          {WORKOUT_PLANS.map(plan => <PlanCard key={plan.id} plan={plan} icon={Dumbbell} />)}
          <div className="card border-dashed p-8 text-center" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'transparent', minHeight: 300 }}>
            <div className="p-4 rounded-full bg-background-alt border border-border mb-4">
              <Plus size={32} className="text-muted" />
            </div>
            <h3 className="font-bold">Design Exercise Routine</h3>
            <p className="text-secondary text-sm mt-2">Build a custom workout split with frequency and intensity controls</p>
            <button className="btn btn-secondary btn-sm mt-6">Create New split</button>
          </div>
        </div>
      )}

      {/* Recommended Section for Pitch */}
      <div className="mt-8">
        <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
          <Star size={20} className="text-warning" fill="currentColor" /> Premium Features
        </h2>
        <div className="grid grid-2 gap-6">
          <div className="card p-6 flex gap-6 items-center bg-gradient-to-r from-accent/10 to-transparent">
            <div className="p-4 rounded-2xl bg-accent/20 text-accent">
              <Zap size={32} />
            </div>
            <div>
              <h3 className="font-bold text-lg">AI Meal Generator</h3>
              <p className="text-secondary text-sm mt-1">Generate dynamic meal plans based on remaining daily macros and member preferences.</p>
              <button className="btn btn-link p-0 mt-3 text-accent font-bold">Enabled for Pro Only</button>
            </div>
          </div>
          <div className="card p-6 flex gap-6 items-center">
            <div className="p-4 rounded-2xl bg-primary/20 text-primary">
              <Activity size={32} />
            </div>
            <div>
              <h3 className="font-bold text-lg">Live Form Correction</h3>
              <p className="text-secondary text-sm mt-1">Integrates with mobile app for AI-powered real-time exercise form analysis.</p>
              <button className="btn btn-link p-0 mt-3 text-primary font-bold">Coming Soon</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
