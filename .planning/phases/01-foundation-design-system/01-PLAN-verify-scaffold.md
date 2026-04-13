---
wave: 1
plan: 01-verify-scaffold
depends_on: []
files_modified:
  - event-management-system/index.html
  - event-management-system/src/main.tsx
  - event-management-system/src/App.css
autonomous: true
requirements: [UI-01, UI-04]
---

## Goal
Verify the Vite + React + TypeScript scaffold compiles and serves correctly with zero errors. Fix any broken imports or missing files that prevent the dev server from starting.

## Context
The project was scaffolded in a previous session. All core files exist but have never been verified to run together end-to-end. This plan confirms the foundation is solid before any feature work.

## Tasks

<task id="1.1">
<title>Audit index.html for correct root div and meta tags</title>
<read_first>
- event-management-system/index.html
</read_first>
<action>
Read index.html. Verify it contains:
  - `<div id="root"></div>` (required by main.tsx's `getElementById('root')`)
  - `<meta charset="UTF-8">`
  - `<meta name="viewport" content="width=device-width, initial-scale=1.0">`
  - `<title>FestFlow</title>` (update if it says "Vite + React + TS" or similar)
  - `<script type="module" src="/src/main.tsx"></script>`

If title is not "FestFlow", update it to:
```html
<title>FestFlow — Event Management</title>
```
</action>
<acceptance_criteria>
- index.html contains `id="root"`
- index.html title is "FestFlow"
- index.html contains `src="/src/main.tsx"`
</acceptance_criteria>
</task>

<task id="1.2">
<title>Clear App.css to prevent default Vite styles from overriding design system</title>
<read_first>
- event-management-system/src/App.css
- event-management-system/src/index.css
</read_first>
<action>
Read App.css. If it contains any default Vite styles (`.card`, `#app`, `.logo`, `.read-the-docs`, or any color/background rules that conflict with the dark design system), replace the entire file content with:

```css
/* App.css — intentionally minimal. All design tokens live in index.css */
```

The reason: Vite scaffolds App.css with light-mode demo styles that override --bg-void and body background.
</action>
<acceptance_criteria>
- App.css does NOT contain `.card {` 
- App.css does NOT contain `background-color: #ffffff` or `color: #213547`
- App.css does NOT contain `.logo`
</acceptance_criteria>
</task>

<task id="1.3">
<title>Verify all feature page imports resolve without errors</title>
<read_first>
- event-management-system/src/App.tsx
- event-management-system/src/features/events/EventsLanding.tsx (or .tsx variants)
- event-management-system/src/features/dashboard/EventDashboard.tsx
- event-management-system/src/features/teams/TeamsPage.tsx
- event-management-system/src/features/attendance/AttendancePage.tsx
- event-management-system/src/features/tasks/TasksPage.tsx
</read_first>
<action>
Read each file that App.tsx imports. For any file that is MISSING, create a minimal placeholder:

```tsx
// src/features/[name]/[ComponentName].tsx
import React from 'react';

export const [ComponentName]: React.FC = () => {
  return (
    <div className="page-enter" style={{ padding: '2rem' }}>
      <h1 className="text-headline">[Page Name]</h1>
      <p className="text-body" style={{ color: 'var(--text-muted)', marginTop: '0.5rem' }}>
        Coming in Phase [N]...
      </p>
    </div>
  );
};
```

Create placeholders for: EventsLanding, EventDashboard, TeamsPage, AttendancePage, TasksPage — only for those that are MISSING.
Also verify GlassCard component exists at `src/components/GlassCard.tsx`. If missing, create it:

```tsx
import React from 'react';

interface GlassCardProps {
  children: React.ReactNode;
  className?: string;
  hover?: boolean;
  onClick?: () => void;
}

export const GlassCard: React.FC<GlassCardProps> = ({ children, className = '', hover = true, onClick }) => {
  return (
    <div
      className={`${hover ? 'glass' : 'glass-static'} ${className}`}
      onClick={onClick}
      style={{ padding: 'var(--space-xl)', cursor: onClick ? 'pointer' : undefined }}
    >
      {children}
    </div>
  );
};
```
</action>
<acceptance_criteria>
- All 5 feature files exist (EventsLanding, EventDashboard, TeamsPage, AttendancePage, TasksPage)
- GlassCard.tsx exists at src/components/GlassCard.tsx
- Each file exports its named component (grep: `export const`)
- No circular imports
</acceptance_criteria>
</task>

<task id="1.4">
<title>Verify TypeScript types file exists and is complete</title>
<read_first>
- event-management-system/src/types/index.ts (or types.ts)
- event-management-system/src/store/useEventStore.ts
</read_first>
<action>
Check if `src/types/index.ts` exists. The store imports from `'../types'`. If missing or incomplete, create `src/types/index.ts` with:

```typescript
export interface TodoItem {
  id: string;
  text: string;
  done: boolean;
}

export interface Event {
  id: string;
  name: string;
  description: string;
  progress: number;
  todos: TodoItem[];
  taskAllotments: TodoItem[];
  createdAt: Date;
  updatedAt: Date;
}

export interface TeamMember {
  id: string;
  name: string;
}

export interface Team {
  id: string;
  eventId: string;
  name: string;
  heads: TeamMember[];
  members: TeamMember[];
  tasks: TodoItem[];
  createdAt: Date;
}

export interface AttendanceRecord {
  memberId: string;
  memberName: string;
  present: boolean;
  ideas: string;
}

export interface Meeting {
  id: string;
  eventId: string;
  teamId: string;
  date: Date;
  attendance: AttendanceRecord[];
}

export interface Task {
  id: string;
  eventId: string;
  text: string;
  team?: string;
  status: 'pending' | 'in-progress' | 'done';
  timeline: 'today' | 'weekly' | 'monthly';
  createdAt: Date;
}

export interface Discussion {
  id: string;
  eventId: string;
  text: string;
  timeline: 'weekly' | 'monthly';
  createdAt: Date;
}
```
</action>
<acceptance_criteria>
- src/types/index.ts exists
- File contains `export interface Event {`
- File contains `export interface Team {`
- File contains `export interface Task {`
- File contains `export interface Meeting {`
</acceptance_criteria>
</task>

## must_haves
- All TypeScript files compile without errors (`tsc --noEmit` passes)
- App.css does not have Vite default light-mode styles
- All 5 route components exist and export named components
- Types file exports all 7 interfaces used by the store
