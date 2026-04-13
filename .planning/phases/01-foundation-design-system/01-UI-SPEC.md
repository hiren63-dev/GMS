# UI-SPEC: Phase 1 — Foundation & Design System

**Phase:** 1 — Foundation & Design System
**Date:** 2026-04-13
**Stitch Project:** `15802347574222396078`
**Design System:** FestFlow Obsidian / "The Nocturne Framework"
**Screen Generated:** AppShell sidebar — `e9c4133994e44ba7a230fb90966e507b`

---

## Design North Star

> "Build an atmosphere, not a dashboard."
> Quiet, focused, and profoundly professional — like a high-end physical studio at night.

This phase establishes the design token foundation that ALL future phases must inherit. Zero deviations.

---

## Color Tokens (Locked)

| Token | Value | Role |
|-------|-------|------|
| `--bg-void` | `#0A0A0F` | Page background (deepest) |
| `--bg-surface` | `#131318` | Primary content surface |
| `--bg-container-lowest` | `#0e0e13` | Input fills, deepest cards |
| `--bg-container-low` | `#1b1b20` | Section containers |
| `--bg-container` | `#1f1f25` | Standard card background |
| `--bg-container-high` | `#2a292f` | Elevated cards, modals |
| `--bg-container-highest` | `#35343a` | Highest priority interactive |
| `--bg-surface-bright` | `#39383e` | Hover states |
| `--primary` | `#d0bcff` | Active text, interactive |
| `--primary-container` | `#a078ff` | CTA gradient end |
| `--primary-dim` | `#8B5CF6` | Violet pulse, glow dot |
| `--primary-deep` | `#7C3AED` | Deep violet |
| `--tertiary` | `#ffb869` | Amber accent — use sparingly |
| `--text-primary` | `#e4e1e9` | Main body text |
| `--text-secondary` | `#cbc3d7` | Secondary text |
| `--text-muted` | `#958ea0` | Inactive nav, captions |
| `--text-dim` | `#6B7280` | Micro text, timestamps |
| `--outline-variant` | `#494454` | Ghost border base |
| `--success` | `#10B981` | Task complete, attended |
| `--error` | `#ffb4ab` | Absent, error states |

---

## Glass Tokens (Locked)

```css
--glass-bg: rgba(53, 52, 58, 0.35);
--glass-bg-hover: rgba(53, 52, 58, 0.55);
--glass-border: rgba(73, 68, 84, 0.15);       /* Ghost border — 15% opacity */
--glass-border-hover: rgba(73, 68, 84, 0.35);
--glass-blur: 16px;
--glass-blur-heavy: 24px;
```

---

## Typography

- **Primary font:** `Inter` (body, labels, UI text)
- **Display font:** `Inter` with `font-weight: 800`, `letter-spacing: -0.03em`
- **Import:** `https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800`

| Scale | Size | Weight | Tracking | Usage |
|-------|------|--------|----------|-------|
| Display | 2.5rem | 800 | -0.03em | Hero headings |
| Headline | 1.75rem | 700 | -0.02em | Section headers |
| Title | 1.25rem | 600 | -0.01em | Card headers |
| Body | 0.875rem | 400 | 0 | Standard text |
| Label | 0.75rem | 500 | +0.05em | Metadata (UPPERCASE) |
| Micro | 0.6875rem | 400 | 0 | Timestamps, dim text |

---

## Elevation Hierarchy (No Dividers Rule)

The **No-Line Rule** is mandatory: **zero** 1px solid borders for structure. Boundaries defined by tonal shifts only.

```
Layer 0: --bg-void (#0A0A0F)       ← Page root
  Layer 1: --bg-surface (#131318)  ← App shell, sidebar
    Layer 2: --bg-container-low    ← Sections
      Layer 3: --bg-container-high ← Cards
        Layer 4: glass-heavy       ← Modals, overlays
```

**Ghost Border:** `0.5px solid rgba(73, 68, 84, 0.15)` — felt, not seen.

---

## Shadows (Violet-Tinted Aura — No Black Shadows)

```css
--shadow-sm:   0 2px 16px rgba(139, 92, 246, 0.04);
--shadow-md:   0 4px 24px rgba(139, 92, 246, 0.06);
--shadow-lg:   0 8px 40px rgba(139, 92, 246, 0.08);
--shadow-glow: 0 0 20px rgba(139, 92, 246, 0.15);
```

---

## Spacing & Radius

```css
/* Spacing */
--space-xs: 4px;   --space-sm: 8px;    --space-md: 12px;
--space-lg: 16px;  --space-xl: 24px;   --space-2xl: 32px;
--space-3xl: 48px; --space-4xl: 64px;

/* Radius — nothing below sm */
--radius-sm: 8px;   --radius-md: 12px;
--radius-lg: 16px;  --radius-xl: 24px;  --radius-full: 9999px;
```

---

## Transitions

```css
--transition-fast:   150ms cubic-bezier(0.4, 0, 0.2, 1);
--transition-base:   200ms cubic-bezier(0.4, 0, 0.2, 1);
--transition-slow:   300ms cubic-bezier(0.4, 0, 0.2, 1);
--transition-spring: 500ms cubic-bezier(0.34, 1.56, 0.64, 1);
```

---

## AppShell Layout

```
┌─────────────────────────────────────────────────────────┐
│  Sidebar (260px)  │         Main Content Area           │
│   [glass-static]  │         [bg-void background]        │
│                   │                                     │
│  FestFlow ●       │                                     │
│                   │                                     │
│  ○ Dashboard      │                                     │
│  ● Events   •     │   <-- "●" = active, "•" = glow dot  │
│  ○ Teams          │                                     │
│  ○ Attendance     │                                     │
│  ○ Tasks          │                                     │
│                   │                                     │
│  ─────────────    │                                     │
│  [Ideathon] 🔶    │                                     │
└─────────────────────────────────────────────────────────┘
```

