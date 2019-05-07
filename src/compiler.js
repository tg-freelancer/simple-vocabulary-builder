const {ipcRenderer} = require('electron');
const handlebars = require('handlebars');

window.onload = () => {
  ipcRenderer.send("compilation-complete", null);
}