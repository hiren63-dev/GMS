const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('electronAPI', {
  toggleWindow: () => ipcRenderer.send('toggle-window'),
  quitApp: () => ipcRenderer.send('quit-app'),
  isElectron: true,
})
