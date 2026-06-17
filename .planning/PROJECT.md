# FestFlow — College Fest Event Management System

## What This Is

FestFlow is a solo-admin SaaS dashboard for managing college fest events end-to-end. The admin can create and oversee multiple events (e.g., Ideathon, Samarthya), manage teams, take meeting attendance, track tasks, record discussion ideas, and monitor overall event progress — all from a single premium interface.

## Core Value

Every aspect of a college fest — from sponsorship follow-ups to volunteer attendance — visible and actionable in one place, so nothing falls through the cracks.

## Requirements

### Validated

(None yet — ship to validate)

### Active

- [ ] Admin can view all events on a landing grid and create new ones
- [ ] Each event has a dashboard with progress ring, to-do list, and task allotment
- [ ] Admin can create and manage teams (sponsorship, registration, design, core-committee, marketing)
- [ ] Each team has designated heads and members
- [ ] Admin can take attendance for team meetings and record absentees
- [ ] Admin can capture individual member ideas/inputs during meetings
- [ ] Admin can assign task checklists to each team
- [ ] Tasks are viewable in Today/Weekly/Monthly timelines
- [ ] Discussion points can be recorded per meeting

### Out of Scope

- Multi-user login / role-based access — admin-only, no auth system
- Email/push notifications — out for v1
- Mobile app — web only
- External calendar integrations — not needed for college context
- Payment/registration portals — separate system

## Context

- **User:** Single admin (college fest organizer / student lead)
- **Scale:** 2-5 concurrent college events, 5-10 teams per event, 5-30 members per team
- **Data:** Firebase Firestore (real-time, cloud, free tier sufficient)
- **Design DNA:** Apple minimalism + glassmorphism + dark premium gradients
- **Reference:** Wireframe sketches show 5 core views (Events Landing, Event Dashboard, Attendance, Teams, Tasks)
- **Existing work:** Previous event-manager-backend (Express/Supabase) — not carried forward; fresh greenfield build

## Constraints

- **Tech Stack:** React + TypeScript + Vite (reliable, proven, no surprises)
- **Database:** Firebase Firestore only — no custom backend server
- **Auth:** None required — single admin, URL-based access, manual audit
- **Design:** Must replicate Apple-grade quality — glassmorphism, smooth animations, curated palette
- **Deployment:** Firebase Hosting (free tier)

## Key Decisions

| Decision | Rationale | Outcome |
|---|---|---|
| React + TS + Vite over Next.js | Simpler, no SSR complexity, fast dev server, proven in GYM dashboard | — Pending |
| Firebase Firestore over Supabase | Real-time by default, no backend server, single SDK for DB + hosting | — Pending |
| No auth system | Admin-only tool, manual audit, complexity not justified | — Pending |
| Custom CSS glassmorphism over UI library | Apple-grade control, no pre-styled component limitations | — Pending |
| Stitch MCP for UI design | Generate premium screen designs before coding for design accuracy | — Pending |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition:**
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone:**
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-04-12 after initialization*
