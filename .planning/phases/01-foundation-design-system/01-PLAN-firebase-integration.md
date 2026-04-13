---
wave: 1
plan: 02-firebase-integration
depends_on: []
files_modified:
  - event-management-system/src/lib/firebase.ts
  - event-management-system/.env
  - event-management-system/.env.example
autonomous: false
requirements: [UI-04]
---

## Goal
Set up real Firebase credentials so Firestore reads/writes work. Verify the Firebase connection is live. Since the .env currently has placeholder values, the admin must provide real credentials.

## Context
`src/lib/firebase.ts` is already correctly structured. The only blocker is placeholder values in `.env`. This plan ensures Firebase connects successfully before any Firestore data work begins in later phases.

## Tasks

<task id="2.1">
<title>Create .env.example with correct variable names</title>
<read_first>
- event-management-system/.env
</read_first>
<action>
Create `event-management-system/.env.example` as a reference template:

```env
# FestFlow Firebase Configuration
# Copy this file to .env and fill in your Firebase project values
# Get these from: Firebase Console → Project Settings → Your apps → Web app

VITE_FIREBASE_API_KEY=your-api-key-here
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
VITE_FIREBASE_APP_ID=your-app-id
```

Verify `.gitignore` contains `.env` (do NOT commit real credentials).
</action>
<acceptance_criteria>
- .env.example exists at event-management-system/.env.example
- .env.example contains `VITE_FIREBASE_API_KEY=`
- event-management-system/.gitignore contains `.env` (without .example)
</acceptance_criteria>
</task>

<task id="2.2">
<title>Harden firebase.ts with connection validation and graceful error handling</title>
<read_first>
- event-management-system/src/lib/firebase.ts
</read_first>
<action>
Replace the content of `src/lib/firebase.ts` with a hardened version that warns clearly when credentials are missing:

```typescript
import { initializeApp, FirebaseApp } from 'firebase/app';
import { getFirestore, Firestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

// Detect placeholder/missing config and warn clearly
const missingVars = Object.entries(firebaseConfig)
  .filter(([, v]) => !v || v === 'your-api-key-here' || v.includes('your-'))
  .map(([k]) => k);

if (missingVars.length > 0) {
  console.warn(
    `⚠️ FestFlow Firebase: Missing or placeholder config keys: ${missingVars.join(', ')}.\n` +
    'Copy .env.example to .env and fill in your Firebase project values.\n' +
    'App will run in demo mode (local state only, no persistence).'
  );
}

export const IS_FIREBASE_CONFIGURED = missingVars.length === 0;

let app: FirebaseApp;
let db: Firestore;

try {
  app = initializeApp(firebaseConfig);
  db = getFirestore(app);
} catch (e) {
  console.error('Firebase init failed — running in demo mode:', e);
}

export { app, db };
export default app;
```
</action>
<acceptance_criteria>
- firebase.ts exports `IS_FIREBASE_CONFIGURED` boolean
- firebase.ts contains `console.warn(` for missing config detection
- firebase.ts contains `try {` block around initializeApp
- firebase.ts exports `db` and `app`
</acceptance_criteria>
</task>

<task id="2.3">
<title>Add Firebase setup instructions to README.md</title>
<read_first>
- event-management-system/README.md
</read_first>
<action>
Replace the content of `event-management-system/README.md` with:

```markdown
# FestFlow — College Fest Event Management System

Premium glassmorphism admin dashboard for managing college fest events, teams, attendance, and tasks.

## Stack
- **Frontend**: React 19 + TypeScript + Vite
- **State**: Zustand (local demo data)
- **Database**: Firebase Firestore (real-time persistence)
- **Hosting**: Firebase Hosting
- **Design**: Custom CSS — Obsidian Violet / Nocturne Framework

## Setup

### 1. Install dependencies
```bash
cd event-management-system
npm install
```

### 2. Configure Firebase
1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Create a project (or use existing)
3. Enable **Firestore Database** (start in test mode)
4. Go to **Project Settings → Your apps → Web app**
5. Copy the config values into `.env`:

```bash
cp .env.example .env
# Edit .env with your real Firebase values
```

### 3. Run dev server
```bash
npm run dev
```

App runs at `http://localhost:5173`

## Demo Mode
If Firebase is not configured, the app runs with local demo data (Ideathon + Samarthya events pre-loaded). No persistence — data resets on refresh.

## Project Structure
```
src/
  components/      # Shared UI (GlassCard, Sidebar)
  features/        # Page modules (events, dashboard, teams, attendance, tasks)
  layouts/         # AppShell (sidebar + main content wrapper)
  lib/             # Firebase config
  store/           # Zustand global state
  types/           # TypeScript interfaces
  index.css        # Design system tokens (Nocturne Framework)
```
```
</action>
<acceptance_criteria>
- README.md contains `## Setup`
- README.md contains `Firebase Console`
- README.md contains `npm run dev`
- README.md contains `Demo Mode`
</acceptance_criteria>
</task>

## must_haves
- .env.example exists with all 6 VITE_FIREBASE_* variable names
- firebase.ts has IS_FIREBASE_CONFIGURED export
- firebase.ts warns clearly (not crashes) when credentials are placeholders
- README.md has Firebase setup steps
