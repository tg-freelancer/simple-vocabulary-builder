var $ = require('jquery');
var notifier = require('node-notifier');
var {ipcRenderer, shell, remote} = require('electron');
var fs = require('fs');
var os = require('os');
var http = require("https");
var path = require('path');
var dictHelpers = require('./dictionary');
var miscHelpers = require('./misc');
var Store = require('electron-store');
var store = new Store();

// useful varants
var SECONDS_IN_MINUTE = 60;
var MILLISECONDS_IN_MINUTE = 1000 * SECONDS_IN_MINUTE;
var DEFINITION_NOT_FOUND_MSG = `Definition not found.\nClick this message to find out more.`;
var API_HOST_URL = 'googledictionaryapi.eu-gb.mybluemix.net';

var $form = $('.container').find('form');
var $selectFileBtn = $form.find('.select-file-btn');
var $toggleBtn = $form.find('.toggle-btn');
var $intervalInput = $form.find('#interval');
var $loopCheckBox = $form.find('.loop input[type="checkbox"]');
var $shuffleCheckBox = $form.find('.shuffle input[type="checkbox"]');

// remove the shuffle checkbox, the upper space for the title bar
// and the title bar itself for windows and linux
if (os.platform() !== 'darwin') {
  $('.shuffle').remove();
  $('.title-bar').remove();
  $('aside, main').removeClass('title-bar-space');
}

// getWordsListData
var targetLang;
var intervalInSeconds;
var intervalInMilliseconds;
var timer;
var index;
var nextIndex;
var lastIndex;
var words;

// display the current list name
$('.current_words_list').text(store.get('name'));

