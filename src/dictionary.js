const $ = require('jquery');
const miscHelpers = require('./misc');

module.exports = {
  getFirstDefinition(json) {
    if (!json) return null;

    const meanings = json[0].meaning;
    return meanings[Object.keys(meanings)[0]][0].definition;
  },
  isValidInterval($interval) {
    const errorType = $interval[0].validity;
    return !(errorType.valueMissing || errorType.patternMismatch);
  },
  isValidFile($file) {
    return $file.attr('data-file-selected');
  },
  validateForm($form) {
    // returns true if valid
    const $interval = $form.find('#interval');
    const $selectedFile = $form.find('.selected-file');

    return this.isValidInterval($interval)
            && this.isValidFile($selectedFile);
  },
  determineErrorMessage($form) {
    const $interval = $form.find('input[type="text"]');
    const errorType = $interval[0].validity;
    let errorMessage;

    if (errorType.valueMissing) {
      errorMessage = 'This value is required.';
    } else if (errorType.patternMismatch) {
      errorMessage = 'Please enter a valid value.';
    } else {
      errorMessage = 'Default error message';
    }

    return errorMessage;
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