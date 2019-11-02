const $ = require('jquery');
const notifier = require('node-notifier');
const {ipcRenderer, shell, remote} = require('electron');
const fs = require('fs');
const os = require('os');
const http = require("https");
const path = require('path');
const dictHelpers = require('./dictionary');
const miscHelpers = require('./misc');
const Store = require('electron-store');
const store = new Store();

// useful constants
const SECONDS_IN_MINUTE = 60;
const MILLISECONDS_IN_MINUTE = 1000 * SECONDS_IN_MINUTE;
const DEFINITION_NOT_FOUND_MSG = `Definition not found.\nClick this message to find out more.`;
const API_HOST_URL = 'googledictionaryapi.eu-gb.mybluemix.net';

const $form = $('.container').find('form');
const $selectFileBtn = $form.find('.select-file-btn');
const $toggleBtn = $form.find('.toggle-btn');
const $intervalInput = $form.find('#interval');
const $loopCheckBox = $form.find('.loop input[type="checkbox"]');
const $shuffleCheckBox = $form.find('.shuffle input[type="checkbox"]');

// remove the shuffle checkbox, the upper space for the title bar
// and the title bar itself for windows and linux
if (os.platform() !== 'darwin') {
  $('.shuffle').remove();
  $('.title-bar').remove();
  $('aside, main').removeClass('title-bar-space');
}

// getWordsListData
let targetLang;
let intervalInSeconds;
let intervalInMilliseconds;
let timer;
let index;
let nextIndex;
let lastIndex;
let words;

// display the current list name
$('.current_words_list').text(store.get('name'));

