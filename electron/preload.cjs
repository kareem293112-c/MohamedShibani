// Electron Preload Script
const { contextBridge } = require('electron');

// We can expose any needed desktop-only APIs safely to the renderer process here
contextBridge.exposeInMainWorld('electronAPI', {
  platform: process.platform,
  isDesktop: true
});

window.addEventListener('DOMContentLoaded', () => {
  console.log('Accounting Desktop Shell: Preload loaded successfully.');
});
