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

    while (arr.length) {
      let randomIdx = Math.floor(Math.random() * arr.length);
      let randomItem = arr.splice(randomIdx, 1)[0];
      // shuffledItems.push({ word: randomItem, yes: 0, no: 0 });
      shuffledItems.push(randomItem);
    }

    return shuffledItems;
  },
  getLastElement(arr) {
    return arr[arr.length - 1];
  }
}