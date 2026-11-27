const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('probeHost', {
  report: (result) => ipcRenderer.send('probe:result', result),
});
