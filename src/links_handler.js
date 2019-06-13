const $ = require('jquery');
const Handlebars = require('handlebars');
const precompiler = require('./precompiler');

const Store = require('electron-store');
const store = new Store();

$('aside a').on('click', (evt) => {
  evt.preventDefault();
  const $link = $(evt.target);
  const linkType = $link.attr('class');
  const newContext = { contents: $(`#${linkType}`).html() };
  const newContents = precompiler.tmplScript(newContext);

  if (linkType === 'index') {
    $('.contents').replaceWith(precompiler.indexHtml);
    $('.current_words_list').text(store.get('name'));
  } else if (linkType === 'stats') {
    const statsTmplScript = Handlebars.compile(newContents);
    const words = store.get('words');
    const statsContents = statsTmplScript({ words: words });
    
    $('.contents').replaceWith(statsContents);
  } else {
    $('.contents').replaceWith(newContents);
  }
})