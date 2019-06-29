const {app, BrowserWindow, ipcMain, dialog, Tray, Menu, shell} = require('electron');
const path = require('path');
console.log('app.getPath("userData")', app.getPath('userData'));

let mainWindow;

function createWindow() {
  const menuTemplate = [
    // About menu
    {
      label: 'Simple Vocabulary Builder',
      submenu: [{
        label: 'About',
        click() {
          shell.openExternal('https://transborder.global/');
        }
      }, {
        type: 'separator'
      }, {
        label: 'Quit',
        accelerator: 'CmdOrCtrl+Q',
        click() {
          app.quit();
        }
      }]
    },
    // View menu
    {
      label: 'View',
      submenu: [{
        label: 'Reroad',
        accelerator: 'CmdOrCtrl+R',
        click(item, focusedWindow) {
          if (focusedWindow) focusedWindow.reload();
        }
      }]
    },
    // Window menu
    {
      label: 'Window',
      submenu: [{
        label: 'Close',
        accelerator: 'CmdOrCtrl+W',
        role: 'close',
      }, {
        label: 'Minimise',
        accelerator: 'CmdOrCtrl+M',
        role: 'minimize'
      }, {
        label: 'Reopen',
        accelerator: 'CmdOrCtrl+Shift+T',
        key: 'reopenMenuItem',
        click() {
          app.emit('activate');
        }
      }]
    }
  ];

  const menu = Menu.buildFromTemplate(menuTemplate);
  Menu.setApplicationMenu(menu);

  mainWindow = new BrowserWindow({
    width: 560,
    minWidth: 500,
    maxWidth: 700,
    height: 570,
    webPreferences: {
      nodeIntegration: true
    },
  });

  // mainWindow.loadURL(`file://${__dirname}/index.html`);
  mainWindow.loadFile(path.join(__dirname, 'index.html'));

  //// open the dev tool
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
}

app.on('ready', () => {
  createWindow();
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