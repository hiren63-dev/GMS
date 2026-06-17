# 🖥️ Electron Desktop App Setup — Always-On Puppy Widget

**Goal:** Create a Windows desktop app that:
- ✅ Runs automatically on computer startup
- ✅ Shows floating puppy widget
- ✅ Minimizes to system tray
- ✅ Stays in background
- ✅ Syncs with web app in real-time

---

## 📦 PHASE 1: Setup Electron

### Step 1: Install Dependencies

```bash
cd petchat
npm install electron --save-dev
npm install electron-builder --save-dev
npm install electron-store --save
npm install auto-launch --save
```

### Step 2: Create Electron Main Files

**`electron/main.ts`** - Main process
```typescript
import { app, BrowserWindow, ipcMain, Menu, Tray, nativeImage } from 'electron';
import path from 'path';
import AutoLaunch from 'auto-launch';
import isDev from 'electron-is-dev';

const autoLaunch = new AutoLaunch({
  name: 'PetChat',
  path: process.execPath,
});

let mainWindow: BrowserWindow | null = null;
let floatingWidget: BrowserWindow | null = null;
let tray: Tray | null = null;

// Create main window (when user clicks app)
function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  const startUrl = isDev
    ? 'http://localhost:3000'
    : `file://${path.join(__dirname, '../build/index.html')}`;

  mainWindow.loadURL(startUrl);

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// Create floating widget (always visible)
function createFloatingWidget() {
  floatingWidget = new BrowserWindow({
    width: 120,
    height: 120,
    x: 1750, // Bottom right
    y: 950,
    frame: false, // No title bar
    transparent: true,
    alwaysOnTop: true,
    skipTaskbar: true,
    resizable: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  const startUrl = isDev
    ? 'http://localhost:3000?widget=floating'
    : `file://${path.join(__dirname, '../build/index.html?widget=floating')}`;

  floatingWidget.loadURL(startUrl);
  floatingWidget.setIgnoreMouseEvents(false);

  floatingWidget.on('closed', () => {
    floatingWidget = null;
  });
}

// Create system tray
function createTray() {
  const trayIcon = nativeImage.createFromPath(
    path.join(__dirname, '../public/puppy-icon.png')
  );

  tray = new Tray(trayIcon);

  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Open PetChat',
      click: () => {
        if (mainWindow) {
          mainWindow.show();
        } else {
          createMainWindow();
        }
      },
    },
    {
      label: 'Toggle Widget',
      click: () => {
        if (floatingWidget) {
          floatingWidget.isVisible() ? floatingWidget.hide() : floatingWidget.show();
        }
      },
    },
    { type: 'separator' },
    {
      label: 'Exit',
      click: () => {
        app.quit();
      },
    },
  ]);

  tray.setContextMenu(contextMenu);
  tray.on('click', () => {
    if (mainWindow) {
      mainWindow.show();
    } else {
      createMainWindow();
    }
  });
}

// App events
app.on('ready', () => {
  createFloatingWidget();
  createTray();

  // Enable auto-start
  autoLaunch.enable();
});

app.on('window-all-closed', () => {
  // Keep app running even when all windows are closed
  // Only quit on explicit exit
});

app.on('activate', () => {
  if (mainWindow === null && floatingWidget === null) {
    createFloatingWidget();
  }
});

// IPC handlers for communication
ipcMain.on('toggle-main-window', () => {
  if (mainWindow) {
    mainWindow.isVisible() ? mainWindow.hide() : mainWindow.show();
  } else {
    createMainWindow();
  }
});

ipcMain.on('minimize-to-tray', () => {
  if (mainWindow) {
    mainWindow.hide();
  }
});
```

**`electron/preload.ts`** - Security layer
```typescript
import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  toggleMainWindow: () => ipcRenderer.send('toggle-main-window'),
  minimizeToTray: () => ipcRenderer.send('minimize-to-tray'),
  getAppVersion: () => '1.0.0',
});
```

### Step 3: Update package.json

Add to your `package.json`:
```json
{
  "homepage": "./",
  "main": "electron/main.ts",
  "homepage": "./",
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "electron": "electron .",
    "electron-dev": "concurrently \"npm run dev\" \"wait-on http://localhost:3000 && electron .\"",
    "electron-build": "npm run build && electron-builder"
  },
  "build": {
    "appId": "com.petchat.app",
    "productName": "PetChat",
    "files": [
      "dist/**/*",
      "electron/main.ts",
      "electron/preload.ts",
      "node_modules/**/*"
    ],
    "win": {
      "target": [
        {
          "target": "nsis",
          "arch": ["x64"]
        }
      ]
    },
    "nsis": {
      "oneClick": false,
      "allowToChangeInstallationDirectory": true,
      "createDesktopShortcut": true,
      "createStartMenuShortcut": true,
      "shortcutName": "PetChat"
    }
  },
  "devDependencies": {
    "electron": "^latest",
    "electron-builder": "^latest",
    "wait-on": "^latest",
    "concurrently": "^latest"
  }
}
```

---

## 🎯 PHASE 2: Update React App for Widget Mode

### Update App.tsx

```typescript
import { useEffect, useState } from 'react';