// handle link clicks on non-index pages
$('.container').on('click', (evt) => {
  const $e = $(evt.target);

  if ($e.is('a')) {
    //// anchor element is clicked
    const url = $e.attr('href');
    if (url !== '#') {
      // follows an external link
      evt.preventDefault();
      shell.openExternal(url);
    } else {
      // follows an internal link
      const pageName = $e.attr('data-link-destination');
      $(`aside a.${pageName}`).trigger('click');

      // if ($e.closest('td').attr('class') === 'delete') {
        // //// handle word deletions
        // // deletes the word from the database and UI
        // evt.preventDefault();

        // // remove from the stats UI
        // const $removedWordRow = $e.closest('tr').remove();

        // // remove from the database
        // const $removedWord = $removedWordRow.find('.word');
        // const removedWordId = $removedWord.attr('data-word-id');
        // store.delete(`words.${removedWordId}`);

        // // update the word count in real time
        // const wordCount = dictHelpers.getWordCount(store.get('words'));
        // $('.word_count').text(wordCount);
      // } else {
      // }
    }
  } else {
    //// clicked element is not an anchor element
    const className = $e.attr('class');

    if (className === 'add-word-btn') {
      // handle word addition
      evt.preventDefault();

      $('.overlay').show();
      $('.add-word-modal').show();
    } else if (className === 'delete') {
      //// handle word deletions
      evt.preventDefault();

      /// delete the word from the database and UI

      // remove the word row from the stats UI
      const $removedWordRow = $e.closest('tr').remove();

      // remove from the database
      // const $removedWord = $removedWordRow.find('.word');
      const removedWordId = Number($removedWordRow.attr('data-word-id'));

      // fetch the last index
      lastIndex = dictHelpers.getLastIndex(store.get('words'));

      // get updated list
      const updatedWordsList = dictHelpers.getUpdatedWordsList(store.get('words'), removedWordId);

      // update db
      store.set('words', updatedWordsList);

      // update the word count display in real time
      const wordCount = dictHelpers.getWordCount(store.get('words'));
      $('.word_count').text(wordCount);
    } else if (className === 'edit') {
      // handle word edit
      evt.preventDefault();

      $('.overlay').show();
      $('.edit-word-modal').show();

      // pre-populate the input fields
      const $modal = $('.edit-word-modal');
      const id = Number($e.closest('tr').attr('data-word-id'));
      const wordObj = dictHelpers.getWordFromId(id);
      const {word, definition} = wordObj;
      $modal.find('[name=edited_word]').val(word);
      $modal.find('[name=edited_word_definition]').val(definition);

      // attach unique id to the input fields
      $modal.attr('data-edited-word-id', id);
    } else if (className === 'edit-word-modal-btn') {
      // handle editing existing word (custom validation method used)
      evt.preventDefault();

      // get the index of the edited word
      const id = Number($e.closest('div').attr('data-edited-word-id'));

      // get new word
      const $editedWordInput = $('input').filter('[name=edited_word]');
      const editedWord = $editedWordInput.val();
      const sanitizedEditedWord = miscHelpers.getSanitizedWord(editedWord);

      // get custom definition
      const editedWordDefinition = $('#edited_word_definition').val();

      if (dictHelpers.isValidWord(sanitizedEditedWord)) {
        // update the current word within the db

        const position = dictHelpers.getPosition(id);

        store.set(`words.${position}.word`, editedWord);
        store.set(`words.${position}.definition`, editedWordDefinition);
        // console.log(store.get(`words.${position}`));

        // clear the error message and the new word entered
        $('.modal .error').text('');
        $('.modal .error').removeClass('error').addClass('success').text('The entry has been updated!');
        $e.closest('form')[0].reset();
      } else {
        // display the error message
        const errorMessage = dictHelpers.getErrorMessageForNewWord(sanitizedNewWord);
        $('.modal span').removeClass('success').addClass('error').text(errorMessage);
      }
    } else if (className === 'overlay') {
      // handle overlay actions
      $('.overlay').remove();
      $('.modal').remove();
      $('aside a.stats').trigger('click');
    } else if (className === 'add-word-modal-btn') {
      // handle adding new word (custom validation method used)
      evt.preventDefault();

      // get new word
      const $newWordInput = $('input').filter('[name=new_word]');
      const newWord = $newWordInput.val();
      const sanitizedNewWord = miscHelpers.getSanitizedWord(newWord);

      // get custom definition
      const newWordDefinition = $('#new_word_definition').val();
      if (dictHelpers.isValidWord(sanitizedNewWord)) {
        // add the new word to the list (UI updated upon the overlay being clicked)
        // nextIndex = dictHelpers.getNextIndex(store.get('words'));

        // fetch the last index
        lastIndex = dictHelpers.getLastIndex(store.get('words')) + 1;
        // lastIndex += 1;
        const newWordObj = { id: lastIndex, word: sanitizedNewWord, score: 0, definition: newWordDefinition };
        const newListSize = dictHelpers.getWordCount(store.get('words'))
        store.set(`words.${newListSize}`, newWordObj);
        console.log(store.get('words'));
        // clear the error message and the new word entered
        $('.modal .error').text('');
        $('.modal .error').removeClass('error').addClass('success').text(`'${sanitizedNewWord}' has been added to the list!`);
        $newWordInput.closest('form')[0].reset();
      } else {
        // display the error message
        const errorMessage = dictHelpers.getErrorMessageForNewWord(sanitizedNewWord);
        $('.modal span').removeClass('success').addClass('error').text(errorMessage);
      }
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

  // display the selected file name and set the selected attribute to true
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

    // assign the words list
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

  // let the user know the review process has started
  const minutes = Number($intervalInput.val());
  const notificationIconPath = path.join(__dirname, '..', 'assets', 'logo.png');
  const initialNotificationOptions = {
    icon: notificationIconPath,
    sound: false,
    title: 'Simple Vocabulary Builder',
    message: `The revision will start in ${minutes} ${minutes === 1 ? 'minute' : 'minutes'}!`
  };

  notifier.notify(initialNotificationOptions);

  // minimise the window if the inputs are valid
  remote.BrowserWindow.getFocusedWindow().minimize();

  // sets the interval
  intervalInSeconds = SECONDS_IN_MINUTE * minutes;
  intervalInMilliseconds = MILLISECONDS_IN_MINUTE * minutes;
  // console.log(intervalInSeconds, intervalInMilliseconds);

  // assigns the words list (if not already selected)
  words = words || store.get('words');
  // assigns the clean words list (no null values)
  // words = dictHelpers.getCleanWordsList(words || store.get('words'));

  // sorts the list if macos, shuffles it otherwise.
  if (os.platform() === 'darwin' && !$shuffleCheckBox.prop('checked')) {
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

    let definition = words[currentIndex].definition;
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
        definition = definition || dictHelpers.getFirstDefinition(json);

        notificationOptions = {
          title: currentWord,
          message: definition || DEFINITION_NOT_FOUND_MSG,
          icon: notificationIconPath,
          sound: false,
          // wait: true,
          timeout: intervalInSeconds,
          closeLabel: 'Close',
          actions: [yesIcon, noIcon],
          dropdownLabel: 'Remember?',
        };

        if (!definition) {
          notificationOptions.open = `https://google.com/search?q=${currentWord}`
        }

        notifier.notify(notificationOptions, function(error, response, metadata) {
          // !!! must reference the "id" for each word to be updated
          // console.log('NOTIFIED!!!');

          const id = dictHelpers.getId(currentWord);
          const currentScore = store.get(`words.${id}.score`);

          // update database based on the user response
          if (metadata.activationValue === yesIcon) {
            store.set(`words.${id}.score`, currentScore + 1);
          } else if (metadata.activationValue === noIcon) {
            let updatedScore = currentScore - 1;
            if (updatedScore < 0) updatedScore = 0;

            store.set(`words.${id}.score`, updatedScore);
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

    // get the next index
    // index = dictHelpers.getNextIndex(words);
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
  }, intervalInMilliseconds);
})

// store.set('indexHtml', $('main').html());