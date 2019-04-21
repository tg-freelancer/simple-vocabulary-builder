module.exports = {
  getSanitizedWords(str) {
    return str.trim()
              .split(/\n+/)
              .map(item => item.trim())
              .filter(item => item.length);
  },
  shuffle(arr) {
    const shuffledArr = [];

    while (arr.length) {
      let randomIdx = Math.floor(Math.random() * arr.length);
      let randomItem = arr.splice(randomIdx, 1)[0];
      shuffledArr.push(randomItem);
    }

    return shuffledArr;
  }
}