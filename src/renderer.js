// TODO
// - error handling (i.e. no definitions found)
const ONE_MINUTE = 60 * 1000;
const INTERVAL = 2000;
const DEFINITION_NOT_FOUND_MSG = `Definition not found.\nClick this message to find out more.`;

const {ipcRenderer, shell} = require('electron');
const fs = require('fs');
const http = require("https");
const dictHelpers = require('./dictionary');
const miscHelpers = require('./misc');

const selectFileBtn = document.getElementById('select-file-btn');

selectFileBtn.addEventListener('click', (e) => {
  ipcRenderer.send('open-file-dialog');
});

ipcRenderer.on('selected-file', (e, path) => {
  document.getElementById('selected-file').innerHTML = `Selected file: ${path}`;

  // read the selected file
  fs.readFile(path[0], {
    encoding: 'utf8'
  }, (err, data) => {
    if (err) throw err;

    // retrieve words/phrases and shuffle the result
    const words = miscHelpers.shuffle(miscHelpers.getSanitizedWords(data));

    // implement notifications
    let notificationOptions;
    let notification;
    let index = 0;

    const fields = "definitions";
    const strictMatch = "false";

    const timer = setInterval(() => {
      let definition;
      let word = words[index];
      let path = encodeURI(`/?define=${word}`);

      const options = {
        host: 'googledictionaryapi.eu-gb.mybluemix.net',
        port: '443',
        path: path,
        headers: {
          'Content-Type': 'application/json'
        }
      };

      // make an api call for each word
      const req = http.request(options, (res) => {
        res.setEncoding('utf8');
        res.on('data', (data) => {
          // check if data is of type html
          // (no error code specified in the original api)
          const json = data[0] === '<' ? null : JSON.parse(data);
          definition = dictHelpers.getFirstDefinition(json);

          notificationOptions = {
            title: word,
            body: definition || DEFINITION_NOT_FOUND_MSG
          };

          notification = new window.Notification(notificationOptions.title, notificationOptions);

          notification.onclick = () => {
            if (!definition) {
              const ddgUrl = encodeURI(`https://duckduckgo.com/?q=${word}`);
              shell.openExternal(ddgUrl);
            }
          }

          index += 1;
        });

        res.on('end', () => {
          console.log('Response completed.');
        });
      });

      req.on('error', err => {
        console.error(`Problem handling request: ${err.message}`);
      });

      req.end();

      if (index === words.length - 1) {
        clearInterval(timer);
      }
    }, INTERVAL);
  });
});
