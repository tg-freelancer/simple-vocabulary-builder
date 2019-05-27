// navigator.serviceWorker.register('./sw.js');

// modules required
const $ = require('jquery');
const notifier = require('node-notifier');
const {ipcRenderer, shell} = require('electron');
const fs = require('fs');
const http = require("https");
const dictHelpers = require('./dictionary');
const miscHelpers = require('./misc');
const Store = require('electron-store');
const store = new Store();

// useful constants
const ONE_MINUTE = 60 * 1000;
const DEFINITION_NOT_FOUND_MSG = `Definition not found.\nClick this message to find out more.`;
const API_HOST_URL = 'googledictionaryapi.eu-gb.mybluemix.net';

const $form = $('form');
const $selectFileBtn = $form.find('.select-file-btn');
const $toggleBtn = $form.find('.toggle-btn');
const $intervalInput = $('#interval');
const $loopCheckBox = $('.loop input[type="checkbox"]');

// getWordsListData
let targetLang;
let interval;
let timer;
let index;
let words;

// display the current word list
$('.current_words_list').text(store.get('name'));

// open the select file dialog window
$selectFileBtn.on('click', (evt) => {
  ipcRenderer.send('open-file-dialog');
});

// process the file name and contents
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

    // retrieve words/phrases (and shuffle the result)
    // words = miscHelpers.shuffle(miscHelpers.getSanitizedWords(data));
    // miscHelpers.getSanitizedWords(data)
    const wordsArr = dictHelpers.getWordsListData(miscHelpers.getSanitizedWords(data));
    // create/update list
    store.set('name', fileName);
    store.set('words', wordsArr);

    words = store.get('words');

    // update the current word list name
    $('.current_words_list').text(store.get('name'));

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

  // sets the interval
  interval = Number($intervalInput.val()) * ONE_MINUTE;

  // assigns the words list (if not already selected)
  words = words || store.get('words');

  // reorders the words list based on the score of each word
  words = dictHelpers.getOrderedWords(words);

  // if valid, clear the input values
  // $form[0].reset();

  // implement notifications
  const yesIcon = '✓';
  const noIcon = '☓'
  let notificationOptions;
  let notification;

  index = index || 0;

  // start the timer and change the toggle btn text
  $(evt.target).text('Stop');

  timer = setInterval(() => {
    // console.log(`index: ${index}`);
    currentWordObj = words[index];
    console.log('current index', index);
    console.log('current state', store.get('words'));
    // console.log(`currentWordObj: ${currentWordObj}, index: ${index}`);
    let definition;
    let path = encodeURI(`/?define=${currentWordObj['word']}&lang=${targetLang}`);

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
          title: currentWordObj['word'],
          message: definition || DEFINITION_NOT_FOUND_MSG,
          sound: false,
          // wait: true,
          timeout: interval,
          closeLabel: 'Close',
          actions: [yesIcon, noIcon],
          dropdownLabel: 'Remember?',
          reply: false
        };

        if (!definition) {
          notificationOptions.open = `https://google.com/search?q=${currentWordObj['word']}`
        }

        notifier.notify(notificationOptions, function(error, response, metadata) {
          console.log('NOTIFIED!!!');
          // console.log(store.set(`words.${index}`, 'hello'));
          // const currentYesCount = store.get(`words.${index}.yes`);
          // const currentNoCount = store.get(`words.${index}.no`);
          const currentScore = store.get(`words.${index}.score`);

          // console.log(`currentYesCount for ${store.get(`words.${index}`)}`, currentYesCount);
          // console.log(`currentNoCount for ${store.get(`words.${index}`)}`, currentNoCount);

          // update database based on the user response
          if (metadata.activationValue === yesIcon) {
            // store.set(`words.${index}.yes`, currentScore + 1);
            store.set(`words.${index}.score`, currentScore + 1);
            console.log(store.get(`words.${index}.word`), 'yes!!!');
            // store.set(`words[]`word['yes'] += 1;
            // console.log(store.set('words')[index], { word: 'kokok', lplp: 'lplp' });
            // console.log(word['word'], `yes: ${word['yes']}, no: ${word['no']}`);
          } else if (metadata.activationValue === noIcon) {
            // store.set(`words.${index}.no`, currentNoCount + 1);
            store.set(`words.${index}.score`, currentScore - 1);
            console.log(store.get(`words.${index}.word`), 'no...');
            // console.log(currentWordObj['word'], 'no...');
            // word['no'] += 1;
            // console.log(word['word'], `yes: ${word['yes']}, no: ${word['no']}`);
          }

          index += 1;

          console.log('Index updated.');

          // execute loop
          if (index > words.length - 1) {
            if ($loopCheckBox.prop('checked')) {
              index = 0;
            } else {
              clearInterval(timer);
              $toggleBtn.text('Start');
            }
          }

          // index += 1;

          // // execute loop
          // if (index > words.length - 1) {
          //   if ($loopCheckBox.prop('checked')) {
          //     index = 0;
          //   } else {
          //     clearInterval(timer);
          //     $toggleBtn.text('Start');
          //   }
          // }

          // console.log('after update', store.get('words'));
          // console.log('updated index', index);
        });

        // notifier.on('click', (notifierObject, options) => {
        //   console.log('clicked');
        //   // // index += 1;
        //   // // execute loop
        //   // if (index > words.length - 1) {
        //   //   if ($loopCheckBox.prop('checked')) {
        //   //     index = 0;
        //   //   } else {
        //   //     clearInterval(timer);
        //   //     $toggleBtn.text('Start');
        //   //   }
        //   // }
        // });

        // notifier.on('timeout', (notifierObject, options) => {
        //   console.log('TIMED OUT');
        //   index += 1;
        //   // execute loop
        //   // if (index > words.length - 1) {
        //   //   if ($loopCheckBox.prop('checked')) {
        //   //     index = 0;
        //   //   } else {
        //   //     clearInterval(timer);
        //   //     $toggleBtn.text('Start');
        //   //   }
        //   // }
        // })

        // // execute loop
        // if (index > words.length - 1) {
        //   if ($loopCheckBox.prop('checked')) {
        //     index = 0;
        //   } else {
        //     clearInterval(timer);
        //     $toggleBtn.text('Start');
        //   }
        // }
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

        // index += 1;

        // // execute loop
        // if (index > words.length - 1) {
        //   if ($loopCheckBox.prop('checked')) {
        //     index = 0;
        //   } else {
        //     clearInterval(timer);
        //     $toggleBtn.text('Start');
        //   }
        // }
      });

      res.on('end', () => {
        console.log('Response completed.');
      });
    });

    req.on('error', (err) => {
      console.error(`Problem handling request: ${err.message}`);
    });

    req.end();

    // index += 1;

    // console.log('Index updated.');

    // // execute loop
    // if (index > words.length - 1) {
    //   if ($loopCheckBox.prop('checked')) {
    //     index = 0;
    //   } else {
    //     clearInterval(timer);
    //     $toggleBtn.text('Start');
    //   }
    // }
  }, interval);
})