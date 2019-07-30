const $ = require('jquery');
const miscHelpers = require('./misc');
const Store = require('electron-store');
const store = new Store();

module.exports = {
  getWordCount(words) {
    // removes the null values and gets the actual number of words in the db
    return words.filter(item => !!item).length;
  },
  getFirstDefinition(json) {
    if (!json) return null;
    const meanings = json.meaning || json[0].meaning;
    return meanings[Object.keys(meanings)[0]][0].definition;
  },
  getOrderedWords(words) {
    return words.sort((word1, word2) => {
      return word1.score - word2.score;
    });
  },
  // returns the words list data
  getWordsListData(arr) {
    return arr.map((item, id) => {
      return { id: id, word: item, score: 0 };
    });
  },
  isValidInterval($interval) {
    const errorType = $interval[0].validity;
    return !(errorType.valueMissing || errorType.patternMismatch);
  },
  isValidWord(word) {
    return !!word;
  },
  isFileSelected($file) {
    // checks if a words list already exists in the database
    return store.has('words');
  },
  validateForm($form) {
    // returns true if valid
    const $interval = $form.find('#interval');
    const $selectedFile = $form.find('.selected-file');

    return this.isValidInterval($interval)
            && this.isFileSelected($selectedFile);
  },
  registerIntervalErrorMessage(errorMessages, errorType) {
    console.log(errorType)
    if (errorType.valueMissing) {
      errorMessages.interval = 'This value is required.';
    } else if (errorType.patternMismatch) {
      errorMessages.interval = 'Please enter a valid value.';
    }
  },
  getErrorMessages($form) {
    const $interval = $form.find('#interval');
    const $selectedFile = $form.find('.selected-file');
    const intervalErrorType = $interval[0].validity;
    let errorMessages = {};

    this.registerIntervalErrorMessage(errorMessages, intervalErrorType);

    if (!this.isFileSelected($selectedFile)) {
      errorMessages.file = 'Please select a text file.';
    }

    return errorMessages;
  },
  getErrorMessageForNewWord(word) {
    return 'New word cannot be empty.';
  },
  displayErrors(errorMessages, $form) {
    $form.find('.error').each(function() {
      let classes = $(this).attr('class').split(/\s/);
      let errorType = miscHelpers.getLastElement(classes);
      let errorMessage = errorMessages[errorType];
      $(this).text(errorMessage);
    });
  },
  trimFilePath(path) {
    const files = path.split('/');
    return miscHelpers.getLastElement(files);
  },
  getFileExt(fileName) {
    const components = fileName.split(/\./);
    return miscHelpers.getLastElement(components);
  },
  getId(word) {
    const words = store.get('words');

    for (let i = 0; i < words.length; i += 1) {
      const currentWord = words[i].word;
      if (word === currentWord) {
        return words[i].id;
      }
    }

    return null;
  }
};