# ROADMAP.md — FestFlow v1.0

## Summary: 7 Phases | 25 Requirements | Ready to Build ✓

| # | Phase | Goal | Requirements | Status |
|---|-------|------|--------------|--------|
| 1 | Foundation & Design System | Vite + React + TS + Firebase + routing shell + CSS design tokens | UI-01, UI-02, UI-04 | ○ Pending |
| 2 | Events Landing Page | Grid of events + create event flow | FEAT-01, FEAT-02, FEAT-03, FEAT-04 | ○ Pending |
| 3 | Event Dashboard | Progress ring, to-do list, task allotment widgets | DASH-01, DASH-02, DASH-03, DASH-04 | ○ Pending |
| 4 | Teams Module | Create/edit teams, assign heads/members, task checklists | TEAM-01, TEAM-02, TEAM-03, TEAM-04, TEAM-05, TEAM-06 | ○ Pending |
| 5 | Attendance Module | Meeting attendance, member inputs, absentee tracking | ATT-01, ATT-02, ATT-03, ATT-04, ATT-05 | ○ Pending |
| 6 | Tasks & Ideas Module | Today/Weekly/Monthly task views, discussion points | TASK-01, TASK-02, TASK-03, TASK-04 | ○ Pending |
| 7 | Polish & Deployment | Glassmorphism refinements, animations, Firebase Hosting | UI-03 | ○ Pending |

---

## Phase Details

### Phase 1: Foundation & Design System
**Goal:** Scaffold the project with all tooling, routing, Firebase, and the complete design token system.

**Requirements:** UI-01, UI-02, UI-04

**Plans:**
1. Vite + React + TypeScript project init with ESLint + Prettier
2. Firebase SDK integration (Firestore config, environment variables)
3. React Router v6 route structure (/, /events/:id, /events/:id/attendance, /events/:id/teams, /events/:id/tasks)
4. CSS design system (CSS custom properties: colors, glass tokens, spacing, typography, animations)
5. AppShell layout component with sidebar navigation

**Success Criteria:**
1. `npm run dev` serves the app with no errors
2. Firebase connection verified (test write/read)
3. All routes resolve to placeholder pages
4. Design tokens applied — background is #131318, sidebar renders in glassmorphism style

**UI hint**: yes
**Design reference:** Stitch project `15802347574222396078` — Obsidian Violet design system

---

### Phase 2: Events Landing Page
**Goal:** Admin can see all events in a grid and create new ones.

**Requirements:** FEAT-01, FEAT-02, FEAT-03, FEAT-04

**Plans:**
1. Firestore data model for events collection
2. Events grid UI with glass cards (Stitch screen: `01274608a8c64fd3bfda616fe26dfd36`)
3. "New Event" creation modal/form
4. Event card navigation to event detail

**Success Criteria:**
1. Events grid renders with glass cards matching Stitch design
2. "+ New Event" opens a creation form
3. Created event appears in grid immediately (real-time Firestore)
4. Clicking an event card navigates to its dashboard

**UI hint**: yes

---

### Phase 3: Event Dashboard
**Goal:** Per-event overview with animated progress ring, to-do checklist, and task allotment panel.

**Requirements:** DASH-01, DASH-02, DASH-03, DASH-04

**Plans:**
1. Progress ring SVG component (animated stroke-dashoffset)
2. To-do list CRUD with Firestore persistence
3. Task allotment checklist component
4. Quick-access sidebar links panel

**Success Criteria:**
1. Progress ring animates on mount and reflects actual completion percentage
2. To-do items persist to Firestore on toggle
3. Task allotment panel renders correctly
4. Sidebar quick-links navigate to correct sub-pages

**UI hint**: yes
**Design reference:** Stitch screen `c46dcbad9cde49ba8d1d529fefaa7ab3`

---

### Phase 4: Teams Module
**Goal:** Full team CRUD — create teams, assign heads and members, view per-team task checklists.

**Requirements:** TEAM-01, TEAM-02, TEAM-03, TEAM-04, TEAM-05, TEAM-06