export default function App() {
  const [isWidget, setIsWidget] = useState(false);

  useEffect(() => {
    // Check if running as floating widget
    const params = new URLSearchParams(window.location.search);
    if (params.get('widget') === 'floating') {
      setIsWidget(true);
    }
  }, []);

  // Floating widget mode (small, always-on)
  if (isWidget) {
    return (
      <div className="fixed bottom-6 right-6 z-50">
        <Mascot onTap={() => {
          // Expand to main window
          window.electronAPI?.toggleMainWindow();
        }} />
      </div>
    );
  }

  // Normal app mode
  return (
    <div className="min-h-screen bg-gradient-to-br from-primary via-purple-500 to-secondary">
      {/* ... rest of your app ... */}
    </div>
  );
}
```

### Create FloatingWidget-only Component

**`src/components/FloatingWidgetMode.tsx`**
```typescript
import { useEffect, useState } from 'react';
import Mascot from './Mascot';
import DepartmentMenu from './DepartmentMenu';
import { getEmployees, onMessagesChange } from '../services/firebase';

export default function FloatingWidgetMode() {
  const [employees, setEmployees] = useState<any[]>([]);
  const [showMenu, setShowMenu] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    getEmployees().then(setEmployees);
  }, []);

  return (
    <div className="fixed bottom-6 right-6 z-50">
      {/* Show unread count badge */}
      {unreadCount > 0 && (
        <div className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold">
          {unreadCount}
        </div>
      )}

      {/* Mascot */}
      <Mascot onTap={() => setShowMenu(!showMenu)} />

      {/* Menu */}
      {showMenu && (
        <DepartmentMenu
          employees={employees}
          isOpen={showMenu}
          onClose={() => setShowMenu(false)}
          onSelectEmployee={(emp) => {
            // Expand to main window with employee selected
            window.electronAPI?.toggleMainWindow();
            // Pass employee ID via IPC
          }}
        />
      )}
    </div>
  );
}
```

---

## 🚀 PHASE 3: Build & Package for Windows

### Step 1: Install Global Tools

```bash
npm install -g electron-builder
npm install -g wait-on
npm install -g concurrently
```

### Step 2: Build React App

```bash
npm run build
```

### Step 3: Build Electron App

```bash
npm run electron-build
```

This creates:
- `dist/PetChat Setup.exe` — Installer
- `dist/PetChat.exe` — Portable app

### Step 4: Create Windows Installer NSIS Configuration

**`electron-builder.yml`** (optional advanced config)
```yaml
appId: com.petchat.app
productName: PetChat
files:
  - from: .
    to: .
    filter:
      - package.json
      - dist/**/*
      - node_modules/**/*
directories:
  buildResources: assets
  output: dist
win:
  target:
    - nsis
    - portable
nsis:
  oneClick: false
  allowToChangeInstallationDirectory: true
  createDesktopShortcut: true
  createStartMenuShortcut: true
  shortcutName: PetChat
```

---

## 🔧 PHASE 4: Auto-Start on Boot

The `auto-launch` package handles Windows startup. Once installed:

1. **First Run:** App automatically registers for auto-start
2. **Check Windows Startup Folder:** 
   ```
   C:\Users\[YourUsername]\AppData\Roaming\Microsoft\Windows\Start Menu\Programs\Startup
   ```
3. **Verify:** Restart computer, PetChat should auto-start

---

## 🎨 PHASE 5: Create Puppy Icon

The floating widget needs an icon. Create in Figma or use:

**`public/puppy-icon.png`** - 256x256 PNG of your puppy

---

## 📋 TESTING CHECKLIST

- [ ] Run `npm run electron-dev` and widget appears
- [ ] Click puppy → menu shows
- [ ] Select employee → main window opens
- [ ] Build release: `npm run electron-build`
- [ ] Install `PetChat Setup.exe` on Windows
- [ ] Restart computer → app auto-starts
- [ ] Widget appears in bottom-right corner
- [ ] Clicking puppy opens main app
- [ ] Messages sync between web and desktop app
- [ ] System tray shows app status

---

## 📦 DISTRIBUTION

### For Your Team:
1. Build the app: `npm run electron-build`
2. Share `dist/PetChat Setup.exe` with team members
3. They install it
4. App auto-starts on their next restart
5. Puppy widget appears in corner

### Automatic Updates (Optional):
Use `electron-updater` to push updates:
```bash
npm install electron-updater
```

---

## 🔄 SYNC WITH WEB APP

Both web and desktop apps use same Firebase:
- Same `.env` variables
- Same Firestore collections
- Same real-time listeners

**Changes in web app appear in desktop app instantly** and vice versa.

---

## 🐛 TROUBLESHOOTING

**Widget not appearing on startup:**
- Check `auto-launch` is enabled
- Verify app executable path is correct
- Check Windows Task Scheduler → startup programs

**Messages not syncing:**
- Verify both apps using same Firebase project
- Check Firestore rules allow read/write
- Check network connection

**High CPU usage:**
- Reduce Firestore listener frequency
- Implement message pagination
- Close unused real-time subscriptions

---

## 📊 PERFORMANCE OPTIMIZATION

For a lightweight widget:

1. **Lazy Load Components**
   ```typescript
   const TaskBoard = lazy(() => import('./TaskBoard'));
   ```

2. **Debounce Real-Time Updates**
   ```typescript
   const debouncedUpdate = debounce(() => setTasks(...), 500);
   ```

3. **Minimize DOM Nodes**
   - Only render visible messages
   - Virtualize long lists
   - Use CSS for animations (not JavaScript)

4. **Resource Limits**
   ```typescript
   // Only keep last 100 messages in memory
   const recentMessages = messages.slice(-100);
   ```

---

## 🎯 FINAL STEPS

1. **Test Locally**
   ```bash
   npm run electron-dev
   ```

2. **Build for Distribution**
   ```bash
   npm run electron-build
   ```

3. **Share Installer**
   - Send `dist/PetChat Setup.exe` to team
   - They install and restart computer
   - Widget auto-starts! 🎉

---

**Ready to build the desktop app? Start with Phase 1!** 🚀
