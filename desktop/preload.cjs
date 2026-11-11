const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('desktop', Object.freeze({
  openWebsite: () => ipcRenderer.invoke('desktop:open-website'),
  onQuickKind: (callback) => {
    if (typeof callback !== 'function') return () => {};
    const listener = (_event, kind) => callback(kind);
    ipcRenderer.on('mini:quick-kind', listener);
    return () => ipcRenderer.removeListener('mini:quick-kind', listener);
  },
  onRefresh: (callback) => {
    if (typeof callback !== 'function') return () => {};
    const listener = () => callback();
    ipcRenderer.on('mini:refresh', listener);
    return () => ipcRenderer.removeListener('mini:refresh', listener);
  }
}));
