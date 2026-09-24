const { app, BrowserWindow, Menu } = require('electron');
const path = require('path');
const { spawn } = require('child_process');

let mainWindow;
let connectorProcess;

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
      nodeIntegration: false,
      contextIsolation: true
    },
    title: "TaleemiDunya Pro — School Management SaaS",
    icon: path.join(__dirname, 'dist', 'favicon.ico')
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