### Sidebar Specs
- **Width:** `260px` (collapsed: `72px`)
- **Background:** `--glass-bg` (`rgba(53, 52, 58, 0.35)`)
- **Blur:** `backdrop-filter: blur(16px)`
- **Border-right:** `1px solid rgba(73, 68, 84, 0.15)` (ghost)
- **Position:** Fixed left, full height

### Nav Item States
| State | Text Color | Indicator |
|-------|-----------|-----------|
| Active | `--primary` (#d0bcff) | 4px violet dot below label (box-shadow glow) |
| Inactive | `--text-muted` (#958ea0) | No indicator |
| Hover | `--text-secondary` | `surface_bright` at 5% opacity background |

**NO pill backgrounds. NO underlines. Only the glow dot.**

### Event Context Badge (bottom of sidebar)
- Shows current event name (e.g., "Ideathon")
- Background: `rgba(255, 184, 105, 0.10)` (amber 10%)
- Border: `rgba(255, 184, 105, 0.20)`
- Text: `--tertiary` (#ffb869)
- Radius: `--radius-full`

---

## Route Structure

```
/                           → Events Landing (Phase 2)
/events/:eventId            → Event Dashboard (Phase 3)
/events/:eventId/teams      → Teams Module (Phase 4)
/events/:eventId/attendance → Attendance Module (Phase 5)
/events/:eventId/tasks      → Tasks Module (Phase 6)
```

---

## Component Utilities to Implement

### `.glass` (interactive glass card)
```css
background: var(--glass-bg);
backdrop-filter: blur(16px);
border: 1px solid var(--glass-border);
border-radius: var(--radius-lg);
box-shadow: var(--shadow-md);
transition: all var(--transition-base);
/* hover: glass-bg-hover, glass-border-hover, shadow-lg */
```

### `.glass-static` (non-interactive glass)
Same as above but no hover states.

### `.glass-heavy` (modals, overlays)
```css
background: rgba(53, 52, 58, 0.55);
backdrop-filter: blur(24px);
border-radius: var(--radius-xl);
```

### `.btn-primary`
```css
background: linear-gradient(135deg, #8B5CF6, #a078ff);
box-shadow: 0 2px 12px rgba(139, 92, 246, 0.3);
/* hover: translateY(-1px), stronger glow */
```

### `.btn-secondary`
```css
background: var(--glass-bg);
backdrop-filter: blur(16px);
border: 1px solid var(--glass-border);
```

---

## Animations Required

```css
@keyframes fadeIn        { 0% → opacity:0 | 100% → opacity:1 }
@keyframes fadeInUp      { 0% → opacity:0 + translateY(16px) | 100% → visible }
@keyframes fadeInScale   { 0% → scale(0.96) opacity:0 | 100% → scale(1) opacity:1 }
@keyframes slideInRight  { 0% → translateX(-20px) opacity:0 | 100% → visible }
@keyframes ringProgress  { stroke-dashoffset animation for SVG progress ring }
@keyframes shimmer       { skeleton loading shimmer }
```

Stagger classes: `.stagger-1` through `.stagger-6` (50ms increments)

---

## Stitch Screen Reference

| Screen | ID | Purpose |
|--------|----|---------| 
| AppShell + Sidebar | `e9c4133994e44ba7a230fb90966e507b` | Layout shell, nav design |

**Screenshot URL:** `https://lh3.googleusercontent.com/aida/ADBb0ujTzfAIJGflxwXZzAQ9IwRCnEwRJj5VIO7PXt0s5GqsMHAmkIZ4yMFBOsBkR1xg4MjR79S4XnIiK2K37gDqm2OesxJmw6ciL51cgIUbNPF9JPjGlVFQJF5DLbozSD4GX4WsbetRcSm1FlgwtKeh0_eV5wQOyQUf89MZwvY_MpcI5bzxzL2mvOYnxaa_Zm2md46U92dTWQ-6AvR8lbWIt7STcaRPNQBPHgjpVTBGAh9NIa4EyrzCQLwXhfGJ`

---

## Firebase Config

The app uses Firebase Firestore (no backend server).

```typescript
// src/lib/firebase.ts
import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  // values from .env: VITE_FIREBASE_*
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

export const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
```

---

## Quality Gates

The implementation in Phase 1 is verified when:

1. `npm run dev` serves with no console errors
2. Background is `#0A0A0F` void — **not white, not grey**  
3. Sidebar renders with glassmorphism (inspect: `backdrop-filter: blur(16px)` in DevTools)
4. All 5 routes resolve to placeholder pages without 404
5. Active nav item has violet `#d0bcff` text + glow dot indicator
6. Zero 1px solid dividers for layout structure (ghost borders only)
7. Firebase test write + read succeeds from the UI
8. Zustand store scaffold present (`useEventStore.ts`)

---

## Implementation Constraints

- **No Tailwind** — Custom CSS only (`index.css` + component `.css` files)
- **No UI component libraries** — Build from scratch for Apple-grade control
- **TypeScript strict** — All components typed
- **React Router v6** — Nested routes with layout wrapping
- **Zustand** — State management (no Redux)
- **Lucide React** — Icons (consistent, minimal)

---

*Phase 1 UI-SPEC generated: 2026-04-13*
*Design system: FestFlow Obsidian / Nocturne Framework*
*Stitch project: 15802347574222396078*
