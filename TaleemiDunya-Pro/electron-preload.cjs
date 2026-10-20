const { contextBridge, ipcRenderer } = require('electron');

/**
 * TaleemiDunya Pro — Secure Preload Bridge for Hardware Licensing & Desktop Features
 */
contextBridge.exposeInMainWorld('electronLicense', {
  isDesktop: true,
  getHwid: async () => {
    try {
      return await ipcRenderer.invoke('license:get-hwid');
    } catch (e) {
      console.error('[Preload] getHwid error:', e);
      return 'HWID_ERR';
    }
  },
  readLicenseFile: async () => {
    try {
      return await ipcRenderer.invoke('license:read-file');
    } catch (e) {
      console.error('[Preload] readLicenseFile error:', e);
      return null;
    }
  },
  saveLicenseFile: async (token) => {
    try {
      return await ipcRenderer.invoke('license:save-file', token);
    } catch (e) {
      console.error('[Preload] saveLicenseFile error:', e);
      return false;
    }
  },
  deleteLicenseFile: async () => {
    try {
      return await ipcRenderer.invoke('license:delete-file');
    } catch (e) {
      return false;
    }
  }
});
