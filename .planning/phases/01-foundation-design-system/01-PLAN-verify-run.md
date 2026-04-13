---
wave: 3
plan: 05-verify-run
depends_on: [01-verify-scaffold, 03-design-system-audit, 04-sidebar-nocturne]
files_modified: []
autonomous: true
requirements: [UI-01, UI-02, UI-04]
---

## Goal
Run `npm run dev`, verify the app serves correctly, check all 5 routes load without crashes, and confirm the Nocturne Framework design renders as specified: void background, glass sidebar, glow-dot nav, zero console errors.

## Context
This is the verification plan — it reads what was built in plans 01-04 and confirms everything works together. No new code is written here.

## Tasks

<task id="5.1">
<title>Run TypeScript type check to catch compilation errors</title>
<read_first>
- event-management-system/tsconfig.app.json
- event-management-system/tsconfig.json
</read_first>
<action>
Run in the `event-management-system/` directory:

```bash
npx tsc --noEmit 2>&1
```

If errors appear:
1. Read the exact error message
2. Open the file mentioned in the error
3. Fix the type error (common issues: missing type imports, incorrect prop types, `undefined` union issues)
4. Re-run until zero errors

Common fixes:
- `Cannot find module '../types'` → verify `src/types/index.ts` exists
- `Property 'X' does not exist on type 'Y'` → check interface definition in types/index.ts
- `Expression of type 'string' is not assignable to type 'never'` → check union type completeness
</action>
<acceptance_criteria>
- `npx tsc --noEmit` exits with code 0 (zero TypeScript errors)
- Zero lines of error output from tsc
</acceptance_criteria>
</task>

<task id="5.2">
<title>Start dev server and verify zero startup errors</title>
<read_first>
- event-management-system/package.json
- event-management-system/vite.config.ts
</read_first>
<action>
Run in background:
```bash
npm run dev
```

Wait 5 seconds for Vite to start. Check for:
1. "ready in Xms" message (success)
2. Any "ERROR" or "Cannot resolve" messages (failure)

If errors appear, read the specific error and fix:
- `Cannot find module 'X'` → install dependency or fix import path
- `Failed to resolve import` → check the exact import path matches the file system
- Port conflict (EADDRINUSE) → Vite will auto-increment port, note the actual port

Confirm the local URL (typically http://localhost:5173 or next available).
</action>
<acceptance_criteria>
- Dev server starts with "ready in" or "Local:" message
- No `[ERROR]` lines in Vite output
- Local URL is accessible (5173 or incremented)
</acceptance_criteria>
</task>

<task id="5.3">
<title>Browser-verify all 5 routes render correctly</title>
<read_first>
- event-management-system/src/App.tsx
</read_first>
<action>
Open a browser and navigate to each route. Verify:

1. `http://localhost:5173/` — Events Landing page loads
   - Background should be near-black (#0A0A0F void)
   - Sidebar should be visible on left (260px wide, glass effect)
   - "Events" nav item should have violet text (#d0bcff) with glow dot

2. `http://localhost:5173/events/ideathon` — Event Dashboard loads
   - Back button visible in sidebar
   - Dashboard, Teams, Attendance, Tasks nav items visible
   - No "undefined" errors on screen

3. `http://localhost:5173/events/ideathon/teams` — Teams tab active
4. `http://localhost:5173/events/ideathon/attendance` — Attendance active
5. `http://localhost:5173/events/ideathon/tasks` — Tasks active

For each route that shows a "Cannot read properties of undefined" crash:
- Read the component file
- Identify the null access
- Add optional chaining (`?.`) or null guard (`if (!data) return null`)
</action>
<acceptance_criteria>
- All 5 routes render without white-screen React error overlay
- No `TypeError: Cannot read properties of undefined` in browser console
- Sidebar is visible on all routes
- Background is dark (not white)
- Active nav item changes color to #d0bcff when route is active
</acceptance_criteria>
</task>

<task id="5.4">
<title>Verify glassmorphism renders correctly in DevTools</title>
<read_first>
- event-management-system/src/components/Sidebar.css
</read_first>
<action>
Open browser DevTools (F12). Inspect the sidebar element (aside.sidebar):

1. Computed Styles must show:
   - `backdrop-filter: blur(16px)` — glass blur effect
   - `border-right: 1px solid rgba(73, 68, 84, 0.15)` — ghost border
   - `background: rgba(19, 19, 24, 0.85)` or similar dark transparent

2. Inspect an active nav item (sidebar__nav-item--active):
   - `color: rgb(208, 188, 255)` — violet primary
   - `::after` pseudo-element should be present (4px violet dot)

3. Inspect body element:
   - `background-color: rgb(10, 10, 15)` — void #0A0A0F

If backdrop-filter is not applying (some browsers need vendor prefix):
Add to Sidebar.css:
```css
.sidebar {
  -webkit-backdrop-filter: blur(var(--glass-blur));
  backdrop-filter: blur(var(--glass-blur));
}
```
</action>
<acceptance_criteria>
- DevTools shows `backdrop-filter: blur` on .sidebar (not empty/none)
- Body background-color is #0a0a0f (10, 10, 15 in RGB)
- Active nav item color is rgb(208, 188, 255)
- No CSS parse errors in DevTools console
</acceptance_criteria>
</task>

<task id="5.5">
<title>Commit verified Phase 1 foundation to git</title>
<read_first>
- event-management-system/.gitignore
</read_first>
<action>
Once all 5 route tests pass and TypeScript compiles clean:

```bash
cd "event-management-system"
git add -A
git commit -m "feat: Phase 1 — Foundation & Design System complete

- Vite + React + TypeScript scaffold verified
- Nocturne Framework design tokens in index.css
- AppShell two-column layout with ambient orb effects
- Sidebar: Glow-Dot navigation, glass morphism, amber event badge
- Firebase config with IS_FIREBASE_CONFIGURED safety check
- All 5 routes render (demo mode with local Zustand state)
- TypeScript compiles with zero errors"
```

Note: Only commit the `event-management-system/` code. Do NOT commit `.env` (has real credentials).
</action>
<acceptance_criteria>
- `git status` shows clean working tree after commit
- Commit message starts with `feat: Phase 1`
- `.env` is NOT in the commit (it's gitignored)
- `.env.example` IS in the commit
</acceptance_criteria>
</task>

## must_haves
- `npx tsc --noEmit` exits with 0 errors
- `npm run dev` starts without errors
- All 5 routes render without React error overlay (white screen of death)
- Background is #0A0A0F void (verifiable in DevTools)
- Sidebar backdrop-filter: blur(16px) is active (verifiable in DevTools)
- Active nav item shows primary violet color + glow dot (no pill background)
- Git commit captured with all Phase 1 changes
