---
wave: 2
plan: 04-sidebar-nocturne
depends_on: [01-verify-scaffold]
files_modified:
  - event-management-system/src/components/Sidebar.tsx
  - event-management-system/src/components/Sidebar.css
autonomous: true
requirements: [UI-01, UI-02]
---

## Goal
Rebuild the Sidebar component to exactly match the Nocturne Framework / Stitch UI-SPEC: Glow-Dot navigation pattern, no pill backgrounds, event context amber badge, glass morphism sidebar with ghost border.

## Context
The existing Sidebar.tsx has the correct structure but needs enhancement to match the Stitch-generated design. Specifically: the Glow-Dot active indicator (4px violet dot below label, NOT a pill/highlight background), the amber event badge at bottom, and the correct glass styling.

**Stitch Screen reference:** `e9c4133994e44ba7a230fb90966e507b` — AppShell + Sidebar

## Tasks

<task id="4.1">
<title>Rewrite Sidebar.tsx with Glow-Dot navigation and event badge</title>
<read_first>
- event-management-system/src/components/Sidebar.tsx
- event-management-system/src/components/Sidebar.css (read if exists)
- event-management-system/src/store/useEventStore.ts
</read_first>
<action>
Replace the content of `src/components/Sidebar.tsx` with:

```tsx
import React from 'react';
import { NavLink, useParams, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  ClipboardCheck,
  ListTodo,
  ChevronLeft,
  Sparkles,
  CalendarDays,
} from 'lucide-react';
import { useEventStore } from '../store/useEventStore';
import './Sidebar.css';

interface NavItemProps {
  to: string;
  icon: React.ReactNode;
  label: string;
  end?: boolean;
}

const NavItem: React.FC<NavItemProps> = ({ to, icon, label, end }) => (
  <NavLink
    to={to}
    end={end}
    className={({ isActive }) =>
      `sidebar__nav-item ${isActive ? 'sidebar__nav-item--active' : ''}`
    }
  >
    <span className="sidebar__nav-icon">{icon}</span>
    <span className="sidebar__nav-label">{label}</span>
    {/* Glow dot renders via CSS :after on --active class */}
  </NavLink>
);

export const Sidebar: React.FC = () => {
  const { eventId } = useParams();
  const navigate = useNavigate();
  const events = useEventStore((s) => s.events);
  const currentEvent = events.find((e) => e.id === eventId);
  const isEventContext = !!eventId;

  return (
    <aside className="sidebar">
      {/* Logo */}
      <div
        className="sidebar__logo"
        onClick={() => navigate('/')}
        role="button"
        tabIndex={0}
        aria-label="Go to events home"
      >
        <div className="sidebar__logo-glow">
          <Sparkles size={18} />
        </div>
        <span className="sidebar__logo-text">FestFlow</span>
      </div>

      {/* Event context back button */}
      {isEventContext && (
        <button className="sidebar__back" onClick={() => navigate('/')}>
          <ChevronLeft size={15} />
          <span>All Events</span>
        </button>
      )}

      {/* Navigation */}
      <nav className="sidebar__nav" aria-label="Main navigation">
        {isEventContext ? (
          <>
            <NavItem
              to={`/events/${eventId}`}
              icon={<LayoutDashboard size={17} />}
              label="Dashboard"
              end
            />
            <NavItem
              to={`/events/${eventId}/teams`}
              icon={<Users size={17} />}
              label="Teams"
            />
            <NavItem
              to={`/events/${eventId}/attendance`}
              icon={<ClipboardCheck size={17} />}
              label="Attendance"
            />
            <NavItem
              to={`/events/${eventId}/tasks`}
              icon={<ListTodo size={17} />}
              label="Tasks"
            />
          </>
        ) : (
          <NavItem
            to="/"
            icon={<CalendarDays size={17} />}
            label="Events"
            end
          />
        )}
      </nav>

      {/* Spacer */}
      <div className="sidebar__spacer" />

      {/* Current event badge (amber) */}
      {currentEvent && (
        <div className="sidebar__event-badge">
          <span className="sidebar__event-badge-dot" />
          <span className="sidebar__event-badge-name">{currentEvent.name}</span>
        </div>
      )}

      {/* Version */}
      <div className="sidebar__footer">
        <span className="text-micro">FestFlow v1.0</span>
      </div>
    </aside>
  );
};
```
</action>
<acceptance_criteria>
- Sidebar.tsx exports `const Sidebar`
- Sidebar.tsx contains `sidebar__nav-item--active`
- Sidebar.tsx contains `sidebar__event-badge`
- Sidebar.tsx contains `useEventStore`
- Sidebar.tsx contains `NavItem` inner component
</acceptance_criteria>
</task>

<task id="4.2">
<title>Create Sidebar.css with Glow-Dot pattern and glass morphism</title>
<read_first>
- event-management-system/src/components/Sidebar.css (read if exists)
- event-management-system/src/index.css (reference for tokens)
</read_first>
<action>
Create or replace `src/components/Sidebar.css` with:

