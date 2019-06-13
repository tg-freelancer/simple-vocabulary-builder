module.exports = {
  getSanitizedWords(str) {
    return str.trim()
              .split(/\n+/)
              .map(item => item.trim())
              .filter(item => item.length);
  },
  // returns a randomised object with stats on each word
  shuffle(arr) {
    const shuffledItems = [];
    const arrCopy = Array.prototype.slice.call(arr, 0);

    while (arrCopy.length) {
      let randomIdx = Math.floor(Math.random() * arrCopy.length);
      let randomItem = arrCopy.splice(randomIdx, 1)[0];
      shuffledItems.push(randomItem);
    }

    return shuffledItems;
  },
  getLastElement(arr) {
    return arr[arr.length - 1];
  }
}