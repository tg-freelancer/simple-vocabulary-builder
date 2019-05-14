// navigator.serviceWorker.register('./sw.js');

// function showNotification() {
//   Notification.requestPermission(function(result) {
//     if (result === 'granted') {
//       navigator.serviceWorker.ready.then(function(registration) {
//         registration.showNotification('Vibration Sample', {
//           body: 'Buzz! Buzz!'
//           // icon: '../images/touch/chrome-touch-icon-192x192.png',
//           // vibrate: [200, 100, 200, 100, 200, 100, 200],
//           // tag: 'vibration-sample'
//         });
//       });
//     } else {
//       console.log('permission denied');
//     }
//   });
// }

// // showNotification();
// if ('serviceWorker' in navigator) {
//   window.addEventListener('load', function() {
//     navigator.serviceWorker.register('./sw.js').then(function(registration) {
//       // Registration was successful
//       console.log('ServiceWorker registration successful with scope: ', registration.scope);
//       // registration.showNotification('New message from Alice', {
//       //     body: 'Hello world',
//       //     actions: [
//       //         {action: 'like', title: 'Like'},
//       //         {action: 'reply', title: 'Reply'}
//       //     ]
//       // });
//     }, function(err) {
//       // registration failed :(
//       console.log('ServiceWorker registration failed: ', err);
//     });
//   });
// }

// ServiceWorkerRegistration.showNotification('New message from Alice', {
//     body: 'Hello world',
//     actions: [
//         {action: 'like', title: 'Like'},
//         {action: 'reply', title: 'Reply'}
//     ]
// });

const $ = require('jquery');
const notifier = require('node-notifier');

const ONE_MINUTE = 60 * 1000;
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
const $loopCheckBox = $('.loop input[type="checkbox"]');

let words;
let targetLang;
let interval;
let timer;
let index;

$selectFileBtn.on('click', (evt) => {
  ipcRenderer.send('open-file-dialog');
});

ipcRenderer.on('selected-file', (evt, path) => {
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
$intervalInput.on('blur', (evt) => {
  const $e = $(evt.target);
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
$intervalInput.on('focus', (evt) => {
  $(evt.target).next('.error').text('');
});

// kick off notification displays
$toggleBtn.on('click', (evt) => {
  evt.preventDefault();

  if (timer) {
    // stop the timer and change the toggle btn text
    clearInterval(timer);
    timer = null;
    $(evt.target).text('Start');
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

  interval = Number($intervalInput.val()) * ONE_MINUTE;
  // checked = $()

  // if valid, clear the input values
  // $form[0].reset();

  // implement notifications
  let notificationOptions;
  let notification;

  index = index || 0;

  // start the timer and change the toggle btn text
  $(evt.target).text('Stop');

  timer = setInterval(() => {
    word = words[index];

    let definition;
    let path = encodeURI(`/?define=${word}&lang=${targetLang}`);

    // set 'Content-Type' to 'text/plain', rather than 'application/json'
    // due to the original API response supposedly not being formated properly
    const options = {
      host: API_HOST_URL,
      port: '443',
      path: path,
      headers: {
        'Content-Type': 'text/plain'
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

        // const url = definition ? null : `https://duckduckgo.com/?q=${definition}`;
        // console.log(url);
        notificationOptions = {
          // id: index,
          // remove: index - 1,
          title: word,
          message: definition || DEFINITION_NOT_FOUND_MSG,
          // body: definition || DEFINITION_NOT_FOUND_MSG,
          // actions: [
          //   { action: 'like', title: 'Like' },
          //   { action: 'reply', title: 'Reply' }
          // ]
          sound: false,
          // 'icon': 'Terminal Icon',
          contentImage: void 0,
          // open: `https://duckduckgo.com/?q=${index}`,
          // open: url,
          // 'wait': false,
          timeout: interval,
          closeLabel: 'Close',
          actions: ['like', 'dislike'],
          dropdownLabel: 'Options',
          reply: false
        };

        if (!definition) {
          notificationOptions.open = `https://duckduckgo.com/?q=${word}`
        }

        // console.log(notificationOptions);

        notifier.notify(notificationOptions, function(error, response, metadata) {

          // console.log('response', response);
          // console.log('metadata', metadata);
          // console.log('\n');
        });

        // notification = new window.Notification(notificationOptions.title, notificationOptions);
        // notifier.notify(notificationOptions);

        // notifier.on('click', (notifierObject, options) => {
        //   if (!definition) {
        //     console.log('definition not found');
        //     const ddgUrl = encodeURI(`https://duckduckgo.com/?q=${word}`);
        //     shell.openExternal(ddgUrl);
        //   }          
        // })

        // notification.onclick = () => {
        //   if (!definition) {
        //     const ddgUrl = encodeURI(`https://duckduckgo.com/?q=${word}`);
        //     shell.openExternal(ddgUrl);
        //   }
        // }

        index += 1;

        // execute loop
        if (index > words.length - 1) {
          if ($loopCheckBox.prop('checked')) {
            index = 0;
          } else {
            clearInterval(timer);
            $toggleBtn.text('Start');
          }
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
  }, interval);
})