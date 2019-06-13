// modules required
const $ = require('jquery');
const notifier = require('node-notifier');
const {ipcRenderer, shell} = require('electron');
const fs = require('fs');
const os = require('os');
const http = require("https");
const path = require('path');
const dictHelpers = require('./dictionary');
const miscHelpers = require('./misc');
const Store = require('electron-store');
const store = new Store();

// useful constants
const ONE_MINUTE = 60 * 1000;
const DEFINITION_NOT_FOUND_MSG = `Definition not found.\nClick this message to find out more.`;
const API_HOST_URL = 'googledictionaryapi.eu-gb.mybluemix.net';
const GITHUB_REPO_URL = 'https://github.com/tg-freelancer/simple-vocabulary-builder';

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

// display the current list name
$('.current_words_list').text(store.get('name'));

$('.container').on('click', (evt) => {
  const $e = $(evt.target);
  if ($e.is('a')) {
    const url = $e.attr('href');

    if (url !== '#') {
      evt.preventDefault();
      console.log(evt.currentTarget);
      shell.openExternal(url); 
    } else {
      const pageName = $e.attr('data-link-destination');
      $(`aside a.${pageName}`).trigger('click');
    }
  }
});

// open the select file dialog window
$selectFileBtn.on('click', (evt) => {
  ipcRenderer.send('open-file-dialog');
});

// check the confirmation on overwriting the words list
ipcRenderer.on('new-list-confirmation', (evt, index) => {
  if (index === 0) {
    ipcRenderer.send('select-new-list');
  }
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
    let wordsArr = dictHelpers.getWordsListData(miscHelpers.getSanitizedWords(data));

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

  // sorts the list if macos, shuffles it otherwise.
  if (os.platform() === 'darwin') {
    words = dictHelpers.getOrderedWords(words);
  } else {
    words = miscHelpers.shuffle(words);
  }

  // implement notifications
  const yesIcon = '✓';
  const noIcon = '☓'
  let notificationOptions;
  let notification;

  // index !== id; index in terms of the sorted arr
  index = index || 0;

  // start the timer and change the toggle btn text
  $(evt.target).text('Stop');

  timer = setInterval(() => {
    let currentIndex = index;
    currentWord = words[currentIndex].word;

    let definition;
    let apiPath = encodeURI(`/?define=${currentWord}&lang=${targetLang}`);

    // set 'Content-Type' to 'text/plain', rather than 'application/json'
    // due to the original API response not being formated properly
    const options = {
      host: API_HOST_URL,
      port: '443',
      path: apiPath,
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
          // title: currentWordObj['word'],
          title: currentWord,
          message: definition || DEFINITION_NOT_FOUND_MSG,
          icon: path.join(__dirname, '../assets/cat_meditating.jpg'),
          sound: false,
          // wait: true,
          timeout: interval,
          closeLabel: 'Close',
          actions: [yesIcon, noIcon],
          dropdownLabel: 'Remember?',
          // reply: false
        };

        if (!definition) {
          notificationOptions.open = `https://google.com/search?q=${currentWord}`
        }

        notifier.notify(notificationOptions, function(error, response, metadata) {
          // !!! must reference the "id" for each word to be updated
          console.log('NOTIFIED!!!');

          const id = dictHelpers.getId(currentWord);
          const currentScore = store.get(`words.${id}.score`);
          // update database based on the user response
          if (metadata.activationValue === yesIcon) {
            store.set(`words.${id}.score`, currentScore + 1);
            // console.log(store.get(`words.${id}.word`), 'yes!!!');
          } else if (metadata.activationValue === noIcon) {
            let updatedScore = currentScore - 1;
            if (updatedScore < 0) updatedScore = 0;

            store.set(`words.${id}.score`, updatedScore);
            // console.log(store.get(`words.${id}.word`), 'no...');
          }
        });
      });

      res.on('end', () => {
        console.log('Response completed.');
      });
    });

    req.on('error', (err) => {
      console.error(`Problem handling request: ${err.message}`);
    });

    req.end();

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
  }, interval);
})