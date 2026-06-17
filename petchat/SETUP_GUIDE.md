# 🐕 PetChat - Complete Setup Guide

Welcome! This guide will take you through **Firebase setup** → **Running the app** → **Deploying to Vercel**.

---

## **PART 1: FIREBASE SETUP (15 minutes)**

### Step 1.1 — Create Firebase Project

1. Go to **[firebase.google.com](https://firebase.google.com)**
2. Click **"Get Started"** → Sign in with your Google account
3. Click **"Create a project"**
4. Enter project name: `petchat` (or any name)
5. Uncheck **"Enable Google Analytics"** (not needed)
6. Click **"Create Project"** and wait ~1 minute

### Step 1.2 — Enable Firestore Database

1. In Firebase console, on the left sidebar, click **"Build"** → **"Firestore Database"**
2. Click **"Create Database"**
3. Choose location:
   - **For India:** `asia-south1` (closest to you)
   - **For other locations:** Choose closest region
4. Security rules: Select **"Start in test mode"** (we'll secure it later)
5. Click **"Create"** and wait ~2 minutes

### Step 1.3 — Enable Authentication

1. Left sidebar: **"Build"** → **"Authentication"**
2. Click **"Get Started"**
3. Find **"Email/Password"** provider
4. Click on it → Toggle **"Enable"** → Click **"Save"**

### Step 1.4 — Get Your Firebase Config (CRITICAL!)

1. Go back to Firebase console **home page**
2. Click the **⚙️ gear icon** (top right) → **"Project Settings"**
3. Scroll down to **"Your apps"** section
4. You should see a web app icon. If not:
   - Click **"Add app"** → Select **"Web"** icon
   - App name: `petchat`
   - Click **"Register app"**
5. You'll see a code block with 6 values:

```javascript
const firebaseConfig = {
  apiKey: "AIzaSy...",
  authDomain: "petchat-xxxxx.firebaseapp.com",
  projectId: "petchat-xxxxx",
  storageBucket: "petchat-xxxxx.appspot.com",
  messagingSenderId: "1234567890",
  appId: "1:1234567890:web:abcdef123456"
};
```

**👉 COPY ALL 6 VALUES — You'll need them in Step 2.4**

---

## **PART 2: RUN THE APP LOCALLY (10 minutes)**

### Step 2.1 — Install Dependencies

Open PowerShell in the `petchat` folder and run:

```powershell
npm install
```

This installs React, Firebase, Tailwind, and all other dependencies. **Wait for it to finish** (~2-3 minutes).

### Step 2.2 — Create `.env.local` File

In the `petchat` folder, create a new file called `.env.local` (no extension):

```
VITE_FIREBASE_API_KEY=AIzaSy...
VITE_FIREBASE_AUTH_DOMAIN=petchat-xxxxx.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=petchat-xxxxx
VITE_FIREBASE_STORAGE_BUCKET=petchat-xxxxx.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=1234567890
VITE_FIREBASE_APP_ID=1:1234567890:web:abcdef123456
```

**Paste the 6 values from Step 1.4 above** (without quotes).

### Step 2.3 — Start Development Server

In PowerShell, run:

```powershell
npm run dev
```

You'll see:

```
VITE v5.0.0  ready in 123 ms

➜  Local:   http://localhost:3000/
```

Open **http://localhost:3000** in your browser. 🎉

### Step 2.4 — Test the App

1. **Go to Admin Dashboard:**
   - Click the **"📊"** button (top right)
   - You'll see a login form
   - **Create an admin account** in Firebase:
     - Go to Firebase Console → **"Authentication"**
     - Click **"Add user"**
     - Email: `admin@petchat.com`
     - Password: `password123` (you can change this)
     - Click **"Add user"**
   - Back in the app, login with that email/password

2. **Add Employees:**
   - Click **"+ Add Employee"**
   - Enter name, email, department
   - Click submit

3. **Back to Chat:**
   - Click **"Back"**
   - Select your name from dropdown
   - Click **"I'm Here"** button (logs you in)
   - Click **mascot (puppy)** in bottom-right
   - Select another employee to message
   - Type and send messages!

4. **Daily Check-In:**
   - Click **"Daily Check-In"** button
   - Fill out the 6 questions
   - Click **"Submit Check-In"**

---

## **PART 3: DEPLOY TO VERCEL (10 minutes)**

### Step 3.1 — Push Code to GitHub

1. Create a GitHub account (if you don't have one): [github.com](https://github.com)
2. Create a new repository called `petchat`
3. In PowerShell, in the petchat folder, run:

```powershell
git init
git add .
git commit -m "Initial PetChat commit"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/petchat.git
git push -u origin main
```

Replace `YOUR_USERNAME` with your actual GitHub username.

### Step 3.2 — Deploy on Vercel

1. Go to **[vercel.com](https://vercel.com)**
2. Sign up with GitHub
3. Click **"Import Project"**
4. Select your `petchat` repository
5. Click **"Import"**
6. On the next screen, add **Environment Variables:**
   - Click **"Environment Variables"**
   - Add all 6 Firebase values:
     - Key: `VITE_FIREBASE_API_KEY` → Value: `AIzaSy...`
     - Key: `VITE_FIREBASE_AUTH_DOMAIN` → Value: `petchat-xxxxx.firebaseapp.com`
     - etc.
7. Click **"Deploy"**
8. Wait ~2 minutes for deployment
9. You'll get a URL like: **`https://petchat-xxxxx.vercel.app`**

### Step 3.3 — Test on Vercel

Open your Vercel URL and test:
- ✅ Login as admin
- ✅ Add employees
- ✅ Send messages
- ✅ Submit check-ins

---

## **PART 4: SHARE WITH YOUR TEAM**

Share the Vercel URL with your team. They can:
1. Open the link
2. Select their name
3. Click "I'm Here"
4. Start chatting!

---

## **TROUBLESHOOTING**

### "Firebase config is not valid"
- Make sure `.env.local` file exists in the root `petchat` folder
- Restart the dev server: `Ctrl+C` then `npm run dev`

### "Email already exists"
- You're trying to create an admin account that already exists
- Use a different email or reset the user in Firebase Console

### "Messages not appearing"
- Check Firestore security rules:
  - Firebase Console → **"Firestore Database"** → **"Rules"** tab
  - Should allow all read/write (test mode)

### "Admin login not working"
- Make sure you created the admin user in Firebase Console
- Check email/password are correct

---

## **NEXT STEPS**

Once deployed:

1. **Customize Mascot:**
   - Edit `src/components/Mascot.tsx` to change the puppy design
   - Add your own SVG or animations

2. **Add More Features:**
   - Group chat
   - Notifications
   - AI-powered suggestions (with Gemini)
   - Work schedule tracking

3. **Secure Firestore:**
   - Once you're happy, lock down security rules
   - Firebase Console → Firestore → Rules tab

---

## **QUICK REFERENCE**

| Task | Command |
|------|---------|
| Start dev server | `npm run dev` |
| Build for production | `npm run build` |
| Install deps | `npm install` |
| Create `.env.local` | Copy `.env.local.example` → rename → fill values |

---

## **FILES YOU CREATED**

```
petchat/
├── src/
│   ├── components/       # All UI components
│   ├── services/         # Firebase logic
│   ├── types/            # TypeScript types
│   ├── App.tsx           # Main app
│   ├── index.css         # Global styles
│   └── main.tsx          # React entry
├── .env.local            # Your Firebase config (SECRET!)
├── package.json
├── vite.config.ts
└── tailwind.config.js
```

---

**Questions?** Check the components themselves — they have comments!

Happy chatting! 🐕💬
