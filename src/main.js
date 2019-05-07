const {app, BrowserWindow, ipcMain, dialog} = require('electron');
const path = require('path');

let mainWindow;

app.on('ready', () => {
  mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      nodeIntegration: true
    },
    // show: false
  });

  // mainWindow.loadURL(`file://${__dirname}/index.html`);
  mainWindow.loadFile(path.join(__dirname, 'index.html'));
  // mainWindow.loadFile(path.join(__dirname, 'layout.html'));

  mainWindow.webContents.openDevTools();

  mainWindow.on('closed', () => {
    mainWindow = null
  });

  // ipcMain.on('compilation-complete', (evt) => {
  //   BrowserWindow.fromWebContents(evt.sender.webContents).show();
  // });

  ipcMain.on('open-file-dialog', (evt) => {
    dialog.showOpenDialog(mainWindow, {
      properties: ['openFile'],
      filters: [{
        name: 'Text Files',
        extensions: ['txt']
      }]
    }, (files) => {
      if (files) {
        e.sender.send('selected-file', files);
      }
    });
  });
});

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