// handle link clicks on non-index pages
$('.container').off('click.container').on('click.container', (evt) => {
  var $e = $(evt.target);

  // return if the clicked element is on the index page
  if ($e.closest('div').hasClass('index')) return;

  if ($e.is('a')) {
    //// anchor element is clicked
    var url = $e.attr('href');
    if (url !== '#') {
      // follows an external link
      evt.preventDefault();
      shell.openExternal(url);
    } else {
      // follows an internal link
      var pageName = $e.attr('data-link-destination');
      $(`aside a.${pageName}`).trigger('click');

      // if ($e.closest('td').attr('class') === 'delete') {
        // //// handle word deletions
        // // deletes the word from the database and UI
        // evt.preventDefault();

        // // remove from the stats UI
        // var $removedWordRow = $e.closest('tr').remove();

        // // remove from the database
        // var $removedWord = $removedWordRow.find('.word');
        // var removedWordId = $removedWord.attr('data-word-id');
        // store.delete(`words.${removedWordId}`);

        // // update the word count in real time
        // var wordCount = dictHelpers.getWordCount(store.get('words'));
        // $('.word_count').text(wordCount);
      // } else {
      // }
    }
  } else {
    //// clicked element is not an anchor element
    var className = $e.attr('class');

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
      var $removedWordRow = $e.closest('tr').remove();

      // remove from the database
      // var $removedWord = $removedWordRow.find('.word');
      var removedWordId = Number($removedWordRow.attr('data-word-id'));

      // fetch the last index
      lastIndex = dictHelpers.getLastIndex(store.get('words'));

      // get updated list
      var updatedWordsList = dictHelpers.getUpdatedWordsList(store.get('words'), removedWordId);

      // update db
      store.set('words', updatedWordsList);

      // update the word count display in real time
      var wordCount = dictHelpers.getWordCount(store.get('words'));
      $('.word_count').text(wordCount);
    } else if (className === 'edit') {
      // handle word edit
      evt.preventDefault();

      $('.overlay').show();
      $('.edit-word-modal').show();

      // pre-populate the input fields
      var $modal = $('.edit-word-modal');
      var id = Number($e.closest('tr').attr('data-word-id'));
      var wordObj = dictHelpers.getWordFromId(id);
      var {word, definition} = wordObj;
      $modal.find('[name=edited_word]').val(word);
      $modal.find('[name=edited_word_definition]').val(definition);

      // attach unique id to the input fields
      $modal.attr('data-edited-word-id', id);
    } else if (className === 'edit-word-modal-btn') {
      // handle editing existing word (custom validation method used)
      evt.preventDefault();

      // get the index of the edited word
      var id = Number($e.closest('div').attr('data-edited-word-id'));

      // get new word
      var $editedWordInput = $('input').filter('[name=edited_word]');
      var editedWord = $editedWordInput.val();
      var sanitizedEditedWord = miscHelpers.getSanitizedWord(editedWord);

      // get custom definition
      var editedWordDefinition = $('#edited_word_definition').val();

      if (dictHelpers.isValidWord(sanitizedEditedWord)) {
        // update the current word within the db

        var position = dictHelpers.getPosition(id);

        store.set(`words.${position}.word`, editedWord);
        store.set(`words.${position}.definition`, editedWordDefinition);
        // console.log(store.get(`words.${position}`));

        // clear the error message and the new word entered
        $('.modal .error').text('');
        $('.modal .error').removeClass('error').addClass('success').text('The entry has been updated!');
        $e.closest('form')[0].reset();
      } else {
        // display the error message
        var errorMessage = dictHelpers.getErrorMessageForNewWord(sanitizedNewWord);
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
      var $newWordInput = $('input').filter('[name=new_word]');
      var newWord = $newWordInput.val();
      var sanitizedNewWord = miscHelpers.getSanitizedWord(newWord);

      // get custom definition
      var newWordDefinition = $('#new_word_definition').val();
      if (dictHelpers.isValidWord(sanitizedNewWord)) {
        // add the new word to the list (UI updated upon the overlay being clicked)
        // nextIndex = dictHelpers.getNextIndex(store.get('words'));

        // fetch the last index
        lastIndex = dictHelpers.getLastIndex(store.get('words')) + 1;
        // lastIndex += 1;
        var newWordObj = { id: lastIndex, word: sanitizedNewWord, score: 0, definition: newWordDefinition };
        var newListSize = dictHelpers.getWordCount(store.get('words'))
        store.set(`words.${newListSize}`, newWordObj);
        console.log(store.get('words'));
        // clear the error message and the new word entered
        $('.modal .error').text('');
        $('.modal .error').removeClass('error').addClass('success').text(`'${sanitizedNewWord}' has been added to the list!`);
        $newWordInput.closest('form')[0].reset();
      } else {
        // display the error message
        var errorMessage = dictHelpers.getErrorMessageForNewWord(sanitizedNewWord);
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
  var pathStr = path[0];
  var fileName = dictHelpers.trimFilePath(pathStr);
  var fileExt = dictHelpers.getFileExt(fileName);

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
    var wordsArr = dictHelpers.getWordsListData(miscHelpers.getSanitizedWords(data));

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
  var $e = $(evt.target);
  var $errorMessageSpan = $e.next('.error');
  var isValidInterval = dictHelpers.isValidInterval($e);

  if (!isValidInterval) {
    // get and display error message
    var errorMessage = {};
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
  console.log('toggle btn clicked');
  if (timer) {
    // stop the timer and change the toggle btn text
    clearInterval(timer);
    timer = null;
    $(evt.target).text('Start');
    return;
  }

  // validate form
  var isValidForm = dictHelpers.validateForm($form);

  // if invalid, display error message(s) and return
  if (!isValidForm) {
    var errorMessages = dictHelpers.getErrorMessages($form);
    dictHelpers.displayErrors(errorMessages, $form);
    return;
  }

  // let the user know the review process has started
  var minutes = Number($intervalInput.val());
  var notificationIconPath = path.join(__dirname, '..', 'assets', 'logo.png');
  var initialNotificationOptions = {
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
  var yesIcon = '✓';
  var noIcon = '☓'
  var notificationOptions;
  var notification;

  // index !== id; index in terms of the sorted arr
  index = index || 0;

  // start the timer and change the toggle btn text
  $(evt.target).text('Stop');

  timer = setInterval(() => {
    var currentIndex = index;
    var currentWordObj = words[currentIndex];
    var currentWord = currentWordObj.word;
    var definition = currentWordObj.definition;
    var apiPath = encodeURI(`/?define=${currentWord}&lang=${targetLang}`);

    // set 'Content-Type' to 'text/plain', rather than 'application/json'
    // due to the original API response not being formated properly
    var options = {
      host: API_HOST_URL,
      port: '443',
      path: apiPath,
      headers: {
        'Content-Type': 'text/plain'
      }
    };

    // make an api call for each word
    var req = http.request(options, (res) => {
      res.setEncoding('utf8');
      res.on('data', (data) => {
        // check if data is of type html
        // (no error code specified in the original api)
        var json = data[0] === '<' ? null : JSON.parse(data);
        debugger;
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
          dropdownLabel: 'Recall?',
        };

        if (!definition) {
          notificationOptions.open = `https://google.com/search?q=${currentWord}`
        }

        notifier.notify(notificationOptions, function(error, response, metadata) {
          // !!! must reference the "id" for each word to be updated
          // console.log('NOTIFIED!!!');

          var id = dictHelpers.getId(currentWord);
          var currentScore = store.get(`words.${id}.score`);
          var updatedScore;

          // update database based on the user response
          if (metadata.activationValue === yesIcon) {
            updatedScore = currentScore + 1;
          } else if (metadata.activationValue === noIcon) {
            updatedScore = currentScore - 1;
            if (updatedScore < 0) updatedScore = 0;
          }

          store.set(`words.${id}.score`, updatedScore);
          console.log(store.get('words'));
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

store.set('indexHtml', $('main').html());