```css
/* Sidebar.css — Nocturne Framework Glow-Dot Navigation */

.sidebar {
  position: fixed;
  top: 0;
  left: 0;
  width: var(--sidebar-width);
  height: 100vh;
  display: flex;
  flex-direction: column;
  padding: var(--space-xl) var(--space-lg);
  z-index: 100;

  /* Glass morphism */
  background: rgba(19, 19, 24, 0.85);
  backdrop-filter: blur(var(--glass-blur));
  -webkit-backdrop-filter: blur(var(--glass-blur));
  border-right: 1px solid var(--glass-border);
}

/* Logo */
.sidebar__logo {
  display: flex;
  align-items: center;
  gap: var(--space-md);
  padding: var(--space-md) 0;
  margin-bottom: var(--space-2xl);
  cursor: pointer;
  user-select: none;
}

.sidebar__logo-glow {
  width: 32px;
  height: 32px;
  border-radius: var(--radius-md);
  background: linear-gradient(135deg, var(--primary-dim), var(--primary-container));
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  box-shadow: 0 0 16px rgba(139, 92, 246, 0.4);
  flex-shrink: 0;
}

.sidebar__logo-text {
  font-size: 1rem;
  font-weight: var(--font-heading);
  color: var(--text-primary);
  letter-spacing: -0.01em;
}

/* Back button */
.sidebar__back {
  display: flex;
  align-items: center;
  gap: var(--space-xs);
  padding: var(--space-xs) var(--space-sm);
  margin-bottom: var(--space-lg);
  font-size: 0.75rem;
  font-weight: var(--font-medium);
  color: var(--text-muted);
  border-radius: var(--radius-sm);
  transition: color var(--transition-fast), background var(--transition-fast);
  cursor: pointer;
  border: none;
  background: none;
}

.sidebar__back:hover {
  color: var(--text-secondary);
  background: rgba(255, 255, 255, 0.04);
}

/* Navigation */
.sidebar__nav {
  display: flex;
  flex-direction: column;
  gap: var(--space-xs);
}

/* Nav Item — Glow-Dot Pattern */
.sidebar__nav-item {
  display: flex;
  align-items: center;
  gap: var(--space-md);
  padding: var(--space-md) var(--space-md);
  border-radius: var(--radius-md);
  color: var(--text-muted);
  font-size: 0.875rem;
  font-weight: var(--font-medium);
  text-decoration: none;
  transition: color var(--transition-fast), background var(--transition-fast);
  position: relative;
  cursor: pointer;
}

.sidebar__nav-item:hover {
  color: var(--text-secondary);
  background: rgba(255, 255, 255, 0.04);
}

/* Active state — Glow-Dot ONLY, no pill background */
.sidebar__nav-item--active {
  color: var(--primary);
  background: rgba(208, 188, 255, 0.06);
}

/* The Glow Dot — 4px violet circle beneath the label */
.sidebar__nav-item--active::after {
  content: '';
  position: absolute;
  bottom: 4px;
  left: 50%;
  transform: translateX(-50%);
  width: 4px;
  height: 4px;
  border-radius: 50%;
  background: var(--primary-dim);
  box-shadow: 0 0 8px var(--primary-dim), 0 0 3px var(--primary-dim);
}

.sidebar__nav-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  opacity: 0.85;
}

.sidebar__nav-item--active .sidebar__nav-icon {
  opacity: 1;
}

.sidebar__nav-label {
  flex: 1;
}

/* Spacer */
.sidebar__spacer {
  flex: 1;
}

/* Event Badge — Amber accent */
.sidebar__event-badge {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  padding: var(--space-sm) var(--space-md);
  margin-bottom: var(--space-md);
  background: rgba(255, 184, 105, 0.08);
  border: 1px solid rgba(255, 184, 105, 0.18);
  border-radius: var(--radius-full);
}

.sidebar__event-badge-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--tertiary);
  box-shadow: 0 0 6px var(--tertiary);
  flex-shrink: 0;
}

.sidebar__event-badge-name {
  font-size: 0.75rem;
  font-weight: var(--font-medium);
  color: var(--tertiary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* Footer */
.sidebar__footer {
  padding: var(--space-sm) 0;
  color: var(--text-dim);
  text-align: center;
}
```
</action>
<acceptance_criteria>
- Sidebar.css exists at src/components/Sidebar.css
- File contains `.sidebar__nav-item--active::after` (the Glow-Dot rule)
- File contains `box-shadow: 0 0 8px var(--primary-dim)` (glow effect)
- File contains `.sidebar__event-badge {` 
- File contains `rgba(255, 184, 105` (amber color for event badge)
- File contains `backdrop-filter: blur` for glass effect
- NO `.sidebar__nav-item--active { background:` with a strong background (only 6% max)
</acceptance_criteria>
</task>

## must_haves
- Sidebar renders with glass morphism (backdrop-filter: blur visible in DevTools)
- Active nav item: color is var(--primary) #d0bcff — NO pill background
- Active nav item: 4px violet glow-dot appears below label (::after pseudo-element)
- Inactive nav items: color is var(--text-muted) #958ea0
- If inside an event context, amber event badge shows event name at bottom
- Back button navigates to / (events list)
- Zero 1px solid opaque borders (ghost borders only at 15% opacity max)
