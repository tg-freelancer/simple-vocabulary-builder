const $ = require('jquery');
const miscHelpers = require('./misc');
const Store = require('electron-store');
const store = new Store();

module.exports = {
  getFirstDefinition(json) {
    if (!json) return null;
    // console.log(`json[0]: `, json[0])
    const meanings = json.meaning || json[0].meaning;
    return meanings[Object.keys(meanings)[0]][0].definition;
  },
  isValidInterval($interval) {
    const errorType = $interval[0].validity;
    return !(errorType.valueMissing || errorType.patternMismatch);
  },
  isFileSelected($file) {
    // return $file.attr('data-file-selected');

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
  }
};