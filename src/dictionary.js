module.exports = {
  getFirstDefinition(json) {
    if (!json) return null;

    const meanings = json.meaning;
    console.log(`meanings:`, meanings);
    return meanings[Object.keys(meanings)[0]][0].definition;
  }
};