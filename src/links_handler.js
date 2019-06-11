const $ = require('jquery');
const Handlebars = require('handlebars');
const precompiler = require('./precompiler');

const Store = require('electron-store');
const store = new Store();

$('aside a').on('click', (evt) => {
  evt.preventDefault();
  const $link = $(evt.target);
  const linkType = $link.attr('class');

  let newContext;
  let newContents;

  newContext = { contents: $(`#${linkType}`).html() };
  newContents = precompiler.tmplScript(newContext);

  $('.contents').replaceWith(newContents);

  if (linkType === 'index') {
    $('.current_words_list').text(store.get('name'));
  } else if (linkType === 'stats') {
    const statsTmplScript = Handlebars.compile(newContents);
    const words = store.get('words');
    // console.dir(words);
    const statsContents = statsTmplScript({ words: words });
    
    // console.log(statsContents);
    $('.contents').replaceWith(statsContents);
  }
})