---
wave: 2
plan: 03-design-system-audit
depends_on: [01-verify-scaffold]
files_modified:
  - event-management-system/src/index.css
  - event-management-system/src/layouts/AppShell.css
autonomous: true
requirements: [UI-01, UI-04]
---

## Goal
Audit and complete `index.css` design tokens against the Nocturne Framework UI-SPEC. Create or fix `AppShell.css` so the two-column layout (sidebar + main) renders correctly with the void background and ambient gradient orbs.

## Context
`index.css` was generated in a previous session with 538 lines and appears complete. This plan verifies every critical token is present, then ensures `AppShell.css` provides the correct layout shell.

## Tasks

<task id="3.1">
<title>Audit index.css for all required Nocturne Framework tokens</title>
<read_first>
- event-management-system/src/index.css
- event-management-system/.planning/phases/01-foundation-design-system/01-UI-SPEC.md
</read_first>
<action>
Read index.css. Verify these exact CSS custom properties exist in `:root {}`:

**Surface tokens (must all exist):**
- `--bg-void: #0A0A0F`
- `--bg-surface: #131318`
- `--bg-container-lowest: #0e0e13`
- `--bg-container-low: #1b1b20`
- `--bg-container: #1f1f25`
- `--bg-container-high: #2a292f`
- `--bg-container-highest: #35343a`

**Primary tokens:**
- `--primary: #d0bcff`
- `--primary-container: #a078ff`
- `--primary-dim: #8B5CF6`

**Tertiary:**
- `--tertiary: #ffb869`

**Glass tokens:**
- `--glass-bg: rgba(53, 52, 58, 0.35)`
- `--glass-border: rgba(73, 68, 84, 0.15)`
- `--glass-blur: 16px`

**Sidebar dimension:**
- `--sidebar-width: 260px`

For any missing token, ADD it to the `:root {}` block in index.css.

Also verify body has `background-color: var(--bg-void)` (NOT `var(--bg-surface)`).
</action>
<acceptance_criteria>
- `grep "--bg-void: #0A0A0F" src/index.css` matches
- `grep "--glass-bg:" src/index.css` matches
- `grep "--sidebar-width:" src/index.css` matches
- `grep "background-color: var(--bg-void)" src/index.css` matches
- body background is --bg-void (#0A0A0F), not white or grey
</acceptance_criteria>
</task>

<task id="3.2">
<title>Create or fix AppShell.css with correct layout and ambient effects</title>
<read_first>
- event-management-system/src/layouts/AppShell.tsx
- event-management-system/src/layouts/AppShell.css (read if exists)
</read_first>
<action>
Create or completely replace `event-management-system/src/layouts/AppShell.css` with:

```css
/* AppShell.css — Two-column layout wrapper */

.app-shell {
  display: flex;
  min-height: 100vh;
  background-color: var(--bg-void);
  position: relative;
  overflow: hidden;
}

/* Main content area */
.app-shell__main {
  flex: 1;
  margin-left: var(--sidebar-width);
  min-height: 100vh;
  position: relative;
  z-index: 1;
  overflow-y: auto;
}

.app-shell__content {
  padding: var(--space-3xl) var(--space-2xl);
  max-width: 1440px;
}

/* Ambient gradient orbs — violet tinted atmospheric light */
.app-shell__bg-effects {
  position: fixed;
  inset: 0;
  pointer-events: none;
  z-index: 0;
  overflow: hidden;
}

.bg-orb {
  position: absolute;
  border-radius: 50%;
  filter: blur(120px);
  opacity: 0.06;
}

.bg-orb--purple {
  width: 600px;
  height: 600px;
  background: radial-gradient(circle, #8B5CF6 0%, transparent 70%);
  top: -200px;
  right: 100px;
}

.bg-orb--blue {
  width: 500px;
  height: 500px;
  background: radial-gradient(circle, #4338CA 0%, transparent 70%);
  bottom: -150px;
  left: 200px;
}

/* Responsive */
@media (max-width: 1280px) {
  .app-shell__main {
    margin-left: var(--sidebar-width);
  }
}

@media (max-width: 768px) {
  .app-shell__main {
    margin-left: 0;
    padding-bottom: 80px; /* space for bottom nav if added */
  }
}
```
</action>
<acceptance_criteria>
- AppShell.css exists at src/layouts/AppShell.css
- File contains `.app-shell {`
- File contains `margin-left: var(--sidebar-width)`
- File contains `.bg-orb--purple {`
- File contains `filter: blur(120px)`
</acceptance_criteria>
</task>

<task id="3.3">
<title>Add missing animation keyframes if absent from index.css</title>
<read_first>
- event-management-system/src/index.css
</read_first>
<action>
Read index.css. Verify these keyframes exist (search for `@keyframes`):
- `fadeIn`
- `fadeInUp`
- `fadeInScale`
- `ringProgress`
- `shimmer`

Also verify these animation utility classes exist:
- `.animate-fadeIn`
- `.animate-fadeInUp`
- `.animate-fadeInScale`
- `.page-enter`

If `ringProgress` keyframe is missing, add it:
```css
@keyframes ringProgress {
  from { stroke-dashoffset: var(--ring-circumference); }
  to { stroke-dashoffset: var(--ring-offset); }
}
```

If stagger classes are missing:
```css
.stagger-1 { animation-delay: 50ms; }
.stagger-2 { animation-delay: 100ms; }
.stagger-3 { animation-delay: 150ms; }
.stagger-4 { animation-delay: 200ms; }
.stagger-5 { animation-delay: 250ms; }
.stagger-6 { animation-delay: 300ms; }
```
</action>
<acceptance_criteria>
- `grep "@keyframes fadeInUp" src/index.css` matches
- `grep "@keyframes ringProgress" src/index.css` matches
- `grep ".animate-fadeInUp" src/index.css` matches
- `grep ".page-enter" src/index.css` matches
- `grep ".stagger-1" src/index.css` matches
</acceptance_criteria>
</task>

## must_haves
- All 7 surface tokens present in :root with exact hex values
- body background is var(--bg-void) = #0A0A0F (verifiable in browser DevTools)
- AppShell.css exists with flex layout: sidebar fixed-width + main flex:1
- Ambient purple orbs rendered (opacity 0.06, blur 120px) — atmospheric, not garish
- All animation keyframes present including ringProgress for Phase 3 SVG ring
