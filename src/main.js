if (require('electron-squirrel-startup')) return;

const {app, BrowserWindow, ipcMain, dialog, Tray, Menu, shell} = require('electron');
const path = require('path');
const os = require('os');
const GITHUB_REPO_URL = 'https://github.com/tg-freelancer/simple-vocabulary-builder';

// this should be placed at top of main.js to handle setup events quickly
if (handleSquirrelEvent()) {
  // squirrel event handled and app will exit in 1000ms, so don't do anything else
  return;
}

// handle Squirrel events
function handleSquirrelEvent() {
  if (process.argv.length === 1) {
    return false;
  }

  const ChildProcess = require('child_process');
  const path = require('path');

  const appFolder = path.resolve(process.execPath, '..');
  const rootAtomFolder = path.resolve(appFolder, '..');
  const updateDotExe = path.resolve(path.join(rootAtomFolder, 'Update.exe'));
  const exeName = path.basename(process.execPath);

  const spawn = function(command, args) {
    let spawnedProcess, error;

    try {
      spawnedProcess = ChildProcess.spawn(command, args, {detached: true});
    } catch (error) {}

    return spawnedProcess;
  };

  const spawnUpdate = function(args) {
    return spawn(updateDotExe, args);
  };

  const squirrelEvent = process.argv[1];
  switch (squirrelEvent) {
    case '--squirrel-install':
    case '--squirrel-updated':
      // Optionally do things such as:
      // - Add your .exe to the PATH
      // - Write to the registry for things like file associations and
      //   explorer context menus

      // Install desktop and start menu shortcuts
      spawnUpdate(['--createShortcut', exeName]);

      setTimeout(app.quit, 1000);
      return true;

    case '--squirrel-uninstall':
      // Undo anything you did in the --squirrel-install and
      // --squirrel-updated handlers

      // Remove desktop and start menu shortcuts
      spawnUpdate(['--removeShortcut', exeName]);

      setTimeout(app.quit, 1000);
      return true;

    case '--squirrel-obsolete':
      // This is called on the outgoing version of your app before
      // we update to the new version - it's the opposite of
      // --squirrel-updated

      app.quit();
      return true;
  }
};

let mainWindow;
const iconPath = path.join(__dirname, '..', 'assets', 'demo.png');

function createWindow() {
  const menuTemplate = [
    // About menu
    {
      label: 'Simple Vocabulary Builder',
      submenu: [{
        label: 'About',
        click() {
          shell.openExternal(GITHUB_REPO_URL);
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
    titleBarStyle: 'hiddenInset',
    icon: iconPath,
    webPreferences: {
      nodeIntegration: true
    },
  });

  // mainWindow.loadURL(`file://${__dirname}/index.html`);
  mainWindow.loadFile(path.join(__dirname, 'index.html'));

  // open the dev tool
  // mainWindow.webContents.openDevTools();

  mainWindow.on('closed', () => {
    mainWindow = null
  });

  ipcMain.on('open-file-dialog', (evt) => {
    const options = {
      type: 'warning',
      title: 'Warning',
      icon: iconPath,
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