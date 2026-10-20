const { app, BrowserWindow, Menu, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');
const os = require('os');
const crypto = require('crypto');
const { spawn, execSync } = require('child_process');

let mainWindow;
let connectorProcess;
let cachedHwid = null;

/**
 * Extract Machine Hardware ID (HWID) on Windows / Mac / Linux
 */
function getMachineHardwareId() {
  if (cachedHwid) return cachedHwid;

  let raw = '';
  if (process.platform === 'win32') {
    try {
      const out = execSync('powershell.exe -NoProfile -Command "[Console]::OutputEncoding = [System.Text.Encoding]::UTF8; (Get-CimInstance Win32_ComputerSystemProduct).UUID"', {
        encoding: 'utf8',
        timeout: 5000,
        windowsHide: true
      }).trim();
      if (out && out.length > 5 && !out.toLowerCase().includes('error')) {
        raw += out;
      }
    } catch (e) {}

    try {
      const mb = execSync('powershell.exe -NoProfile -Command "(Get-CimInstance Win32_BaseBoard).SerialNumber"', {
        encoding: 'utf8',
        timeout: 5000,
        windowsHide: true
      }).trim();
      if (mb && mb.length > 3) raw += ':' + mb;
    } catch (e) {}
  }

  // Fallback to network MACs + CPU + username if wmic/powershell fails or on other OS
  if (!raw || raw.length < 5) {
    const interfaces = os.networkInterfaces();
    let macs = [];
    for (const name in interfaces) {
      for (const iface of interfaces[name]) {
        if (!iface.internal && iface.mac && iface.mac !== '00:00:00:00:00:00') {
          macs.push(iface.mac);
        }
      }
    }
    raw = (macs.sort().join('-') || 'UNKNOWN_NIC') + ':' + os.hostname() + ':' + os.cpus()[0]?.model;
  }

  // Hash to clean standardized format: TD-XXXX-YYYY-ZZZZ-WWWW
  const hash = crypto.createHash('sha256').update(raw.trim()).digest('hex').toUpperCase();
  const chunk1 = hash.substring(0, 4);
  const chunk2 = hash.substring(4, 8);
  const chunk3 = hash.substring(8, 12);
  const chunk4 = hash.substring(12, 16);
  cachedHwid = `TD-${chunk1}-${chunk2}-${chunk3}-${chunk4}`;
  return cachedHwid;
}

function getLicenseFilePath() {
  return path.join(app.getPath('userData'), 'taleemi_license.tdlic');
}

// Setup IPC handlers for renderer licensing
ipcMain.handle('license:get-hwid', async () => {
  return getMachineHardwareId();
});

ipcMain.handle('license:read-file', async () => {
  try {
    const licPath = getLicenseFilePath();
    if (fs.existsSync(licPath)) {
      return fs.readFileSync(licPath, 'utf8').trim();
    }
    // Also check local directory for pre-installed license
    const localLic = path.join(__dirname, 'license.tdlic');
    if (fs.existsSync(localLic)) {
      return fs.readFileSync(localLic, 'utf8').trim();
    }
    return null;
  } catch (err) {
    console.error('[Electron License] Error reading license file:', err);
    return null;
  }
});

ipcMain.handle('license:save-file', async (event, token) => {
  try {
    const licPath = getLicenseFilePath();
    fs.writeFileSync(licPath, token.trim(), 'utf8');
    return true;
  } catch (err) {
    console.error('[Electron License] Error saving license file:', err);
    return false;
  }
});

ipcMain.handle('license:delete-file', async () => {
  try {
    const licPath = getLicenseFilePath();
    if (fs.existsSync(licPath)) {
      fs.unlinkSync(licPath);
    }
    return true;
  } catch (err) {
    return false;
  }
});

function startCctvConnector() {
  const connectorPath = path.join(__dirname, 'cctv-connector', 'index.js');
  console.log('Starting CCTV Connector at:', connectorPath);
  
  // Use node to run the connector, passing the .env file path
  connectorProcess = spawn('node', ['--env-file=.env', 'index.js'], {
    cwd: path.join(__dirname, 'cctv-connector'),
    env: { ...process.env },
    shell: true
  });

  connectorProcess.stdout.on('data', (data) => {
    console.log(`[Connector]: ${data}`);
  });

  connectorProcess.stderr.on('data', (data) => {
    console.error(`[Connector Error]: ${data}`);
  });
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'electron-preload.cjs'),
      nodeIntegration: false,
      contextIsolation: true
    },
    title: "TaleemiDunya Pro — School Management SaaS",
    icon: path.join(__dirname, 'dist', 'icon.png')
  });

  // Load the compiled index.html from dist
  mainWindow.loadFile(path.join(__dirname, 'dist', 'index.html'));

  // Maximize the window to fit the screen
  mainWindow.maximize();

  mainWindow.on('closed', function () {
    mainWindow = null;
  });
}

// Remove the default browser menu bar for a clean desktop-app feel
Menu.setApplicationMenu(null);

app.on('ready', () => {
  console.log('[TaleemiDunya Pro] Initializing... Machine HWID:', getMachineHardwareId());
  startCctvConnector();
  createWindow();
});

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('quit', () => {
  if (connectorProcess) {
    connectorProcess.kill();
  }
});

app.on('activate', function () {
  if (mainWindow === null) {
    createWindow();
  }
});
