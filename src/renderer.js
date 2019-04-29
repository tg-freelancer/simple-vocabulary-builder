const $ = require('jquery');

const ONE_MINUTE = 60 * 1000;
// const INTERVAL = 0.1 * ONE_MINUTE;
const DEFINITION_NOT_FOUND_MSG = `Definition not found.\nClick this message to find out more.`;
const API_HOST_URL = 'googledictionaryapi.eu-gb.mybluemix.net';

const {ipcRenderer, shell} = require('electron');
const fs = require('fs');
const http = require("https");
const dictHelpers = require('./dictionary');
const miscHelpers = require('./misc');

const $form = $('form');
const $selectFileBtn = $form.find('.select-file-btn');
const $toggleBtn = $form.find('.toggle-btn');
const $intervalInput = $('#interval');

let words;
let targetLang;
let isFileSelected = false;
let interval;
let timer;
let timerOn = false;

$selectFileBtn.on('click', (e) => {
  ipcRenderer.send('open-file-dialog');
});

ipcRenderer.on('selected-file', (e, path) => {
  const pathStr = path[0];
  const fileName = dictHelpers.trimFilePath(pathStr);
  const fileExt = dictHelpers.getFileExt(fileName);

  if (fileExt !== 'txt') {
    console.log('Looks like the selected file is not a text file.');
    return;
  }

  // delete the error message if it exists
  $form.find('.file').text('');

  $('.selected-file').text(`Selected file: ${fileName}`);
  $('.selected-file').attr('data-file-selected', true);
  // read the selected file
  fs.readFile(pathStr, {
    encoding: 'utf8'
  }, (err, data) => {
    if (err) throw err;

    // retrieve words/phrases and shuffle the result
    words = miscHelpers.shuffle(miscHelpers.getSanitizedWords(data));
    targetLang = 'en';
  });
});

// validate interval input when blurred and display error message if necessary
$intervalInput.on('blur', (e) => {
  const $e = $(e.target);
  const $errorMessageSpan = $e.next('.error');
  let isValidInterval = dictHelpers.isValidInterval($e);

  if (!isValidInterval) {
    // get and display error message
    let errorMessage = {};
    dictHelpers.registerIntervalErrorMessage(errorMessage, $e[0].validity);
    $errorMessageSpan.text(errorMessage.interval);
  } else {
    $errorMessageSpan.text('');
  }
});

// remove error message (if any) for interval input when focused
$intervalInput.on('focus', (e) => {
  $(e.target).next('.error').text('');
});

// kick off notification displays
$toggleBtn.on('click', (e) => {
  e.preventDefault();

  if (timer && timerOn) {
    // stop the timer and change the toggle btn text
    clearInterval(timer);
    timer = null;
    timerOn = false;
    $(e.target).text('Start');
    return;
  }

  // validate form
  let isValidForm = dictHelpers.validateForm($form);

  // if invalid, display error message(s) and return
  if (!isValidForm) {
    const errorMessages = dictHelpers.getErrorMessages($form);
    dictHelpers.displayErrors(errorMessages, $form);
    return;
  }

  // if (timer && toggleBtnText === '')

  // // change btn text
  // const toggleBtnText = $(e.target).text() === 'Start' ? 'Stop' : 'Start';
  // $(e.target).text(toggleBtnText);

  interval = Number($intervalInput.val()) * ONE_MINUTE;

  // implement notifications
  let notificationOptions;
  let notification;
  let index = 0;

  // start the timer and change the toggle btn text
  $(e.target).text('Stop');
  timerOn = true;

  timer = setInterval(() => {
    word = words[index];

    let definition;
    let path = encodeURI(`/?define=${word}&lang=${targetLang}`);

    const options = {
      host: API_HOST_URL,
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

        // execute loop
        if (index > words.length - 1) {
          index = 0;
        }
      });

      res.on('end', () => {
        console.log('Response completed.');
      });
    });

    req.on('error', err => {
      console.error(`Problem handling request: ${err.message}`);
    });

    req.end();

    // if (index > words.length - 1) {
    //   // clearInterval(timer);

    //   // enables loop
    //   index = 0;
    // }

    console.log(`index: ${index}`);
  }, interval);
})