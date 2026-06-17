# REQUIREMENTS.md — FestFlow v1.0

## v1 Requirements

### EVENTS — Event Management

- [ ] **FEAT-01**: Admin can view all events in a grid/card layout on the landing page
- [ ] **FEAT-02**: Admin can create a new event with name and basic details
- [ ] **FEAT-03**: Admin can navigate into an event to see its full dashboard
- [ ] **FEAT-04**: Admin can delete or archive an event

### DASH — Event Dashboard

- [ ] **DASH-01**: Dashboard shows an animated progress ring (% of tasks complete)
- [ ] **DASH-02**: Dashboard shows a to-do checklist (HOD approval, Theme PPT, Meeting Announcement, etc.)
- [ ] **DASH-03**: Dashboard shows a task allotment panel (poster, sponsor list, volunteer recruitment)
- [ ] **DASH-04**: Dashboard has quick-access sidebar links (Attendance, Teams, Upcoming Features)

### TEAM — Team Management

- [ ] **TEAM-01**: Admin can create a new team within an event (e.g., Sponsorship, Registration, Design)
- [ ] **TEAM-02**: Admin can assign team heads (lead roles) to a team
- [ ] **TEAM-03**: Admin can add/remove members from a team
- [ ] **TEAM-04**: Teams page shows tabs for switching between all teams in an event
- [ ] **TEAM-05**: Each team shows member attendance summary (e.g., 4/6 meetings attended)
- [ ] **TEAM-06**: Each team shows its task checklist (registration workflow, follow-up, etc.)

### ATT — Attendance Tracking

- [ ] **ATT-01**: Admin can record meeting attendance for a team (mark present/absent per member)
- [ ] **ATT-02**: Attendance view shows all team members with input fields for ideas/notes
- [ ] **ATT-03**: Attendance view shows absentees from the last meeting
- [ ] **ATT-04**: Admin can add individual ideas/inputs per member during a meeting session
- [ ] **ATT-05**: Each session is timestamped and stored as a meeting record

### TASK — Task & Planning

- [ ] **TASK-01**: Admin can view tasks in Today / Weekly / Monthly timeline tabs
- [ ] **TASK-02**: Admin can create tasks and assign them to a specific team or the overall event
- [ ] **TASK-03**: Tasks have a status (pending / in-progress / done)
- [ ] **TASK-04**: Discussion points and ideas can be recorded in a dedicated section

### UI — Design & Experience

- [ ] **UI-01**: All pages have dark glassmorphism backgrounds with premium gradient accents
- [ ] **UI-02**: Sidebar navigation with event name context displayed
- [ ] **UI-03**: Smooth micro-animations on card hover, progress ring, and page transitions
- [ ] **UI-04**: Fully responsive for desktop use (primary device for admin)

---

## v2 Requirements (Deferred)

- Multi-admin access with invite links
- Email digest of weekly task progress
- Event calendar/timeline view
- Export attendance as CSV/PDF
- Notification banners for overdue tasks

---

## Out of Scope (v1)

- **Multi-user auth / RBAC** — Solo admin only, no login system needed
- **Mobile app** — Web dashboard is sufficient for admin use
- **Payment / registration forms** — Handled separately outside this tool
- **External calendar sync (Google Calendar)** — Not needed for v1
- **Public-facing event pages** — Internal admin tool only
- **Analytics / reporting dashboard** — Could be v2

---

## Traceability

| REQ-ID | Phase | Status |
|--------|-------|--------|
| FEAT-01 to FEAT-04 | Phase 2 | ○ Pending |
| DASH-01 to DASH-04 | Phase 3 | ○ Pending |
| TEAM-01 to TEAM-06 | Phase 4 | ○ Pending |
| ATT-01 to ATT-05 | Phase 5 | ○ Pending |
| TASK-01 to TASK-04 | Phase 6 | ○ Pending |
| UI-01 to UI-04 | Phase 1 + Phase 7 | ○ Pending |
