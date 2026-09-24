const { app, BrowserWindow } = require('electron');
const path = require('path');
const { spawn } = require('child_process');

let mainWindow;
let connectorProcess;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: true,
      contextIsolation: false
    },
    icon: path.join(__dirname, '../public/vite.svg')
  });

  // Load the Vite dev server URL or local build file
  if (process.env.VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL);
    // mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }
}

function startCctvConnector() {
  const connectorPath = path.join(__dirname, '../cctv-connector/index.js');
  console.log('Starting CCTV Connector at:', connectorPath);
  
  // Use node to run the connector, passing the .env file path
  connectorProcess = spawn('node', ['--env-file=../cctv-connector/.env', connectorPath], {
    cwd: path.join(__dirname, '../cctv-connector'),
    env: { ...process.env }
  });

  connectorProcess.stdout.on('data', (data) => {
    console.log(`[Connector]: ${data}`);
  });

  connectorProcess.stderr.on('data', (data) => {
    console.error(`[Connector Error]: ${data}`);
  });
}

app.whenReady().then(() => {
  startCctvConnector();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('quit', () => {
  if (connectorProcess) {
    connectorProcess.kill();
  }
});