**Plans:**
1. Teams Firestore data model (subcollection under event)
2. Team tab bar UI + team detail panel
3. Add/remove heads and members CRUD forms
4. Team task checklist component with Firestore sync
5. Attendance fraction display per member

**Success Criteria:**
1. Can create a team (e.g., "Sponsorship") within an event
2. Can add heads and members to a team
3. Team tab bar switches between teams correctly
4. Task checklist persists to Firestore
5. Attendance fractions display correctly (pulled from ATT records)

**UI hint**: yes
**Design reference:** Stitch screen `fb1837bafd8f4bd59526f388db79a0fe`

---

### Phase 5: Attendance Module
**Goal:** Admin can take meeting attendance, record individual ideas/inputs, and see absentee history.

**Requirements:** ATT-01, ATT-02, ATT-03, ATT-04, ATT-05

**Plans:**
1. Attendance Firestore data model (meetings subcollection)
2. Attendance table UI with present/absent toggle per member
3. Per-member idea/input text field with save
4. Last meeting absentees panel
5. Meeting session create/close flow

**Success Criteria:**
1. Admin can start a meeting session for a team
2. Each member row has present/absent toggle + idea input
3. Saved attendance persists to Firestore
4. "Last Meeting Absentees" panel shows names from previous session
5. Attendance fractions in Teams module update correctly

**UI hint**: yes

---

### Phase 6: Tasks & Ideas Module
**Goal:** Task management with timeline views (Today/Weekly/Monthly) and a discussion/ideas capture panel.

**Requirements:** TASK-01, TASK-02, TASK-03, TASK-04

**Plans:**
1. Tasks Firestore data model (with date + assignee + status fields)
2. Tasks list UI with Today/Weekly/Monthly timeline tabs
3. Task creation form with team assignment
4. Ideas & Discussion Points panel with CRUD

**Success Criteria:**
1. Tasks panel renders with correct timeline filtering
2. Can create a task and assign to a team
3. Task status toggle (pending/in-progress/done) persists
4. Discussion points can be added and displayed in the Ideas panel

**UI hint**: yes

---

### Phase 7: Polish & Deployment
**Goal:** Production-quality glassmorphism animations, micro-interactions, and Firebase Hosting deployment.

**Requirements:** UI-03

**Plans:**
1. CSS Animation pass — progress ring, card hover lift, page fade transitions
2. Micro-interaction polish — checkbox animations, tab switching, form inputs
3. Performance audit (lazy loading routes, Firestore query optimization)
4. Firebase Hosting deployment + custom domain setup

**Success Criteria:**
1. All page transitions animate smoothly (fade + slide)
2. Progress ring animates on mount
3. Card hover states trigger lift + glow
4. App deployed at Firebase Hosting URL, accessible in browser
5. Lighthouse score ≥ 85 performance

---

## Stitch MCP UI Design Assets

| Screen | Stitch Screen ID | Design Status |
|--------|-----------------|---------------|
| Events Landing | `01274608a8c64fd3bfda616fe26dfd36` | ✓ Generated |
| Event Dashboard | `c46dcbad9cde49ba8d1d529fefaa7ab3` | ✓ Generated |
| Teams | `fb1837bafd8f4bd59526f388db79a0fe` | ✓ Generated |
| Attendance | *(from step 142)* | ✓ Generated |
| Tasks | *(from step 143)* | ✓ Generated |

**Stitch Project:** `15802347574222396078`
**Design System:** Obsidian Violet (auto-generated) — dark #131318, violet #8B5CF6

---

## Tech Stack (Locked)

| Layer | Technology | Rationale |
|-------|-----------|-----------|
| Frontend Framework | React 18 + TypeScript | Reliable, typed, proven |
| Build Tool | Vite | Fast, zero-config, no CRA baggage |
| Routing | React Router v6 | Standard, nested routes |
| State | Zustand | Simple, no Redux boilerplate |
| Database | Firebase Firestore | Real-time, no backend, free tier |
| Hosting | Firebase Hosting | Same SDK, seamless |
| Styling | Custom CSS (CSS variables) | Full glassmorphism control |
| Animation | CSS transitions + SVG | Lightweight, GPU-accelerated |
| Icons | Lucide React | Clean, minimal, consistent |
