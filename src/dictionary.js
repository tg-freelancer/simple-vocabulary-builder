const $ = require('jquery');

module.exports = {
  getFirstDefinition(json) {
    if (!json) return null;

    const meanings = json[0].meaning;
    return meanings[Object.keys(meanings)[0]][0].definition;
  },
  validateForm($form) {
    // returns true if valid
    const $interval = $form.find('input[type="text"]');
    const errorType = $interval[0].validity;

    return !(errorType.valueMissing || errorType.patternMismatch);
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
  }
};