# 🐕 PetChat — Playful Workplace Communication App

A colorful, fun team communication tool with an adorable mascot. Send messages, track work hours, and get daily check-ins.

## ✨ Features

✅ Employee Messaging by Department  
✅ Login/Logout Time Tracking  
✅ Daily Check-Ins (6 questions)  
✅ Admin Dashboard with Analytics  
✅ Real-Time Message Updates  
✅ Cute Mascot Character  
✅ 100% Free to Run  

## 🚀 Quick Start

### Step 1: Firebase Setup (15 mins)
1. Go to firebase.google.com
2. Create project "petchat"
3. Enable Firestore (test mode)
4. Enable Email/Password auth
5. Copy Firebase config (6 values)
6. Create .env.local file with these values

### Step 2: Run Locally (5 mins)
```bash
npm install
npm run dev
# Open http://localhost:3000
```

### Step 3: Deploy to Vercel (10 mins)
```bash
git init && git add . && git commit -m "Initial"
git push to GitHub
Import GitHub repo on vercel.com
Add environment variables
Deploy!
```

## 📚 Full Guide

See **SETUP_GUIDE.md** for detailed instructions!

## 🛠️ Tech Stack

React 18 + TypeScript + Vite + Firebase + Tailwind CSS + Vercel

## 📁 Files

- **src/components/** — UI components (Mascot, Messages, CheckIn, etc)
- **src/services/firebase.ts** — All Firebase logic
- **SETUP_GUIDE.md** — Complete setup instructions
- **package.json** — Dependencies

## 💬 Features Breakdown

### Employee App
- Select name → Click mascot → Pick colleague → Send message
- Clock in with "I'm Here" button
- Fill daily check-in with mood/work/issues
- See work hours tracked

### Admin Dashboard
- View all employees
- See mood trends
- Track login/logout times
- Flag issues reported
- Add new employees

## 🎨 Customization

Edit these files:
- **Mascot design:** src/components/Mascot.tsx
- **Colors:** tailwind.config.js (primary, secondary, accent)
- **Check-in questions:** src/components/CheckInForm.tsx

## 💰 Cost

$0/month — Uses Firebase free tier + Vercel free tier

## ❓ Questions?

Read SETUP_GUIDE.md for troubleshooting and detailed steps!
