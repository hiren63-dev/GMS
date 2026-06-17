const { app, BrowserWindow, ipcMain, Menu, Tray, nativeImage, shell } = require('electron')
const path = require('path')

let mainWindow = null
let tray = null
const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged

function createMainWindow() {
  if (mainWindow) {
    mainWindow.show()
    mainWindow.focus()
    return
  }

  mainWindow = new BrowserWindow({
    width: 1100,
    height: 750,
    minWidth: 900,
    minHeight: 600,
    title: 'PetChat',
    icon: path.join(__dirname, '../public/icon.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      nodeIntegration: false,
      contextIsolation: true,
    },
    show: false,
  })

  const url = isDev ? 'http://localhost:3000' : `file://${path.join(__dirname, '../dist/index.html')}`
  mainWindow.loadURL(url)

  mainWindow.once('ready-to-show', () => mainWindow.show())

  mainWindow.on('close', (e) => {
    // Minimize to tray instead of quitting
    e.preventDefault()
    mainWindow.hide()
    if (tray) {
      tray.displayBalloon({
        title: 'PetChat',
        content: 'Still running in the background. Click the tray icon to reopen.',
        iconType: 'info',
      })
    }
  })

  mainWindow.on('closed', () => { mainWindow = null })
}

function createTray() {
  // Use a simple colored icon if no custom icon exists
  let icon
  try {
    icon = nativeImage.createFromPath(path.join(__dirname, '../public/icon.png'))
    if (icon.isEmpty()) throw new Error('empty')
  } catch {
    // Create a 16x16 solid teal icon as fallback
    icon = nativeImage.createEmpty()
  }

  tray = new Tray(icon)
  tray.setToolTip('PetChat — Workplace Companion')

  const menu = Menu.buildFromTemplate([
    { label: 'Open PetChat', click: createMainWindow },
    { type: 'separator' },
    { label: 'Quit PetChat', click: () => { app.exit(0) } },
  ])

  tray.setContextMenu(menu)
  tray.on('double-click', createMainWindow)
  tray.on('click', createMainWindow)
}

function setupAutoLaunch() {
  if (!isDev && app.isPackaged) {
    app.setLoginItemSettings({
      openAtLogin: true,
      openAsHidden: true,
      name: 'PetChat',
    })
  }
}

app.whenReady().then(() => {
  createTray()
  createMainWindow()
  setupAutoLaunch()
})

// Keep app alive when all windows closed (stays in tray)
app.on('window-all-closed', (e) => {
  // Don't quit — stays in system tray
})

app.on('activate', () => {
  createMainWindow()
})

ipcMain.on('toggle-window', () => {
  if (mainWindow?.isVisible()) {
    mainWindow.hide()
  } else {
    createMainWindow()
  }
})

ipcMain.on('quit-app', () => {
  app.exit(0)
})
