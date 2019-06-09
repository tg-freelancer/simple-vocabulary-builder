const {app, BrowserWindow, ipcMain, dialog} = require('electron');
const path = require('path');
console.log('app.getPath("userData")', app.getPath('userData'));

let mainWindow;

app.on('ready', () => {
  mainWindow = new BrowserWindow({
    width: 560,
    minWidth: 500,
    maxWidth: 700,
    height: 570,
    // icon: path.join(__dirname, '../assets/cat_meditating.jpg'),
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
    const options = {
      type: 'warning',
      title: 'Warning',
      message: 'When you select a new words list, the data for the previous words list (if any) will be deleted.\nAre you sure you want to continue?',
      buttons: ['Yes', 'No']
    };

    dialog.showMessageBox(options, (index) => {
      evt.sender.send('new-list-confirmation', index);
    });
  });

  ipcMain.on('select-new-list', (evt) => {
    dialog.showOpenDialog(mainWindow, {
      properties: ['openFile'],
      filters: [{
        name: 'Text Files',
        extensions: ['txt']
      }]
    }, (files) => {
      if (files) {
        evt.sender.send('selected-file', files);
      }
    });
  })
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