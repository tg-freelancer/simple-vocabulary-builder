module.exports = {
  getFirstDefinition(json) {
    if (!json) return null;

    const meanings = json[0].meaning;
    return meanings[Object.keys(meanings)[0]][0].definition;
  }
};