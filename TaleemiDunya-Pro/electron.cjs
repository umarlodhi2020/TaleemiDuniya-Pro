const { app, BrowserWindow, Menu } = require('electron');
const path = require('path');

let mainWindow;

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

app.on('ready', createWindow);

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', function () {
  if (mainWindow === null) {
    createWindow();
  }
});
